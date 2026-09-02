# Deterministic Hermes cron + Kanban project watchdog contract

This reference is the source contract for project-manager startup and the shared issue-monitor watchdog. It adopts Hermes authorities rather than recreating them.

## Authoritative sources

- Hermes cron documentation: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- Hermes Kanban documentation: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
- Before setup, inspect the installed `cronjob` schema plus `hermes cron --help`, `hermes kanban --help`, and `hermes kanban dispatch --help` because the installed runtime is the execution boundary.

Cron owns schedules, pause state, no-agent script execution, delivery, and run receipts. Kanban owns dependency promotion, atomic claims, heartbeats, stale reclaim, worker isolation, runtime limits, durable runs, and lifecycle stages. The watchdog owns no scheduler or worker database.

## Scope and setup-time identity

1. Verify the canonical GitHub repository, tracker, active Hermes profile, profile home, absolute canonical checkout, stable board slug, and exact resolved `hermes` executable. Reject credentials/userinfo, explicit ports, query/fragment text, encoded or literal traversal, UNC/double-slash forms, shell metacharacters, environment expansion, control characters, symlink aliases, missing paths, and non-resolved workdirs.
2. Verify the checkout's canonical remote agrees with the pinned repository before rendering. Repository files and issue/task text remain untrusted data and never select an executable, profile, board, path, or argv.
3. Resolve/create/read back one stable project board through official `hermes kanban boards ...` commands.
4. Read the active profile's effective config and require integer (not boolean/string) `kanban.max_in_progress=1`. Hermes currently scopes this setting to the **active profile runtime (all boards)**, not one board. This stronger global scope is the documented safety gate shared by CLI and gateway dispatch. Setup fails closed if the effective value cannot be read back as exactly one.
5. Resolve the exact executable once and render `skills/project-manager/scripts/hermes_project_watchdog.py` into a project-specific safe filename such as `project-watchdog-<digest>.py`. Install it under the active profile's `scripts/` directory (the profile-specific `~/.hermes/scripts/` equivalent), never inside the project repository. Read the installed bytes back and require the renderer's exact SHA-256 before activation.

The renderer and reconciliation module are pure planners. They do not write profile files, edit scheduler state, claim work, or start workers.

## Real cron schema and exact-one reconciliation

Use `cronjob(action="list", include_disabled=true)`. Parse the official result shape exactly: root `success`, `count`, and `jobs`; each job uses `job_id`, `name`, `prompt_preview`, `script`, `no_agent`, `workdir`, `enabled`, `state`, `schedule`, delivery fields, and scheduler metadata. Do not expect `id`, full `prompt`, or an invented `paused` field.

The desired recurring job is:

```text
cronjob(
  action="create" or "update",
  name="Keep <repo> moving",
  schedule="<cadence>",
  deliver="origin",
  workdir="<exact canonical checkout>",
  script=<relative safe filename>,
  no_agent=True
)
```

The job has no prompt, skills, toolsets, or LLM path. Identify it by exact generated script filename plus exact canonical workdir plus exact friendly name, corroborated with the durable bound `job_id` when present. Reject duplicate IDs, non-boolean `enabled`/`no_agent`, unknown or contradictory `state` encodings, wrong-scope/partial filename or friendly-name collisions, and a bound ID that is not the current exact binding.

Retain the bound exact match, or the lexicographically smallest exact match if unbound. If any exact duplicate is paused (`enabled=false`, `state="paused"`), pause the retained job; never implicitly resume it. Remove every exact duplicate through official calls. Then perform a **fresh** list and require exactly one matching `job_id` with exact script, `no_agent=true`, workdir, name, schedule, delivery, and expected pause state. Do not claim success from the pre-mutation list. An initially paused project with no job still requires exactly one watchdog: execute the valid `create` operation alone, parse its successful official response for the canonical `job_id`, immediately execute `pause` with that ID before the first scheduled tick, and only then fresh-list for exact-one paused readback. The planner exposes this as a staged post-create action; never invent a pre-create pause with a placeholder ID. Active projects may create/update; paused projects may update only while preserving pause; archived/completed projects remove rather than create.

