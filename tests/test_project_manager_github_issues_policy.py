from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "project-manager"


def test_project_manager_uses_github_issues_and_rejects_kanban_tracking():
    skill = (PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(evaluation["expectations"])
    fixture = (PACKAGE / "evaldata" / "README.md").read_text(encoding="utf-8")

    for marker in [
        "GitHub Issues is the only work tracker",
        "Search open and closed GitHub Issues",
        "Do **not** create or use Kanban tasks/cards",
        "ISSUE_TRACKER_BLOCKED",
        "GitHub issue number and URL",
        "GitHub-Issue Project Watchdog",
    ]:
        assert marker in skill

    assert "uses GitHub Issues as the only work tracker" in expectations
    assert "never substitutes Kanban cards" in expectations
    assert "Scenario: GitHub Issues only, with an existing Kanban board" in fixture


def test_project_manager_has_no_legacy_kanban_or_local_task_fallback():
    skill = (PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    evaluation = (PACKAGE / "EVAL.yaml").read_text(encoding="utf-8")

    forbidden = [
        "use thin idempotent Kanban cards",
        "Use Hermes Kanban only when",
        "Otherwise create a repo-local issue/task artifact",
        "resolve/read back one stable Kanban board",
        "hermes kanban --board",
        "kanban.max_in_progress",
        "leaves dependencies claims heartbeats stale reclaim workers runtime runs and issue workflow stages to Kanban",
    ]
    for text in forbidden:
        assert text not in skill
        assert text not in evaluation