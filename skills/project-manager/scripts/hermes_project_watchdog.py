"""Deterministic no-agent Hermes cron + Kanban watchdog integration.

This package module is a pure renderer and operation planner. It never edits a
profile, scheduler, board, or worker database. Setup installs the rendered
project-specific script below the active profile's ``scripts/`` directory and
uses only official ``cronjob`` operations. The rendered script owns no state
and invokes only fixed argv-array Hermes Kanban commands.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
from typing import Any, NamedTuple
from urllib.parse import unquote, urlsplit


MARKER_PREFIX = "HERMES_PROJECT_WATCHDOG_V2:"
_SAFE_COMPONENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_SAFE_SLUG = re.compile(r"^(?:[a-z0-9]|[a-z0-9][a-z0-9-]{0,126}[a-z0-9])$")
_SAFE_FILENAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}\.py$")
_CONTROL = re.compile(r"[\x00-\x1f\x7f]")
_PATH_UNSAFE = re.compile(r"[\x00-\x20\x7f\\$~*?\[\]{}();|&<>`]")
_TEXT_META = re.compile(r"[\\$~*?\[\]{}();|&<>`]")
_CRON_ROOT_KEYS = {"success", "count", "jobs", "gateway_running", "warning"}
_CRON_JOB_KEYS = {
    "job_id", "name", "skill", "skills", "prompt_preview", "model",
    "provider", "base_url", "schedule", "repeat", "deliver", "next_run_at",
    "last_run_at", "last_status", "last_delivery_error", "last_fire_error",
    "enabled", "state", "paused_at", "paused_reason", "script", "no_agent",
    "workdir", "reasoning_effort", "monitor_script", "monitor_url",
    "monitor_state", "enabled_toolsets", "continuity", "context_from",
}
_CRON_JOB_REQUIRED = {
    "job_id", "name", "skill", "skills", "prompt_preview", "model",
    "provider", "base_url", "schedule", "repeat", "deliver", "next_run_at",
    "last_run_at", "last_status", "last_delivery_error", "last_fire_error",
    "enabled", "state", "paused_at", "paused_reason",
}


class ContractError(ValueError):
    """A setup value, official result, or runtime receipt failed closed."""


class ProjectIdentity(NamedTuple):
    repository: str
    tracker: str
    board_slug: str
    marker: str


class ProjectConfig(NamedTuple):
    identity: ProjectIdentity
    profile: str
    profile_home: str
    workdir: str
    schedule: str
    hermes_executable: str
    bound_job_id: str | None


class CronPlan(NamedTuple):
    job_id: str | None
    preserve_paused: bool
    operations: list[dict[str, Any]]
    pause_created_job: bool = False


class CronCreateStage(NamedTuple):
    job_id: str
    operations: list[dict[str, str]]


def _safe_component(value: object, label: str) -> str:
    if not isinstance(value, str) or not _SAFE_COMPONENT.fullmatch(value):
        raise ContractError(f"unsafe {label}")
    return value


def _canonical_existing_path(value: object, label: str, *, executable: bool = False) -> str:
    if not isinstance(value, str) or not value or _PATH_UNSAFE.search(value):
        raise ContractError(f"unsafe {label}")
    if value.startswith("//") or not value.startswith("/"):
        raise ContractError(f"{label} must be an absolute canonical path")
    pure = PurePosixPath(value)
    if any(part in {".", "..", ""} for part in pure.parts[1:]):
        raise ContractError(f"noncanonical {label}")
    candidate = Path(value)
    try:
        resolved = candidate.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise ContractError(f"missing {label}") from exc
    if str(resolved) != value:
        raise ContractError(f"non-resolved {label}")
    if executable:
        if not resolved.is_file() or resolved.name != "hermes" or not os.access(resolved, os.X_OK):
            raise ContractError("invalid Hermes executable")
    elif not resolved.is_dir():
        raise ContractError(f"{label} must be a directory")
    return str(resolved)


def canonical_project_identity(repository: str, tracker: str) -> ProjectIdentity:
    """Validate canonical GitHub coordinates and derive a stable board scope."""
    if not isinstance(repository, str) or not repository or repository != repository.strip():
        raise ContractError("unsafe repository")
    if _CONTROL.search(repository) or _TEXT_META.search(repository) or "%" in repository:
        raise ContractError("unsafe repository")

    if "://" in repository:
        parsed = urlsplit(repository)
        if (
            parsed.scheme != "https"
            or parsed.netloc != "github.com"
            or parsed.hostname != "github.com"
            or parsed.username is not None
            or parsed.password is not None
            or parsed.port is not None
            or parsed.query
            or parsed.fragment
            or parsed.path.startswith("//")
            or unquote(parsed.path) != parsed.path
        ):
            raise ContractError("repository URL must be canonical GitHub HTTPS")
        path = parsed.path[1:]
    else:
        if repository.startswith(("/", "//")) or ":" in repository:
            raise ContractError("repository must be OWNER/REPO")
        path = repository

    if path.endswith(".git"):
        path = path[:-4]
    pieces = path.split("/")
    if len(pieces) != 2 or any(piece in {"", ".", ".."} for piece in pieces):
        raise ContractError("repository must be OWNER/REPO")
    if not all(_SAFE_COMPONENT.fullmatch(piece) for piece in pieces):
        raise ContractError("unsafe repository component")

    if not isinstance(tracker, str) or tracker != tracker.strip() or _CONTROL.search(tracker) or _TEXT_META.search(tracker):
        raise ContractError("unsafe tracker")
    tracker_slug = tracker.lower().replace(" ", "-")
    if not _SAFE_SLUG.fullmatch(tracker_slug) or ".." in tracker_slug:
        raise ContractError("unsafe tracker")

    canonical_repo = f"github.com/{pieces[0].lower()}/{pieces[1].lower()}"
    board_slug = re.sub(
        r"[^a-z0-9]+", "-", f"{pieces[0].lower()}-{pieces[1].lower()}-{tracker_slug}"
    ).strip("-")
    board_slug = re.sub(r"-+", "-", board_slug)[:63].rstrip("-")
    if not _SAFE_SLUG.fullmatch(board_slug):
        raise ContractError("unsafe board slug")
    digest = hashlib.sha256(f"{canonical_repo}#{tracker_slug}".encode()).hexdigest()[:16]
    return ProjectIdentity(canonical_repo, tracker_slug, board_slug, f"{MARKER_PREFIX}{digest}")


def project_config(
    repository: str,
    tracker: str,
    profile: str,
    profile_home: str,
    workdir: str,
    schedule: str,
    hermes_executable: str,
    bound_job_id: str | None = None,
) -> ProjectConfig:
    identity = canonical_project_identity(repository, tracker)
    _safe_component(profile, "profile")
    canonical_home = _canonical_existing_path(profile_home, "profile home")
    canonical_workdir = _canonical_existing_path(workdir, "workdir")
    canonical_hermes = _canonical_existing_path(
        hermes_executable, "Hermes executable", executable=True
    )
    if not isinstance(schedule, str) or schedule != schedule.strip() or not schedule:
        raise ContractError("unsafe schedule")
    if _CONTROL.search(schedule) or _TEXT_META.search(schedule):
        raise ContractError("unsafe schedule")
    if bound_job_id is not None:
        _safe_component(bound_job_id, "bound job id")
    return ProjectConfig(
        identity, profile, canonical_home, canonical_workdir, schedule,
        canonical_hermes, bound_job_id,
    )


def verify_max_in_progress(config: object) -> dict[str, object]:
    """Require the one effective dispatcher cap shared by CLI and gateway.

    Hermes currently scopes ``kanban.max_in_progress`` to the active profile
    runtime, not to one board. That stronger all-board scope is recorded in the
    returned setup receipt and must be accepted before watchdog activation.
    """
    if not isinstance(config, dict) or set(config) - {"kanban"}:
        raise ContractError("unverifiable Hermes config")
    kanban = config.get("kanban")
    if not isinstance(kanban, dict):
        raise ContractError("missing kanban config")
    value = kanban.get("max_in_progress")
    if not isinstance(value, int) or isinstance(value, bool) or value != 1:
        raise ContractError("effective kanban.max_in_progress must equal 1")
    return {"max_in_progress": 1, "scope": "active profile runtime (all boards)"}


def _friendly_name(config: ProjectConfig) -> str:
    return f"Keep {config.identity.repository.rsplit('/', 1)[-1]} moving"


def watchdog_script_filename(config: ProjectConfig) -> str:
    digest = config.identity.marker.rsplit(":", 1)[-1]
    filename = f"project-watchdog-{digest}.py"
    if not _SAFE_FILENAME.fullmatch(filename):
        raise ContractError("unsafe rendered script filename")
    return filename


def _desired_job(config: ProjectConfig) -> dict[str, object]:
    return {
        "name": _friendly_name(config),
        "schedule": config.schedule,
        "deliver": "origin",
        "script": watchdog_script_filename(config),
        "no_agent": True,
        "workdir": config.workdir,
    }


def _strict_bool(value: object, label: str) -> bool:
    if not isinstance(value, bool):
        raise ContractError(f"invalid {label}")
    return value


def _nullable_string(value: object, label: str) -> None:
    if value is not None and not isinstance(value, str):
        raise ContractError(f"invalid {label}")


def _jobs_from_list(payload: dict | str) -> list[dict[str, Any]]:
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise ContractError("invalid cronjob list JSON") from exc
    if not isinstance(payload, dict) or set(payload) - _CRON_ROOT_KEYS:
        raise ContractError("invalid cronjob list result")
    if payload.get("success") is not True:
        raise ContractError("unsuccessful cronjob list result")
    jobs = payload.get("jobs")
    count = payload.get("count")
    if (
        not isinstance(jobs, list)
        or not isinstance(count, int)
        or isinstance(count, bool)
        or count != len(jobs)
    ):
        raise ContractError("invalid cronjob list count")
    if "gateway_running" in payload and payload["gateway_running"] not in {True, False, None}:
        raise ContractError("invalid gateway liveness")
    if "warning" in payload and not isinstance(payload["warning"], str):
        raise ContractError("invalid gateway warning")

    seen: set[str] = set()
    validated: list[dict[str, Any]] = []
    for job in jobs:
        if (
            not isinstance(job, dict)
            or not _CRON_JOB_REQUIRED.issubset(job)
            or set(job) - _CRON_JOB_KEYS
        ):
            raise ContractError("invalid cronjob job record")
        job_id = _safe_component(job["job_id"], "cron job id")
        if job_id in seen:
            raise ContractError("duplicate cron job id")
        seen.add(job_id)
        for key in ("name", "prompt_preview", "schedule", "repeat", "deliver", "state"):
            if not isinstance(job[key], str):
                raise ContractError(f"invalid cron {key}")
        if job["skill"] is not None and not isinstance(job["skill"], str):
            raise ContractError("invalid cron skill")
        if not isinstance(job["skills"], list) or not all(isinstance(v, str) for v in job["skills"]):
            raise ContractError("invalid cron skills")
        for key in (
            "model", "provider", "base_url", "next_run_at", "last_run_at",
            "last_status", "last_delivery_error", "last_fire_error", "paused_at",
            "paused_reason", "script", "workdir",
        ):
            if key in job:
                _nullable_string(job[key], f"cron {key}")
        enabled = _strict_bool(job["enabled"], "cron enabled")
        expected_state = "scheduled" if enabled else "paused"
        if job["state"] != expected_state:
            raise ContractError("conflicting cron pause state")
        if "no_agent" in job:
            _strict_bool(job["no_agent"], "cron no_agent")
        validated.append(job)
    return validated


def _scope_matches(job: dict[str, Any], config: ProjectConfig) -> bool:
    return job.get("script") == watchdog_script_filename(config)


def _assert_exact_binding(job: dict[str, Any], config: ProjectConfig) -> None:
    if job.get("name") != _friendly_name(config):
        raise ContractError("watchdog script/name scope collision")
    if job.get("workdir") != config.workdir:
        raise ContractError("watchdog script/workdir scope collision")
    if job.get("no_agent") is not True:
        raise ContractError("watchdog must be no-agent")
    if job.get("script") != watchdog_script_filename(config):
        raise ContractError("wrong watchdog script")


def plan_cron_reconciliation(
    list_result: dict | str,
    config: ProjectConfig,
    *,
    project_state: str = "active",
) -> CronPlan:
    """Plan convergent official calls from the real list schema.

    For an ordinary plan, execute the operations and call
    :func:`validate_cron_readback` on a fresh ``cronjob(action="list")`` result.
    For a staged create, execute only ``create``, pass its response to
    :func:`stage_created_cron_job`, execute that returned follow-up immediately,
    and then perform the fresh readback.
    """
    if project_state not in {"active", "paused", "archived", "completed"}:
        raise ContractError("unknown project lifecycle state")
    jobs = _jobs_from_list(list_result)
    filename = watchdog_script_filename(config)
    friendly = _friendly_name(config)

    for job in jobs:
        partial = (
            job.get("script") == filename
            or job.get("name") == friendly
            or (config.bound_job_id is not None and job["job_id"] == config.bound_job_id)
        )
        if partial:
            _assert_exact_binding(job, config)

    matches = [job for job in jobs if _scope_matches(job, config)]
    if project_state in {"archived", "completed"}:
        return CronPlan(None, False, [
            {"action": "remove", "job_id": job["job_id"]} for job in matches
        ])
    if not matches:
        paused = project_state == "paused"
        return CronPlan(
            None,
            paused,
            [{"action": "create", **_desired_job(config)}],
            pause_created_job=paused,
        )

    by_id = {job["job_id"]: job for job in matches}
    if config.bound_job_id is not None:
        if config.bound_job_id not in by_id:
            raise ContractError("bound cron job is not an exact current binding")
        selected_id = config.bound_job_id
    else:
        selected_id = sorted(by_id)[0]
    preserve_paused = project_state == "paused" or any(not job["enabled"] for job in matches)
    operations: list[dict[str, Any]] = [
        {"action": "update", "job_id": selected_id, **_desired_job(config)}
    ]
    if preserve_paused:
        operations.append({"action": "pause", "job_id": selected_id})
    for duplicate in sorted(job_id for job_id in by_id if job_id != selected_id):
        operations.append({"action": "remove", "job_id": duplicate})
    return CronPlan(selected_id, preserve_paused, operations)


def stage_created_cron_job(
    plan: CronPlan,
    create_result: dict | str,
) -> CronCreateStage:
    """Bind a create response before any required post-create pause.

    Execute only the plan's create call first. Feed its official response here,
    execute the returned pause immediately, then perform a fresh exact-one list
    readback. This avoids inventing a pause operation before the scheduler has
    assigned the canonical job ID.
    """
    if len(plan.operations) != 1 or plan.operations[0].get("action") != "create":
        raise ContractError("cron plan is not a staged create")
    if isinstance(create_result, str):
        try:
            create_result = json.loads(create_result)
        except json.JSONDecodeError as exc:
            raise ContractError("invalid cron create JSON") from exc
    if not isinstance(create_result, dict) or create_result.get("success") is not True:
        raise ContractError("unsuccessful cron create result")
    desired_name = plan.operations[0].get("name")
    if create_result.get("name") != desired_name:
        raise ContractError("cron create response name drift")
    job_id = _safe_component(create_result.get("job_id"), "created cron job id")
    operations = (
        [{"action": "pause", "job_id": job_id}]
        if plan.pause_created_job
        else []
    )
    return CronCreateStage(job_id, operations)


def validate_cron_readback(
    list_result: dict | str,
    config: ProjectConfig,
    job_id: str,
    preserve_paused: bool,
) -> str:
    """Require a fresh exact-one, exact-definition official list readback."""
    job = _validate_exact_current_binding(list_result, config, job_id)
    if preserve_paused != (job["enabled"] is False):
        raise ContractError("cron readback pause drift")
    return job_id


def _validate_exact_current_binding(
    list_result: dict | str,
    config: ProjectConfig,
    job_id: str,
) -> dict[str, Any]:
    """Validate exact identity and definition independent of enabled state."""
    _safe_component(job_id, "job id")
    jobs = _jobs_from_list(list_result)
    matches = [job for job in jobs if _scope_matches(job, config)]
    if len(matches) != 1 or matches[0]["job_id"] != job_id:
        raise ContractError("cron readback is not exact-one bound job")
    job = matches[0]
    _assert_exact_binding(job, config)
    desired = _desired_job(config)
    for key in ("name", "schedule", "deliver", "script", "workdir"):
        if job.get(key) != desired[key]:
            raise ContractError(f"cron readback drift: {key}")
    if job.get("no_agent") is not True:
        raise ContractError("cron readback is not no-agent")
    return job


def lifecycle_operation(
    list_result: dict | str,
    config: ProjectConfig,
    project_state: str,
    job_id: str,
) -> dict[str, str] | None:
    """Return pause/remove only after validating the current exact binding."""
    _validate_exact_current_binding(list_result, config, job_id)
    if project_state == "paused":
        return {"action": "pause", "job_id": job_id}
    if project_state in {"archived", "completed"}:
        return {"action": "remove", "job_id": job_id}
    if project_state == "active":
        return None
    raise ContractError("unknown project lifecycle state")


def validate_lifecycle_readback(
    list_result: dict | str,
    config: ProjectConfig,
    project_state: str,
    job_id: str,
) -> bool:
    jobs = _jobs_from_list(list_result)
    matches = [job for job in jobs if _scope_matches(job, config)]
    if project_state == "paused":
        validate_cron_readback(list_result, config, job_id, preserve_paused=True)
        return True
    if project_state in {"archived", "completed"}:
        if matches:
            raise ContractError("removed watchdog still present")
        return True
    raise ContractError("unsupported lifecycle readback state")


_RUNTIME_TEMPLATE = r'''#!/usr/bin/env python3
"""Generated deterministic Hermes project watchdog. DO NOT EDIT."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess

