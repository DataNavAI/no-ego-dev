#!/usr/bin/env python3
"""List and inspect GitHub pull-request review threads via gh."""

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
        raise RuntimeError(f"thread identity mismatch: expected exactly one target {thread_id}")
    return matches[0]


def _unresolved_count(data: dict[str, Any]) -> int:
    return sum(not thread.get("isResolved", False) for thread in data.get("threads", []))


def inspect_thread(
    repo: tuple[str, str],
    pr_number: int,
    thread_id: str,
    expected_head: str,
    *,
    unresolved_only: bool = False,
) -> dict[str, Any]:
    data = fetch_threads(repo, pr_number)
    _validate_snapshot(data, repo, pr_number, expected_head)
    thread = _exact_thread(data, thread_id)
    if unresolved_only and thread.get("isResolved"):
        raise RuntimeError(f"target thread is already resolved: {thread_id}")
    return {
        "repo": data["repo"],
        "pr": data["pr"],
        "url": data.get("url"),
        "head_sha": data["head_sha"],
        "thread": thread,
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
    inspection = subparsers.add_parser("inspect")
    inspection.add_argument("--repo", required=True, type=parse_repo)
    inspection.add_argument("--pr", required=True, type=positive_int)
    inspection.add_argument("--thread-id", required=True)
    inspection.add_argument("--expected-head", required=True, type=full_sha)
    inspection.add_argument("--unresolved", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "list":
            data = fetch_threads(args.repo, args.pr)
            result: Any = data if args.json else markdown_report(data, args.unresolved)
        else:
            result = inspect_thread(
                args.repo,
                args.pr,
                args.thread_id,
                args.expected_head,
                unresolved_only=args.unresolved,
            )
        print(json.dumps(result, indent=2) if not isinstance(result, str) else result)
        return 0
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
