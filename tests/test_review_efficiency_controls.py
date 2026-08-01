from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
SCRIPT = SKILLS / "issue-monitor" / "scripts" / "review_gate.py"
SHA_A = "a" * 40
SHA_B = "b" * 40
DIGEST = "d" * 64


def load_gate():
    spec = importlib.util.spec_from_file_location("review_gate", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def readiness(sha: str = SHA_A) -> dict:
    return {
        "schema_version": 1,
        "repository": "DataNavAI/example",
        "pr": 17,
        "candidate_sha": sha,
        "base_sha": SHA_B,
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


def identity(gate, sha: str = SHA_A, round_number: int = 1):
    return gate.ReviewIdentity(
        repository="DataNavAI/example",
        pr=17,
        lineage="issue-17",
        round=round_number,
        candidate_sha=sha,
        review_bundle="composite",
    )


def test_readiness_fails_closed_before_review() -> None:
    gate = load_gate()
    payload = readiness()
    payload["checks"]["full_tests"] = "FAIL"
    with pytest.raises(gate.GateError, match="full_tests"):
        gate.validate_readiness(payload, expected_sha=SHA_A)

    payload = readiness()
    payload["dirty_worktree"] = True
    with pytest.raises(gate.GateError, match="dirty_worktree"):
        gate.validate_readiness(payload, expected_sha=SHA_A)


def test_same_sha_result_and_active_attempt_suppress_duplicate_review(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)

    first = store.claim(key, "attempt-one", readiness())
    assert first["started"] is True

    active_duplicate = store.claim(key, "attempt-two", readiness())
    assert active_duplicate == {"started": False, "reason": "attempt-active"}

    store.finalize(key, "attempt-one", "REQUEST_CHANGES", DIGEST)
    closed_duplicate = store.claim(key, "attempt-three", readiness())
    assert closed_duplicate == {"started": False, "reason": "verdict-already-final"}

    metrics = store.metrics()
    assert metrics["duplicate_dispatches_suppressed"] == 2
    assert metrics["verdicts"]["REQUEST_CHANGES"] == 1


def test_incomplete_review_allows_one_narrow_recovery_only(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)

    store.claim(key, "attempt-one", readiness())
    store.finalize(
        key,
        "attempt-one",
        "INCOMPLETE",
        DIGEST,
        missing_evidence=["migration rollback probe"],
    )

    without_scope = store.claim(key, "attempt-two", readiness())
    assert without_scope == {"started": False, "reason": "missing-recovery-scope"}

    recovery = store.claim(
        key,
        "attempt-two",
        readiness(),
        missing_evidence=["migration rollback probe"],
    )
    assert recovery["started"] is True
    assert recovery["scope"] == ["migration rollback probe"]

    store.finalize(key, "attempt-two", "INCOMPLETE", DIGEST, missing_evidence=["live rollback proof"])
    exhausted = store.claim(
        key,
        "attempt-three",
        readiness(),
        missing_evidence=["live rollback proof"],
    )
    assert exhausted == {"started": False, "reason": "attempt-budget-exhausted"}
    assert store.metrics()["narrow_recoveries_started"] == 1


def test_new_sha_is_a_new_candidate_but_round_four_is_rejected(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    old = identity(gate, SHA_A, 1)
    store.claim(old, "attempt-one", readiness(SHA_A))
    store.finalize(old, "attempt-one", "REQUEST_CHANGES", DIGEST)

    new = identity(gate, SHA_B, 2)
    assert store.claim(new, "attempt-two", readiness(SHA_B))["started"] is True

    with pytest.raises(gate.GateError, match="round"):
        identity(gate, SHA_B, 4)


def test_metrics_include_review_runtime_and_fresh_tokens(tmp_path: Path) -> None:
    gate = load_gate()
    store = gate.ReviewGateStore(tmp_path / "review-index.json")
    key = identity(gate)
    store.claim(key, "attempt-one", readiness())
    store.finalize(
        key,
        "attempt-one",
        "APPROVED",
        DIGEST,
        runtime_seconds=12.5,
        fresh_tokens=321,
    )
    metrics = store.metrics()
    assert metrics["review_runtime_seconds"] == 12.5
    assert metrics["review_fresh_tokens"] == 321
    assert metrics["candidate_rounds"]["1"] == 1


def test_orchestration_contracts_prevent_fragmented_reviews() -> None:
    required = {
        "subagent-driven-development": (
            "composite independent reviewer",
            "review-readiness receipt",
            "one reviewer per immutable candidate",
        ),
        "delegation-reliability": (
            "review-readiness receipt",
            "atomic review index",
            "same-SHA",
        ),
        "project-manager": (
            "composite review",
            "specialized reviewer",
            "review-readiness receipt",
        ),
        "issue-monitor": (
            "composite review bundle",
            "review-readiness receipt",
            "scripts/review_gate.py",
            "merge-only executor",
        ),
    }
    for skill, phrases in required.items():
        text = (SKILLS / skill / "SKILL.md").read_text(encoding="utf-8")
        for phrase in phrases:
            assert phrase in text, f"{skill} missing {phrase!r}"


def test_evals_cover_readiness_dedup_composite_and_metrics() -> None:
    for skill in (
        "subagent-driven-development",
        "delegation-reliability",
        "project-manager",
        "issue-monitor",
    ):
        data = yaml.safe_load((SKILLS / skill / "EVAL.yaml").read_text(encoding="utf-8"))
        expectations = "\n".join(data["expectations"]).lower()
        assert "readiness" in expectations
        assert "composite" in expectations
        assert "duplicate" in expectations or "deduplic" in expectations

    issue = yaml.safe_load((SKILLS / "issue-monitor" / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(issue["expectations"]).lower()
    assert "metrics" in expectations
    assert "merge-only" in expectations
