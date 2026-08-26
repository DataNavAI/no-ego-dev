#!/usr/bin/env python3
"""Inventory complete Hermes skill packages without copying their contents.

The output contains paths, digests, and change classifications only. Operational
state belongs outside the repository and is written only with an explicit
initial-enrollment or verified-merge record operation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import yaml

CANONICAL_PROFILE_NAMES = frozenset({"ned", "alphaned", "kiaened", "nedxned", "newsned"})
IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "node_modules",
    "sessions",
    "logs",
    "memories",
    "workspace",
    "workspaces",
}
IGNORED_FILES = {".DS_Store", "Thumbs.db"}
RUNTIME_NAMES = {
    ".env",
    "auth.json",
    "google_token.json",
    "google_client_secret.json",
    "google_oauth_pending.json",
}
NAME_RE = re.compile(r"(?m)^name:\s*[\"']?([a-z0-9][a-z0-9_-]{0,63})[\"']?\s*$")


@dataclass(frozen=True)
class Package:
    name: str
    path: str
    digest: str
    file_count: int
    newest_mtime: str


def parse_name(skill_md: Path) -> str:
    text = skill_md.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"frontmatter must start at byte zero: {skill_md}")
    closing = text.find("\n---\n", 4)
    if closing < 0:
        raise ValueError(f"frontmatter is not closed: {skill_md}")
    match = NAME_RE.search(text[4:closing])
    if not match:
        raise ValueError(f"frontmatter name is missing or invalid: {skill_md}")
    return match.group(1)


def package_files(package_dir: Path) -> Iterable[Path]:
    for path in sorted(package_dir.rglob("*")):
        if path.is_symlink() or not path.is_file():
            continue
        rel = path.relative_to(package_dir)
        if any(part in IGNORED_DIRS for part in rel.parts):
            continue
        if path.name in IGNORED_FILES or path.name in RUNTIME_NAMES:
            continue
        if path.name.endswith((".pyc", ".pyo", "~", ".swp")):
            continue
        yield path


def hash_package(package_dir: Path) -> tuple[str, int, str]:
    digest = hashlib.sha256()
    count = 0
    newest = 0.0
    for path in package_files(package_dir):
        rel = path.relative_to(package_dir).as_posix()
        data = path.read_bytes()
        digest.update(rel.encode("utf-8") + b"\0")
        digest.update(hashlib.sha256(data).digest())
        count += 1
        newest = max(newest, path.stat().st_mtime)
    when = datetime.fromtimestamp(newest, timezone.utc).isoformat() if newest else ""
    return digest.hexdigest(), count, when


def validate_eval_package(package_dir: Path) -> list[str]:
    eval_path = package_dir / "EVAL.yaml"
    if not eval_path.is_file() or eval_path.is_symlink():
        return ["missing regular EVAL.yaml"]
    try:
        evaluation = yaml.safe_load(eval_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        return [f"invalid EVAL.yaml: {exc}"]
    if not isinstance(evaluation, dict):
        return ["EVAL.yaml must be a mapping"]

    errors: list[str] = []
    prompt = evaluation.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        errors.append("EVAL.yaml requires a non-empty prompt")
    expectations = evaluation.get("expectations")
    if not isinstance(expectations, list) or not expectations or not all(
        isinstance(item, str) and item.strip() for item in expectations
    ):
        errors.append("EVAL.yaml requires non-empty string expectations")
    parameters = evaluation.get("parameters", {})
    if not isinstance(parameters, dict):
        errors.append("EVAL.yaml parameters must be a mapping")
        return errors
    for key, value in parameters.items():
        if "fixture" not in str(key).lower() or not isinstance(value, str):
            continue
        candidate = (package_dir / value).resolve()
        try:
            candidate.relative_to(package_dir.resolve())
        except ValueError:
            errors.append(f"EVAL.yaml {key} escapes the package: {value}")
            continue
        if not candidate.is_file() or candidate.is_symlink():
            errors.append(f"EVAL.yaml {key} is not a regular packaged file: {value}")
    return errors


def discover(skills_root: Path) -> tuple[dict[str, Package], list[str]]:
    packages: dict[str, Package] = {}
    errors: list[str] = []
    if not skills_root.is_dir():
        return packages, [f"skills root does not exist: {skills_root}"]
    for skill_md in sorted(skills_root.rglob("SKILL.md")):
        if any(part in IGNORED_DIRS for part in skill_md.parts):
            continue
        try:
            name = parse_name(skill_md)
            if name in packages:
                raise ValueError(
                    f"duplicate skill name {name!r}: {packages[name].path} and {skill_md.parent}"
                )
            package_dir = skill_md.parent
            eval_errors = validate_eval_package(package_dir)
            if eval_errors:
                raise ValueError("; ".join(f"{package_dir}: {message}" for message in eval_errors))
            digest, count, newest = hash_package(package_dir)
            packages[name] = Package(
                name=name,
                path=str(package_dir.resolve()),
                digest=digest,
                file_count=count,
                newest_mtime=newest,
            )
        except (OSError, UnicodeError, ValueError) as exc:
            errors.append(str(exc))
    return packages, errors


def load_state(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"invalid state file {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError(f"state file must contain a JSON object: {path}")
    return data


def atomic_json_write(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(path.parent, 0o700)
    fd, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def parse_profile(value: str) -> tuple[str, Path]:
    name, separator, raw_path = value.partition("=")
    path = Path(raw_path).expanduser()
    if not separator or not name or not path.is_absolute():
        raise argparse.ArgumentTypeError("profile must be NAME=/absolute/profile/path")
    return name, path


def canonical_profile_roots() -> dict[str, str]:
    base = Path.home() / ".hermes" / "profiles"
    return {name: str((base / name).resolve()) for name in sorted(CANONICAL_PROFILE_NAMES)}


def git_output(repo: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(repo), *args],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip() or "git command failed"
        raise ValueError(detail)
    return completed.stdout.strip()


def normalize_remote_url(value: str) -> str:
    value = value.strip().rstrip("/")
    if value.endswith(".git"):
        value = value[:-4]
    if value.startswith("git@") and ":" in value:
        host, path = value[4:].split(":", 1)
        return f"ssh://{host}/{path}".rstrip("/")
    if "://" not in value:
        return str(Path(value).expanduser().resolve())
    return value


def verify_origin_identity(repo: Path, expected_url: str) -> tuple[str, str]:
    actual_url = git_output(repo, "remote", "get-url", "origin")
    normalized_actual = normalize_remote_url(actual_url)
    normalized_expected = normalize_remote_url(expected_url)
    if normalized_actual != normalized_expected:
        raise ValueError("origin URL does not match the enrolled canonical remote URL")

    advertised = git_output(repo, "ls-remote", "--symref", "origin", "HEAD").splitlines()
    symrefs = [line.split() for line in advertised if line.startswith("ref:")]
    heads = [line.split() for line in advertised if not line.startswith("ref:")]
    if len(symrefs) != 1 or len(symrefs[0]) != 3 or symrefs[0][2] != "HEAD":
        raise ValueError("origin HEAD does not advertise one symbolic default branch")
    prefix = "refs/heads/"
    if not symrefs[0][1].startswith(prefix):
        raise ValueError("origin HEAD does not resolve to refs/heads/<branch>")
    default_branch = symrefs[0][1][len(prefix):]
    head_rows = [row for row in heads if len(row) == 2 and row[1] == "HEAD"]
    if len(head_rows) != 1 or not re.fullmatch(r"[0-9a-f]{40}", head_rows[0][0]):
        raise ValueError("origin HEAD does not advertise one default-branch commit")
    return default_branch, head_rows[0][0]


def verify_remote_default_record_source(
    repo: Path,
    verified_sha: str,
    expected_remote_url: str,
) -> tuple[str, str]:
    if not re.fullmatch(r"[0-9a-f]{40}", verified_sha):
        raise ValueError("--verified-remote-default-sha must be a full lowercase commit SHA")
    default_branch, advertised_sha = verify_origin_identity(repo, expected_remote_url)
    remote_ref = f"refs/remotes/origin/{default_branch}"
    remote_sha = git_output(repo, "rev-parse", "--verify", f"{remote_ref}^{{commit}}")
    head_sha = git_output(repo, "rev-parse", "--verify", "HEAD^{commit}")
    if remote_sha != verified_sha or advertised_sha != verified_sha:
        raise ValueError(
            f"verified SHA does not match both origin/{default_branch} and {remote_ref}; "
            "fetch origin and retry"
        )
    if head_sha != verified_sha:
        raise ValueError("inventory source HEAD is not the verified remote-default merge commit")
    if git_output(repo, "status", "--porcelain", "--untracked-files=all"):
        raise ValueError("inventory source worktree is not clean at the verified merge commit")
    return default_branch, normalize_remote_url(expected_remote_url)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path, help="Canonical repository root")
    parser.add_argument(
        "--profile",
        action="append",
        default=[],
        type=parse_profile,
        help="Profile mapping NAME=/absolute/profile/path; repeat as needed",
    )
    parser.add_argument("--state", type=Path, help="External state JSON path")
    record_mode = parser.add_mutually_exclusive_group()
    record_mode.add_argument(
        "--record",
        action="store_true",
        help="Record a full post-rollout baseline from a verified remote-default merge commit",
    )
    record_mode.add_argument(
        "--initialize",
        action="store_true",
        help="Create the first observation baseline without treating existing drift as harvested",
    )
    parser.add_argument(
        "--verified-remote-default-sha",
        help="Full origin-default merge SHA required by --record",
    )
    parser.add_argument(
        "--canonical-remote-url",
        help="Canonical origin URL; required by --initialize and --record and persisted as a trust anchor",
    )
    args = parser.parse_args()

    repo = args.repo.expanduser().resolve()
    source, source_errors = discover(repo / "skills")
    prior = load_state(args.state.expanduser()) if args.state else {}
    prior_profiles = prior.get("profiles", {}) if isinstance(prior.get("profiles", {}), dict) else {}

    profiles: dict[str, dict[str, Package]] = {}
    profile_roots: dict[str, str] = {}
    errors = list(source_errors)
    for profile_name, profile_path in args.profile:
        if profile_name in profiles:
            errors.append(f"duplicate --profile name: {profile_name}")
            continue
        resolved = profile_path.resolve()
        found, profile_errors = discover(resolved / "skills")
        profiles[profile_name] = found
        profile_roots[profile_name] = str(resolved)
        errors.extend(f"{profile_name}: {message}" for message in profile_errors)

    candidates = []
    all_skill_names = set(source)
    for packages in profiles.values():
        all_skill_names.update(packages)
    for prior_packages in prior_profiles.values():
        if isinstance(prior_packages, dict):
            all_skill_names.update(prior_packages)
    all_names = sorted(all_skill_names)
    for skill_name in all_names:
        source_package = source.get(skill_name)
        variants: dict[str, list[str]] = {}
        for profile_name, profile_packages in profiles.items():
            package = profile_packages.get(skill_name)
            old_entry = prior_profiles.get(profile_name, {}).get(skill_name, {})
            old_digest = old_entry.get("digest") if isinstance(old_entry, dict) else None
            if not package:
                if old_digest is not None:
                    candidates.append(
                        {
                            "skill": skill_name,
                            "profile": profile_name,
                            "profile_digest": None,
                            "source_digest": source_package.digest if source_package else None,
                            "newly_observed": True,
                            "classification": "missing",
                        }
                    )
                continue
            variants.setdefault(package.digest, []).append(profile_name)
            differs = source_package is None or package.digest != source_package.digest
            newly_observed = package.digest != old_digest
            if differs:
                candidates.append(
                    {
                        "skill": skill_name,
                        "profile": profile_name,
                        "profile_digest": package.digest,
                        "source_digest": source_package.digest if source_package else None,
                        "newly_observed": newly_observed,
                        "classification": "profile-only" if source_package is None else "divergent",
                    }
                )
        if len(variants) > 1:
            for candidate in candidates:
                if candidate["skill"] == skill_name:
                    candidate["multiple_profile_variants"] = True

    observed_at = datetime.now(timezone.utc).isoformat()
    snapshot = {
        "initialized_at": prior.get("initialized_at") or observed_at,
        "observed_at": observed_at,
        "repo": str(repo),
        "profile_roots": profile_roots,
        "source": {name: asdict(package) for name, package in sorted(source.items())},
        "profiles": {
            profile: {name: asdict(package) for name, package in sorted(packages.items())}
            for profile, packages in sorted(profiles.items())
        },
        "candidates": candidates,
        "errors": errors,
    }

    if args.initialize:
        if not args.state:
            parser.error("--initialize requires --state")
        if not args.canonical_remote_url:
            parser.error("--initialize requires --canonical-remote-url")
        if args.state.expanduser().exists() or prior:
            raise SystemExit("refusing to replace an existing inventory with --initialize")
        if profile_roots != canonical_profile_roots():
            raise SystemExit("refusing to initialize without the exact canonical five profile roots")
        if errors:
            raise SystemExit("refusing to initialize an inventory with discovery errors")
        try:
            default_branch, _ = verify_origin_identity(repo, args.canonical_remote_url)
        except ValueError as exc:
            raise SystemExit(f"refusing to initialize: {exc}") from exc
        snapshot["record_mode"] = "initial_enrollment"
        snapshot["canonical_remote_url"] = normalize_remote_url(args.canonical_remote_url)
        snapshot["default_branch"] = default_branch
        atomic_json_write(args.state.expanduser(), snapshot)

    if args.record:
        if not args.state:
            parser.error("--record requires --state")
        if not args.verified_remote_default_sha:
            parser.error("--record requires --verified-remote-default-sha")
        if not args.canonical_remote_url:
            parser.error("--record requires --canonical-remote-url")
        if not args.state.expanduser().exists() or not prior.get("initialized_at"):
            raise SystemExit("refusing to record before explicit --initialize enrollment")
        enrolled_remote = prior.get("canonical_remote_url")
        enrolled_roots = prior.get("profile_roots")
        enrolled_branch = prior.get("default_branch")
        if (
            not isinstance(enrolled_remote, str)
            or not isinstance(enrolled_roots, dict)
            or not isinstance(enrolled_branch, str)
        ):
            raise SystemExit("refusing to record state without enrolled remote/profile trust anchors")
        if normalize_remote_url(args.canonical_remote_url) != enrolled_remote:
            raise SystemExit("refusing to change the enrolled canonical remote during --record")
        if (
            profile_roots != canonical_profile_roots()
            or set(profiles) != set(prior_profiles)
            or profile_roots != enrolled_roots
        ):
            raise SystemExit("refusing to record an incomplete or substituted configured profile set")
        if errors:
            raise SystemExit("refusing to record an inventory with discovery errors")
        try:
            default_branch, normalized_remote = verify_remote_default_record_source(
                repo,
                args.verified_remote_default_sha,
                args.canonical_remote_url,
            )
        except ValueError as exc:
            raise SystemExit(f"refusing to record: {exc}") from exc
        if default_branch != enrolled_branch:
            raise SystemExit("refusing to change the enrolled symbolic default branch during --record")
        unresolved = [
            candidate
            for candidate in candidates
            if candidate["classification"] in {"divergent", "missing"}
            or candidate["newly_observed"]
        ]
        if unresolved:
            names = ", ".join(
                sorted(f"{item['profile']}:{item['skill']}" for item in unresolved)
            )
            raise SystemExit(
                "refusing to baseline unpublished or unrolled candidates: "
                f"{names}; use selective merged-entry advancement"
            )
        snapshot["record_mode"] = "verified_remote_default_merge"
        snapshot["verified_remote_default_sha"] = args.verified_remote_default_sha
        snapshot["canonical_remote_url"] = normalized_remote
        snapshot["default_branch"] = default_branch
        atomic_json_write(args.state.expanduser(), snapshot)

    json.dump(snapshot, fp=sys.stdout, indent=2, sort_keys=True)
    print()
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
