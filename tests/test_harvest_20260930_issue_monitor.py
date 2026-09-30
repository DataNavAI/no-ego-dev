from pathlib import Path

import yaml

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "issue-monitor"


def read(relative: str) -> str:
    return (PACKAGE / relative).read_text(encoding="utf-8")


def test_issue_monitor_adopts_durable_no_launch_audit_receipt() -> None:
    skill = read("SKILL.md")
    reference = read("references/no-launch-audit-and-review-continuation.md")

    assert "version: 1.17.1" in skill
    assert "references/no-launch-audit-and-review-continuation.md" in skill
    for marker in (
        "Before returning `[SILENT]`",
        "atomic controller-readable receipt outside the repository",
        '"reason_code": "BUSY | NO_ELIGIBLE | GLOBAL_DEPENDENCY_DEADLOCK"',
        '"origin_base_sha": "40-hex"',
        '"evaluated_frontier"',
        "live issue bodies",
        "official Kanban",
        "reasoning-capable monitor or controller",
        "does not apply to the shared no-agent watchdog's ordinary tick",
    ):
        assert marker in reference
    assert "If no issue is eligible—or if the serialized capacity gate launches nothing" not in skill
    assert "For every no-launch outcome" not in skill


def test_container_recovery_is_scoped_to_required_local_gates_and_kanban() -> None:
    skill = read("SKILL.md")
    reference = read("references/local-container-runtime-recovery.md")

    assert "references/local-container-runtime-recovery.md" in skill
    for marker in (
        "required local container-backed gate",
        "official Kanban",
        "serialized",
        "explicit approval",
        "VM delete/reset",
        "container-store wipe",
        "broad image/volume prune",
        "filesystem rebuild",
        "at most one",
        "transaction-created",
        "exact-task-owned",
        "disposable",
        "ownerless",
        "no unpushed commits",
        "fetched default",
        "terminal PR/issue state",
    ):
        assert marker in reference
    for marker in (
        "transaction-created",
        "exact task-owned disposable",
        "no live owner",
        "no unpushed commits",
        "fetched default",
        "terminal PR/issue state",
    ):
        assert marker in skill
    assert "Completion hooks for supervised detached runners must emit" not in reference
    assert "direct detached runner" in reference
    assert "must not" in reference


def test_metric_gap_kickoff_requires_explicit_metric_accountability() -> None:
    skill = read("SKILL.md")
    reference = read("references/metric-gap-task-kickoff.md")

    assert "references/metric-gap-task-kickoff.md" in skill
    for marker in (
        "explicitly accountable",
        "measurable operational metric",
        "does not apply to every issue monitor",
        "TASK_STARTED",
        "official Kanban",
        "existing serialized lineage",
        "does not create another controller slot",
    ):
        assert marker in reference


def test_harvest_preserves_official_serialized_authority_and_forbids_competing_launchers() -> None:
    surfaces = "\n".join(
        read(path)
        for path in (
            "SKILL.md",
            "references/no-launch-audit-and-review-continuation.md",
            "references/local-container-runtime-recovery.md",
            "references/metric-gap-task-kickoff.md",
        )
    )
    for marker in (
        "Official Hermes Kanban authority",
        "max_in_progress=1",
        "custom worker pool",
        "lifecycle-plugin scheduler",
        "direct detached runner",
        "multi-slot controller",
    ):
        assert marker in surfaces
    assert "Completion hooks for supervised detached runners must emit" not in surfaces
    assert "lifecycle plugin that directly selects work" in surfaces


def test_eval_and_fixture_cover_receipt_and_scope_boundaries() -> None:
    spec = load_eval(PACKAGE / "EVAL.harvest-20260930.yaml")
    evaluation = yaml.safe_load(read("EVAL.harvest-20260930.yaml"))
    fixture = read(evaluation["parameters"]["fixture"])
    surface = "\n".join([evaluation["prompt"], *spec.expectations, fixture])

    for marker in (
        "no-launch receipt",
        "BUSY",
        "NO_ELIGIBLE",
        "GLOBAL_DEPENDENCY_DEADLOCK",
        "required local container-backed gate",
        "transaction-created",
        "exact-task-owned",
        "fetched default",
        "terminal PR/issue state",
        "destructive VM/container-store actions",
        "explicitly accountable for a measurable operational metric",
        "custom worker pool",
        "lifecycle-plugin scheduler",
        "direct detached runner",
        "multi-slot controller",
        "official Kanban",
        "serialized",
    ):
        assert marker in surface
