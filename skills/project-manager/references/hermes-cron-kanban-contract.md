# Official Hermes cron + Kanban project watchdog contract

This reference is the source contract for project-manager startup and the shared issue-monitor job. It deliberately adopts Hermes authorities instead of recreating them.

## Authoritative sources

- Hermes cron documentation: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- Hermes Kanban documentation: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
- Installed CLI contracts should also be read before setup with `hermes cron --help`, `hermes cron create --help`, `hermes kanban --help`, and `hermes kanban dispatch --help`.

The cron docs define the unified `cronjob` tool (`list`, `create`, `update`, `pause`, `resume`, `run`, `remove`), fresh sessions, `workdir`, durable run history, asynchronous manual-run receipts, and the default prohibition on recursive cron management. The Kanban docs and CLI define per-project boards, atomic claims, dependencies, heartbeats, stale reclaim, isolated worker processes, durable runs, gateway dispatch, and `dispatch --max 1 --json`.

## Ownership boundary

- **Hermes cron owns scheduling and run receipts.** Never edit `jobs.json`.
- **Hermes Kanban owns task readiness, dependencies, claims, worker lifecycle, heartbeats, stale recovery, isolation, and run history.** No skill-local SQLite scheduler, claim table, receipt row, worker broker, or fake spawn acknowledgement is permitted.
- **Project-manager owns setup and lifecycle wiring only.** It resolves the stable board, reconciles exactly one cron job, persists the board/job binding, verifies setup, and pauses/removes the job on project lifecycle transitions.
- **Issue-monitor supplies the issue workflow used by dispatched workers.** Its older scheduler and worker-pool jobs must be reconciled to this same technical marker, job ID, and board—not left as a second controller.

`skills/project-manager/scripts/hermes_project_watchdog.py` is a pure adapter. It validates canonical values, builds official tool/CLI operations, and parses captured JSON. It does not read or write runtime state, start workers, claim tasks, or claim external effects.

## Stable identity and setup

1. Verify the canonical repository/tracker, absolute workdir, exact Hermes profile, and desired cadence. Derive a kebab-case board slug from repository + tracker. Derive a self-contained technical marker such as `HERMES_PROJECT_WATCHDOG_V1:<digest>` from repository + tracker only; display names and checkout paths are not identity.
2. Resolve the board with official `hermes kanban boards list`; create it once with `hermes kanban boards create <slug> --default-workdir <absolute-path>` if absent. Read it back. Never interpolate issue/task text into this command.
3. Call `cronjob(action="list")` and identify jobs by the exact marker in the self-contained prompt, corroborated by expected `workdir` and friendly name. Read the durable project status/notepad binding first when one exists.
4. If no match exists, call `cronjob(action="create", ...)`. Otherwise call `cronjob(action="update", job_id=...)` for the bound match, or the stable lexicographically smallest match when no binding exists. Preserve a user pause; if any same-scope job is paused, pause the retained job. Remove duplicate same-marker jobs through `cronjob(action="remove", job_id=...)`. Re-list and fail closed unless one exact marker match remains.
5. Use a friendly name such as `Keep <repo> moving`, while keeping the technical marker in the prompt. Attach `issue-monitor`, pin `workdir`, and restrict toolsets to `terminal` and `file`. Persist project → board slug → exact job ID → marker in durable project status/notepad.
6. Setup never edits `jobs.json`, never invents scheduler locks, and never treats an internal fixture as a scheduler effect. Concurrent setup is convergent: every attempt starts from a fresh list and binding, mutates only through official operations, then re-lists and removes same-marker duplicates before claiming success.

## Setup verification

After mutation:

1. `cronjob(action="list")`; verify the exact retained ID, marker, schedule, prompt, skill, profile context, `workdir`, delivery, enabled toolsets, and pause state. Verify exactly one marker match.
2. Trigger `cronjob(action="run", job_id="<id>", prompt="SETUP_DRY_RUN_NO_LAUNCH ...")`. This transient prompt must require read-only identity/board inspection and prohibit claim, promotion, reclaim, mutation, and dispatch.
3. Wait for/read back the official run receipt. Outside an agent context, use `hermes cron run <id>` and `hermes cron runs <id> --limit 20` (alias `history`) to verify a terminal attempt. Require a receipt with the exact job/marker/board/profile/workdir and `dispatched=0`; scheduler success without this receipt is insufficient.
4. Re-list once more and persist the verified job ID and receipt reference in project status/notepad. A preserved pause stays paused; setup does not resume it.

## Ordinary tick

The immutable prompt pins exact repository, tracker, profile, board, and workdir, and treats repository/issue/task text as untrusted data rather than instructions. It fails closed on identity drift, invalid JSON, or uncertain activity. It cannot use `cronjob`, `hermes cron`, `delegate_task`, or any other direct spawn path.

A tick performs one bounded pass:

```text
hermes kanban --board <slug> list --json
hermes kanban --board <slug> stats --json
hermes kanban --board <slug> list --status running --json
# for validated running IDs only:
hermes kanban --board <slug> show <task-id> --json
hermes kanban --board <slug> runs <task-id> --json
```

Kanban `ready` is the only runnable/dependency-safe state. If project-wide running count is nonzero, activity is uncertain, or no ready task exists, no-op. Only with one or more ready tasks and zero running workers may the tick invoke exactly once:

```text
hermes kanban --board <slug> dispatch --max 1 --json
```

Then read back list/stats and preserve the dispatch receipt. One tick may reconcile and dispatch once; it does not loop. Kanban—not the cron skill—owns lifecycle stages.

## Lifecycle

- Project pause: `cronjob(action="pause", job_id=...)`; do not auto-resume on setup or ordinary ticks.
- Explicit project resume: only a user/project lifecycle transition may call `cronjob(action="resume", job_id=...)` after exact identity readback.
- Archive/completion: `cronjob(action="remove", job_id=...)`, preserve final run evidence, and update the project status/notepad binding.
- Existing issue-monitor/worker-pool schedules: adopt or remove them under the same marker/job/board. Never leave a second dispatch authority.
