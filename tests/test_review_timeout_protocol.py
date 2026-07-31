from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"


def text(name: str) -> str:
    return (SKILLS / name / "SKILL.md").read_text(encoding="utf-8")


def test_issue_monitor_has_bounded_durable_review_protocol() -> None:
    content = text("issue-monitor")

    required = [
        "one reviewer attempt per cron run",
        "REVIEW_PENDING",
        "REQUEST_CHANGES",
        "reserve the final 20%",
        "INCOMPLETE",
        "exact-SHA CI",
        "Attach only the controller skill",
    ]
    for phrase in required:
        assert phrase in content


def test_cross_skill_timeout_rules_preserve_review_quality() -> None:
    expected = {
        "delegation-reliability": ["Cron/scheduled mode", "attempt-scoped durable sink", "final 20%"],
        "subagent-driven-development": ["Bounded review principle", "REVIEW_PENDING", "exact-SHA CI"],
        "spec-compliance-review": ["Bounded execution and report-first closure", "INCOMPLETE", "exact-SHA CI"],
        "immutable-candidate-verification": ["review kind", "suppress duplicate review dispatch"],
        "project-manager": ["Scope hook-only continuation", "dispatch at most one reviewer per run"],
    }

    for skill, phrases in expected.items():
        content = text(skill)
        for phrase in phrases:
            assert phrase in content, f"{skill} missing {phrase!r}"

    project_manager = text("project-manager")
    assert "Every correction creates a new SHA and requires fresh independent exact-SHA review before merge" in project_manager
    assert "tests or scanners never substitute for independent review of changed bytes" in project_manager

    issue_monitor = text("issue-monitor")
    assert "merge-only executor" in issue_monitor
    assert "It may not edit code, change the approval, waive checks, approve a different SHA, or broaden scope" in issue_monitor


def test_issue_monitor_eval_covers_timeout_and_duplicate_suppression() -> None:
    data = yaml.safe_load((SKILLS / "issue-monitor" / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(data["expectations"])

    assert isinstance(data["prompt"], str) and data["prompt"].strip()
    assert "not reviewed again" in expectations
    assert "at most one reviewer" in expectations
    assert "INCOMPLETE remains fail-closed" in expectations
    assert "merge-only executor" in expectations
