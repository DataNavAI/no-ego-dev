#!/usr/bin/env python3
"""Fail-closed validation for a recorded STATUS.md completion handoff packet."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse


COMPLETE_KINDS = {"big_task_complete", "milestone_complete"}
NONCOMPLETE_KINDS = {"progress_blocked"}
REMOTE_KINDS = {"default_branch", "pr_branch", "commit"}
HASH_RE = re.compile(r"^[0-9a-fA-F]{7,64}$")


def _remote_url_ref(target: str) -> str | None:
    """Extract the ref from common root-file browser URLs."""
    path = unquote(urlparse(target).path).rstrip("/")
    for marker in ("/-/blob/", "/blob/", "/src/"):
        if marker in path and path.endswith("/STATUS.md"):
            return path.split(marker, 1)[1][: -len("/STATUS.md")]
    return None


def _truthy(mapping: dict, key: str, errors: list[str]) -> None:
    if mapping.get(key) is not True:
        errors.append(f"{key} must be true")


def validate_packet(packet: dict) -> list[str]:
    """Return consistency errors; an empty list means the packet passes."""
    errors: list[str] = []
    completion_kind = packet.get("completion_kind")
    status = packet.get("status_update") or {}
    handoff = packet.get("handoff") or {}

    if completion_kind in NONCOMPLETE_KINDS:
        return errors
    if completion_kind not in COMPLETE_KINDS:
        return ["completion_kind must be big_task_complete, milestone_complete, or progress_blocked"]

    _truthy(status, "committed_or_in_landing_pr", errors)
    expected_revision = str(status.get("expected_revision") or "")
    observed_revision = str(status.get("observed_revision") or "")
    if not expected_revision or observed_revision != expected_revision:
        errors.append("observed STATUS.md revision must equal the expected completed revision")

    kind = handoff.get("kind")
    awaiting_merge = handoff.get("awaiting_merge") is True
    target = str(handoff.get("target") or "")
    if kind not in REMOTE_KINDS | {"local_path"}:
        errors.append("handoff kind must be default_branch, pr_branch, commit, or local_path")
        return errors

    _truthy(handoff, "resolves", errors)
    _truthy(handoff, "content_verified", errors)
    _truthy(handoff, "points_to_status_md", errors)

    checked_at = str(handoff.get("checked_at") or "")
    if not checked_at:
        errors.append("checked_at verification time is required")

    if kind in REMOTE_KINDS:
        parsed = urlparse(target)
        target_ref = str(handoff.get("target_ref") or "")
        default_branch_ref = str(handoff.get("default_branch_ref") or "")
        url_ref = _remote_url_ref(target)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            errors.append("remote handoff target must be an absolute HTTP(S) URL")
        elif not unquote(parsed.path).rstrip("/").endswith("/STATUS.md"):
            errors.append("remote handoff URL must point specifically to STATUS.md")
        if not target_ref or not default_branch_ref:
            errors.append("target_ref and default_branch_ref are required for remote handoffs")
        if url_ref is None:
            errors.append("remote handoff URL must expose its ref in a supported blob/src path")
        elif url_ref != target_ref:
            errors.append("remote handoff URL ref must equal target_ref")
        if kind == "default_branch" and target_ref != default_branch_ref:
            errors.append("default_branch handoff target_ref must equal default_branch_ref")
        if kind == "pr_branch" and target_ref == default_branch_ref:
            errors.append("pr_branch handoff target_ref must differ from default_branch_ref")
        if kind == "commit" and not HASH_RE.fullmatch(target_ref):
            errors.append("commit handoff target_ref must be a commit hash")
        _truthy(handoff, "access_verified", errors)
        blob_hash = str(handoff.get("blob_hash") or "")
        if not HASH_RE.fullmatch(blob_hash):
            errors.append("verified STATUS.md blob_hash is required")

    if kind == "default_branch":
        if awaiting_merge:
            errors.append("awaiting-merge completion cannot link the default branch")
        _truthy(handoff, "remote_ref_contains_update", errors)
    elif kind in {"pr_branch", "commit"}:
        _truthy(handoff, "pushed_ref_contains_update", errors)
    else:
        relative_path = handoff.get("repo_relative_path")
        absolute_path = Path(str(handoff.get("absolute_path") or ""))
        if relative_path != "STATUS.md":
            errors.append("local handoff repo_relative_path must be STATUS.md")
        if not absolute_path.is_absolute() or not absolute_path.is_file():
            errors.append("local handoff absolute_path must be an existing absolute file")
        elif expected_revision and expected_revision not in absolute_path.read_text(
            encoding="utf-8"
        ):
            errors.append("local STATUS.md does not contain the expected revision marker")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("packet", type=Path, help="JSON status-handoff evidence packet")
    args = parser.parse_args()
    packet = json.loads(args.packet.read_text(encoding="utf-8"))
    errors = validate_packet(packet)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("STATUS handoff PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
