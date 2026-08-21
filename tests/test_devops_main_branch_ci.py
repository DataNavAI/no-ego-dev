from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_PATH = ROOT / "skills" / "devops" / "SKILL.md"
EVAL_PATH = ROOT / "skills" / "devops" / "EVAL.yaml"
FIXTURE_PATH = ROOT / "skills" / "devops" / "evaldata" / "README.md"


def test_devops_requires_default_branch_ci_monitoring_and_immediate_response():
    skill = SKILL_PATH.read_text()
    lowered = skill.lower()

    required_phrases = (
        "default branch",
        "exact head sha",
        "all required workflows",
        "create or reuse one canonical github issue",
        "do not create duplicate issues",
        "failed run and job urls",
        "act immediately",
        "dedicated isolated worktree",
        "test-driven",
        "verify the replacement run",
        "do not require pr-only checks",
        "silent when healthy",
    )
    for phrase in required_phrases:
        assert phrase in lowered, f"missing default-branch CI contract: {phrase}"

    assert "latest successful run" not in lowered, (
        "A latest-success shortcut can hide a newer failed workflow or missing exact-head coverage"
    )
    assert "failure, startup_failure, cancelled, timed_out, action_required, or stale" in lowered
    assert "missing required workflow/check coverage" in lowered
    assert "requested`, `waiting`, `pending`, `queued`, and `in_progress` are pending" in lowered
    assert "10-minute missing-run grace" in lowered
    assert "60-minute maximum nonterminal runtime" in lowered
    assert "at most one bounded rerun" in lowered
    assert "never print secrets" in lowered
    assert "missing ci visibility" in lowered
    assert "existing live worker, remediation branch, or pull request" in lowered
    assert "close the issue only after exact default-branch readback" in lowered
    assert "accepts documented residual risk" not in lowered


def test_devops_eval_and_fixture_cover_broken_default_branch_ci():
    eval_data = yaml.safe_load(EVAL_PATH.read_text())
    expectations = "\n".join(eval_data["expectations"]).lower()
    fixture = FIXTURE_PATH.read_text().lower()

    for phrase in (
        "default branch",
        "exact head sha",
        "all required workflows",
        "create or reuse one canonical github issue",
        "act immediately",
        "verify the replacement run",
        "do not require pr-only checks",
    ):
        assert phrase in expectations, f"eval missing CI expectation: {phrase}"
        assert phrase in fixture, f"fixture missing CI scenario detail: {phrase}"

    assert "failed run and job urls" in fixture
    assert "do not create duplicate issues" in fixture
    assert "dedicated isolated worktree" in fixture
    assert "test-driven" in fixture
    assert "requested`, `waiting`, `pending`, `queued`, and `in_progress`" in fixture
    assert "at most one bounded rerun" in fixture
    assert "missing ci visibility" in fixture
    assert "before closing the issue" in fixture
