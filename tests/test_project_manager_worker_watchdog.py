import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
PROJECT_PACKAGE = ROOT / "skills" / "project-manager"
ISSUE_MONITOR_PACKAGE = ROOT / "skills" / "issue-monitor"
CONTRACT_PATH = PROJECT_PACKAGE / "scripts" / "hermes_project_watchdog.py"
FIXTURES = PROJECT_PACKAGE / "evaldata"
TASK_KEYS = {
    "id", "title", "body", "assignee", "status", "priority", "tenant",
    "workspace_kind", "workspace_path", "branch_name", "project_id",
    "created_by", "created_at", "started_at", "completed_at", "result",
    "skills", "max_retries", "model_override", "provider_override",
    "session_id", "workflow_template_id", "current_step_key",
}


def load_contract():
    spec = importlib.util.spec_from_file_location("hermes_project_watchdog", CONTRACT_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def task(task_id="task-1", status="ready", assignee="coder"):
    row = {
        "id": task_id,
        "title": "Bounded work",
        "body": "Implement one outcome",
        "assignee": assignee,
        "status": status,
        "priority": 1,
        "tenant": None,
        "workspace_kind": "worktree",
        "workspace_path": None,
        "branch_name": None,
        "project_id": None,
        "created_by": "project-manager",
        "created_at": 1_700_000_000,
        "started_at": 1_700_000_001 if status == "running" else None,
        "completed_at": None,
        "result": None,
        "skills": ["issue-monitor"],
        "max_retries": None,
        "model_override": None,
        "provider_override": None,
        "session_id": None,
        "workflow_template_id": None,
        "current_step_key": None,
    }
    assert set(row) == TASK_KEYS
    return row


def stats_for(tasks):
    statuses = {}
    assignees = {}
    for row in tasks:
        statuses[row["status"]] = statuses.get(row["status"], 0) + 1
        if row["assignee"] is not None:
            bucket = assignees.setdefault(row["assignee"], {})
            bucket[row["status"]] = bucket.get(row["status"], 0) + 1
    return {
        "by_status": statuses,
        "by_assignee": assignees,
        "oldest_ready_age_seconds": 10.0 if statuses.get("ready") else None,
        "now": 1_700_000_010,
    }


def make_fake_hermes(tmp_path):
    fake = tmp_path / "bin" / "hermes"
    fake.parent.mkdir(parents=True)
    fake.write_text(
        """#!/usr/bin/env python3
import json, os, pathlib, sys
scenario = json.loads(pathlib.Path(os.environ['FAKE_HERMES_SCENARIO']).read_text())
log = pathlib.Path(os.environ['FAKE_HERMES_LOG'])
with log.open('a', encoding='utf-8') as handle:
    handle.write(json.dumps(sys.argv[1:]) + '\\n')
args = sys.argv[1:]
if args[-2:] == ['list', '--json']:
    key = 'list'
elif args[-4:] == ['list', '--status', 'running', '--json']:
    key = 'running'
elif args[-2:] == ['stats', '--json']:
    key = 'stats'
elif args[-4:] == ['dispatch', '--max', '1', '--json']:
    key = 'dispatch'
else:
    print(json.dumps({'unexpected': args}))
    raise SystemExit(9)
record = scenario[key]
if isinstance(record, dict) and '__raw__' in record:
    print(record['__raw__'], end='')
else:
    print(json.dumps(record))
raise SystemExit(int(scenario.get('exit_codes', {}).get(key, 0)))
""",
        encoding="utf-8",
    )
    fake.chmod(fake.stat().st_mode | stat.S_IXUSR)
    return fake.resolve()


def make_config(contract, tmp_path, fake_hermes, **overrides):
    profile_home = (tmp_path / "profile").resolve()
    profile_home.mkdir(parents=True, exist_ok=True)
    workdir = (tmp_path / "repo").resolve()
    workdir.mkdir(exist_ok=True)
    values = {
        "repository": "DataNavAI/no-ego-dev",
        "tracker": "github-issues",
        "profile": "no-ego-dev",
        "profile_home": str(profile_home),
        "workdir": str(workdir),
        "schedule": "every 30m",
        "hermes_executable": str(fake_hermes),
    }
    values.update(overrides)
    return contract.project_config(**values)


def dispatch_receipt(task_id="task-1"):
    return {
        "reclaimed": 0,
        "crashed": [],
        "timed_out": [],
        "stale": [],
        "auto_blocked": [],
        "promoted": 0,
        "spawned": [{"task_id": task_id, "assignee": "coder", "workspace": "/tmp/work"}],
        "skipped_unassigned": [],
        "skipped_nonspawnable": [],
        "skipped_per_profile_capped": [],
        "auto_assigned_default": [],
    }


def run_rendered(
    tmp_path,
    scenario,
    *,
    dry_run=False,
    mutate_script=None,
    include_profile_env=True,
    extra_env=None,
):
    contract = load_contract()
    fake = make_fake_hermes(tmp_path)
    config = make_config(contract, tmp_path, fake)
    script_text = contract.render_watchdog_script(config)
    if mutate_script:
        script_text = mutate_script(script_text)
    scripts = Path(config.profile_home) / "scripts"
    scripts.mkdir()
    script = scripts / contract.watchdog_script_filename(config)
    script.write_text(script_text, encoding="utf-8")
    scenario_path = tmp_path / "scenario.json"
    scenario_path.write_text(json.dumps(scenario), encoding="utf-8")
    log = tmp_path / "argv.jsonl"
    env = {
        **os.environ,
        "HERMES_HOME": config.profile_home,
        "FAKE_HERMES_SCENARIO": str(scenario_path),
        "FAKE_HERMES_LOG": str(log),
    }
    env.pop("HERMES_PROFILE", None)
    env.pop("HERMES_PROFILE_NAME", None)
    if include_profile_env:
        env["HERMES_PROFILE"] = config.profile
    env.update(extra_env or {})
    argv = [sys.executable, str(script)] + (["--dry-run"] if dry_run else [])
    result = subprocess.run(argv, cwd=config.workdir, env=env, text=True, capture_output=True, timeout=20)
    calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
    return contract, config, script, result, calls


def test_custom_scheduler_broker_and_prompt_watchdog_are_deleted() -> None:
    assert not (ISSUE_MONITOR_PACKAGE / "scripts" / "project_controller.py").exists()
    source = CONTRACT_PATH.read_text(encoding="utf-8")
    assert "build_job_prompt" not in source
    assert "SETUP_DRY_RUN_NO_LAUNCH" not in source


@pytest.mark.parametrize("repository", [
    "https://user@github.com/DataNavAI/no-ego-dev",
    "https://github.com:443/DataNavAI/no-ego-dev",
    "https://github.com/DataNavAI/no-ego-dev?x=1",
    "https://github.com/DataNavAI/no-ego-dev#fragment",
    "https://github.com//DataNavAI/no-ego-dev",
    "https://github.com/DataNavAI/../no-ego-dev",
    "https://github.com/DataNavAI/no-ego-dev/extra",
    "http://github.com/DataNavAI/no-ego-dev",
    "//github.com/DataNavAI/no-ego-dev",
    "DataNavAI/no-ego-dev/extra",
    "DataNavAI/%2e%2e",
    " DataNavAI/no-ego-dev",
])
def test_repository_rejects_noncanonical_or_credentialed_forms(repository) -> None:
    contract = load_contract()
    with pytest.raises(contract.ContractError):
        contract.canonical_project_identity(repository, "github-issues")


def test_canonical_identity_is_stable_and_sanitized() -> None:
    contract = load_contract()
    short = contract.canonical_project_identity("DataNavAI/No-Ego_Dev", "GitHub Issues")
    url = contract.canonical_project_identity("https://github.com/DataNavAI/No-Ego_Dev.git", "GitHub Issues")
    assert short == url
    assert short.repository == "github.com/datanavai/no-ego_dev"
    assert short.board_slug == "datanavai-no-ego-dev-github-issues"
    assert short.marker.startswith("HERMES_PROJECT_WATCHDOG_V2:")


@pytest.mark.parametrize("workdir", [
    "/tmp/../etc", "//server/share", "/tmp/$HOME", "/tmp/tab\there", "/tmp/line\nhere",
    "/tmp/*", "relative/path",
])
def test_workdir_rejects_traversal_unc_expansion_meta_and_controls(tmp_path, workdir) -> None:
    contract = load_contract()
    fake = make_fake_hermes(tmp_path)
    with pytest.raises(contract.ContractError):
        make_config(contract, tmp_path, fake, workdir=workdir)


def test_config_pins_existing_canonical_paths_profile_and_exact_hermes(tmp_path) -> None:
    contract = load_contract()
    fake = make_fake_hermes(tmp_path)
    config = make_config(contract, tmp_path, fake)
    assert Path(config.workdir).resolve() == Path(config.workdir)
    assert Path(config.profile_home).resolve() == Path(config.profile_home)
    assert Path(config.hermes_executable).resolve() == Path(config.hermes_executable)
    assert Path(config.hermes_executable).name == "hermes"
    alias = tmp_path / "hermes-alias"
    alias.symlink_to(fake)
    with pytest.raises(contract.ContractError):
        make_config(contract, tmp_path, fake, hermes_executable=str(alias))


@pytest.mark.parametrize("raw", [
    {}, {"kanban": {}}, {"kanban": {"max_in_progress": True}},
    {"kanban": {"max_in_progress": "1"}}, {"kanban": {"max_in_progress": 0}},
    {"kanban": {"max_in_progress": 2}},
])
def test_max_in_progress_gate_fails_closed_unless_effective_global_runtime_cap_is_one(raw) -> None:
    contract = load_contract()
    with pytest.raises(contract.ContractError):
        contract.verify_max_in_progress(raw)
    assert contract.verify_max_in_progress({"kanban": {"max_in_progress": 1}})["scope"] == "active profile runtime (all boards)"


def test_renderer_plans_profile_local_safe_script_and_readback(tmp_path) -> None:
    contract = load_contract()
    fake = make_fake_hermes(tmp_path)
    config = make_config(contract, tmp_path, fake)
    plan = contract.script_installation_plan(config)
    assert plan["filename"] == contract.watchdog_script_filename(config)
    assert "/scripts/" in plan["path"]
    assert Path(plan["path"]).parent == Path(config.profile_home) / "scripts"
    assert plan["filename"].endswith(".py") and "/" not in plan["filename"]
    assert plan["sha256"] == contract.validate_script_readback(config, plan["content"])
    with pytest.raises(contract.ContractError):
        contract.validate_script_readback(config, plan["content"] + "# drift\n")


def test_real_captured_official_cron_create_list_shape_is_supported(tmp_path) -> None:
    contract = load_contract()
    fake = make_fake_hermes(tmp_path)
    config = make_config(contract, tmp_path, fake)
    captured = fixture("cronjob-list-real-no-agent.json")
    assert "job_id" in captured["jobs"][0]
    assert "id" not in captured["jobs"][0]
    assert "prompt_preview" in captured["jobs"][0]
    rebound = json.loads(json.dumps(captured).replace("probe_watchdog.py", contract.watchdog_script_filename(config)).replace("/private/tmp/ned-watchdog-workdir", config.workdir))
    rebound["jobs"][0]["name"] = "Keep no-ego-dev moving"
    rebound["jobs"][0]["schedule"] = "every 30m"
    rebound["jobs"][0]["deliver"] = "origin"
    plan = contract.plan_cron_reconciliation(rebound, config)
    assert plan.job_id == "0cc1a5eae672"
    assert plan.operations[0]["action"] == "update"
    assert plan.operations[0]["script"] == contract.watchdog_script_filename(config)
    assert plan.operations[0]["no_agent"] is True
    assert "prompt" not in plan.operations[0]


def official_job(config, job_id="job-a", *, enabled=True, state=None, **overrides):
    record = json.loads(json.dumps(fixture("cronjob-list-real-no-agent.json")["jobs"][0]))
    record.update({
        "job_id": job_id,
        "name": "Keep no-ego-dev moving",
        "schedule": "every 30m",
        "deliver": "origin",
        "enabled": enabled,
        "state": state or ("scheduled" if enabled else "paused"),
        "script": config and load_contract().watchdog_script_filename(config),
        "no_agent": True,
        "workdir": config.workdir,
    })
    record.update(overrides)
    return record


def cron_payload(jobs):
    return {"success": True, "count": len(jobs), "jobs": jobs, "gateway_running": True}


def test_duplicate_reconciliation_preserves_pause_and_removes_every_duplicate(tmp_path) -> None:
    contract = load_contract()
    config = make_config(contract, tmp_path, make_fake_hermes(tmp_path))
    jobs = [official_job(config, "job-z"), official_job(config, "job-bound", enabled=False), official_job(config, "job-a")]
    plan = contract.plan_cron_reconciliation(cron_payload(jobs), config._replace(bound_job_id="job-bound"))
    assert plan.job_id == "job-bound"
    assert plan.preserve_paused is True
    assert [op["action"] for op in plan.operations] == ["update", "pause", "remove", "remove"]
    assert {op["job_id"] for op in plan.operations[2:]} == {"job-a", "job-z"}


def test_new_paused_project_stages_create_then_canonical_pause_and_readback(tmp_path) -> None:
    contract = load_contract()
    config = make_config(contract, tmp_path, make_fake_hermes(tmp_path))
    plan = contract.plan_cron_reconciliation(cron_payload([]), config, project_state="paused")
    assert [op["action"] for op in plan.operations] == ["create"]
    assert plan.pause_created_job is True

    staged = contract.stage_created_cron_job(
        plan,
        {"success": True, "job_id": "job-new", "name": "Keep no-ego-dev moving"},
    )
    assert staged.job_id == "job-new"
    assert staged.operations == [{"action": "pause", "job_id": "job-new"}]
    assert contract.validate_cron_readback(
        cron_payload([official_job(config, "job-new", enabled=False)]),
        config,
        "job-new",
        preserve_paused=True,
    ) == "job-new"


@pytest.mark.parametrize("mutator", [
    lambda jobs: jobs + [dict(jobs[0])],
    lambda jobs: [dict(jobs[0], enabled="false")],
    lambda jobs: [dict(jobs[0], state="paused")],
    lambda jobs: [dict(jobs[0], no_agent=False)],
    lambda jobs: [dict(jobs[0], name="Wrong scope")],
    lambda jobs: [dict(jobs[0], workdir="/tmp/wrong")],
    lambda jobs: [dict(jobs[0], script="../watchdog.py")],
])
def test_cron_reconciliation_rejects_duplicate_ids_unknown_pause_and_partial_scope_collisions(tmp_path, mutator) -> None:
    contract = load_contract()
    config = make_config(contract, tmp_path, make_fake_hermes(tmp_path))
    jobs = mutator([official_job(config)])
    with pytest.raises(contract.ContractError):
        contract.plan_cron_reconciliation(cron_payload(jobs), config)


def test_friendly_name_or_bound_id_wrong_scope_collision_is_rejected(tmp_path) -> None:
    contract = load_contract()
    config = make_config(contract, tmp_path, make_fake_hermes(tmp_path))
    wrong = official_job(config, "bound", script="other.py")
    with pytest.raises(contract.ContractError):
        contract.plan_cron_reconciliation(cron_payload([wrong]), config._replace(bound_job_id="bound"))


def test_fresh_readback_requires_exactly_one_exact_binding_and_pause_encoding(tmp_path) -> None:
    contract = load_contract()
    config = make_config(contract, tmp_path, make_fake_hermes(tmp_path))
    one = cron_payload([official_job(config, "job-a", enabled=False)])
    assert contract.validate_cron_readback(one, config, "job-a", preserve_paused=True) == "job-a"
    with pytest.raises(contract.ContractError):
        contract.validate_cron_readback(cron_payload([official_job(config, "job-a"), official_job(config, "job-b")]), config, "job-a", False)
    with pytest.raises(contract.ContractError):
        contract.validate_cron_readback(one, config, "job-a", preserve_paused=False)


def test_lifecycle_requires_current_exact_binding_and_post_operation_readback(tmp_path) -> None:
    contract = load_contract()
    config = make_config(contract, tmp_path, make_fake_hermes(tmp_path))
    current = cron_payload([official_job(config, "job-a")])
    assert contract.lifecycle_operation(current, config, "paused", "job-a") == {"action": "pause", "job_id": "job-a"}
    assert contract.validate_lifecycle_readback(cron_payload([official_job(config, "job-a", enabled=False)]), config, "paused", "job-a")
    assert contract.lifecycle_operation(current, config, "completed", "job-a") == {"action": "remove", "job_id": "job-a"}
    assert contract.validate_lifecycle_readback(cron_payload([]), config, "completed", "job-a")
    paused = cron_payload([official_job(config, "job-a", enabled=False)])
    assert contract.lifecycle_operation(paused, config, "archived", "job-a") == {"action": "remove", "job_id": "job-a"}
    assert contract.validate_lifecycle_readback(cron_payload([]), config, "archived", "job-a")
    with pytest.raises(contract.ContractError):
        contract.lifecycle_operation(cron_payload([official_job(config, "job-a", script="other.py")]), config, "completed", "job-a")


def test_rendered_script_empty_noop_uses_three_fixed_read_only_argv(tmp_path) -> None:
    rows = [task(status="blocked")]
    scenario = {"list": rows, "stats": stats_for(rows), "running": [], "dispatch": dispatch_receipt()}
    _, config, _, result, calls = run_rendered(tmp_path, scenario)
    assert result.returncode == 0
    assert result.stdout == ""
    base = ["kanban", "--board", config.identity.board_slug]
    assert calls == [[*base, "list", "--json"], [*base, "stats", "--json"], [*base, "list", "--status", "running", "--json"]]


def test_rendered_script_dispatches_exactly_once_and_validates_receipt(tmp_path) -> None:
    rows = [task()]
    scenario = {"list": rows, "stats": stats_for(rows), "running": [], "dispatch": dispatch_receipt()}
    _, config, _, result, calls = run_rendered(tmp_path, scenario)
    assert result.returncode == 0
    receipt = json.loads(result.stdout)
    assert receipt["kind"] == "dispatch"
    assert receipt["dispatched"] == 1
    dispatches = [call for call in calls if "dispatch" in call]
    assert dispatches == [["kanban", "--board", config.identity.board_slug, "dispatch", "--max", "1", "--json"]]


def test_rendered_script_dry_run_never_dispatches_and_receipt_is_mechanically_valid(tmp_path) -> None:
    rows = [task()]
    scenario = {"list": rows, "stats": stats_for(rows), "running": [], "dispatch": dispatch_receipt()}
    contract, config, script, result, calls = run_rendered(tmp_path, scenario, dry_run=True)
    assert result.returncode == 0
    receipt = contract.validate_dry_run_receipt(result.stdout, config)
    assert receipt["dispatched"] == 0 and receipt["mutated"] is False
    assert all("dispatch" not in call for call in calls)
    assert script.read_text(encoding="utf-8") == contract.render_watchdog_script(config)


@pytest.mark.parametrize("mutate", [
    lambda s: ({**s, "stats": {**s["stats"], "running": 0, "counts": {"running": 1}}}),
    lambda s: ({**s, "stats": {**s["stats"], "running": True}}),
    lambda s: ({**s, "stats": {**s["stats"], "counts": {"running": "bad"}}}),
    lambda s: ({**s, "list": [task("dup"), task("dup")], "stats": stats_for([task("dup"), task("dup")])}),
    lambda s: ({**s, "list": [task("bad;id")], "stats": stats_for([task("bad;id")])}),
    lambda s: ({**s, "list": [dict(task(), status="mystery")], "stats": stats_for([dict(task(), status="mystery")])}),
    lambda s: ({**s, "list": [{k: v for k, v in task().items() if k != "created_at"}], "stats": s["stats"]}),
    lambda s: ({**s, "running": [task("ghost", "running")]}),
    lambda s: ({**s, "stats": {**s["stats"], "unknown": 1}}),
    lambda s: ({**s, "list": {"tasks": [task()]}}),
])
def test_rendered_script_rejects_hostile_malformed_conflicting_or_unknown_evidence_without_dispatch(tmp_path, mutate) -> None:
    rows = [task()]
    base = {"list": rows, "stats": stats_for(rows), "running": [], "dispatch": dispatch_receipt()}
    scenario = mutate(base)
    _, _, _, result, calls = run_rendered(tmp_path, scenario)
    assert result.returncode == 0
    blocker = json.loads(result.stdout)
    assert blocker["kind"] == "blocker"
    assert blocker["dispatched"] == 0
    assert all("dispatch" not in call for call in calls)


def test_any_running_claim_is_silent_conservative_noop_until_official_reclaim(tmp_path) -> None:
    rows = [task("ready"), task("live", "running")]
    scenario = {"list": rows, "stats": stats_for(rows), "running": [rows[1]], "dispatch": dispatch_receipt()}
    _, _, _, result, calls = run_rendered(tmp_path, scenario)
    assert result.returncode == 0 and result.stdout == ""
    assert all("dispatch" not in call for call in calls)


@pytest.mark.parametrize("bad_dispatch", [
    {**dispatch_receipt(), "spawned": [dispatch_receipt()["spawned"][0], dispatch_receipt("task-2")["spawned"][0]]},
    {**dispatch_receipt(), "reclaimed": True},
    {**dispatch_receipt(), "unknown": []},
    {**dispatch_receipt(), "spawned": [{"task_id": "bad;id", "assignee": "coder", "workspace": "/tmp"}]},
])
def test_dispatch_output_is_strictly_validated(tmp_path, bad_dispatch) -> None:
    rows = [task()]
    scenario = {"list": rows, "stats": stats_for(rows), "running": [], "dispatch": bad_dispatch}
    _, _, _, result, calls = run_rendered(tmp_path, scenario)
    blocker = json.loads(result.stdout)
    assert blocker["kind"] == "blocker"
    assert sum("dispatch" in call for call in calls) == 1


def test_runtime_rejects_identity_drift_before_any_subprocess(tmp_path) -> None:
    rows = [task()]
    scenario = {"list": rows, "stats": stats_for(rows), "running": [], "dispatch": dispatch_receipt()}
    contract, config, script, _, _ = run_rendered(tmp_path, scenario)
    log = tmp_path / "drift-log"
    env = {**os.environ, "HERMES_HOME": config.profile_home, "HERMES_PROFILE": "attacker", "FAKE_HERMES_LOG": str(log), "FAKE_HERMES_SCENARIO": str(tmp_path / "scenario.json")}
    result = subprocess.run([sys.executable, str(script)], cwd=config.workdir, env=env, text=True, capture_output=True)
    assert json.loads(result.stdout)["kind"] == "blocker"
    assert not log.exists()


def test_production_scheduler_environment_allows_absent_profile_name_but_pins_home(tmp_path) -> None:
    rows = [task(status="blocked")]
    scenario = {"list": rows, "stats": stats_for(rows), "running": [], "dispatch": dispatch_receipt()}
    _, _, _, result, calls = run_rendered(
        tmp_path,
        scenario,
        include_profile_env=False,
    )
    assert result.returncode == 0 and result.stdout == ""
    assert len(calls) == 3

    _, _, _, mismatch, mismatch_calls = run_rendered(
        tmp_path / "mismatch",
        scenario,
        include_profile_env=False,
        extra_env={"HERMES_PROFILE_NAME": "attacker"},
    )
    assert json.loads(mismatch.stdout)["kind"] == "blocker"
    assert mismatch_calls == []

    _, _, _, wrong_home, wrong_home_calls = run_rendered(
        tmp_path / "wrong-home",
        scenario,
        include_profile_env=False,
        extra_env={"HERMES_HOME": str(tmp_path)},
    )
    assert json.loads(wrong_home.stdout)["kind"] == "blocker"
    assert wrong_home_calls == []


def test_skill_eval_fixture_and_reference_describe_no_agent_real_schema_contract() -> None:
    project_skill = (PROJECT_PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    issue_skill = (ISSUE_MONITOR_PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    project_eval = yaml.safe_load((PROJECT_PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    issue_eval = yaml.safe_load((ISSUE_MONITOR_PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture_text = (PROJECT_PACKAGE / "evaldata" / "README.md").read_text(encoding="utf-8")
    reference = (PROJECT_PACKAGE / "references" / "hermes-cron-kanban-contract.md").read_text(encoding="utf-8")
    combined = "\n".join([project_skill, issue_skill, fixture_text, reference, *project_eval["expectations"], *issue_eval["expectations"]]).lower()
    for required in (
        "no_agent=true", "script=<relative safe filename>", "job_id", "prompt_preview",
        "empty stdout", "max_in_progress=1", "--dry-run", "project status/notepad",
        "https://hermes-agent.nousresearch.com/docs/user-guide/features/cron",
        "https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban",
    ):
        assert required in combined
    for obsolete in ("show/runs", "heartbeat evidence", "immutable job prompt", "setup_dry_run_no_launch"):
        assert obsolete not in combined
