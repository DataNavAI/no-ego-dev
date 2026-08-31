from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_PATH = ROOT / "skills" / "project-manager" / "SKILL.md"
EVAL_PATH = ROOT / "skills" / "project-manager" / "EVAL.yaml"
FIXTURE_PATH = ROOT / "skills" / "project-manager" / "evaldata" / "README.md"


def test_project_manager_routes_product_bug_reports_issue_first_and_worker_first():
    skill = SKILL_PATH.read_text(encoding="utf-8")
    lowered = skill.lower()

    required_phrases = (
        "product bug intake: issue first, worker first",
        "exactly one canonical issue",
        "before diagnosis, code inspection, reproduction work, or implementation",
        "spawn a focused worker linked to that canonical issue",
        "the project manager coordinates and verifies; it does not diagnose or fix the bug inline",
        "dispatch blocker",
        "emergency reversible containment",
        "never replaces the canonical issue and focused-worker flow",
    )
    for phrase in required_phrases:
        assert phrase in lowered, f"missing product-bug intake contract: {phrase}"

    issue_position = lowered.index("exactly one canonical issue")
    worker_position = lowered.index("spawn a focused worker linked to that canonical issue")
    diagnosis_position = lowered.index("before diagnosis, code inspection, reproduction work, or implementation")
    assert issue_position < worker_position
    assert issue_position < diagnosis_position

    assert "silently fix inline" in lowered
    assert "tracker/pr linkage" in lowered


def test_product_bug_intake_cannot_use_direct_request_diagnostic_exception():
    skill = SKILL_PATH.read_text(encoding="utf-8")
    normalized = " ".join(skill.lower().split())
    direct_request_rules = normalized.split(
        "## direct user request issue and subagent rules", 1
    )[1].split("## progress update rules", 1)[0]

    for required in (
        "this exception never applies to user-reported product bugs",
        "canonical issue creation or reuse and focused-worker dispatch precede any diagnosis",
        "only immediate, reversible containment",
        "containment cannot include project-manager inline diagnosis or implementation",
    ):
        assert required in direct_request_rules, (
            f"direct-request exception leaves a product-bug bypass: {required}"
        )

    forbidden_contradictions = (
        "issue-first execution can be skipped only for pure conversational answers, "
        "clarifying questions, or emergency read-only diagnostics",
        "user-reported product bugs may use emergency read-only diagnostics",
        "containment may include project-manager inline diagnosis",
        "containment may include project-manager inline implementation",
    )
    for contradiction in forbidden_contradictions:
        assert contradiction not in direct_request_rules, (
            f"contradictory product-bug bypass remains: {contradiction}"
        )


def test_project_manager_eval_and_fixture_cover_direct_product_bug_intake():
    eval_data = yaml.safe_load(EVAL_PATH.read_text(encoding="utf-8"))
    expectations = "\n".join(eval_data["expectations"]).lower()
    fixture = FIXTURE_PATH.read_text(encoding="utf-8").lower()

    shared_phrases = (
        "exactly one canonical issue",
        "before diagnosis or implementation",
        "focused worker linked to that issue",
        "dispatch blocker",
        "emergency reversible containment",
    )
    for phrase in shared_phrases:
        assert phrase in expectations, f"eval missing product-bug expectation: {phrase}"
        assert phrase in fixture, f"fixture missing product-bug scenario detail: {phrase}"

    for phrase in (
        "project context",
        "reproduction/evidence",
        "user impact",
        "acceptance criteria",
        "verification requirements",
        "coordinates and verifies",
        "does not fix inline",
    ):
        assert phrase in fixture, f"fixture missing canonical issue/PM detail: {phrase}"
