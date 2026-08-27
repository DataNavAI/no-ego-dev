from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
MANAGEMENT_SKILLS = (
    "subagent-driven-development",
    "delegation-reliability",
    "project-manager",
    "issue-monitor",
)


def skill_text(name: str) -> str:
    return (SKILLS / name / "SKILL.md").read_text(encoding="utf-8")


def eval_expectations(name: str) -> str:
    data = yaml.safe_load((SKILLS / name / "EVAL.yaml").read_text(encoding="utf-8"))
    return "\n".join(data["expectations"])


def test_delegate_examples_use_current_hermes_api() -> None:
    for name in MANAGEMENT_SKILLS:
        content = skill_text(name)
        assert not re.search(
            r"(?m)^\s*toolsets\s*=", content
        ), f"{name} still documents removed delegate_task toolsets"
        assert not re.search(
            r"(?m)^\s*background\s*=", content
        ), f"{name} still documents deprecated delegate_task background"

    subagent = skill_text("subagent-driven-development")
    assert 'role="leaf"' in subagent
    assert "returns immediately" in subagent
    assert "completion delivery" in subagent


def test_modern_batch_delegation_delivers_each_child_independently() -> None:
    subagent = skill_text("subagent-driven-development")
    reliability = skill_text("delegation-reliability")
    hook_reference = (
        SKILLS
        / "delegation-reliability"
        / "references"
        / "harness-completion-hooks.md"
    ).read_text(encoding="utf-8")
    kanban_reference = (
        SKILLS
        / "delegation-reliability"
        / "references"
        / "durable-kanban-continuation.md"
    ).read_text(encoding="utf-8")

    for content in (subagent, reliability, hook_reference, kanban_reference):
        assert "each child" in content.lower()
        assert "consolidated result only after all batch children finish" not in content
        assert "batch drains before" not in content

    assert "N independent background children" in subagent
    assert "one handle and one completion delivery per child" in reliability


def test_subagent_controller_is_compact_and_slice_oriented() -> None:
    content = skill_text("subagent-driven-development")
    assert "## Controller Contract" in content
    assert "one independently testable vertical slice" in content
    assert "Each task = 2-5 minutes" not in content
    assert "## Example Workflow" not in content
    assert len(content.splitlines()) < 400


def test_upfront_questions_are_bounded_and_execution_continues_automatically() -> None:
    for name in ("subagent-driven-development", "project-manager"):
        content = skill_text(name)
        assert "Upfront Requirement Confirmation and Automatic Continuation" in content
        assert "no more than three" in content
        assert "Do not ask for routine phase approval" in content
    subagent = skill_text("subagent-driven-development")
    assert "compact decision table" in subagent
    assert "intake blocked" in subagent


def test_timeout_preflight_prefers_precise_runtime_evidence_with_safe_fallback() -> None:
    content = skill_text("subagent-driven-development")
    section = content.split("### 1.4 Delegation Timeout Pre-flight", 1)[1].split(
        "### 1.5 Contract-Alignment Pre-flight", 1
    )[0]
    assert "process-owned startup receipt" in section
    assert "timeout-specific generation evidence" in section
    assert "config file's modification time" in section
    assert "fresh request" in section


def test_truncated_completion_requires_full_saved_summary() -> None:
    content = skill_text("delegation-reliability")
    expectations = eval_expectations("delegation-reliability")
    assert "SUMMARY TRUNCATED" in content
    assert "read the complete saved summary" in content
    assert "complete saved summary" in expectations


def test_issue_monitor_aligns_real_runtime_budget_and_tracks_live_workers() -> None:
    content = skill_text("issue-monitor")
    expectations = eval_expectations("issue-monitor")
    reference = (
        SKILLS
        / "issue-monitor"
        / "references"
        / "subagent-completion-continuation.md"
    )

    assert "Runtime-budget alignment" in content
    assert "delegation.child_timeout_seconds" in content
    assert "increase both the child and gateway budgets" in content
    assert "Completion-triggered scheduling wake" in content
    assert "active-worker lease" in content
    assert reference.is_file()
    assert "positive timeout" in reference.read_text(encoding="utf-8")
    assert "effective runtime budget" in expectations
    assert "active-worker lease" in expectations


