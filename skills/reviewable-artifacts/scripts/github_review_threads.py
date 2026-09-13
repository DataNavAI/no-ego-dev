#!/usr/bin/env python3
"""List and safely mutate GitHub pull-request review threads via gh."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from typing import Any

THREAD_QUERY = r"""
query($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    nameWithOwner
    pullRequest(number: $number) {
      number url headRefOid
      reviewThreads(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id isResolved isOutdated path line originalLine
          comments(first: 100) {
            pageInfo { hasNextPage endCursor }
            nodes { id databaseId body createdAt url author { login } }
          }
        }
      }
    }
  }
}
"""

THREAD_COMMENTS_QUERY = r"""
query($threadId: ID!, $after: String) {
  node(id: $threadId) {
    ... on PullRequestReviewThread {
      id
      comments(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { id databaseId body createdAt url author { login } }
      }
    }
  }
}
"""

REPLY_MUTATION = r"""
mutation($threadId: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $threadId, body: $body}) {
    comment { id databaseId body createdAt url author { login } }
  }
}
"""

RESOLVE_MUTATION = r"""
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread { id isResolved }
  }
}
"""


def parse_repo(value: str) -> tuple[str, str]:
    parts = value.strip().strip("/").split("/")
    allowed = re.compile(r"[A-Za-z0-9_.-]+")
    if len(parts) != 2 or any(not allowed.fullmatch(part) or part in {".", ".."} for part in parts):
        raise argparse.ArgumentTypeError("repository must be OWNER/REPO")
    return parts[0], parts[1]


def positive_int(value: str) -> int:
    try:
        number = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("value must be a positive integer") from exc
    if number <= 0:
        raise argparse.ArgumentTypeError("value must be a positive integer")
    return number


def full_sha(value: str) -> str:
    if not re.fullmatch(r"[0-9a-fA-F]{40,64}", value):
        raise argparse.ArgumentTypeError("expected head must be a full 40-64 character hexadecimal SHA")
    return value.lower()


def run_gh(args: list[str]) -> dict[str, Any]:
    try:
        result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True, timeout=60)
    except FileNotFoundError as exc:
        raise RuntimeError("GitHub CLI `gh` is not installed") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError((exc.stderr or exc.stdout or "gh command failed").strip()) from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("GitHub CLI request timed out after 60 seconds") from exc
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("GitHub CLI returned non-JSON output") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("GitHub CLI returned a non-object JSON payload")
    return payload


def graphql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    args = ["api", "graphql", "-f", f"query={query}"]
    for key, value in variables.items():
        if value is None:
            continue
        args.extend(["-F" if isinstance(value, int) else "-f", f"{key}={value}"])
    payload = run_gh(args)
    errors = payload.get("errors") or []
    if errors:
        messages = "; ".join(str(error.get("message") or "unknown GraphQL error") for error in errors)
        raise RuntimeError(f"GitHub GraphQL error: {messages}")
    return payload


def complete_thread_comments(thread: dict[str, Any]) -> None:
    connection = thread.get("comments") or {}
    page_info = connection.get("pageInfo") or {}
    after = page_info.get("endCursor")
    while page_info.get("hasNextPage"):
        if not after:
            raise RuntimeError("GitHub reported more thread comments without an end cursor")
        payload = graphql(THREAD_COMMENTS_QUERY, {"threadId": thread.get("id"), "after": after})
        node = payload.get("data", {}).get("node")
        if not node or node.get("id", thread.get("id")) != thread.get("id"):
            raise RuntimeError(f"review thread identity changed while paginating comments: {thread.get('id')}")
        next_connection = node.get("comments") or {}
        connection.setdefault("nodes", []).extend(next_connection.get("nodes") or [])
        page_info = next_connection.get("pageInfo") or {}
        after = page_info.get("endCursor")
    connection["pageInfo"] = page_info
    thread["comments"] = connection


def fetch_threads(repo: tuple[str, str], pr_number: int) -> dict[str, Any]:
    if pr_number <= 0:
        raise RuntimeError("pull request number must be positive")
    owner, name = repo
    expected_repo = f"{owner}/{name}"
    after: str | None = None
    threads: list[dict[str, Any]] = []
    url = ""
    head_sha = ""
    while True:
        payload = graphql(THREAD_QUERY, {"owner": owner, "name": name, "number": pr_number, "after": after})
        repository = payload.get("data", {}).get("repository")
        if not repository:
            raise RuntimeError(f"repository not found or inaccessible: {expected_repo}")
        actual_repo = repository.get("nameWithOwner")
        if actual_repo != expected_repo:
            raise RuntimeError(f"repository identity mismatch: expected {expected_repo}, got {actual_repo or 'unknown'}")
        pull_request = repository.get("pullRequest")
        if not pull_request:
            raise RuntimeError(f"pull request not found: {expected_repo}#{pr_number}")
        if pull_request.get("number") != pr_number:
            raise RuntimeError(f"pull request identity mismatch: expected #{pr_number}")
        page_head = pull_request.get("headRefOid") or ""
        if head_sha and page_head != head_sha:
            raise RuntimeError("pull request head changed during pagination")
        head_sha = page_head
        url = pull_request.get("url") or url
        connection = pull_request.get("reviewThreads") or {}
        page_threads = connection.get("nodes") or []
        for thread in page_threads:
            complete_thread_comments(thread)
        threads.extend(page_threads)
        page_info = connection.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            break
        after = page_info.get("endCursor")
        if not after:
            raise RuntimeError("GitHub reported another page without an end cursor")
    ids = [thread.get("id") for thread in threads]
    if any(not thread_id for thread_id in ids) or len(ids) != len(set(ids)):
        raise RuntimeError("GitHub returned missing or duplicate thread identity")
    return {"repo": expected_repo, "pr": pr_number, "url": url, "head_sha": head_sha, "threads": threads}


def _validate_snapshot(data: dict[str, Any], repo: tuple[str, str], pr_number: int, expected_head: str) -> None:
    expected_repo = "/".join(repo)
    if data.get("repo") != expected_repo:
        raise RuntimeError(f"repository identity mismatch: expected {expected_repo}")
    if data.get("pr") != pr_number:
        raise RuntimeError(f"pull request identity mismatch: expected #{pr_number}")
    if (data.get("head_sha") or "").lower() != expected_head.lower():
        raise RuntimeError(f"pull request head mismatch: expected {expected_head}, got {data.get('head_sha') or 'unknown'}")


def _exact_thread(data: dict[str, Any], thread_id: str) -> dict[str, Any]:
    matches = [thread for thread in data.get("threads", []) if thread.get("id") == thread_id]
    if len(matches) != 1:
        raise RuntimeError(f"thread identity mismatch: expected exactly one unresolved target {thread_id}")
    return matches[0]


def _unresolved_count(data: dict[str, Any]) -> int:
    return sum(not thread.get("isResolved", False) for thread in data.get("threads", []))


def prefetch_unresolved_thread(
    repo: tuple[str, str], pr_number: int, thread_id: str, expected_head: str
) -> tuple[dict[str, Any], dict[str, Any]]:
    data = fetch_threads(repo, pr_number)
    _validate_snapshot(data, repo, pr_number, expected_head)
    thread = _exact_thread(data, thread_id)
    if thread.get("isResolved"):
        raise RuntimeError(f"target thread is already resolved: {thread_id}")
    return data, thread


def reply(
    repo: tuple[str, str], pr_number: int, thread_id: str, expected_head: str, body: str
) -> dict[str, Any]:
    if not body.strip():
        raise RuntimeError("reply body cannot be empty")
    before, _ = prefetch_unresolved_thread(repo, pr_number, thread_id, expected_head)
    payload = graphql(REPLY_MUTATION, {"threadId": thread_id, "body": body})
    comment = payload.get("data", {}).get("addPullRequestReviewThreadReply", {}).get("comment") or {}
    if not comment.get("id"):
        raise RuntimeError("GitHub did not return the created reply identity")
    after = fetch_threads(repo, pr_number)
    _validate_snapshot(after, repo, pr_number, expected_head)
    target = _exact_thread(after, thread_id)
    comments = (target.get("comments") or {}).get("nodes") or []
    if sum(item.get("id") == comment["id"] for item in comments) != 1:
        raise RuntimeError("reply readback did not contain the exact created comment")
    return {
        "thread_id": thread_id,
        "head_sha": expected_head,
        "before_unresolved": _unresolved_count(before),
        "after_unresolved": _unresolved_count(after),
        "comment": comment,
    }


def resolve(repo: tuple[str, str], pr_number: int, thread_id: str, expected_head: str) -> dict[str, Any]:
    before, _ = prefetch_unresolved_thread(repo, pr_number, thread_id, expected_head)
    payload = graphql(RESOLVE_MUTATION, {"threadId": thread_id})
    mutated = payload.get("data", {}).get("resolveReviewThread", {}).get("thread") or {}
    if mutated.get("id") != thread_id:
        raise RuntimeError("mutation returned wrong thread identity")
    if not mutated.get("isResolved"):
        raise RuntimeError("GitHub did not confirm that the target thread was resolved")
    after = fetch_threads(repo, pr_number)
    _validate_snapshot(after, repo, pr_number, expected_head)
    target = _exact_thread(after, thread_id)
    before_count = _unresolved_count(before)
    after_count = _unresolved_count(after)
    if not target.get("isResolved") or after_count != before_count - 1:
        raise RuntimeError("resolve readback did not confirm exact target and unresolved counts")
    return {
        "thread_id": thread_id,
        "head_sha": expected_head,
        "before_unresolved": before_count,
        "after_unresolved": after_count,
        "isResolved": True,
    }


def markdown_report(data: dict[str, Any], unresolved_only: bool = False) -> str:
    threads = [thread for thread in data["threads"] if not unresolved_only or not thread.get("isResolved")]
    lines = [
        f"# Review threads — {data['repo']}#{data['pr']}",
        "",
        f"- PR: {data.get('url') or 'unknown'}",
        f"- Head revision: `{data.get('head_sha') or 'unknown'}`",
        f"- Threads shown: {len(threads)}",
        f"- Unresolved total: {_unresolved_count(data)}",
        "",
    ]
    for index, thread in enumerate(threads, 1):
        state = "RESOLVED" if thread.get("isResolved") else "UNRESOLVED"
        location = thread.get("line") or thread.get("originalLine") or "file"
        lines.extend([f"## {index}. {state} — `{thread.get('path')}`:{location}", "", f"- Thread ID: `{thread['id']}`"])
        for comment in (thread.get("comments") or {}).get("nodes") or []:
            author = (comment.get("author") or {}).get("login") or "unknown"
            lines.extend([f"- Comment ID: `{comment.get('databaseId')}` by **@{author}** — {comment.get('url')}", "", "> " + (comment.get("body") or "").strip().replace("\n", "\n> "), ""])
    if not threads:
        lines.append("No matching review threads.")
    return "\n".join(lines).rstrip()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    listing = subparsers.add_parser("list")
    listing.add_argument("--repo", required=True, type=parse_repo)
    listing.add_argument("--pr", required=True, type=positive_int)
    listing.add_argument("--unresolved", action="store_true")
    listing.add_argument("--json", action="store_true")
    for command in ("reply", "resolve"):
        mutation = subparsers.add_parser(command)
        mutation.add_argument("--repo", required=True, type=parse_repo)
        mutation.add_argument("--pr", required=True, type=positive_int)
        mutation.add_argument("--thread-id", required=True)
        mutation.add_argument("--expected-head", required=True, type=full_sha)
        if command == "reply":
            mutation.add_argument("--body", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "list":
            data = fetch_threads(args.repo, args.pr)
            result: Any = data if args.json else markdown_report(data, args.unresolved)
        elif args.command == "reply":
            result = reply(args.repo, args.pr, args.thread_id, args.expected_head, args.body)
        else:
            result = resolve(args.repo, args.pr, args.thread_id, args.expected_head)
        print(json.dumps(result, indent=2) if not isinstance(result, str) else result)
        return 0
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
