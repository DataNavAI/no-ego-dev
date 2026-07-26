from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "devops"


def test_devops_monitors_all_active_repository_workflows():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")

    for marker in (
        "version: 0.6.0",
        "## Repository Workflow Failure Monitoring",
        "monitor the status of **all active workflows**",
        "workflow_run` webhooks",
        "gh workflow list --all",
        "inventory its trigger events",
        "each workflow + relevant event + relevant branch/ref lane",
        "paginate until the latest two completed attempts plus the preceding success are known",
        "per-workflow-only `--limit <N>` query can hide infrequent schedule, release, or deployment lanes",
        "databaseId,attempt,workflowName",
        "--attempt <attempt>",
        "branch-protection/rulesets read",
        "Webhook mode additionally needs repository-hook administration/write",
        "at least every 15 minutes",
        "missing workflow visibility",
        "`failure`, `timed_out`, `startup_failure`, and `action_required`",
        "do not classify an intentional manual cancellation as a code failure",
        "`skipped` and `neutral` are not successes for a required check",
        "stable workflow ID plus path",
        "inventory is truncated",
        "Reconcile workflow renames by stable ID/path history",
        "intentional retirement decision",
        "~/.hermes/tmp/<project>-workflow-monitor-state.json",
    ):
        assert marker in skill


def test_devops_persistent_failure_gate_and_fix_task_are_fail_closed():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")

    for marker in (
        "A single failed run is a **candidate incident**, not automatically a fix task",
        "latest two completed attempts of the same active workflow fail",
        "same normalized failure signature and no intervening success",
        "latest three completed attempts",
        "`mixed-signature` lane task",
        "safe, explicitly authorized rerun fails again",
        "remains red for 30 minutes",
        "two consecutive scheduled executions",
        "Do not blindly rerun deployment, migration, billing, destructive, or non-idempotent workflows",
        "one open fix task per repository + stable workflow ID/path + relevant branch/event + normalized failure signature",
        "one open deduplicated visibility/setup task",
        "persist one pending-task record",
        "never claim that a task was created until its returned ID/URL is verified",
        "reject an event at or behind the stored lane cursor",
        "Deduplicate unchanged red-state **and visibility** alerts",
        "atomic lock/idempotent upsert",
        "Write state atomically",
        "Update the existing task with new runs and evidence instead of creating duplicate issues",
        "Fix persistent workflow failure — <workflow> — <branch/event>",
        "original failing scenario rerun passes",
        "two consecutive normal runs succeed",
        "workflow was not merely disabled/skipped to hide failure",
        "Redact tokens, secrets, private environment values",
    ):
        assert marker in skill


def test_persistent_repair_task_write_failures_remain_fail_closed():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    repair_section = skill.split("### Fix-task creation and deduplication", 1)[1].split(
        "### Recovery and verification", 1
    )[0]

    for marker in (
        "persistent failure is not safely tracked until the repair task's returned ID/URL is verified",
        "read-back confirms the dedupe key and current failure evidence",
        "repair-task creation/update fails, times out, or returns an ambiguous response",
        "exactly one pending repair-task record per dedupe key",
        "search the tracker by dedupe key to adopt a task that may have been created despite a lost response",
        "Never claim the repair task exists",
        "deduplicate unchanged tracker-outage alerts",
    ):
        assert marker in repair_section


def test_devops_workflow_monitor_eval_covers_detection_dedupe_and_recovery():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(evaluation["expectations"])
    fixture = (SKILL_DIR / "evaldata" / "README.md").read_text(encoding="utf-8")

    for marker in (
        "Configure repository workflow monitoring for every active workflow",
        "Create/update one deduplicated fix task",
        "Every maintained repository inventories workflow triggers",
        "two consecutive matching completed attempts",
        "three continuously red mixed-signature attempts",
        "deduplicates visibility tasks/alerts",
        "recovery without premature closure",
    ):
        assert marker in skill

    for marker in (
        "paginates each active workflow event branch lane",
        "tracks run attempts",
        "three continuously red mixed-signature attempts",
        "one durable fix task per stable workflow ID or path",
        "deduplicates missing visibility setup tasks and alerts",
        "rejects stale or out of order run attempt events",
        "does not hide workflow failures",
        "recovery without premature closure",
    ):
        assert marker in expectations

    for marker in (
        "Repository workflow monitoring scenario",
        "active `ci`, `security-scan`, `deploy-staging`, `deploy-production`",
        "inventory workflow trigger definitions",
        "paginate each lane",
        "One `ci` failure is a candidate incident",
        "second consecutive matching completed attempt on the same branch/event must create one durable fix task",
        "three continuously red mixed-signature attempts",
        "Repeated polls and subsequent matching runs update the same task",
        "Failed, timed-out, or ambiguous repair-task writes remain one pending record per dedupe key",
        "no task is claimed until returned ID/URL and read-back evidence are verified",
        "atomic/idempotent upsert",
        "every event transition and monitor restart reconciles authoritative remote runs/attempts",
        "rejecting stale or out-of-order webhook events",
        "intentional retirement decision is verified",
        "Missing trigger/lane/pagination/auth/run/required-check visibility fails closed",
        "one deduplicated access/setup task",
        "least-privilege polling",
        "recovery without premature closure",
    ):
        assert marker in fixture
