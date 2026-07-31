#!/usr/bin/env python3
"""Authorize profile-bound IFA invocations before selecting a credential store."""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Any


POLICY_PATH = Path(__file__).resolve().parents[1] / "references" / "profile-credential-policy.yaml"
GRANT_ID = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")


class Denied(RuntimeError):
    pass


def load_policy() -> dict[str, Any]:
    # The policy uses JSON syntax so the installed guard has no third-party dependency.
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


def runtime_root() -> Path:
    return Path.home() / ".hermes" / "state" / "identity-for-agent"


def reject_symlinks(path: Path, *, scan_children: bool = False) -> None:
    current = path
    while current != current.parent:
        if current.is_symlink():
            raise Denied(f"runtime credential symlink rejected: {current}")
        current = current.parent
    if scan_children and path.exists():
        for child in path.rglob("*"):
            if child.is_symlink():
                raise Denied(f"runtime credential symlink rejected: {child}")


def secure_runtime_tree(directory: Path) -> None:
    reject_symlinks(directory, scan_children=True)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    for item in [directory, *directory.rglob("*")]:
        if item.is_symlink():
            raise Denied(f"runtime credential symlink rejected: {item}")
        if item.is_dir():
            item.chmod(0o700)
        elif item.is_file():
            item.chmod(0o600)


def validate_profile(policy: dict[str, Any], profile: str) -> dict[str, Any]:
    active = os.environ.get("HERMES_PROFILE", "")
    if not profile or not active:
        raise Denied("missing active Hermes profile; global IFA fallback is denied")
    if active != profile:
        raise Denied(f"profile attribution mismatch: active {active!r}, requested {profile!r}")
    try:
        return policy["profiles"][profile]
    except KeyError as exc:
        raise Denied(f"unsupported Hermes profile: {profile}") from exc


def profile_store(policy: dict[str, Any], profile: str) -> Path:
    binding = validate_profile(policy, profile)
    expected = runtime_root() / "profiles" / profile / "store.json"
    configured = Path(os.path.expanduser(binding["store_path"]))
    if configured != expected:
        raise Denied("profile policy store path does not match the runtime boundary")
    secure_runtime_tree(expected.parent)
    reject_symlinks(expected)
    return expected


def load_shared_grant(policy: dict[str, Any], profile: str, grant_id: str) -> tuple[Path, Path, dict[str, Any]]:
    validate_profile(policy, profile)
    sharing = policy["explicit_sharing"]
    if not GRANT_ID.fullmatch(grant_id):
        raise Denied("invalid shared grant id")
    if profile in sharing["forbidden_consumers"]:
        raise Denied(f"profile {profile} may not consume shared grants")

    directory = runtime_root() / "shared" / grant_id
    secure_runtime_tree(directory)
    metadata_path = directory / "grant.json"
    store = directory / "store.json"
    if not metadata_path.is_file():
        raise Denied(f"shared grant policy is missing: {grant_id}")
    reject_symlinks(metadata_path)
    reject_symlinks(store)
    try:
        grant = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise Denied(f"shared grant policy is invalid: {grant_id}") from exc

    required = set(sharing["required_metadata"])
    if not required.issubset(grant) or grant["grant_id"] != grant_id:
        raise Denied(f"shared grant metadata is incomplete: {grant_id}")
    if grant["provider"].lower() in sharing["forbidden_providers"]:
        raise Denied(f"provider {grant['provider']} is not shareable")
    source = grant["source_profile"]
    if source not in policy["profiles"] or source in sharing["forbidden_sources"]:
        raise Denied(f"profile {source} may not provide shared grants")
    if profile not in grant["approved_profiles"]:
        raise Denied(f"profile {profile} is not approved for shared grant {grant_id}")
    return store, metadata_path, grant


def reject_caller_authority(args: list[str]) -> None:
    for arg in args:
        if arg == "--path" or arg.startswith("--path="):
            raise Denied("caller-supplied --path is forbidden; the guard selects the authorized store")
        if arg == "--profile" or arg.startswith("--profile="):
            raise Denied("caller-supplied --profile is forbidden; the guard attributes the active profile")


def run_ifa(policy: dict[str, Any], profile: str, args: list[str]) -> int:
    grant_id = None
    if args[:1] == ["--grant-id"]:
        if len(args) < 3:
            raise Denied("--grant-id requires an id and an IFA command")
        grant_id, args = args[1], args[2:]
    if not args:
        raise Denied("missing IFA command")
    reject_caller_authority(args)

    if grant_id:
        store, _, _ = load_shared_grant(policy, profile, grant_id)
    else:
        store = profile_store(policy, profile)

    command = [os.environ.get("IFA_EXECUTABLE", "ifa"), *args]
    if args[0] == "request":
        command.extend(["--profile", profile])
    command.extend(["--path", str(store)])
    return subprocess.run(command, check=False).returncode


def remove_profile(policy: dict[str, Any], profile: str) -> int:
    validate_profile(policy, profile)
    shared_root = runtime_root() / "shared"
    reject_symlinks(shared_root, scan_children=True)
    if shared_root.is_dir():
        for metadata_path in shared_root.glob("*/grant.json"):
            grant_id = metadata_path.parent.name
            _, _, grant = load_shared_grant_for_removal(policy, grant_id)
            approved = grant.get("approved_profiles", [])
            if profile in approved:
                grant["approved_profiles"] = [item for item in approved if item != profile]
                temporary = metadata_path.with_suffix(".json.tmp")
                temporary.write_text(json.dumps(grant, indent=2) + "\n", encoding="utf-8")
                temporary.chmod(0o600)
                temporary.replace(metadata_path)

    local = runtime_root() / "profiles" / profile
    reject_symlinks(local, scan_children=True)
    if local.exists():
        shutil.rmtree(local)
    return 0


def load_shared_grant_for_removal(
    policy: dict[str, Any], grant_id: str
) -> tuple[Path, Path, dict[str, Any]]:
    if not GRANT_ID.fullmatch(grant_id):
        raise Denied("invalid shared grant id")
    directory = runtime_root() / "shared" / grant_id
    secure_runtime_tree(directory)
    metadata_path = directory / "grant.json"
    store = directory / "store.json"
    reject_symlinks(metadata_path)
    reject_symlinks(store)
    try:
        grant = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise Denied(f"shared grant policy is invalid: {grant_id}") from exc
    required = set(policy["explicit_sharing"]["required_metadata"])
    if not required.issubset(grant) or grant.get("grant_id") != grant_id:
        raise Denied(f"shared grant metadata is incomplete: {grant_id}")
    return store, metadata_path, grant


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        raise Denied("usage: ifa_profile_guard.py PROFILE {run|remove-profile} ...")
    profile, action, *args = argv
    policy = load_policy()
    if action == "run":
        return run_ifa(policy, profile, args)
    if action == "remove-profile" and not args:
        return remove_profile(policy, profile)
    raise Denied("unsupported guard action")


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Denied as exc:
        print(f"IFA authorization denied: {exc}", file=sys.stderr)
        raise SystemExit(2)
