#!/usr/bin/env python3
"""Finite-lease single-flight lock for scheduled profile-skill harvests."""

from __future__ import annotations

import argparse
import json
import os
import secrets
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

BUSY = 73
OWNER_MISMATCH = 74
LEASE_EXPIRED = 124
MAX_LEASE_SECONDS = 86_399


def utc_text(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        os.chmod(path, 0o600)
    finally:
        temporary.unlink(missing_ok=True)


def read_owner(lock_dir: Path) -> dict[str, Any]:
    owner_path = lock_dir / "owner.json"
    try:
        payload = json.loads(owner_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        raise RuntimeError(f"cannot read lock owner: {exc}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("lock owner must be a JSON object")
    return payload


def cleanup_owned(lock_dir: Path, pid: int, token: str) -> bool:
    try:
        owner = read_owner(lock_dir)
    except RuntimeError:
        return not lock_dir.exists()
    if owner.get("pid") != pid or owner.get("token") != token:
        return False
    owner_path = lock_dir / "owner.json"
    owner_path.unlink(missing_ok=True)
    try:
        lock_dir.rmdir()
    except FileNotFoundError:
        pass
    except OSError:
        return False
    return not lock_dir.exists()


def hold(args: argparse.Namespace) -> int:
    lock_dir = Path(args.lock_dir).expanduser().resolve()
    if not 1 <= args.lease_seconds <= MAX_LEASE_SECONDS:
        raise ValueError(f"lease must be between 1 and {MAX_LEASE_SECONDS} seconds")

    lock_dir.parent.mkdir(parents=True, exist_ok=True)
    try:
        lock_dir.mkdir(mode=0o700)
    except FileExistsError:
        existing: dict[str, Any] | None
        try:
            existing = read_owner(lock_dir)
        except RuntimeError:
            existing = None
        print(json.dumps({"status": "busy", "owner": existing}, sort_keys=True), flush=True)
        return BUSY

    pid = os.getpid()
    token = "lock_" + secrets.token_urlsafe(24)
    started = datetime.now(timezone.utc)
    expires = started + timedelta(seconds=args.lease_seconds)
    owner = {
        "pid": pid,
        "token": token,
        "started_at": utc_text(started),
        "expires_at": utc_text(expires),
        "lease_seconds": args.lease_seconds,
        "session_id": args.session_id,
        "controller_profile": args.controller_profile,
        "provider": args.provider,
        "model": args.model,
        "worktree": args.worktree,
        "branch": args.branch,
        "pr": args.pr,
    }
    owner = {key: value for key, value in owner.items() if value not in (None, "")}

    try:
        write_json_atomic(lock_dir / "owner.json", owner)
    except Exception:
        cleanup_owned(lock_dir, pid, token)
        raise

    print(
        json.dumps(
            {
                "status": "acquired",
                "pid": pid,
                "token": token,
                "expires_at": owner["expires_at"],
            },
            sort_keys=True,
        ),
        flush=True,
    )

    stopped = False

    def request_stop(_signum: int, _frame: Any) -> None:
        nonlocal stopped
        stopped = True

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    deadline = time.monotonic() + args.lease_seconds
    expired = False
    cleanup_ok = False
    try:
        while not stopped:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                expired = True
                break
            time.sleep(min(0.25, remaining))
    finally:
        cleanup_ok = cleanup_owned(lock_dir, pid, token)

    if not cleanup_ok:
        print(json.dumps({"status": "cleanup_failed", "pid": pid}, sort_keys=True), file=sys.stderr)
        return OWNER_MISMATCH
    if expired:
        print(json.dumps({"status": "lease_expired", "pid": pid}, sort_keys=True), flush=True)
        return LEASE_EXPIRED
    print(json.dumps({"status": "released", "pid": pid}, sort_keys=True), flush=True)
    return 0


def release(args: argparse.Namespace) -> int:
    lock_dir = Path(args.lock_dir).expanduser().resolve()
    try:
        owner = read_owner(lock_dir)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return OWNER_MISMATCH

    if owner.get("pid") != args.pid or owner.get("token") != args.token:
        print("owner PID/token mismatch; refusing release", file=sys.stderr)
        return OWNER_MISMATCH

    try:
        os.kill(args.pid, 0)
    except ProcessLookupError:
        if cleanup_owned(lock_dir, args.pid, args.token):
            print(json.dumps({"status": "released_dead_owner", "pid": args.pid}, sort_keys=True))
            return 0
        print("dead owner cleanup failed", file=sys.stderr)
        return OWNER_MISMATCH
    except PermissionError:
        print("owner process is not signalable", file=sys.stderr)
        return OWNER_MISMATCH

    os.kill(args.pid, signal.SIGTERM)
    deadline = time.monotonic() + args.wait_seconds
    while time.monotonic() < deadline:
        if not lock_dir.exists():
            print(json.dumps({"status": "released", "pid": args.pid}, sort_keys=True))
            return 0
        time.sleep(0.1)

    print("owner did not remove the lock before timeout", file=sys.stderr)
    return OWNER_MISMATCH


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    commands = result.add_subparsers(dest="command", required=True)

    hold_parser = commands.add_parser("hold", help="acquire and hold a finite lease")
    hold_parser.add_argument("--lock-dir", required=True)
    hold_parser.add_argument("--lease-seconds", type=int, required=True)
    hold_parser.add_argument("--session-id", required=True)
    hold_parser.add_argument("--controller-profile")
    hold_parser.add_argument("--provider")
    hold_parser.add_argument("--model")
    hold_parser.add_argument("--worktree")
    hold_parser.add_argument("--branch")
    hold_parser.add_argument("--pr")
    hold_parser.set_defaults(function=hold)

    release_parser = commands.add_parser("release", help="release an exact PID/token-owned lease")
    release_parser.add_argument("--lock-dir", required=True)
    release_parser.add_argument("--pid", type=int, required=True)
    release_parser.add_argument("--token", required=True)
    release_parser.add_argument("--wait-seconds", type=float, default=10.0)
    release_parser.set_defaults(function=release)
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        return int(args.function(args))
    except (OSError, ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