CONFIG = __CONFIG_JSON__
TASK_KEYS = {"id","title","body","assignee","status","priority","tenant","workspace_kind","workspace_path","branch_name","project_id","created_by","created_at","started_at","completed_at","result","skills","max_retries","model_override","provider_override","session_id","workflow_template_id","current_step_key"}
STATUSES = {"triage","todo","scheduled","ready","running","blocked","review","done","archived"}
WORKSPACE_KINDS = {"scratch","worktree","dir"}
SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
STATS_KEYS = {"by_status","by_assignee","oldest_ready_age_seconds","now"}
DISPATCH_KEYS = {"reclaimed","crashed","timed_out","stale","auto_blocked","promoted","spawned","skipped_unassigned","skipped_nonspawnable","skipped_per_profile_capped","auto_assigned_default"}

class EvidenceError(ValueError):
    pass

def integer(value, label, nullable=False):
    if nullable and value is None:
        return
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise EvidenceError("invalid " + label)

def nullable_string(value, label):
    if value is not None and not isinstance(value, str):
        raise EvidenceError("invalid " + label)

def safe_id(value, label="task id"):
    if not isinstance(value, str) or not SAFE_ID.fullmatch(value):
        raise EvidenceError("unsafe " + label)
    return value

def validate_task(row):
    if not isinstance(row, dict) or set(row) != TASK_KEYS:
        raise EvidenceError("invalid complete task schema")
    safe_id(row["id"])
    if not isinstance(row["title"], str):
        raise EvidenceError("invalid task title")
    for key in ("body","assignee","tenant","workspace_path","branch_name","project_id","created_by","result","model_override","provider_override","session_id","workflow_template_id","current_step_key"):
        nullable_string(row[key], "task " + key)
    if row["status"] not in STATUSES:
        raise EvidenceError("unknown task status")
    integer(row["priority"], "task priority")
    if row["workspace_kind"] not in WORKSPACE_KINDS:
        raise EvidenceError("unknown workspace kind")
    integer(row["created_at"], "created_at")
    for key in ("started_at","completed_at","max_retries"):
        integer(row[key], key, nullable=True)
    if not isinstance(row["skills"], list) or not all(isinstance(v, str) and SAFE_ID.fullmatch(v) for v in row["skills"]):
        raise EvidenceError("invalid task skills")
    return row

