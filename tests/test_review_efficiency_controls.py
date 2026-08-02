from __future__ import annotations

import ast
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
SCRIPT = SKILLS / "issue-monitor" / "scripts" / "review_gate.py"
SHA_A = "a" * 40
SHA_B = "b" * 40
SHA_C = "c" * 40
SHA_D = "d" * 40
BASE_A = "e" * 40
BASE_B = "f" * 40
DIGEST = "d" * 64


def load_gate():
    spec = importlib.util.spec_from_file_location("review_gate", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def readiness(
    sha: str = SHA_A,
    round_number: int = 1,
    base_sha: str = BASE_A,
    bundles: list[str] | None = None,
    prior_round_context: dict | None = None,
) -> dict:
    return {
        "schema_version": 1,
        "repository": "DataNavAI/example",
        "pr": 17,
        "lineage": "issue-17",
        "round": round_number,
        "prior_round_context": prior_round_context,
        "review_bundles": bundles or ["composite"],
        "candidate_sha": sha,
        "base_sha": base_sha,
        "dirty_worktree": False,
        "untracked_scope": [],
        "checks": {
            "static_analysis": "PASS",
            "focused_tests": "PASS",
            "full_tests": "PASS",
            "build": "PASS",
            "secret_scan": "PASS",
            "github_checks": "PASS",
            "self_audit": "PASS",
        },
    }


def prior_context(
    round_number: int = 1,
    candidate_sha: str = SHA_A,
    base_sha: str = BASE_A,
    report_digests: dict[str, str] | None = None,
    report_history: list[dict] | None = None,
) -> dict:
    immediate_reports = report_digests or {"composite": DIGEST}
    if report_history is None:
        report_history = []
        if round_number > 1:
            report_history.append(
                {
                    "round": 1,
                    "candidate_sha": SHA_A,
                    "base_sha": BASE_A,
                    "report_digests": {"composite": DIGEST},
                }
            )
        report_history.append(
            {
                "round": round_number,
                "candidate_sha": candidate_sha,
                "base_sha": base_sha,
                "report_digests": immediate_reports,
            }
        )
    return {
        "round": round_number,
        "candidate_sha": candidate_sha,
        "base_sha": base_sha,
        "report_digests": immediate_reports,
        "report_history": report_history,
        "finding_disposition_digest": DIGEST,
        "remediation_change_map_digest": DIGEST,
    }


def identity(
    gate,
    sha: str = SHA_A,
    round_number: int = 1,
    review_bundle: str = "composite",
    base_sha: str = BASE_A,
):
    return gate.ReviewIdentity(
        repository="DataNavAI/example",
        pr=17,
        lineage="issue-17",
        round=round_number,
        candidate_sha=sha,
        base_sha=base_sha,
        review_bundle=review_bundle,
    )


def test_readiness_fails_closed_before_review() -> None:
    gate = load_gate()
    payload = readiness()
    payload["checks"]["full_tests"] = "FAIL"
    with pytest.raises(gate.GateError, match="full_tests"):
        gate.validate_readiness(payload, expected_sha=SHA_A, expected_base_sha=BASE_A)

    payload = readiness()
    payload["dirty_worktree"] = True
    with pytest.raises(gate.GateError, match="dirty_worktree"):
        gate.validate_readiness(payload, expected_sha=SHA_A, expected_base_sha=BASE_A)

    payload = readiness()
    payload["checks"]["full_tests"] = "PASS_OR_NOT_REQUIRED"
    with pytest.raises(gate.GateError, match="full_tests"):
        gate.validate_readiness(payload, expected_sha=SHA_A, expected_base_sha=BASE_A)


@pytest.mark.parametrize("untracked_scope", [pytest.param(None, id="null"), pytest.param("omitted", id="omitted")])
def test_readiness_requires_explicit_empty_untracked_scope(untracked_scope: object) -> None:
    gate = load_gate()
    payload = readiness()
    if untracked_scope == "omitted":
        del payload["untracked_scope"]
    else:
        payload["untracked_scope"] = untracked_scope

    with pytest.raises(gate.GateError, match="untracked_scope"):
        gate.validate_readiness(payload, expected_sha=SHA_A, expected_base_sha=BASE_A)


def test_readiness_rejects_stale_base_with_unchanged_head(tmp_path: Path) -> None:
    gate = load_gate()
    stale = readiness(base_sha=BASE_A)
    with pytest.raises(gate.GateError, match="base_sha"):
        gate.validate_readiness(stale, expected_sha=SHA_A, expected_base_sha=BASE_B)
    with pytest.raises(gate.GateError, match="base_sha"):
        gate.ReviewGateStore(tmp_path / "review-index.json").claim(
            identity(gate, base_sha=BASE_B), "attempt-one", stale
        )


def test_receipt_identity_and_bundle_manifest_are_enforced(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    foreign = readiness()
    foreign["repository"] = "OtherOwner/other-repo"
    with pytest.raises(gate.GateError, match="repository"):
        store.claim(identity(gate), "attempt-one", foreign)

    with pytest.raises(gate.GateError, match="review bundle"):
        store.claim(identity(gate, review_bundle="security"), "attempt-two", readiness())

    store.claim(identity(gate), "attempt-base", readiness())
    expanded = readiness(bundles=["composite", "security"])
    with pytest.raises(gate.GateError, match="manifest drift"):
        store.claim(identity(gate, review_bundle="security"), "attempt-three", expanded)


def test_predeclared_specialized_bundle_shares_one_candidate_manifest(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    manifest = readiness(bundles=["composite", "security"])
    composite = store.claim(identity(gate), "attempt-one", manifest)
    security = store.claim(identity(gate, review_bundle="security"), "attempt-two", manifest)
    assert composite["scope"] == ["full-composite-review"]
    assert security["scope"] == ["specialized-security-review"]

    state = store._read()
    assert len(state["candidates"]) == 1
    candidate = next(iter(state["candidates"].values()))
    assert set(candidate["bundles"]) == {"composite", "security"}
    metrics = store.metrics()
    assert metrics["candidates"] == 1
    assert metrics["review_bundles"] == 2
    assert metrics["candidate_rounds"] == {"1": 1}

    store.finalize(identity(gate), "attempt-one", "APPROVED", DIGEST)
    assert store.candidate_status(identity(gate))["approved"] is False
    store.finalize(identity(gate, review_bundle="security"), "attempt-two", "APPROVED", DIGEST)
    assert store.candidate_status(identity(gate))["approved"] is True


def test_same_sha_result_and_active_attempt_suppress_duplicate_review(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)

    first = store.claim(key, "attempt-one", readiness())
    assert first["started"] is True
    assert store.claim(key, "attempt-two", readiness()) == {"started": False, "reason": "attempt-active"}

    store.finalize(key, "attempt-one", "REQUEST_CHANGES", DIGEST)
    assert store.claim(key, "attempt-three", readiness()) == {
        "started": False,
        "reason": "verdict-already-final",
    }
    metrics = store.metrics()
    assert metrics["duplicate_dispatches_suppressed"] == 2
    assert metrics["verdicts"]["REQUEST_CHANGES"] == 1


def test_incomplete_review_allows_one_narrow_recovery_only(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)

    store.claim(key, "attempt-one", readiness())
    store.finalize(key, "attempt-one", "INCOMPLETE", DIGEST, missing_evidence=["migration rollback probe"])
    assert store.claim(key, "attempt-two", readiness()) == {
        "started": False,
        "reason": "missing-recovery-scope",
    }
    recovery = store.claim(
        key, "attempt-two", readiness(), missing_evidence=["migration rollback probe"]
    )
    assert recovery["scope"] == ["migration rollback probe"]
    store.finalize(key, "attempt-two", "INCOMPLETE", DIGEST, missing_evidence=["live rollback proof"])
    assert store.claim(
        key, "attempt-three", readiness(), missing_evidence=["live rollback proof"]
    ) == {"started": False, "reason": "attempt-budget-exhausted"}
    assert store.metrics()["narrow_recoveries_started"] == 1


def test_lineage_rounds_are_monotonic_unique_and_capped(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    first = identity(gate, SHA_A, 1)
    store.claim(first, "attempt-one", readiness(SHA_A, 1))
    store.finalize(first, "attempt-one", "REQUEST_CHANGES", DIGEST)

    with pytest.raises(gate.GateError, match="already bound"):
        store.claim(identity(gate, SHA_B, 1), "attempt-two", readiness(SHA_B, 1))
    with pytest.raises(gate.GateError, match="next round"):
        store.claim(
            identity(gate, SHA_B, 3),
            "attempt-three",
            readiness(
                SHA_B,
                3,
                prior_round_context=prior_context(round_number=2),
            ),
        )

    second = identity(gate, SHA_B, 2)
    assert store.claim(
        second,
        "attempt-four",
        readiness(SHA_B, 2, prior_round_context=prior_context()),
    )["started"] is True
    store.finalize(second, "attempt-four", "REQUEST_CHANGES", DIGEST)

    with pytest.raises(gate.GateError, match="already bound"):
        store.claim(
            identity(gate, SHA_C, 2),
            "attempt-five",
            readiness(SHA_C, 2, prior_round_context=prior_context()),
        )
    with pytest.raises(gate.GateError, match="regress"):
        store.claim(identity(gate, SHA_C, 1), "attempt-six", readiness(SHA_C, 1))

    third = identity(gate, SHA_C, 3)
    assert store.claim(
        third,
        "attempt-seven",
        readiness(
            SHA_C,
            3,
            prior_round_context=prior_context(
                round_number=2,
                candidate_sha=SHA_B,
            ),
        ),
    )["started"] is True
    store.finalize(third, "attempt-seven", "REQUEST_CHANGES", DIGEST)

    with pytest.raises(gate.GateError, match="Round 3"):
        store.claim(identity(gate, SHA_D, 1), "attempt-eight", readiness(SHA_D, 1))
    with pytest.raises(gate.GateError, match="round"):
        identity(gate, SHA_D, 4)


def test_next_generation_waits_for_complete_terminal_prior_manifest(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    first_manifest = readiness(bundles=["composite", "security"])
    first_composite = identity(gate)
    second = identity(gate, SHA_B, 2)
    incomplete_prior = prior_context(report_digests={"composite": DIGEST})

    store.claim(first_composite, "round-one-composite", first_manifest)
    with pytest.raises(gate.GateError, match="prior generation.*terminal"):
        store.claim(
            second,
            "round-two-active-composite",
            readiness(SHA_B, 2, prior_round_context=incomplete_prior),
        )

    store.finalize(first_composite, "round-one-composite", "REQUEST_CHANGES", DIGEST)
    with pytest.raises(gate.GateError, match="prior generation.*terminal"):
        store.claim(
            second,
            "round-two-security-not-started",
            readiness(SHA_B, 2, prior_round_context=incomplete_prior),
        )

    first_security = identity(gate, review_bundle="security")
    store.claim(first_security, "round-one-security", first_manifest)
    with pytest.raises(gate.GateError, match="prior generation.*terminal"):
        store.claim(
            second,
            "round-two-active-security",
            readiness(SHA_B, 2, prior_round_context=incomplete_prior),
        )

    store.finalize(first_security, "round-one-security", "REQUEST_CHANGES", DIGEST)
    complete_prior = prior_context(
        report_digests={"composite": DIGEST, "security": DIGEST}
    )
    assert store.claim(
        second,
        "round-two-after-terminal",
        readiness(SHA_B, 2, prior_round_context=complete_prior),
    )["started"] is True


def test_round_two_requires_complete_prior_round_context(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    first = identity(gate, SHA_A, 1)
    store.claim(first, "round-one", readiness())
    store.finalize(first, "round-one", "REQUEST_CHANGES", DIGEST)

    second = identity(gate, SHA_B, 2)
    with pytest.raises(gate.GateError, match="prior_round_context"):
        store.claim(second, "round-two-missing", readiness(SHA_B, 2))

    malformed = prior_context()
    del malformed["finding_disposition_digest"]
    with pytest.raises(gate.GateError, match="finding_disposition_digest"):
        store.claim(
            second,
            "round-two-malformed",
            readiness(SHA_B, 2, prior_round_context=malformed),
        )


def test_round_two_prior_context_matches_terminal_prior_reports(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    first = identity(gate, SHA_A, 1)
    store.claim(first, "round-one", readiness())
    store.finalize(first, "round-one", "REQUEST_CHANGES", DIGEST)

    second = identity(gate, SHA_B, 2)
    wrong_sha = prior_context(candidate_sha=SHA_C)
    with pytest.raises(gate.GateError, match="prior candidate_sha"):
        store.claim(
            second,
            "round-two-wrong-sha",
            readiness(SHA_B, 2, prior_round_context=wrong_sha),
        )

    wrong_report = prior_context(report_digests={"composite": "e" * 64})
    with pytest.raises(gate.GateError, match="prior report_digests"):
        store.claim(
            second,
            "round-two-wrong-report",
            readiness(SHA_B, 2, prior_round_context=wrong_report),
        )

    result = store.claim(
        second,
        "round-two-valid",
        readiness(SHA_B, 2, prior_round_context=prior_context()),
    )
    assert result["started"] is True
    assert result["prior_context_digest"]


def test_documented_round_two_receipt_is_accepted_end_to_end(tmp_path: Path) -> None:
    gate = load_gate()
    reference = (
        SKILLS / "issue-monitor" / "references" / "review-round-continuity.md"
    ).read_text(encoding="utf-8")
    examples = re.findall(r"```json\n(.*?)\n```", reference, re.DOTALL)
    documented = json.loads(examples[1])["prior_round_context"]

    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    first = identity(gate, SHA_A, 1, base_sha=SHA_B)
    store.claim(first, "documented-round-one", readiness(SHA_A, 1, base_sha=SHA_B))
    store.finalize(
        first,
        "documented-round-one",
        "REQUEST_CHANGES",
        "c" * 64,
    )

    second = identity(gate, SHA_C, 2, base_sha=SHA_B)
    result = store.claim(
        second,
        "documented-round-two",
        readiness(
            SHA_C,
            2,
            base_sha=SHA_B,
            prior_round_context=documented,
        ),
    )
    assert result["started"] is True
    assert result["prior_context_digest"] == gate.readiness_digest(documented)


def test_round_three_rejects_context_missing_round_one_report_history(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    digest_one = "1" * 64
    digest_two = "2" * 64

    first = identity(gate, SHA_A, 1)
    store.claim(first, "history-round-one", readiness(SHA_A, 1))
    store.finalize(first, "history-round-one", "REQUEST_CHANGES", digest_one)

    second_context = prior_context(report_digests={"composite": digest_one})
    second = identity(gate, SHA_B, 2)
    store.claim(
        second,
        "history-round-two",
        readiness(SHA_B, 2, prior_round_context=second_context),
    )
    store.finalize(second, "history-round-two", "REQUEST_CHANGES", digest_two)

    missing_round_one = prior_context(
        round_number=2,
        candidate_sha=SHA_B,
        report_digests={"composite": digest_two},
        report_history=[
            {
                "round": 2,
                "candidate_sha": SHA_B,
                "base_sha": BASE_A,
                "report_digests": {"composite": digest_two},
            }
        ],
    )
    third = identity(gate, SHA_C, 3)
    with pytest.raises(gate.GateError, match="report_history"):
        store.claim(
            third,
            "history-round-three-missing",
            readiness(SHA_C, 3, prior_round_context=missing_round_one),
        )


def test_round_three_accepts_complete_report_history(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    digest_one = "1" * 64
    digest_two = "2" * 64

    first = identity(gate, SHA_A, 1)
    store.claim(first, "complete-history-round-one", readiness(SHA_A, 1))
    store.finalize(first, "complete-history-round-one", "REQUEST_CHANGES", digest_one)

    second = identity(gate, SHA_B, 2)
    second_context = prior_context(report_digests={"composite": digest_one})
    store.claim(
        second,
        "complete-history-round-two",
        readiness(SHA_B, 2, prior_round_context=second_context),
    )
    store.finalize(second, "complete-history-round-two", "REQUEST_CHANGES", digest_two)

    complete_history = prior_context(
        round_number=2,
        candidate_sha=SHA_B,
        report_digests={"composite": digest_two},
        report_history=[
            {
                "round": 1,
                "candidate_sha": SHA_A,
                "base_sha": BASE_A,
                "report_digests": {"composite": digest_one},
            },
            {
                "round": 2,
                "candidate_sha": SHA_B,
                "base_sha": BASE_A,
                "report_digests": {"composite": digest_two},
            },
        ],
    )
    third = identity(gate, SHA_C, 3)
    result = store.claim(
        third,
        "complete-history-round-three",
        readiness(SHA_C, 3, prior_round_context=complete_history),
    )
    assert result["started"] is True
    assert result["prior_context_digest"] == gate.readiness_digest(complete_history)


def test_round_three_rejects_wrong_round_one_report_digest(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    digest_one = "1" * 64
    digest_two = "2" * 64

    first = identity(gate, SHA_A, 1)
    store.claim(first, "wrong-history-round-one", readiness(SHA_A, 1))
    store.finalize(first, "wrong-history-round-one", "REQUEST_CHANGES", digest_one)

    second = identity(gate, SHA_B, 2)
    store.claim(
        second,
        "wrong-history-round-two",
        readiness(
            SHA_B,
            2,
            prior_round_context=prior_context(
                report_digests={"composite": digest_one}
            ),
        ),
    )
    store.finalize(second, "wrong-history-round-two", "REQUEST_CHANGES", digest_two)

    wrong_history = prior_context(
        round_number=2,
        candidate_sha=SHA_B,
        report_digests={"composite": digest_two},
        report_history=[
            {
                "round": 1,
                "candidate_sha": SHA_A,
                "base_sha": BASE_A,
                "report_digests": {"composite": "f" * 64},
            },
            {
                "round": 2,
                "candidate_sha": SHA_B,
                "base_sha": BASE_A,
                "report_digests": {"composite": digest_two},
            },
        ],
    )
    third = identity(gate, SHA_C, 3)
    with pytest.raises(gate.GateError, match="report_history"):
        store.claim(
            third,
            "wrong-history-round-three",
            readiness(SHA_C, 3, prior_round_context=wrong_history),
        )


def test_same_sha_cannot_be_renamed_as_a_new_round(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    store.claim(identity(gate), "attempt-one", readiness())
    changed_round = readiness(SHA_A, 2, prior_round_context=prior_context())
    assert store.claim(identity(gate, SHA_A, 2), "attempt-two", changed_round) == {
        "started": False,
        "reason": "same-sha-round-reuse",
    }


def test_metrics_include_review_runtime_and_fresh_tokens(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)
    store.claim(key, "attempt-one", readiness())
    store.finalize(key, "attempt-one", "APPROVED", DIGEST, runtime_seconds=12.5, fresh_tokens=321)
    metrics = store.metrics()
    assert metrics["review_runtime_seconds"] == 12.5
    assert metrics["review_fresh_tokens"] == 321
    assert metrics["candidate_rounds"]["1"] == 1


@pytest.mark.parametrize(
    ("runtime_seconds", "fresh_tokens"),
    [
        (float("nan"), 1),
        (float("inf"), 1),
        (float("-inf"), 1),
        (True, 1),
        (1.0, float("nan")),
        (1.0, float("inf")),
        (1.0, True),
    ],
)
def test_finalize_rejects_non_finite_and_boolean_metrics(
    tmp_path: Path, runtime_seconds: object, fresh_tokens: object
) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)
    store.claim(key, "attempt-one", readiness())

    with pytest.raises(gate.GateError, match="runtime_seconds|fresh_tokens"):
        store.finalize(
            key,
            "attempt-one",
            "APPROVED",
            DIGEST,
            runtime_seconds=runtime_seconds,
            fresh_tokens=fresh_tokens,
        )


@pytest.mark.parametrize("field,value", [("runtime_seconds", float("nan")), ("fresh_tokens", True)])
def test_metrics_reject_invalid_persisted_values(tmp_path: Path, field: str, value: object) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)
    store.claim(key, "attempt-one", readiness())
    state = store._read()
    attempt = next(iter(state["candidates"].values()))["bundles"]["composite"]["attempts"][0]
    attempt[field] = value
    store.path.write_text(json.dumps(state), encoding="utf-8")

    with pytest.raises(gate.GateError, match=field):
        store.metrics()


def test_review_index_serialization_rejects_non_standard_json(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")

    with pytest.raises(ValueError, match="JSON compliant"):
        store._write({"bad_metric": float("nan")})
    assert not store.path.exists()


def test_kernel_lock_accepts_empty_and_malformed_persistent_files(tmp_path: Path) -> None:
    gate = load_gate()
    lock = tmp_path / "review-index.json.lock"
    for contents in ("", "not-a-pid\n", "99999999\n"):
        lock.write_text(contents, encoding="ascii")
        with gate._FileMutex(lock, timeout=0.1):
            assert lock.exists()


def test_cross_process_claim_is_atomic(tmp_path: Path) -> None:
    state_path = tmp_path / "review-index.json"
    receipt_path = tmp_path / "readiness.json"
    receipt_path.write_text(json.dumps(readiness()), encoding="utf-8")
    common = [
        sys.executable,
        str(SCRIPT),
        "claim",
        "--state",
        str(state_path),
        "--repository",
        "DataNavAI/example",
        "--pr",
        "17",
        "--lineage",
        "issue-17",
        "--round",
        "1",
        "--candidate-sha",
        SHA_A,
        "--base-sha",
        BASE_A,
        "--review-bundle",
        "composite",
        "--readiness",
        str(receipt_path),
    ]
    children = [
        subprocess.Popen(
            common + ["--attempt-id", f"atomic-attempt-{index}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        for index in range(2)
    ]
    results = []
    for child in children:
        stdout, stderr = child.communicate(timeout=10)
        assert child.returncode == 0, stderr
        results.append(json.loads(stdout))
    assert sum(bool(result["started"]) for result in results) == 1
    assert {result.get("reason") for result in results if not result["started"]} == {
        "attempt-active"
    }


def test_process_crash_releases_kernel_lock(tmp_path: Path) -> None:
    gate = load_gate()
    state_path = tmp_path / "review-index.json"
    lock_path = state_path.with_suffix(".json.lock")
    helper = """
import importlib.util, pathlib, sys, time
spec = importlib.util.spec_from_file_location('crash_gate', sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
with module._FileMutex(pathlib.Path(sys.argv[2]), timeout=2):
    print('LOCKED', flush=True)
    time.sleep(60)
"""
    child = subprocess.Popen(
        [sys.executable, "-c", helper, str(SCRIPT), str(lock_path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    assert child.stdout is not None
    assert child.stdout.readline().strip() == "LOCKED"
    child.kill()
    child.wait(timeout=5)
    assert gate.ReviewGateStore(state_path).claim(
        identity(gate), "post-crash-attempt", readiness()
    )["started"]


def test_state_publication_fsyncs_file_and_directory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    gate = load_gate()
    calls: list[int] = []
    real_fsync = os.fsync

    def recording_fsync(fd: int) -> None:
        calls.append(fd)
        real_fsync(fd)

    monkeypatch.setattr(gate.os, "fsync", recording_fsync)
    gate.ReviewGateStore(tmp_path / "review-index.json").claim(
        identity(gate), "attempt-one", readiness()
    )
    assert len(calls) >= 2


def test_packaged_gate_is_python39_annotation_compatible_and_executable() -> None:
    tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    annotation_unions = []
    for node in ast.walk(tree):
        annotation = None
        if isinstance(node, ast.arg):
            annotation = node.annotation
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            annotation = node.returns
        elif isinstance(node, ast.AnnAssign):
            annotation = node.annotation
        if annotation and any(
            isinstance(item, ast.BinOp) and isinstance(item.op, ast.BitOr)
            for item in ast.walk(annotation)
        ):
            annotation_unions.append(node)
    assert not annotation_unions, "runtime-evaluated PEP 604 annotations break Python 3.9"
    result = subprocess.run([sys.executable, str(SCRIPT), "--help"], text=True, capture_output=True)
    assert result.returncode == 0, result.stderr
    assert "Python 3.9+" in SCRIPT.read_text(encoding="utf-8")


def test_orchestration_contracts_prevent_fragmented_reviews() -> None:
    required = {
        "subagent-driven-development": (
            "composite independent reviewer",
            "review-readiness receipt",
            "one reviewer per immutable candidate",
            "complete review-bundle manifest",
            "prior generation",
        ),
        "delegation-reliability": (
            "review-readiness receipt", "atomic review index", "same-bundle", "prior generation"
        ),
        "project-manager": (
            "composite review", "specialized reviewer", "review-readiness receipt", "prior generation"
        ),
        "coder": ("composite independent review", "review-readiness receipt", "prior generation"),
        "immutable-candidate-verification": ("composite independent", "prior generation"),
        "issue-monitor": (
            "composite review bundle",
            "review-readiness receipt",
            "scripts/review_gate.py",
            "merge-only executor",
            "prior generation",
        ),
    }
    for skill, phrases in required.items():
        text = (SKILLS / skill / "SKILL.md").read_text(encoding="utf-8")
        for phrase in phrases:
            assert phrase in text, f"{skill} missing {phrase!r}"

    subagent = (SKILLS / "subagent-driven-development" / "SKILL.md").read_text(encoding="utf-8")
    assert "### 4. Specification Review" not in subagent
    assert "### 5. Quality Review" not in subagent
    assert "Two independent read-only reviewers may run in parallel" not in subagent
    assert "No quality approval before specification PASS" not in subagent

    stale_fragments = (
        "Only start code-quality review after contract compliance passes",
        "independent spec review, ordinary code-quality review",
        "Only after spec PASS, run a code-quality review",
        "rerun spec review before quality review",
        "repeat immutable specification and quality reviews",
        "obtain independent pre-commit review.\n9. After commit, run immutable specification and quality reviews",
        "Default to specification review before quality review",
        "implementation → exact-head specification review → code-quality review",
        "implementation → spec review → quality review",
        "obtain specification PASS and quality APPROVED",
        "Only after spec PASS proceed to a separate quality/security review",
        "rerun specification review and then quality review",
        "independent specification and quality/security reviews",
        "re-dispatch specification and quality/security reviews",
        "rerun specification then quality",
    )
    governed = (
        "subagent-driven-development",
        "coder",
        "project-manager",
        "delegation-reliability",
        "spec-compliance-review",
        "immutable-candidate-verification",
    )
    for skill in governed:
        for path in (SKILLS / skill).rglob("*.md"):
            text = path.read_text(encoding="utf-8")
            for fragment in stale_fragments:
                assert fragment not in text, f"{path} retains fragmented review instruction {fragment!r}"

    sequential_directive = re.compile(
        r"(?i)(specification then quality review|spec(?:ification)?/quality review|"
        r"spec(?:ification)? and quality(?:/security)? review|both immutable review gates|"
        r"advance to quality review|before quality review|starting spec review|"
        r"specification reviewer:|quality reviewer:|ask the spec reviewer)"
    )
    negative_guard = re.compile(r"(?i)(do not|never|no fragmented|rather than|must not)")
    for skill in governed:
        for path in (SKILLS / skill).rglob("*.md"):
            for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if sequential_directive.search(line) and not negative_guard.search(line):
                    pytest.fail(
                        f"{path}:{line_number} retains an operative fragmented-review directive: {line}"
                    )


def test_evals_cover_readiness_dedup_composite_and_metrics() -> None:
    for skill in ("subagent-driven-development", "delegation-reliability", "project-manager", "issue-monitor"):
        data = yaml.safe_load((SKILLS / skill / "EVAL.yaml").read_text(encoding="utf-8"))
        expectations = "\n".join(data["expectations"]).lower()
        assert "readiness" in expectations
        assert "composite" in expectations
        assert "duplicate" in expectations or "deduplic" in expectations

    subagent = yaml.safe_load((SKILLS / "subagent-driven-development" / "EVAL.yaml").read_text(encoding="utf-8"))
    text = (subagent["prompt"] + "\n" + "\n".join(subagent["expectations"])).lower()
    assert "specification review before code-quality review" not in text
    issue = yaml.safe_load((SKILLS / "issue-monitor" / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(issue["expectations"]).lower()
    assert "metrics" in expectations
    assert "merge-only" in expectations
