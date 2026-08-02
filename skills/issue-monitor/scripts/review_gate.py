#!/usr/bin/env python3
"""Atomic review-readiness, deduplication, recovery, and metrics gate.

Python 3.9+ compatible. The state file belongs outside every candidate
repository. It is operational metadata, never an approval by itself; callers
must still verify the durable review report and immutable candidate through
their tracker/provider.
"""

import argparse
import errno
import hashlib
import json
import math
import os
import re
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

if os.name == "nt":
    import msvcrt
else:
    import fcntl


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


class GateError(ValueError):
    """A fail-closed review-gate validation error."""


PRE_REVIEW_SUMMARY_FIELDS = {
    "schema_version",
    "lineage",
    "governing_request",
    "scope",
    "acceptance_criteria",
    "intended_approach",
    "change_inventory",
    "risk_assumptions",
    "hard_to_reverse_surfaces",
    "known_tradeoffs",
    "open_questions",
    "verification_matrix",
    "inherited_findings",
}
PRE_REVIEW_SUMMARY_LIST_FIELDS = PRE_REVIEW_SUMMARY_FIELDS - {
    "schema_version",
    "lineage",
    "scope",
}
MAX_PRE_REVIEW_SUMMARY_BYTES = 65536


def _validate_pre_review_summary(payload: Dict[str, Any]) -> str:
    artifact = payload.get("pre_review_summary_artifact")
    if not isinstance(artifact, str) or not artifact:
        raise GateError("pre_review_summary_artifact must be exact canonical JSON text")
    try:
        encoded = artifact.encode("utf-8")
    except UnicodeEncodeError:
        raise GateError("pre_review_summary_artifact must be valid UTF-8 text")
    if len(encoded) > MAX_PRE_REVIEW_SUMMARY_BYTES:
        raise GateError("pre_review_summary_artifact exceeds 65536 UTF-8 bytes")
    try:
        summary = json.loads(artifact)
    except (TypeError, ValueError):
        raise GateError("pre_review_summary_artifact must be valid JSON")
    if not isinstance(summary, dict) or set(summary) != PRE_REVIEW_SUMMARY_FIELDS:
        raise GateError("pre_review_summary_artifact has an invalid schema")
    if summary.get("schema_version") != 1:
        raise GateError("pre_review_summary_artifact schema_version must be 1")
    if summary.get("lineage") != payload.get("lineage"):
        raise GateError("pre_review_summary_artifact lineage does not match readiness")
    scope = summary.get("scope")
    if not isinstance(scope, dict) or set(scope) != {"in", "out"}:
        raise GateError("pre_review_summary_artifact scope has an invalid schema")
    for field, value in (("scope.in", scope["in"]), ("scope.out", scope["out"])):
        if not isinstance(value, list) or not all(
            isinstance(item, str) and item.strip() for item in value
        ):
            raise GateError(
                "pre_review_summary_artifact {0} must be a string list".format(field)
            )
    if not scope["in"]:
        raise GateError("pre_review_summary_artifact scope.in must not be empty")
    for field in PRE_REVIEW_SUMMARY_LIST_FIELDS:
        value = summary.get(field)
        if not isinstance(value, list) or not value or not all(
            isinstance(item, str) and item.strip() for item in value
        ):
            raise GateError(
                "pre_review_summary_artifact {0} must be a non-empty string list".format(
                    field
                )
            )
    canonical = json.dumps(
        summary, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ) + "\n"
    if artifact != canonical:
        raise GateError(
            "pre_review_summary_artifact must be compact sorted-key UTF-8 JSON "
            "with exactly one trailing LF"
        )
    actual_digest = hashlib.sha256(encoded).hexdigest()
    if actual_digest != payload.get("pre_review_summary_digest"):
        raise GateError(
            "pre_review_summary_digest does not match pre_review_summary_artifact bytes"
        )
    return artifact