def validate_tasks(value):
    if not isinstance(value, list):
        raise EvidenceError("task list must be a JSON array")
    rows = [validate_task(row) for row in value]
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise EvidenceError("duplicate task ids")
    return rows

def validate_stats(value, tasks):
    if not isinstance(value, dict) or set(value) != STATS_KEYS:
        raise EvidenceError("invalid stats schema")
    by_status = value["by_status"]
    by_assignee = value["by_assignee"]
    if not isinstance(by_status, dict) or not isinstance(by_assignee, dict):
        raise EvidenceError("invalid stats maps")
    observed = {}
    observed_assignees = {}
    for row in tasks:
        observed[row["status"]] = observed.get(row["status"], 0) + 1
        if row["assignee"] is not None:
            bucket = observed_assignees.setdefault(row["assignee"], {})
            bucket[row["status"]] = bucket.get(row["status"], 0) + 1
    for status, count in by_status.items():
        if status not in STATUSES:
            raise EvidenceError("unknown stats status")
        integer(count, "status count")
    if by_status != observed:
        raise EvidenceError("conflicting status counts")
    clean_assignees = {}
    for assignee, counts in by_assignee.items():
        safe_id(assignee, "assignee")
        if not isinstance(counts, dict):
            raise EvidenceError("invalid assignee counts")
        clean = {}
        for status, count in counts.items():
            if status not in STATUSES:
                raise EvidenceError("unknown assignee status")
            integer(count, "assignee count")
            clean[status] = count
        clean_assignees[assignee] = clean
    if clean_assignees != observed_assignees:
        raise EvidenceError("conflicting assignee counts")
    age = value["oldest_ready_age_seconds"]
    if age is not None and (not isinstance(age, (int, float)) or isinstance(age, bool) or age < 0):
        raise EvidenceError("invalid ready age")
    integer(value["now"], "stats now")