def test_scheduled_issue_monitor_resumes_one_durable_stage_per_fresh_run() -> None:
    content = skill_text("issue-monitor")
    expectations = eval_expectations("issue-monitor")
    fixture = (SKILLS / "issue-monitor" / "evaldata" / "README.md").read_text(
        encoding="utf-8"
    )

    assert "one durable stage per tick" in content
    assert "Do not launch one monolithic orchestrator" in content
    assert "IMPLEMENT_PENDING" in content
    assert "REVIEW_PENDING" in content
    assert "MERGE_PENDING" in content
    assert "the reviewer never merges" in content.lower()
    assert "no nested delegation requirement remains" in content.lower()
    assert "normally the merge action" not in content
    assert "fresh scheduled run" in expectations
    assert "fresh scheduled run" in fixture


def test_management_evals_preserve_material_round_one_scope() -> None:
    for name in ("subagent-driven-development", "project-manager", "issue-monitor"):
        expectations = eval_expectations(name)
        assert "all independently discoverable blockers" not in expectations
        assert "material" in expectations.lower()


def test_review_dispatch_uses_a_frozen_identity_receipt_and_archive_fallback() -> None:
    content = skill_text("subagent-driven-development")
    for phrase in (
        "Before consuming reviewer capacity",
        "git write-tree",
        "staged binary-diff SHA-256",
        "git archive <sha>",
        "explicit cwd",
    ):
        assert phrase in content


def test_recovery_separates_repository_bytes_from_collaboration_metadata() -> None:
    content = skill_text("delegation-reliability")
    expectations = eval_expectations("delegation-reliability")
    assert "repository bytes and collaboration metadata" in content
    assert "do not launch another writer" in content
    assert "collaboration metadata" in expectations


def test_profile_local_round_extension_is_not_promoted() -> None:
    for name in MANAGEMENT_SKILLS:
        content = skill_text(name)
        assert "exceptional-review-round-extension" not in content


def test_completion_hooks_wake_scheduling_without_dispatching_children_directly() -> None:
    subagent = skill_text("subagent-driven-development")
    reliability = skill_text("delegation-reliability")
    issue_monitor = skill_text("issue-monitor")
    assert "Every worker completion must wake scheduling reconciliation" in subagent
    assert "The hook never dispatches a child directly" in subagent
    assert "completion-triggered scheduling wake" in reliability
    assert "Hook callbacks never dispatch children directly" in reliability
    assert "completion-triggered scheduling wake" in issue_monitor
    for name in ("subagent-driven-development", "delegation-reliability", "issue-monitor"):
        assert "completion" in eval_expectations(name).lower()
        assert "scheduling" in eval_expectations(name).lower()


def test_eval_fixtures_cover_profile_harvested_boundaries() -> None:
    required = {
        "subagent-driven-development": ("compact decision table", "git archive"),
        "delegation-reliability": ("omits a blocking middle finding", "PR/tracker metadata"),
        "project-manager": ("Bounded intake", "routine phase approval"),
        "issue-monitor": ("active-worker lease", "completion bursts"),
    }
    for name, phrases in required.items():
        fixture = (SKILLS / name / "evaldata" / "README.md").read_text(encoding="utf-8")
        for phrase in phrases:
            assert phrase in fixture


