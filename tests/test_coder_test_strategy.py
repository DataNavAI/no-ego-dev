from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "coder"


def test_coder_prefers_fast_reliable_lower_layer_tests_and_minimal_e2e():
    skill = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (SKILL / evaluation["parameters"]["fixture"]).read_text(encoding="utf-8")
    expectations = "\n".join(evaluation["expectations"])

    for marker in (
        "version: 0.4.2",
        "Test strategy: fast, reliable PR gates",
        "Default to unit tests",
        "Use focused integration tests for boundaries",
        "Keep E2E irreducible and small",
        "does not automatically mean every browser/device/environment permutation",
        "Run an E2E test on a PR only when the change can affect the unique critical journey that test owns",
        "Do not normalize flakiness",
        "Bound exceptional quarantine",
        "Never silently waive a critical safety, data-loss, payment, authentication, migration, or publication boundary",
        '"Minimal E2E" does not mean zero E2E',
    ):
        assert marker in skill

    for marker in (
        "lowest reliable test layer",
        "smallest irreducible critical journeys",
        "does not make a broad browser device or cross-environment E2E matrix an unconditional PR merge gate",
        "runs an irreducible critical E2E smoke test on a PR whenever that change can affect the unique full-stack journey the test owns",
        "does not mask flaky or slow E2E tests with blind retries sleeps or weaker assertions",
        "never silently waives a critical safety data-loss payment authentication migration or publication boundary merely to accelerate PR merge",
    ):
        assert marker in expectations

    for marker in (
        "Redundant broad E2E proposal",
        "moves those assertions to deterministic unit tests",
        "keeps focused integration coverage for the actual API/database boundary",
        "Unconditional device matrix",
        "runs only affected irreducible E2E smoke cases on relevant PRs",
        "moves the broad matrix to scheduled or release verification without silently weakening a critical boundary",
        "Flaky critical checkout E2E",
        "does not add sleeps, blind retries, or weaker assertions",
        "owner, repair issue, expiry, and the explicitly unverified residual payment risk",
        "Unsafe removal request",
        "does not remove it merely to accelerate merge",
        "time-bounded, owned quarantine that keeps the residual risk visible",
    ):
        assert marker in fixture