import importlib.util
import json
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
PROJECT_PACKAGE = ROOT / "skills" / "project-manager"
ISSUE_MONITOR_PACKAGE = ROOT / "skills" / "issue-monitor"
CONTRACT_PATH = PROJECT_PACKAGE / "scripts" / "hermes_project_watchdog.py"
FIXTURES = PROJECT_PACKAGE / "evaldata"


def load_contract():
    spec = importlib.util.spec_from_file_location("hermes_project_watchdog", CONTRACT_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_custom_scheduler_broker_is_deleted() -> None:
    assert not (ISSUE_MONITOR_PACKAGE / "scripts" / "project_controller.py").exists()


def test_canonical_identity_slug_and_marker_are_stable_and_sanitized() -> None:
    contract = load_contract()
    identity = contract.canonical_project_identity(
        repository="https://github.com/DataNavAI/No-Ego_Dev.git",
        tracker="GitHub Issues",
        workdir="/tmp/not-part-of-identity",
    )
    assert identity.repository == "github.com/datanavai/no-ego_dev"
    assert identity.tracker == "github-issues"
    assert identity.board_slug == "datanavai-no-ego-dev-github-issues"
    assert identity.marker.startswith("HERMES_PROJECT_WATCHDOG_V1:")
    assert len(identity.marker.split(":", 1)[1]) == 16
    other = contract.canonical_project_identity(
        repository="https://github.com/DataNavAI/No-Ego_Dev.git",
        tracker="GitHub Issues",
        workdir="/different/path",
    )
    assert other == identity


@pytest.mark.parametrize(
    "repository,tracker",
    [
        ("$(touch /tmp/pwned)", "github"),
        ("DataNavAI/repo\n--profile attacker", "github"),
        ("DataNavAI/repo", "../../tracker"),
    ],
)
def test_hostile_identity_strings_are_rejected(repository, tracker) -> None:
    contract = load_contract()
    with pytest.raises(contract.ContractError):
        contract.canonical_project_identity(repository, tracker)


def test_no_existing_job_creates_one_official_cronjob() -> None:
    contract = load_contract()
    config = contract.project_config(
        repository="DataNavAI/no-ego-dev",
        tracker="github-issues",
        profile="no-ego-dev",
        workdir="/Users/example/no-ego-dev",
        schedule="every 30m",
    )
    plan = contract.plan_cron_reconciliation(fixture("cronjob-list-empty.json"), config)
    assert [op["action"] for op in plan.operations] == ["create"]
    create = plan.operations[0]
    assert create["schedule"] == "every 30m"
    assert create["workdir"] == "/Users/example/no-ego-dev"
    assert create["skills"] == ["issue-monitor"]
    assert create["enabled_toolsets"] == ["terminal", "file"]
    assert config.identity.marker in create["prompt"]
    assert create["name"] == "Keep no-ego-dev moving"


def test_duplicate_fixture_updates_bound_job_removes_others_and_preserves_pause() -> None:
    contract = load_contract()
    config = contract.project_config(
        repository="DataNavAI/no-ego-dev",
        tracker="github-issues",
        profile="no-ego-dev",
        workdir="/Users/example/no-ego-dev",
        schedule="every 30m",
        bound_job_id="job-bound",
    )
    plan = contract.plan_cron_reconciliation(fixture("cronjob-list-duplicates-paused.json"), config)
    assert plan.job_id == "job-bound"
    assert [op["action"] for op in plan.operations] == ["update", "pause", "remove", "remove"]
    assert plan.operations[0]["job_id"] == "job-bound"
    assert plan.operations[1] == {"action": "pause", "job_id": "job-bound"}
    assert {op["job_id"] for op in plan.operations[2:]} == {"job-a", "job-z"}
    assert all("jobs.json" not in json.dumps(op) for op in plan.operations)


def test_unbound_duplicate_fixture_adopts_stable_job_and_preserves_any_pause() -> None:
    contract = load_contract()
    config = contract.project_config(
        repository="DataNavAI/no-ego-dev",
        tracker="github-issues",
        profile="no-ego-dev",
        workdir="/Users/example/no-ego-dev",
        schedule="every 30m",
    )
    plan = contract.plan_cron_reconciliation(fixture("cronjob-list-duplicates-paused.json"), config)
    assert plan.job_id == "job-a"
    assert plan.preserve_paused is True
    assert sum(op["action"] == "update" for op in plan.operations) == 1
    assert sum(op["action"] == "pause" for op in plan.operations) == 1
    assert sum(op["action"] == "remove" for op in plan.operations) == 2


def test_setup_verification_requires_exact_readback_and_dry_run_receipt() -> None:
    contract = load_contract()
    config = contract.project_config(
        repository="DataNavAI/no-ego-dev",
        tracker="github-issues",
        profile="no-ego-dev",
        workdir="/Users/example/no-ego-dev",
        schedule="every 30m",
    )
    verification = contract.setup_verification_operations("job-a", config)
    assert verification[0] == {"action": "list"}
    assert verification[1]["action"] == "run"
    assert verification[1]["job_id"] == "job-a"
    assert "SETUP_DRY_RUN_NO_LAUNCH" in verification[1]["prompt"]
    assert "do not dispatch" in verification[1]["prompt"].lower()
    requirements = contract.setup_receipt_requirements("job-a", config)
    assert requirements["exact_job_id"] == "job-a"
    assert requirements["scope_match_count"] == 1
    assert requirements["require_terminal_cron_run_history"] is True
    assert requirements["require_no_kanban_dispatch"] is True
    assert requirements["persist_binding_to"] == "project status/notepad"


def test_tick_prompt_uses_only_official_kanban_and_never_delegates_or_schedules() -> None:
    contract = load_contract()
    config = contract.project_config(
        repository="DataNavAI/no-ego-dev",
        tracker="github-issues",
        profile="no-ego-dev",
        workdir="/Users/example/no-ego-dev",
        schedule="every 30m",
    )
    prompt = contract.build_job_prompt(config)
    assert "hermes kanban --board datanavai-no-ego-dev-github-issues list --json" in prompt
    assert "hermes kanban --board datanavai-no-ego-dev-github-issues stats --json" in prompt
    assert "hermes kanban --board datanavai-no-ego-dev-github-issues dispatch --max 1 --json" in prompt
    assert prompt.count("dispatch --max 1 --json") == 1
    assert "delegate_task" not in prompt
    assert "cronjob(" not in prompt
    assert "hermes cron create" not in prompt
    assert "hermes cron edit" not in prompt
    assert "one lifecycle stage per tick" not in prompt.lower()
    assert "kanban owns" in prompt.lower()


@pytest.mark.parametrize(
    "tasks,stats,expected",
    [
        ([{"id": "task-1", "status": "ready"}], {"by_status": {"ready": 1}}, "dispatch"),
        ([{"id": "task-1", "status": "ready"}, {"id": "task-2", "status": "running"}], {"by_status": {"ready": 1, "running": 1}}, "active"),
        ([{"id": "task-1", "status": "blocked"}], {"by_status": {"blocked": 1}}, "no-task"),
    ],
)
def test_json_board_decision_active_no_active_no_task(tasks, stats, expected) -> None:
    contract = load_contract()
    decision = contract.decide_tick(json.dumps(tasks), json.dumps(stats))
    assert decision.reason == expected
    if expected == "dispatch":
        assert decision.should_dispatch is True
    else:
        assert decision.should_dispatch is False


@pytest.mark.parametrize(
    "stats",
    [
        [],
        {},
        {"running": -1},
        {"running": "0"},
        {"running": 0},
    ],
)
def test_json_board_decision_fails_closed_on_invalid_or_conflicting_stats(stats) -> None:
    contract = load_contract()
    tasks = [
        {"id": "task-ready", "status": "ready"},
        {"id": "task-live", "status": "running"},
    ]
    with pytest.raises(contract.ContractError):
        contract.decide_tick(json.dumps(tasks), json.dumps(stats))


def test_exactly_one_dispatch_command_and_hostile_task_never_enters_commands() -> None:
    contract = load_contract()
    commands = contract.tick_commands("datanavai-no-ego-dev-github-issues", dispatch=True)
    dispatches = [cmd for cmd in commands if "dispatch" in cmd]
    assert dispatches == [["hermes", "kanban", "--board", "datanavai-no-ego-dev-github-issues", "dispatch", "--max", "1", "--json"]]
    with pytest.raises(contract.ContractError):
        contract.tick_commands("safe; touch /tmp/pwned", dispatch=True)
    with pytest.raises(contract.ContractError):
        contract.running_task_evidence_command("datanavai-no-ego-dev-github-issues", "task; env")


def test_lifecycle_operations_pause_remove_and_preserve_user_pause() -> None:
    contract = load_contract()
    assert contract.lifecycle_operation("paused", "job-a") == {"action": "pause", "job_id": "job-a"}
    assert contract.lifecycle_operation("completed", "job-a") == {"action": "remove", "job_id": "job-a"}
    assert contract.lifecycle_operation("archived", "job-a") == {"action": "remove", "job_id": "job-a"}
    assert contract.lifecycle_operation("active", "job-a", user_paused=True) is None
    assert contract.lifecycle_operation("active", "job-a", user_paused=False) is None


def test_skill_eval_fixtures_and_citations_share_official_contract() -> None:
    project_skill = (PROJECT_PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    issue_skill = (ISSUE_MONITOR_PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    project_eval = yaml.safe_load((PROJECT_PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    issue_eval = yaml.safe_load((ISSUE_MONITOR_PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    fixtures = (PROJECT_PACKAGE / "evaldata" / "README.md").read_text(encoding="utf-8")
    reference = (PROJECT_PACKAGE / "references" / "hermes-cron-kanban-contract.md").read_text(encoding="utf-8")
    combined = "\n".join([project_skill, issue_skill, fixtures, reference, *project_eval["expectations"], *issue_eval["expectations"]]).lower()
    for required in (
        "cronjob(action=\"list\")",
        "dispatch --max 1 --json",
        "setup_dry_run_no_launch",
        "project status/notepad",
        "https://hermes-agent.nousresearch.com/docs/user-guide/features/cron",
        "https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban",
    ):
        assert required in combined
    assert "unclaimed → reserved → dispatching → active" not in combined
