from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "project-manager"


def test_project_manager_maintains_repository_status_snapshot():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")

    for marker in (
        "version: 0.7.0",
        "## Repository STATUS.md Contract",
        "Every active project repository must maintain a concise living `STATUS.md` at the repository root",
        "not a replacement for issues, PRDs, roadmaps, release notes, or detailed history",
        "after every **big task** or **milestone**",
        "Do not churn the file for trivial subtasks",
        "Never carry forward stale claims or infer health from silence",
        "Update it in the same branch/PR/commit as the milestone when practical",
        "do **not** send a task/milestone-complete message until the gate passes",
        "Do not put secrets, raw logs, speculative promises, copied issue backlogs, or unverified percentages",
    ):
        assert marker in skill


def test_project_status_contract_has_complete_current_state_and_link_gate():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")

    for marker in (
        "Current objective or milestone and its objective acceptance state",
        "Recently completed big tasks/milestones with issue/PR/commit/QA/deploy links",
        "In-progress work with owner and evidence/task link",
        "Blockers, risks, and decisions needed with owner or decision owner",
        "Ordered next steps with owner, link, and verifiable completion condition",
        "Canonical links to PRD/roadmap, issue tracker, architecture/design, QA, deploy/runtime, monitoring, and runbooks",
        "## Completion-message link gate",
        "Project status: [STATUS.md](<verified user-accessible URL>)",
        "never link a stale default-branch copy",
        "state `awaiting merge`",
        "exact repo-relative `STATUS.md` path and local absolute path",
    ):
        assert marker in skill

    assert "update and commit the repository-root `STATUS.md`" in skill
    assert "notify the client with a user-accessible `STATUS.md` link" in skill


def test_project_status_template_and_eval_cover_completion_handoff():
    template_path = SKILL_DIR / "templates" / "STATUS.md"
    assert template_path.is_file()
    template = template_path.read_text(encoding="utf-8")

    for heading in (
        "# Project Status — <Project Name>",
        "## Current state",
        "## Recently completed",
        "## In progress",
        "## Blockers, risks, and decisions",
        "## Next steps",
        "## Canonical project links",
    ):
        assert heading in template

    for marker in (
        "Overall state",
        "Current objective",
        "Objective status",
        "Last updated",
        "Updated by",
        "Evidence revision",
        "complete when <verifiable condition>",
        "Never include secrets or raw logs",
    ):
        assert marker in template

    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(evaluation["expectations"])
    fixture = (SKILL_DIR / "evaldata" / "README.md").read_text(encoding="utf-8")

    for marker in (
        "repository root STATUS.md",
        "after every verified big task or milestone",
        "verified user accessible Project status link",
        "verifies the remote default branch contains the updated STATUS.md",
        "declared-kind versus URL-ref mismatched handoffs",
    ):
        assert marker in expectations

    for marker in (
        "## Scenario: Big-task and milestone status handoff",
        "update the repository-root `STATUS.md` before the final completion message",
        "`Project status:` followed by a verified user-accessible link",
        "exact pushed PR branch or commit containing it",
        "Confirm the target resolves",
        "send a blocker/progress message and keep the milestone incomplete",
        "mismatch among the declared handoff kind, URL-derived ref, target ref",
        "give both the exact repo-relative path and local absolute path",
        "inconsequential subtasks do not churn the snapshot",
    ):
        assert marker in fixture