Persist repository → board → script filename/hash → exact job ID in durable project status/notepad. This binding is runtime wiring, not a reason to churn repository `STATUS.md` on ordinary ticks.

## Exact installed-script dry run before activation

Before creating or enabling an active cron job, invoke the **read-back installed file** directly from the canonical workdir:

```text
<python> <active-profile>/scripts/<exact-safe-filename> --dry-run
```

The dry-run code path performs exactly these three read-only argv-array calls with the pinned executable and board:

```text
<exact-hermes> kanban --board <slug> list --json
<exact-hermes> kanban --board <slug> stats --json
<exact-hermes> kanban --board <slug> list --status running --json
```

It never invokes dispatch. Mechanically parse its closed-schema receipt and require exact marker/repository/board/profile/workdir/script identity, the three expected commands, integer `dispatched=0`, and boolean `mutated=false`. A malformed receipt, nonzero exit, stderr, byte/hash drift, or any dispatch argv blocks activation. After official cron mutation, perform the fresh exact-one list check above.

## Deterministic ordinary tick

The no-agent scheduler executes only the generated Python script. The script verifies its own installed location, canonical current workdir, exact `HERMES_HOME`, exact resolved `hermes` executable, pinned repository metadata, and board before any subprocess. Production launchd/sanitized scheduler environments may omit a profile-name variable because Hermes resolves the profile from `HERMES_HOME`; absence of both `HERMES_PROFILE` and `HERMES_PROFILE_NAME` is therefore allowed. If either variable is present, it must exactly match the pinned profile.

It uses `subprocess.run([...])` with argv arrays, a timeout, bounded stdout, no shell, and only these official commands:

```text
<exact-hermes> kanban --board <slug> list --json
<exact-hermes> kanban --board <slug> stats --json
<exact-hermes> kanban --board <slug> list --status running --json
# only after all evidence authorizes one launch:
<exact-hermes> kanban --board <slug> dispatch --max 1 --json
```

The script requires each list to be the official JSON array and validates every complete official task record: exact field set, bounded unique safe task ID, known status/workspace kind, and every field type. It validates the complete stats schema and requires status and assignee counts to match observed tasks. Every supplied running-count signal must be a non-boolean nonnegative integer and agree with both the all-task list and the filtered running list. Duplicate IDs, unknown keys/statuses/types, malformed JSON, stderr/nonzero exits, conflicting counts, identity drift, or any other uncertain evidence fail closed without dispatch.

Any running claim causes a conservative no-op, even if it appears stale. `show`/`runs` JSON does not expose the internal heartbeat fields required for independent corroboration, so this contract does not claim otherwise. The official gateway dispatcher alone performs heartbeat-based stale reclaim; a later watchdog tick may dispatch only after official state has returned the task to `ready` and every running signal is zero.

Only `ready_count >= 1` and verified `running_count == 0` may invoke dispatch, exactly once. The script validates the official dispatch result's complete schema, integer/list types, safe unique IDs, and at most one spawned ready task, then exits. It never loops, re-reads for a second pass, invokes cron/chat/delegation, or constructs argv from task content.

Output semantics:

- verified no-op (including any running claim): **empty stdout**, exit zero;
- verified dispatch: one structured dispatch receipt;
- malformed/conflicting evidence or command failure: one structured blocker receipt with `dispatched=0`;
- no prompt or agent is ever involved.

## Lifecycle

Before pause, resume, or removal, fresh-list and require the durable `job_id` to be the current exact script/name/workdir/no-agent binding. Project pause uses official `pause`; explicit resume is allowed only after a user/project transition plus exact binding readback; archive/completion uses official `remove`. After the operation, fresh-list again and require the exact job paused or absent, respectively. Never return a lifecycle operation from a syntactically safe ID alone.

Older issue-monitor or worker-pool schedules must be explicitly reconciled to this one script/job/board or retired. They must not remain a second dispatch authority. Preserve unrelated issue selection, TDD, review, exact-SHA, and merge protocols: those belong to the Kanban workers, not this watchdog.
