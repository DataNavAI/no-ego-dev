#!/usr/bin/env python3
"""Atomic review-readiness, deduplication, recovery, and metrics gate.

The state file belongs outside every candidate repository. It is operational
metadata, never an approval by itself; callers must still verify the durable
review report and immutable candidate through their tracker/provider.
"""

import argparse
import hashlib
import json
import os
import re
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


SHA_RE = re.compile(r"^[0-9a-f]{40}$")
DIGEST_RE = re.compile(r"^[0-9a-f]{64}$")
FINAL_VERDICTS = {"APPROVED", "REQUEST_CHANGES", "INCOMPLETE"}
REQUIRED_CHECKS = {
    "static_analysis",
    "focused_tests",
    "full_tests",
    "build",
    "secret_scan",
    "github_checks",
    "self_audit",
}
PASS_VALUES = {"PASS"}


class GateError(ValueError):
    """A fail-closed review-gate validation error."""


@dataclass(frozen=True)
class ReviewIdentity:
    repository: str
    pr: int
    lineage: str
    round: int
    candidate_sha: str
    review_bundle: str = "composite"

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", self.repository):
            raise GateError("invalid repository identity")
        if not isinstance(self.pr, int) or self.pr < 1:
            raise GateError("pr must be a positive integer")
        if not self.lineage or len(self.lineage) > 160:
            raise GateError("invalid lineage")
        if self.round not in {1, 2, 3}:
            raise GateError("round must be 1, 2, or 3; Round 4 is prohibited")
        if not SHA_RE.fullmatch(self.candidate_sha):
            raise GateError("candidate_sha must be a lowercase 40-character SHA")
        if not re.fullmatch(r"[a-z][a-z0-9_-]{2,63}", self.review_bundle):
            raise GateError("invalid review_bundle")

    @property
    def key(self) -> str:
        raw = json.dumps(asdict(self), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def readiness_digest(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def validate_readiness(payload: dict[str, Any], expected_sha: str) -> str:
    if not isinstance(payload, dict):
        raise GateError("readiness receipt must be an object")
    if payload.get("schema_version") != 1:
        raise GateError("unsupported readiness schema_version")
    if not SHA_RE.fullmatch(expected_sha):
        raise GateError("expected_sha must be a lowercase 40-character SHA")
    if payload.get("candidate_sha") != expected_sha:
        raise GateError("readiness candidate_sha does not match expected_sha")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", str(payload.get("repository", ""))):
        raise GateError("readiness repository is invalid")
    if not isinstance(payload.get("pr"), int) or payload["pr"] < 1:
        raise GateError("readiness pr is invalid")
    if not payload.get("lineage") or len(str(payload["lineage"])) > 160:
        raise GateError("readiness lineage is invalid")
    if payload.get("round") not in {1, 2, 3}:
        raise GateError("readiness round must be 1, 2, or 3")
    bundles = payload.get("review_bundles")
    if not isinstance(bundles, list) or not bundles or len(bundles) != len(set(bundles)):
        raise GateError("readiness review_bundles must be a non-empty unique list")
    if any(not re.fullmatch(r"[a-z][a-z0-9_-]{2,63}", str(bundle)) for bundle in bundles):
        raise GateError("readiness review bundle is invalid")
    if not SHA_RE.fullmatch(str(payload.get("base_sha", ""))):
        raise GateError("readiness base_sha is invalid")
    if payload.get("dirty_worktree") is not False:
        raise GateError("dirty_worktree must be false")
    if payload.get("untracked_scope") not in ([], None):
        raise GateError("untracked_scope must be empty")
    checks = payload.get("checks")
    if not isinstance(checks, dict):
        raise GateError("readiness checks must be an object")
    missing = sorted(REQUIRED_CHECKS - set(checks))
    if missing:
        raise GateError("missing readiness checks: " + ", ".join(missing))
    for name in sorted(REQUIRED_CHECKS):
        allowed = PASS_VALUES | ({"PASS_OR_NOT_REQUIRED"} if name == "github_checks" else set())
        if checks.get(name) not in allowed:
            raise GateError(f"readiness check {name} is not PASS")
    return readiness_digest(payload)


class _FileMutex:
    def __init__(self, path: Path, timeout: float = 5.0) -> None:
        self.path = path
        self.timeout = timeout
        self.fd: int | None = None

    def __enter__(self) -> "_FileMutex":
        deadline = time.monotonic() + self.timeout
        while True:
            try:
                self.fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
                os.write(self.fd, f"{os.getpid()}\n".encode("ascii"))
                return self
            except FileExistsError:
                try:
                    owner = int(self.path.read_text(encoding="ascii").strip())
                    os.kill(owner, 0)
                except ProcessLookupError:
                    try:
                        self.path.unlink()
                    except FileNotFoundError:
                        pass
                    continue
                except (ValueError, OSError):
                    pass
                if time.monotonic() >= deadline:
                    raise GateError(f"review index lock is busy: {self.path}")
                time.sleep(0.05)

    def __exit__(self, exc_type, exc, tb) -> None:
        if self.fd is not None:
            os.close(self.fd)
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass


class ReviewGateStore:
    def __init__(self, path: Path | str) -> None:
        self.path = Path(path).expanduser().resolve()
        self.lock_path = self.path.with_suffix(self.path.suffix + ".lock")

    @staticmethod
    def _empty() -> dict[str, Any]:
        return {
            "schema_version": 1,
            "candidates": {},
            "counters": {
                "duplicate_dispatches_suppressed": 0,
                "narrow_recoveries_started": 0,
            },
        }

    def _read(self) -> dict[str, Any]:
        if not self.path.exists():
            return self._empty()
        value = json.loads(self.path.read_text(encoding="utf-8"))
        if value.get("schema_version") != 1:
            raise GateError("unsupported review index schema")
        if not isinstance(value.get("candidates"), dict):
            raise GateError("invalid review index candidates")
        value.setdefault("counters", {})
        value["counters"].setdefault("duplicate_dispatches_suppressed", 0)
        value["counters"].setdefault("narrow_recoveries_started", 0)
        return value

    def _write(self, value: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(self.path.suffix + f".tmp.{os.getpid()}")
        tmp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        os.chmod(tmp, 0o600)
        os.replace(tmp, self.path)

    def claim(
        self,
        identity: ReviewIdentity,
        attempt_id: str,
        readiness: dict[str, Any],
        missing_evidence: list[str] | None = None,
    ) -> dict[str, Any]:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,96}", attempt_id):
            raise GateError("invalid attempt_id")
        readiness_hash = validate_readiness(readiness, identity.candidate_sha)
        for field in ("repository", "pr", "lineage", "round"):
            if readiness.get(field) != getattr(identity, field):
                raise GateError(f"readiness {field} does not match review identity")
        if identity.review_bundle not in readiness["review_bundles"]:
            raise GateError("review bundle is not authorized by readiness manifest")
        requested_scope = [str(item).strip() for item in (missing_evidence or []) if str(item).strip()]

        with _FileMutex(self.lock_path):
            state = self._read()
            for existing in state["candidates"].values():
                prior = existing.get("identity", {})
                same_candidate = all(
                    prior.get(field) == getattr(identity, field)
                    for field in ("repository", "pr", "lineage", "candidate_sha")
                )
                if same_candidate and prior.get("round") != identity.round:
                    state["counters"]["duplicate_dispatches_suppressed"] += 1
                    self._write(state)
                    return {"started": False, "reason": "same-sha-round-reuse"}
                if same_candidate and prior.get("round") == identity.round:
                    if existing.get("readiness_digest") != readiness_hash:
                        raise GateError("candidate readiness manifest drift")
            candidate = state["candidates"].setdefault(
                identity.key,
                {
                    "identity": asdict(identity),
                    "readiness_digest": readiness_hash,
                    "review_bundles": list(readiness["review_bundles"]),
                    "attempts": [],
                },
            )
            attempts = candidate["attempts"]
            if any(a.get("attempt_id") == attempt_id for a in attempts):
                state["counters"]["duplicate_dispatches_suppressed"] += 1
                self._write(state)
                return {"started": False, "reason": "attempt-id-already-used"}
            active = next((a for a in attempts if a.get("status") == "IN_PROGRESS"), None)
            if active:
                state["counters"]["duplicate_dispatches_suppressed"] += 1
                self._write(state)
                return {"started": False, "reason": "attempt-active"}
            final = next(
                (a for a in reversed(attempts) if a.get("status") in {"APPROVED", "REQUEST_CHANGES"}),
                None,
            )
            if final:
                state["counters"]["duplicate_dispatches_suppressed"] += 1
                self._write(state)
                return {"started": False, "reason": "verdict-already-final"}

            scope: list[str] = ["full-composite-review"]
            if attempts:
                previous = attempts[-1]
                if previous.get("status") != "INCOMPLETE":
                    raise GateError("candidate has an unrecognized terminal state")
                if len(attempts) >= 2:
                    state["counters"]["duplicate_dispatches_suppressed"] += 1
                    self._write(state)
                    return {"started": False, "reason": "attempt-budget-exhausted"}
                previous_missing = previous.get("missing_evidence") or []
                if not requested_scope:
                    state["counters"]["duplicate_dispatches_suppressed"] += 1
                    self._write(state)
                    return {"started": False, "reason": "missing-recovery-scope"}
                if not set(requested_scope).issubset(set(previous_missing)):
                    raise GateError("recovery scope is not bounded by prior missing evidence")
                scope = requested_scope
                state["counters"]["narrow_recoveries_started"] += 1

            attempts.append(
                {
                    "attempt_id": attempt_id,
                    "status": "IN_PROGRESS",
                    "scope": scope,
                    "readiness_digest": readiness_hash,
                    "started_at": time.time(),
                }
            )
            self._write(state)
            return {"started": True, "scope": scope, "readiness_digest": readiness_hash}

    def finalize(
        self,
        identity: ReviewIdentity,
        attempt_id: str,
        verdict: str,
        report_digest: str,
        missing_evidence: list[str] | None = None,
        runtime_seconds: float | None = None,
        fresh_tokens: int | None = None,
    ) -> dict[str, Any]:
        verdict = verdict.upper()
        if verdict not in FINAL_VERDICTS:
            raise GateError("invalid review verdict")
        if not DIGEST_RE.fullmatch(report_digest):
            raise GateError("report_digest must be a lowercase SHA-256 digest")
        missing = [str(item).strip() for item in (missing_evidence or []) if str(item).strip()]
        if verdict == "INCOMPLETE" and not missing:
            raise GateError("INCOMPLETE requires missing_evidence")
        if verdict != "INCOMPLETE" and missing:
            raise GateError("missing_evidence is valid only for INCOMPLETE")
        if runtime_seconds is not None and runtime_seconds < 0:
            raise GateError("runtime_seconds must be non-negative")
        if fresh_tokens is not None and fresh_tokens < 0:
            raise GateError("fresh_tokens must be non-negative")

        with _FileMutex(self.lock_path):
            state = self._read()
            candidate = state["candidates"].get(identity.key)
            if not candidate:
                raise GateError("review candidate was never claimed")
            attempt = next((a for a in candidate["attempts"] if a.get("attempt_id") == attempt_id), None)
            if not attempt:
                raise GateError("review attempt was never claimed")
            if attempt.get("status") != "IN_PROGRESS":
                raise GateError("review attempt is already finalized")
            attempt.update(
                status=verdict,
                report_digest=report_digest,
                missing_evidence=missing,
                runtime_seconds=runtime_seconds,
                fresh_tokens=fresh_tokens,
                finished_at=time.time(),
            )
            self._write(state)
            return {"finalized": True, "verdict": verdict}

    def metrics(self) -> dict[str, Any]:
        with _FileMutex(self.lock_path):
            state = self._read()
        verdicts = {name: 0 for name in sorted(FINAL_VERDICTS)}
        attempts_started = 0
        review_runtime_seconds = 0.0
        review_fresh_tokens = 0
        candidate_rounds: dict[str, int] = {}
        for candidate in state["candidates"].values():
            round_key = str(candidate.get("identity", {}).get("round", "unknown"))
            candidate_rounds[round_key] = candidate_rounds.get(round_key, 0) + 1
            for attempt in candidate.get("attempts", []):
                attempts_started += 1
                review_runtime_seconds += float(attempt.get("runtime_seconds") or 0)
                review_fresh_tokens += int(attempt.get("fresh_tokens") or 0)
                if attempt.get("status") in verdicts:
                    verdicts[attempt["status"]] += 1
        return {
            "candidates": len(state["candidates"]),
            "attempts_started": attempts_started,
            "duplicate_dispatches_suppressed": state["counters"]["duplicate_dispatches_suppressed"],
            "narrow_recoveries_started": state["counters"]["narrow_recoveries_started"],
            "verdicts": verdicts,
            "review_runtime_seconds": review_runtime_seconds,
            "review_fresh_tokens": review_fresh_tokens,
            "candidate_rounds": candidate_rounds,
        }


def _identity_from_args(args: argparse.Namespace) -> ReviewIdentity:
    return ReviewIdentity(
        repository=args.repository,
        pr=args.pr,
        lineage=args.lineage,
        round=args.round,
        candidate_sha=args.candidate_sha,
        review_bundle=args.review_bundle,
    )


def _read_json(path: str) -> dict[str, Any]:
    return json.loads(Path(path).expanduser().resolve().read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    validate = sub.add_parser("validate-readiness")
    validate.add_argument("--receipt", required=True)
    validate.add_argument("--expected-sha", required=True)

    for name in ("claim", "finalize"):
        cmd = sub.add_parser(name)
        cmd.add_argument("--state", required=True)
        cmd.add_argument("--repository", required=True)
        cmd.add_argument("--pr", required=True, type=int)
        cmd.add_argument("--lineage", required=True)
        cmd.add_argument("--round", required=True, type=int)
        cmd.add_argument("--candidate-sha", required=True)
        cmd.add_argument("--review-bundle", default="composite")
        cmd.add_argument("--attempt-id", required=True)
        cmd.add_argument("--missing-evidence", action="append", default=[])
    claim = sub.choices["claim"]
    claim.add_argument("--readiness", required=True)
    finalize = sub.choices["finalize"]
    finalize.add_argument("--verdict", required=True, choices=sorted(FINAL_VERDICTS))
    finalize.add_argument("--report-digest", required=True)
    finalize.add_argument("--runtime-seconds", type=float)
    finalize.add_argument("--fresh-tokens", type=int)

    metrics = sub.add_parser("metrics")
    metrics.add_argument("--state", required=True)

    args = parser.parse_args()
    if args.command == "validate-readiness":
        result = {"valid": True, "readiness_digest": validate_readiness(_read_json(args.receipt), args.expected_sha)}
    elif args.command == "claim":
        result = ReviewGateStore(args.state).claim(
            _identity_from_args(args), args.attempt_id, _read_json(args.readiness), args.missing_evidence
        )
    elif args.command == "finalize":
        result = ReviewGateStore(args.state).finalize(
            _identity_from_args(args), args.attempt_id, args.verdict, args.report_digest,
            args.missing_evidence, args.runtime_seconds, args.fresh_tokens
        )
    else:
        result = ReviewGateStore(args.state).metrics()
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