def test_project_manager_communicates_product_impact_and_product_decisions() -> None:
    content = skill_text("project-manager")
    expectations = eval_expectations("project-manager").lower()
    reference = SKILLS / "project-manager" / "references" / "product-oriented-communication.md"
    fixture = (SKILLS / "project-manager" / "evaldata" / "README.md").read_text(encoding="utf-8")

    assert "## Product-oriented user communication" in content
    assert "Lead with product impact" in content
    assert "Ask the user to decide product requirements and product tradeoffs, not implementation details" in content
    assert "Implementation choices stay with the delivery team" in content
    assert reference.is_file()
    assert "Technical-first" in reference.read_text(encoding="utf-8")
    assert "Product-first" in reference.read_text(encoding="utf-8")
    assert "never use a `Purpose:` prefix" in reference.read_text(encoding="utf-8")
    assert "Executive summary:" in reference.read_text(encoding="utf-8")
    assert "Human action needed:" in reference.read_text(encoding="utf-8")
    assert "Detailed information:" in reference.read_text(encoding="utf-8")
    assert "verify every link" in reference.read_text(encoding="utf-8")
    assert "Every user-facing communication states its purpose naturally" in content
    assert "Human action needed: None" in content
    assert "product impact" in expectations
    assert "implementation details" in expectations
    assert "executive summary" in expectations
    assert "human action needed" in expectations
    assert "detailed-information links" in expectations
    assert "Database connection pool saturation" in fixture
    assert "customers" in fixture


def test_issue_monitor_increments_candidate_round_and_preserves_finding_dispositions() -> None:
    content = skill_text("issue-monitor")
    fix_loop = content.split("## Fix and Re-review Loop", 1)[1].split(
        "## Post-merge Verification", 1
    )[0]

    assert "incrementing the candidate round" in fix_loop
    assert "prior finding dispositions" in fix_loop
    assert "prior exact review reports" in content
    assert "finding disposition ledger" in content
    assert "re-review the new commit from scratch" not in content
    assert "preserving the lineage round number" not in fix_loop


def test_project_manager_message_templates_include_mandatory_envelope() -> None:
    content = skill_text("project-manager")
    progress_template = content.split("Use this update shape:", 1)[1].split("```", 2)[1]
    completion_template = content.split("Minimum completion-message shape:", 1)[1].split(
        "```", 2
    )[1]

    for template in (progress_template, completion_template):
        assert not re.search(r"^\s*(?:-\s*)?Purpose:", template, re.MULTILINE)
        assert "Executive summary:" in template
        assert "Human action needed:" in template
        assert "Detailed information:" in template


def test_all_changed_user_facing_templates_use_mandatory_envelope() -> None:
    project = skill_text("project-manager")
    service_template = project.split("Use this shape for each periodic checkup report:", 1)[
        1
    ].split("```", 2)[1]
    single_email = project.split("Required shape:", 1)[1].split("```", 2)[1]
    portfolio_email = project.split("Use this shape when reporting on more than one", 1)[
        1
    ].split("```", 2)[1]
    issue = skill_text("issue-monitor")
    play = skill_text("play-store-publisher")
    play_report = play.split("Use this report shape:", 1)[1].split("```", 2)[1]

    for template in (service_template, single_email, portfolio_email, issue, play_report):
        assert not re.search(r"^\s*(?:-\s*)?Purpose:", template, re.MULTILINE)
        assert "Executive summary:" in template
        assert "Human action needed:" in template
        assert "Detailed information:" in template

    assert "Daily release alert envelope" in play


def test_subagent_skills_use_hermes_tracking_without_requiring_duplicate_ledger() -> None:
    subagent = skill_text("subagent-driven-development")
    reliability = skill_text("delegation-reliability")
    expectations = "\n".join(
        (
            eval_expectations("subagent-driven-development"),
            eval_expectations("delegation-reliability"),
        )
    ).lower()
    reference = (
        SKILLS
        / "delegation-reliability"
        / "references"
        / "active-subagent-visibility.md"
    )

    for content in (subagent, reliability):
        assert "Prefer Hermes's in-process active-subagent registry" in content
        assert "Do not require a duplicate lifecycle ledger" in content
        assert "/queue Report active subagent status from Hermes runtime tracking" in content
        assert "Mark unconfirmed liveness as `unknown`" in content
    assert reference.is_file()
    reference_text = reference.read_text(encoding="utf-8")
    assert "list_active_subagents()" in reference_text
    assert "list_async_delegations()" in reference_text
    assert "optional hook ledger" in reference_text.lower()
    assert "hermes kanban list --status running --json" in reference_text
    assert "process-local" in reference_text
    assert "does not require a duplicate lifecycle ledger" in expectations