def _validate_metric(name: str, value: Any, *, integer: bool = False) -> None:
    if value is None:
        return
    expected_type = int if integer else (int, float)
    if isinstance(value, bool) or not isinstance(value, expected_type):
        raise GateError("{0} must be a non-negative finite number".format(name))
    if (isinstance(value, float) and not math.isfinite(value)) or value < 0:
        raise GateError("{0} must be a non-negative finite number".format(name))


@dataclass(frozen=True)
class ReviewIdentity:
    repository: str
    pr: int
    lineage: str
    round: int
    candidate_sha: str
    base_sha: str
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
        if not SHA_RE.fullmatch(self.base_sha):
            raise GateError("base_sha must be a lowercase 40-character SHA")
        if not re.fullmatch(r"[a-z][a-z0-9_-]{2,63}", self.review_bundle):
            raise GateError("invalid review_bundle")

    @property
    def generation_payload(self) -> Dict[str, Any]:
        return {
            "repository": self.repository,
            "pr": self.pr,
            "lineage": self.lineage,
            "round": self.round,
            "candidate_sha": self.candidate_sha,
            "base_sha": self.base_sha,
        }

    @property
    def generation_key(self) -> str:
        raw = json.dumps(self.generation_payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @property
    def lineage_payload(self) -> Dict[str, Any]:
        return {"repository": self.repository, "pr": self.pr, "lineage": self.lineage}


def readiness_digest(payload: Dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def validate_readiness(
    payload: Dict[str, Any], expected_sha: str, expected_base_sha: str
) -> str:
    if not isinstance(payload, dict):
        raise GateError("readiness receipt must be an object")
    if payload.get("schema_version") != 1:
        raise GateError("unsupported readiness schema_version")
    if not SHA_RE.fullmatch(expected_sha):
        raise GateError("expected_sha must be a lowercase 40-character SHA")
    if not SHA_RE.fullmatch(expected_base_sha):
        raise GateError("expected_base_sha must be a lowercase 40-character SHA")
    if payload.get("candidate_sha") != expected_sha:
        raise GateError("readiness candidate_sha does not match expected_sha")
    if payload.get("base_sha") != expected_base_sha:
        raise GateError("readiness base_sha does not match expected_base_sha")
    if not re.fullmatch(
        r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", str(payload.get("repository", ""))
    ):
        raise GateError("readiness repository is invalid")
    if not isinstance(payload.get("pr"), int) or payload["pr"] < 1:
        raise GateError("readiness pr is invalid")
    if not payload.get("lineage") or len(str(payload["lineage"])) > 160:
        raise GateError("readiness lineage is invalid")
    if payload.get("round") not in {1, 2, 3}:
        raise GateError("readiness round must be 1, 2, or 3")
    if not DIGEST_RE.fullmatch(str(payload.get("pre_review_summary_digest", ""))):
        raise GateError("pre_review_summary_digest must be a lowercase SHA-256 digest")
    _validate_pre_review_summary(payload)
    prior_context = payload.get("prior_round_context")
    if payload["round"] == 1:
        if prior_context is not None:
            raise GateError("Round 1 prior_round_context must be null")
    else:
        if not isinstance(prior_context, dict):
            raise GateError("prior_round_context is required for Round 2 and Round 3")
        required_prior_fields = {
            "round",
            "candidate_sha",
            "base_sha",
            "report_digests",
            "report_history",
            "pre_review_summary_digest",
            "finding_disposition_digest",
            "remediation_change_map_digest",
        }
        if set(prior_context) != required_prior_fields:
            missing_prior = sorted(required_prior_fields - set(prior_context))
            extra_prior = sorted(set(prior_context) - required_prior_fields)
            if missing_prior:
                raise GateError(
                    "prior_round_context missing " + ", ".join(missing_prior)
                )
            raise GateError(
                "prior_round_context has unknown fields: " + ", ".join(extra_prior)
            )
        if prior_context.get("round") != payload["round"] - 1:
            raise GateError("prior_round_context round must be the immediately prior round")
        for field in ("candidate_sha", "base_sha"):
            if not SHA_RE.fullmatch(str(prior_context.get(field, ""))):
                raise GateError("prior_round_context {0} is invalid".format(field))
        report_digests = prior_context.get("report_digests")
        if not isinstance(report_digests, dict) or not report_digests:
            raise GateError("prior_round_context report_digests must be non-empty")
        for bundle, digest in report_digests.items():
            if not re.fullmatch(r"[a-z][a-z0-9_-]{2,63}", str(bundle)):
                raise GateError("prior_round_context report bundle is invalid")
            if not DIGEST_RE.fullmatch(str(digest)):
                raise GateError("prior_round_context report digest is invalid")
        report_history = prior_context.get("report_history")
        if not isinstance(report_history, list) or len(report_history) != payload["round"] - 1:
            raise GateError(
                "prior_round_context report_history must contain every prior round"
            )
        for expected_round, generation in enumerate(report_history, start=1):
            if not isinstance(generation, dict) or set(generation) != {
                "round",
                "candidate_sha",
                "base_sha",
                "report_digests",
            }:
                raise GateError("prior_round_context report_history entry is invalid")
            if generation.get("round") != expected_round:
                raise GateError("prior_round_context report_history rounds must be contiguous")
            for field in ("candidate_sha", "base_sha"):
                if not SHA_RE.fullmatch(str(generation.get(field, ""))):
                    raise GateError(
                        "prior_round_context report_history {0} is invalid".format(field)
                    )
            generation_reports = generation.get("report_digests")
            if not isinstance(generation_reports, dict) or not generation_reports:
                raise GateError(
                    "prior_round_context report_history report_digests must be non-empty"
                )
            for bundle, digest in generation_reports.items():
                if not re.fullmatch(r"[a-z][a-z0-9_-]{2,63}", str(bundle)):
                    raise GateError(
                        "prior_round_context report_history report bundle is invalid"
                    )
                if not DIGEST_RE.fullmatch(str(digest)):
                    raise GateError(
                        "prior_round_context report_history report digest is invalid"
                    )
        latest_history = report_history[-1]
        for field in ("round", "candidate_sha", "base_sha", "report_digests"):
            if prior_context.get(field) != latest_history.get(field):
                raise GateError(
                    "prior_round_context immediate {0} must match report_history".format(field)
                )
        for field in (
            "pre_review_summary_digest",
            "finding_disposition_digest",
            "remediation_change_map_digest",
        ):
            if not DIGEST_RE.fullmatch(str(prior_context.get(field, ""))):
                raise GateError("prior_round_context {0} is invalid".format(field))
        if prior_context["pre_review_summary_digest"] != payload["pre_review_summary_digest"]:
            raise GateError(
                "prior_round_context pre_review_summary_digest does not match readiness"
            )
    bundles = payload.get("review_bundles")
    if not isinstance(bundles, list) or not bundles or len(bundles) != len(set(bundles)):
        raise GateError("readiness review_bundles must be a non-empty unique list")
    if any(
        not re.fullmatch(r"[a-z][a-z0-9_-]{2,63}", str(bundle))
        for bundle in bundles
    ):
        raise GateError("readiness review bundle is invalid")
    if payload.get("dirty_worktree") is not False:
        raise GateError("dirty_worktree must be false")
    if "untracked_scope" not in payload or payload["untracked_scope"] != []:
        raise GateError("untracked_scope must be empty")
    checks = payload.get("checks")
    if not isinstance(checks, dict):
        raise GateError("readiness checks must be an object")
    missing = sorted(REQUIRED_CHECKS - set(checks))
    if missing:
        raise GateError("missing readiness checks: " + ", ".join(missing))
    for name in sorted(REQUIRED_CHECKS):
        allowed = {"PASS", "PASS_OR_NOT_REQUIRED"} if name == "github_checks" else {"PASS"}
        if checks.get(name) not in allowed:
            raise GateError("readiness check {0} is not PASS".format(name))
    return readiness_digest(payload)


class _FileMutex:
    """Portable process-owned advisory lock; stale file contents are not authority."""

    def __init__(self, path: Path, timeout: float = 5.0) -> None:
        self.path = path
        self.timeout = timeout
        self.fd = None  # type: Optional[int]

    def _try_lock(self) -> None:
        if self.fd is None:
            raise GateError("lock file is not open")
        if os.name == "nt":
            os.lseek(self.fd, 0, os.SEEK_SET)
            msvcrt.locking(self.fd, msvcrt.LK_NBLCK, 1)
        else:
            fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def __enter__(self) -> "_FileMutex":
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.fd = os.open(self.path, os.O_CREAT | os.O_RDWR, 0o600)
        if os.name == "nt" and os.fstat(self.fd).st_size == 0:
            os.write(self.fd, b"\0")
            os.fsync(self.fd)
        deadline = time.monotonic() + self.timeout
        while True:
            try:
                self._try_lock()
                break
            except (BlockingIOError, OSError) as exc:
                if isinstance(exc, OSError) and exc.errno not in {
                    errno.EACCES,
                    errno.EAGAIN,
                    errno.EDEADLK,
                }:
                    os.close(self.fd)
                    self.fd = None
                    raise
                if time.monotonic() >= deadline:
                    os.close(self.fd)
                    self.fd = None
                    raise GateError("review index lock is busy: {0}".format(self.path))
                time.sleep(0.05)
        metadata = json.dumps({"pid": os.getpid(), "acquired_at": time.time()}) + "\n"
        os.lseek(self.fd, 0, os.SEEK_SET)
        os.ftruncate(self.fd, 0)
        os.write(self.fd, metadata.encode("ascii"))
        os.fsync(self.fd)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self.fd is None:
            return
        try:
            if os.name == "nt":
                os.lseek(self.fd, 0, os.SEEK_SET)
                msvcrt.locking(self.fd, msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(self.fd, fcntl.LOCK_UN)
        finally:
            os.close(self.fd)
            self.fd = None


class ReviewGateStore:
    def __init__(self, path: Union[Path, str]) -> None:
        self.path = Path(path).expanduser().resolve()
        self.lock_path = self.path.with_suffix(self.path.suffix + ".lock")

    @staticmethod
    def _empty() -> Dict[str, Any]:
        return {
            "schema_version": 2,
            "candidates": {},
            "counters": {
                "duplicate_dispatches_suppressed": 0,
                "narrow_recoveries_started": 0,
            },
        }

    def _read(self) -> Dict[str, Any]:
        if not self.path.exists():
            return self._empty()
        value = json.loads(self.path.read_text(encoding="utf-8"))
        if value.get("schema_version") != 2:
            raise GateError("unsupported review index schema")
        if not isinstance(value.get("candidates"), dict):
            raise GateError("invalid review index candidates")
        value.setdefault("counters", {})
        value["counters"].setdefault("duplicate_dispatches_suppressed", 0)
        value["counters"].setdefault("narrow_recoveries_started", 0)
        return value

    def _write(self, value: Dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(
            self.path.suffix + ".tmp.{0}.{1}".format(os.getpid(), time.time_ns())
        )
        try:
            with tmp.open("w", encoding="utf-8") as handle:
                handle.write(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.chmod(tmp, 0o600)
            os.replace(tmp, self.path)
            if os.name != "nt":
                directory_fd = os.open(str(self.path.parent), os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
        finally:
            try:
                tmp.unlink()
            except FileNotFoundError:
                pass

    @staticmethod
    def _same_lineage(candidate: Dict[str, Any], identity: ReviewIdentity) -> bool:
        prior = candidate.get("identity", {})
        return all(
            prior.get(field) == getattr(identity, field)
            for field in ("repository", "pr", "lineage")
        )

    def _locate_candidate(
        self, state: Dict[str, Any], identity: ReviewIdentity
    ) -> Optional[Dict[str, Any]]:
        return state["candidates"].get(identity.generation_key)

    @staticmethod
    def _manifest_is_terminal(candidate: Dict[str, Any]) -> bool:
        for bundle_name in candidate.get("review_bundles", []):
            attempts = candidate.get("bundles", {}).get(bundle_name, {}).get("attempts", [])
            if not attempts or attempts[-1].get("status") not in FINAL_VERDICTS:
                return False
        return bool(candidate.get("review_bundles"))

    @staticmethod
    def _validate_prior_context(
        lineage: List[Dict[str, Any]],
        highest: Dict[str, Any],
        readiness: Dict[str, Any],
    ) -> str:
        context = readiness.get("prior_round_context")
        if not isinstance(context, dict):
            raise GateError("prior_round_context is required for a changed candidate")
        expected_summary_digest = highest.get("pre_review_summary_digest")
        expected_summary_artifact = highest.get("pre_review_summary_artifact")
        if not DIGEST_RE.fullmatch(str(expected_summary_digest or "")):
            raise GateError("prior generation pre_review_summary_digest is missing or invalid")
        if not isinstance(expected_summary_artifact, str) or not expected_summary_artifact:
            raise GateError("prior generation pre_review_summary_artifact is missing")
        if readiness.get("pre_review_summary_digest") != expected_summary_digest:
            raise GateError("pre_review_summary_digest changed within the review lineage")
        if readiness.get("pre_review_summary_artifact") != expected_summary_artifact:
            raise GateError("pre_review_summary_artifact changed within the review lineage")
        if context.get("pre_review_summary_digest") != expected_summary_digest:
            raise GateError(
                "prior_round_context pre_review_summary_digest does not match the lineage"
            )
        if any(
            candidate.get("pre_review_summary_digest") != expected_summary_digest
            or candidate.get("pre_review_summary_artifact") != expected_summary_artifact
            for candidate in lineage
        ):
            raise GateError(
                "pre-review summary is inconsistent across prior generations"
            )
        prior_identity = highest.get("identity", {})
        if context.get("round") != prior_identity.get("round"):
            raise GateError("prior round does not match the terminal prior generation")
        if context.get("candidate_sha") != prior_identity.get("candidate_sha"):
            raise GateError("prior candidate_sha does not match the terminal prior generation")
        if context.get("base_sha") != prior_identity.get("base_sha"):
            raise GateError("prior base_sha does not match the terminal prior generation")

        expected_reports = {}
        for bundle_name in highest.get("review_bundles", []):
            attempts = highest.get("bundles", {}).get(bundle_name, {}).get("attempts", [])
            if not attempts or attempts[-1].get("status") not in FINAL_VERDICTS:
                raise GateError("prior generation review-bundle manifest must be terminal")
            report_digest = attempts[-1].get("report_digest")
            if not DIGEST_RE.fullmatch(str(report_digest or "")):
                raise GateError("prior terminal report digest is missing or invalid")
            expected_reports[bundle_name] = report_digest
        if context.get("report_digests") != expected_reports:
            raise GateError("prior report_digests do not match terminal prior reports")
        expected_history = []
        for candidate in sorted(
            lineage, key=lambda item: int(item.get("identity", {}).get("round", 0))
        ):
            generation_identity = candidate.get("identity", {})
            generation_reports = {}
            for bundle_name in candidate.get("review_bundles", []):
                attempts = candidate.get("bundles", {}).get(bundle_name, {}).get("attempts", [])
                if not attempts or attempts[-1].get("status") not in FINAL_VERDICTS:
                    raise GateError("prior report_history generation must be terminal")
                report_digest = attempts[-1].get("report_digest")
                if not DIGEST_RE.fullmatch(str(report_digest or "")):
                    raise GateError("prior report_history digest is missing or invalid")
                generation_reports[bundle_name] = report_digest
            expected_history.append(
                {
                    "round": generation_identity.get("round"),
                    "candidate_sha": generation_identity.get("candidate_sha"),
                    "base_sha": generation_identity.get("base_sha"),
                    "report_digests": generation_reports,
                }
            )
        if context.get("report_history") != expected_history:
            raise GateError("prior report_history does not match all terminal prior reports")
        return readiness_digest(context)

    def _validate_generation(
        self,
        state: Dict[str, Any],
        identity: ReviewIdentity,
        readiness_hash: str,
        readiness: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        lineage = [
            candidate
            for candidate in state["candidates"].values()
            if self._same_lineage(candidate, identity)
        ]
        exact = self._locate_candidate(state, identity)
        for candidate in lineage:
            prior = candidate["identity"]
            if (
                prior.get("candidate_sha") == identity.candidate_sha
                and prior.get("base_sha") == identity.base_sha
                and prior.get("round") != identity.round
            ):
                state["counters"]["duplicate_dispatches_suppressed"] += 1
                self._write(state)
                return {"started": False, "reason": "same-sha-round-reuse"}
        if exact:
            if exact.get("readiness_digest") != readiness_hash:
                raise GateError("candidate readiness manifest drift")
            return None

        if not lineage:
            if identity.round != 1:
                raise GateError("first candidate must use the next round: Round 1")
            return None

        max_round = max(int(candidate["identity"]["round"]) for candidate in lineage)
        highest = next(
            candidate for candidate in lineage
            if int(candidate["identity"]["round"]) == max_round
        )
        if not self._manifest_is_terminal(highest):
            raise GateError(
                "prior generation review-bundle manifest must be terminal before a new candidate"
            )
        if max_round >= 3:
            raise GateError("lineage exhausted after Round 3; Round 4 is prohibited")
        if identity.round < max_round:
            raise GateError("candidate round would regress lineage progression")
        if identity.round == max_round:
            raise GateError("round {0} is already bound to another candidate".format(identity.round))
        if identity.round != max_round + 1:
            raise GateError("changed candidate must use the next round: Round {0}".format(max_round + 1))
        self._validate_prior_context(lineage, highest, readiness)
        return None

    def claim(
        self,
        identity: ReviewIdentity,
        attempt_id: str,
        readiness: Dict[str, Any],
        missing_evidence: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,96}", attempt_id):
            raise GateError("invalid attempt_id")
        readiness_hash = validate_readiness(
            readiness, identity.candidate_sha, identity.base_sha
        )
        for field in ("repository", "pr", "lineage", "round"):
            if readiness.get(field) != getattr(identity, field):
                raise GateError("readiness {0} does not match review identity".format(field))
        if identity.review_bundle not in readiness["review_bundles"]:
            raise GateError("review bundle is not authorized by readiness manifest")
        requested_scope = [
            str(item).strip() for item in (missing_evidence or []) if str(item).strip()
        ]
        prior_context_hash = (
            readiness_digest(readiness["prior_round_context"])
            if identity.round > 1
            else None
        )

        with _FileMutex(self.lock_path):
            state = self._read()
            suppressed = self._validate_generation(
                state, identity, readiness_hash, readiness
            )
            if suppressed:
                return suppressed
            candidate = state["candidates"].setdefault(
                identity.generation_key,
                {
                    "identity": identity.generation_payload,
                    "readiness_digest": readiness_hash,
                    "pre_review_summary_digest": readiness["pre_review_summary_digest"],
                    "pre_review_summary_artifact": readiness[
                        "pre_review_summary_artifact"
                    ],
                    "prior_context_digest": prior_context_hash,
                    "review_bundles": list(readiness["review_bundles"]),
                    "bundles": {},
                },
            )
            if candidate.get("review_bundles") != list(readiness["review_bundles"]):
                raise GateError("candidate readiness manifest drift")
            for bundle in candidate.get("bundles", {}).values():
                if any(a.get("attempt_id") == attempt_id for a in bundle.get("attempts", [])):
                    state["counters"]["duplicate_dispatches_suppressed"] += 1
                    self._write(state)
                    return {"started": False, "reason": "attempt-id-already-used"}
            bundle_state = candidate["bundles"].setdefault(
                identity.review_bundle, {"attempts": []}
            )
            attempts = bundle_state["attempts"]
            if any(a.get("status") == "IN_PROGRESS" for a in attempts):
                state["counters"]["duplicate_dispatches_suppressed"] += 1
                self._write(state)
                return {"started": False, "reason": "attempt-active"}
            if any(
                a.get("status") in {"APPROVED", "REQUEST_CHANGES"}
                for a in attempts
            ):
                state["counters"]["duplicate_dispatches_suppressed"] += 1
                self._write(state)
                return {"started": False, "reason": "verdict-already-final"}

            scope = (
                ["full-composite-review"]
                if identity.review_bundle == "composite"
                else ["specialized-{0}-review".format(identity.review_bundle)]
            )
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
            return {
                "started": True,
                "scope": scope,
                "readiness_digest": readiness_hash,
                "pre_review_summary_digest": readiness["pre_review_summary_digest"],
                "pre_review_summary_artifact": readiness[
                    "pre_review_summary_artifact"
                ],
                "prior_context_digest": prior_context_hash,
            }

    def finalize(
        self,
        identity: ReviewIdentity,
        attempt_id: str,
        verdict: str,
        report_digest: str,
        missing_evidence: Optional[List[str]] = None,
        runtime_seconds: Optional[float] = None,
        fresh_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        verdict = verdict.upper()
        if verdict not in FINAL_VERDICTS:
            raise GateError("invalid review verdict")
        if not DIGEST_RE.fullmatch(report_digest):
            raise GateError("report_digest must be a lowercase SHA-256 digest")
        missing = [
            str(item).strip() for item in (missing_evidence or []) if str(item).strip()
        ]
        if verdict == "INCOMPLETE" and not missing:
            raise GateError("INCOMPLETE requires missing_evidence")
        if verdict != "INCOMPLETE" and missing:
            raise GateError("missing_evidence is valid only for INCOMPLETE")
        _validate_metric("runtime_seconds", runtime_seconds)
        _validate_metric("fresh_tokens", fresh_tokens, integer=True)

        with _FileMutex(self.lock_path):
            state = self._read()
            candidate = self._locate_candidate(state, identity)
            if not candidate:
                raise GateError("review candidate was never claimed")
            bundle = candidate.get("bundles", {}).get(identity.review_bundle)
            if not bundle:
                raise GateError("review bundle was never claimed")
            attempt = next(
                (a for a in bundle["attempts"] if a.get("attempt_id") == attempt_id),
                None,
            )
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

    def candidate_status(self, identity: ReviewIdentity) -> Dict[str, Any]:
        with _FileMutex(self.lock_path):
            state = self._read()
            candidate = self._locate_candidate(state, identity)
        if not candidate:
            raise GateError("review candidate was never claimed")
        statuses = {}
        for bundle_name in candidate["review_bundles"]:
            attempts = candidate.get("bundles", {}).get(bundle_name, {}).get("attempts", [])
            statuses[bundle_name] = attempts[-1]["status"] if attempts else "NOT_STARTED"
        return {
            "candidate_sha": identity.candidate_sha,
            "base_sha": identity.base_sha,
            "round": identity.round,
            "bundles": statuses,
            "complete": all(value in FINAL_VERDICTS for value in statuses.values()),
            "approved": bool(statuses) and all(value == "APPROVED" for value in statuses.values()),
        }

    def metrics(self) -> Dict[str, Any]:
        with _FileMutex(self.lock_path):
            state = self._read()
        verdicts = {name: 0 for name in sorted(FINAL_VERDICTS)}
        attempts_started = 0
        review_runtime_seconds = 0.0
        review_fresh_tokens = 0
        review_bundles = 0
        candidate_rounds = {}  # type: Dict[str, int]
        for candidate in state["candidates"].values():
            round_key = str(candidate.get("identity", {}).get("round", "unknown"))
            candidate_rounds[round_key] = candidate_rounds.get(round_key, 0) + 1
            review_bundles += len(candidate.get("bundles", {}))
            for bundle in candidate.get("bundles", {}).values():
                for attempt in bundle.get("attempts", []):
                    attempts_started += 1
                    runtime_seconds = attempt.get("runtime_seconds")
                    fresh_tokens = attempt.get("fresh_tokens")
                    _validate_metric("runtime_seconds", runtime_seconds)
                    _validate_metric("fresh_tokens", fresh_tokens, integer=True)
                    review_runtime_seconds += float(runtime_seconds or 0)
                    review_fresh_tokens += fresh_tokens or 0
                    if attempt.get("status") in verdicts:
                        verdicts[attempt["status"]] += 1
        return {
            "candidates": len(state["candidates"]),
            "review_bundles": review_bundles,
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
        base_sha=args.base_sha,
        review_bundle=args.review_bundle,
    )


def _read_json(path: str) -> Dict[str, Any]:
    return json.loads(Path(path).expanduser().resolve().read_text(encoding="utf-8"))


def _add_identity_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--state", required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--pr", required=True, type=int)
    parser.add_argument("--lineage", required=True)
    parser.add_argument("--round", required=True, type=int)
    parser.add_argument("--candidate-sha", required=True)
    parser.add_argument("--base-sha", required=True)
    parser.add_argument("--review-bundle", default="composite")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    validate = sub.add_parser("validate-readiness")
    validate.add_argument("--receipt", required=True)
    validate.add_argument("--expected-sha", required=True)
    validate.add_argument("--expected-base-sha", required=True)

    claim = sub.add_parser("claim")
    _add_identity_arguments(claim)
    claim.add_argument("--attempt-id", required=True)
    claim.add_argument("--missing-evidence", action="append", default=[])
    claim.add_argument("--readiness", required=True)

    finalize = sub.add_parser("finalize")
    _add_identity_arguments(finalize)
    finalize.add_argument("--attempt-id", required=True)
    finalize.add_argument("--missing-evidence", action="append", default=[])
    finalize.add_argument("--verdict", required=True, choices=sorted(FINAL_VERDICTS))
    finalize.add_argument("--report-digest", required=True)
    finalize.add_argument("--runtime-seconds", type=float)
    finalize.add_argument("--fresh-tokens", type=int)

    status = sub.add_parser("candidate-status")
    _add_identity_arguments(status)

    metrics = sub.add_parser("metrics")
    metrics.add_argument("--state", required=True)

    args = parser.parse_args()
    if args.command == "validate-readiness":
        result = {
            "valid": True,
            "readiness_digest": validate_readiness(
                _read_json(args.receipt), args.expected_sha, args.expected_base_sha
            ),
        }
    elif args.command == "claim":
        result = ReviewGateStore(args.state).claim(
            _identity_from_args(args),
            args.attempt_id,
            _read_json(args.readiness),
            args.missing_evidence,
        )
    elif args.command == "finalize":
        result = ReviewGateStore(args.state).finalize(
            _identity_from_args(args),
            args.attempt_id,
            args.verdict,
            args.report_digest,
            args.missing_evidence,
            args.runtime_seconds,
            args.fresh_tokens,
        )
    elif args.command == "candidate-status":
        result = ReviewGateStore(args.state).candidate_status(_identity_from_args(args))
    else:
        result = ReviewGateStore(args.state).metrics()
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
