#!/usr/bin/env python3
"""List, reply to, and resolve GitHub pull-request review threads via gh.

This helper never reads or prints tokens; authentication is delegated to the
GitHub CLI. It intentionally separates replying from resolving so callers can
verify a canonical artifact revision before closing a conversation.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any


THREAD_QUERY = r"""
query($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      url
      headRefOid
      reviewThreads(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          originalLine
          comments(first: 100) {
            nodes {
              id
              databaseId
              body
              createdAt
              url
              author { login }
            }
          }
        }
      }
    }
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
    if len(parts) != 2 or not all(parts):
        raise argparse.ArgumentTypeError("repository must be OWNER/REPO")
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
    if any(set(part) - allowed for part in parts):
        raise argparse.ArgumentTypeError("repository contains unsupported characters")
    return parts[0], parts[1]


def run_gh(args: list[str]) -> dict[str, Any]:
    try:
        result = subprocess.run(
            ["gh", *args],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("GitHub CLI `gh` is not installed") from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "gh command failed").strip()
        raise RuntimeError(detail) from exc
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("GitHub CLI returned non-JSON output") from exc


def graphql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    args = ["api", "graphql", "-f", f"query={query}"]
    for key, value in variables.items():
        if value is None:
            continue
        flag = "-F" if isinstance(value, (int, bool)) else "-f"
        args.extend([flag, f"{key}={str(value).lower() if isinstance(value, bool) else value}"])
    return run_gh(args)


def fetch_threads(repo: tuple[str, str], pr_number: int) -> dict[str, Any]:
    owner, name = repo
    after: str | None = None
    threads: list[dict[str, Any]] = []
    pr_url = ""
    head_sha = ""

    while True:
        payload = graphql(
            THREAD_QUERY,
            {"owner": owner, "name": name, "number": pr_number, "after": after},
        )
        repository = payload.get("data", {}).get("repository")
        if not repository:
            raise RuntimeError(f"repository not found or inaccessible: {owner}/{name}")
        pull_request = repository.get("pullRequest")
        if not pull_request:
            raise RuntimeError(f"pull request not found: {owner}/{name}#{pr_number}")
        pr_url = pull_request.get("url") or pr_url
        head_sha = pull_request.get("headRefOid") or head_sha
        connection = pull_request.get("reviewThreads") or {}
        threads.extend(connection.get("nodes") or [])
        page_info = connection.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            break
        after = page_info.get("endCursor")
        if not after:
            raise RuntimeError("GitHub reported another page without an end cursor")

    return {"repo": f"{owner}/{name}", "pr": pr_number, "url": pr_url, "head_sha": head_sha, "threads": threads}


def markdown_report(data: dict[str, Any], unresolved_only: bool = False) -> str:
    threads = [
        thread for thread in data["threads"]
        if not unresolved_only or not thread.get("isResolved", False)
    ]
    unresolved_count = sum(not thread.get("isResolved", False) for thread in data["threads"])
    lines = [
        f"# Review threads — {data['repo']}#{data['pr']}",
        "",
        f"- PR: {data.get('url') or 'unknown'}",
        f"- Head revision: `{data.get('head_sha') or 'unknown'}`",
        f"- Threads shown: {len(threads)}",
        f"- Unresolved total: {unresolved_count}",
        "",
    ]

    if not threads:
        lines.append("No matching review threads.")
        return "\n".join(lines)

    for index, thread in enumerate(threads, start=1):
        state = "RESOLVED" if thread.get("isResolved") else "UNRESOLVED"
        location = thread.get("line") or thread.get("originalLine") or "file"
        lines.extend(
            [
                f"## {index}. {state} — `{thread.get('path')}`:{location}",
                "",
                f"- Thread ID: `{thread.get('id')}`",
                f"- Outdated: `{bool(thread.get('isOutdated'))}`",
            ]
        )
        for comment in (thread.get("comments") or {}).get("nodes") or []:
            author = (comment.get("author") or {}).get("login") or "unknown"
            body = (comment.get("body") or "").strip()
            lines.extend(
                [
                    f"- Comment ID: `{comment.get('databaseId')}` by **@{author}** — {comment.get('url')}",
                    "",
                    "> " + body.replace("\n", "\n> "),
                    "",
                ]
            )
    return "\n".join(lines).rstrip()


def reply(repo: tuple[str, str], pr_number: int, comment_id: int, body: str) -> dict[str, Any]:
    owner, name = repo
    if not body.strip():
        raise RuntimeError("reply body cannot be empty")
    return run_gh(
        [
            "api",
            "--method",
            "POST",
            f"repos/{owner}/{name}/pulls/{pr_number}/comments/{comment_id}/replies",
            "-f",
            f"body={body}",
        ]
    )


def resolve(thread_id: str) -> dict[str, Any]:
    if not thread_id.strip():
        raise RuntimeError("thread ID cannot be empty")
    return graphql(RESOLVE_MUTATION, {"threadId": thread_id})


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="list PR review threads")
    list_parser.add_argument("--repo", required=True, type=parse_repo, metavar="OWNER/REPO")
    list_parser.add_argument("--pr", required=True, type=int, metavar="NUMBER")
    list_parser.add_argument("--unresolved", action="store_true", help="show unresolved threads only")
    list_parser.add_argument("--json", action="store_true", help="emit JSON instead of Markdown")

    reply_parser = subparsers.add_parser("reply", help="reply to a PR review comment")
    reply_parser.add_argument("--repo", required=True, type=parse_repo, metavar="OWNER/REPO")
    reply_parser.add_argument("--pr", required=True, type=int, metavar="NUMBER")
    reply_parser.add_argument("--comment-id", required=True, type=int)
    reply_parser.add_argument("--body", required=True)

    resolve_parser = subparsers.add_parser("resolve", help="resolve a PR review thread after verification")
    resolve_parser.add_argument("--thread-id", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "list":
            data = fetch_threads(args.repo, args.pr)
            print(json.dumps(data, indent=2) if args.json else markdown_report(data, args.unresolved))
        elif args.command == "reply":
            result = reply(args.repo, args.pr, args.comment_id, args.body)
            print(json.dumps({"id": result.get("id"), "url": result.get("html_url")}, indent=2))
        elif args.command == "resolve":
            result = resolve(args.thread_id)
            thread = result.get("data", {}).get("resolveReviewThread", {}).get("thread") or {}
            if not thread.get("isResolved"):
                raise RuntimeError("GitHub did not confirm that the thread was resolved")
            print(json.dumps(thread, indent=2))
        return 0
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