def validate_running(all_tasks, running_tasks):
    expected = {row["id"] for row in all_tasks if row["status"] == "running"}
    supplied = {row["id"] for row in running_tasks}
    if any(row["status"] != "running" for row in running_tasks) or supplied != expected:
        raise EvidenceError("conflicting running evidence")
    return len(expected)

def run_json(argv):
    result = subprocess.run(argv, cwd=CONFIG["workdir"], text=True, capture_output=True, timeout=45, check=False)
    if result.returncode != 0 or result.stderr or len(result.stdout.encode("utf-8")) > 1048576:
        raise EvidenceError("Hermes command failed")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise EvidenceError("invalid Hermes JSON") from exc

def validate_id_list(value, label):
    if not isinstance(value, list):
        raise EvidenceError("invalid " + label)
    result = [safe_id(item) for item in value]
    if len(result) != len(set(result)):
        raise EvidenceError("duplicate ids in " + label)
    return result

def validate_dispatch(value, ready_ids):
    if not isinstance(value, dict) or set(value) != DISPATCH_KEYS:
        raise EvidenceError("invalid dispatch schema")
    integer(value["reclaimed"], "reclaimed")
    integer(value["promoted"], "promoted")
    for key in ("crashed","timed_out","stale","auto_blocked","skipped_unassigned","skipped_nonspawnable","auto_assigned_default"):
        validate_id_list(value[key], key)
    spawned = value["spawned"]
    if not isinstance(spawned, list) or len(spawned) > 1:
        raise EvidenceError("dispatch exceeded max one")
    for row in spawned:
        if not isinstance(row, dict) or set(row) != {"task_id","assignee","workspace"}:
            raise EvidenceError("invalid spawned record")
        task_id = safe_id(row["task_id"])
        safe_id(row["assignee"], "spawned assignee")
        if not isinstance(row["workspace"], str) or task_id not in ready_ids:
            raise EvidenceError("invalid spawned task")
    capped = value["skipped_per_profile_capped"]
    if not isinstance(capped, list):
        raise EvidenceError("invalid capped records")
    for row in capped:
        if not isinstance(row, dict) or set(row) != {"task_id","assignee","current"}:
            raise EvidenceError("invalid capped record")
        safe_id(row["task_id"])
        safe_id(row["assignee"], "capped assignee")
        integer(row["current"], "capped current")
    return value

