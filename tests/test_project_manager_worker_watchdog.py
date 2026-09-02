from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "project-manager"
SKILL_PATH = PACKAGE / "SKILL.md"
EVAL_PATH = PACKAGE / "EVAL.yaml"
FIXTURE_PATH = PACKAGE / "evaldata" / "README.md"


def skill_text() -> str:
    return SKILL_PATH.read_text(encoding="utf-8")


def watchdog_section() -> str:
    return skill_text().split("## Per-project worker watchdog", 1)[1].split(
        "\n## ", 1
    )[0].lower()


def test_new_project_startup_upserts_exactly_one_scoped_watchdog() -> None:
    skill = skill_text()
    section = watchdog_section()

    assert "version: 0.24.0" in skill
    assert "every new-project startup" in section
    assert "stable project identity" in section
    assert "canonical repository and tracker" in section
    assert "search by technical scope" in section
    assert "create or update exactly one" in section
    assert "one global watchdog" in section
    assert "friendly project-specific outcome name" in section


def test_watchdog_prompt_is_self_contained_and_project_scoped() -> None:
    section = watchdog_section()
    required = (
        "repository and tracker coordinates",
        "project identity",
        "eligible task states",
        "dependency rules",
        "worker/profile routing",
        "single-flight lock and state paths",
        "cadence",
        "evidence and reporting requirements",
        "fresh cron session has no current-chat context",
        "cannot ask questions",
    )
    for phrase in required:
        assert phrase in section


def test_zero_worker_launch_requires_claim_plus_live_evidence() -> None:
    section = watchdog_section()
    assert "eligible_count >= 1 and active_worker_count == 0" in section
    assert "highest-priority dependency-safe task" in section
    assert "atomically claim" in section
    assert "starts exactly one focused worker linked to that task" in section
    assert "durable task claim plus current live lease/runtime evidence" in section
    assert "pid, branch, pr, worker self-report, or durable claim alone" in section


def test_active_worker_and_empty_queue_are_no_ops() -> None:
    section = watchdog_section()
    assert "active_worker_count >= 1" in section
    assert "eligible_count == 0" in section
    assert section.count("do not launch") >= 2


def test_single_flight_suppresses_overlap_retries_and_duplicate_dispatch() -> None:
    section = watchdog_section()
    assert "project-scoped single-flight lock" in section
    assert "one tick starts at most one worker" in section
    assert "overlapping ticks and retries cannot double-dispatch" in section
    assert "releases only its own lock" in section
    assert "bounded verified lease rules" in section


def test_setup_readback_manual_reconciliation_and_receipt_are_startup_gates() -> None:
    section = watchdog_section()
    ordered = (
        "list and read back the exact job",
        "run one manual reconciliation",
        "verify its receipt/output",
        "project startup complete",
    )
    positions = [section.index(phrase) for phrase in ordered]
    assert positions == sorted(positions)


def test_lifecycle_and_controller_reconciliation_prevent_competing_jobs() -> None:
    section = watchdog_section()
    for phrase in (
        "preserve a user-controlled pause",
        "pause or retire",
        "paused, archived, or completed",
        "never creates or updates cron jobs",
        "scheduled monitor",
        "worker-pool",
        "one dispatch authority",
        "without duplicate controllers",
    ):
        assert phrase in section


def test_eval_and_fixture_cover_watchdog_contract() -> None:
    eval_data = yaml.safe_load(EVAL_PATH.read_text(encoding="utf-8"))
    expectations = "\n".join(eval_data["expectations"]).lower()
    fixture = FIXTURE_PATH.read_text(encoding="utf-8").lower()

    shared = (
        "exactly one per-project hermes cron watchdog",
        "stable repository/tracker identity",
        "durable claim plus live lease/runtime evidence",
        "highest-priority dependency-safe task",
        "overlapping or retried ticks",
        "manual reconciliation",
        "pause or retire",
        "no recursive cron creation",
        "scheduled monitor and worker-pool",
    )
    for phrase in shared:
        assert phrase in expectations, f"eval missing watchdog contract: {phrase}"
        assert phrase in fixture, f"fixture missing watchdog scenario: {phrase}"

    assert re.search(r"active_worker_count\s*==\s*0", expectations)
    assert re.search(r"active_worker_count\s*>=\s*1", fixture)
    assert re.search(r"eligible_count\s*==\s*0", fixture)