def emit_blocker(reason):
    print(json.dumps({"kind":"blocker","marker":CONFIG["marker"],"board":CONFIG["board"],"dispatched":0,"reason":reason}, sort_keys=True))

def verify_identity():
    expected_script = Path(CONFIG["profile_home"]) / "scripts" / CONFIG["script_filename"]
    if Path(__file__).resolve() != expected_script.resolve(strict=True):
        raise EvidenceError("installed script identity drift")
    if Path.cwd().resolve(strict=True) != Path(CONFIG["workdir"]):
        raise EvidenceError("workdir identity drift")
    if os.environ.get("HERMES_HOME") != CONFIG["profile_home"]:
        raise EvidenceError("profile identity drift")
    for env_name in ("HERMES_PROFILE", "HERMES_PROFILE_NAME"):
        if env_name in os.environ and os.environ[env_name] != CONFIG["profile"]:
            raise EvidenceError("profile identity drift")
    executable = Path(CONFIG["hermes"])
    if executable.name != "hermes" or executable.resolve(strict=True) != executable or not os.access(executable, os.X_OK):
        raise EvidenceError("Hermes executable identity drift")

def main():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    verify_identity()
    base = [CONFIG["hermes"], "kanban", "--board", CONFIG["board"]]
    commands = [base + ["list", "--json"], base + ["stats", "--json"], base + ["list", "--status", "running", "--json"]]
    tasks = validate_tasks(run_json(commands[0]))
    stats = run_json(commands[1])
    validate_stats(stats, tasks)
    running = validate_tasks(run_json(commands[2]))
    running_count = validate_running(tasks, running)
    if args.dry_run:
        print(json.dumps({"kind":"dry-run","marker":CONFIG["marker"],"repository":CONFIG["repository"],"board":CONFIG["board"],"profile":CONFIG["profile"],"workdir":CONFIG["workdir"],"script":CONFIG["script_filename"],"commands":commands,"dispatched":0,"mutated":False}, sort_keys=True))
        return
    if running_count:
        return
    ready_ids = {row["id"] for row in tasks if row["status"] == "ready"}
    if not ready_ids:
        return
    dispatch_argv = base + ["dispatch", "--max", "1", "--json"]
    receipt = validate_dispatch(run_json(dispatch_argv), ready_ids)
    print(json.dumps({"kind":"dispatch","marker":CONFIG["marker"],"board":CONFIG["board"],"dispatched":len(receipt["spawned"]),"receipt":receipt}, sort_keys=True))

if __name__ == "__main__":
    try:
        main()
    except (EvidenceError, OSError, subprocess.SubprocessError) as exc:
        emit_blocker(str(exc))
'''


def render_watchdog_script(config: ProjectConfig) -> str:
    """Render the standalone script with immutable setup-time constants."""
    payload = {
        "marker": config.identity.marker,
        "repository": config.identity.repository,
        "board": config.identity.board_slug,
        "profile": config.profile,
        "profile_home": config.profile_home,
        "workdir": config.workdir,
        "hermes": config.hermes_executable,
        "script_filename": watchdog_script_filename(config),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return _RUNTIME_TEMPLATE.replace("__CONFIG_JSON__", encoded)


def script_installation_plan(config: ProjectConfig) -> dict[str, str]:
    """Return bytes/path for setup to write outside the repository."""
    content = render_watchdog_script(config)
    filename = watchdog_script_filename(config)
    path = Path(config.profile_home) / "scripts" / filename
    if path.parent != Path(config.profile_home) / "scripts":
        raise ContractError("script destination escaped profile scripts")
    return {
        "filename": filename,
        "path": str(path),
        "content": content,
        "sha256": hashlib.sha256(content.encode()).hexdigest(),
    }


def validate_script_readback(config: ProjectConfig, content: object) -> str:
    if not isinstance(content, str) or content != render_watchdog_script(config):
        raise ContractError("generated script readback mismatch")
    return hashlib.sha256(content.encode()).hexdigest()


def _read_json_object(stdout: object, label: str) -> dict[str, Any]:
    if not isinstance(stdout, str):
        raise ContractError(f"invalid {label}")
    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise ContractError(f"invalid {label} JSON") from exc
    if not isinstance(payload, dict):
        raise ContractError(f"invalid {label} object")
    return payload


def validate_dry_run_receipt(stdout: str, config: ProjectConfig) -> dict[str, Any]:
    """Mechanically prove the exact installed script performed no mutation."""
    payload = _read_json_object(stdout, "dry-run receipt")
    expected_keys = {
        "kind", "marker", "repository", "board", "profile", "workdir",
        "script", "commands", "dispatched", "mutated",
    }
    if set(payload) != expected_keys:
        raise ContractError("invalid dry-run receipt schema")
    expected_identity = {
        "kind": "dry-run",
        "marker": config.identity.marker,
        "repository": config.identity.repository,
        "board": config.identity.board_slug,
        "profile": config.profile,
        "workdir": config.workdir,
        "script": watchdog_script_filename(config),
        "dispatched": 0,
        "mutated": False,
    }
    for key, value in expected_identity.items():
        if payload.get(key) != value or type(payload.get(key)) is not type(value):
            raise ContractError(f"dry-run receipt drift: {key}")
    base = [config.hermes_executable, "kanban", "--board", config.identity.board_slug]
    expected_commands = [
        [*base, "list", "--json"],
        [*base, "stats", "--json"],
        [*base, "list", "--status", "running", "--json"],
    ]
    if payload["commands"] != expected_commands:
        raise ContractError("dry-run contained unexpected command")
    return payload
