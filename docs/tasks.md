# NED task management

NED owns the work model and CLI. Beads is its single persistence backend; no task-manager selection or external tracker synchronization is implemented. Planning and decomposition remain the agent's job. A future dashboard can call the exported `createTaskService` methods instead of invoking Beads or querying its database.

## Setup

Install Beads (`bd`) 1.3.1 or newer using its official installation instructions at https://github.com/gastownhall/beads. The first supported contract was verified with 1.3.1. This does not require Daytona, ChatGPT OAuth, Telegram, or a running Hermes session.

```bash
ned task init --project /absolute/project/path
ned goal create "Build authentication" --project /absolute/project/path --json
```

Every command accepts `--project <directory>`, `--actor agent:<id>` or `--actor human:<id>`, and `--json`. The default project is the current directory, resolved through realpath; commands from different subdirectories must use the same explicit project path. The default actor is `human:<OS username>`; agents should supply a stable actor ID.

Each canonical project path gets an isolated database under `~/.ned/tasks/<sha256-of-path>/.beads/`. Initialization is explicit and idempotent, and does not edit the project's agent instructions or install Git hooks. Database state survives separate processes and Hermes sessions. Moving a project path creates a new project identity; migration is not automatic. Keep runtime state and credentials out of Git and distribution archives.

Beads' embedded mode is used initially. It serializes writes through its database; a contending process may receive a backend error and must retry after inspecting state. Atomic claims are delegated to Beads, so two actors cannot both become the owner. Multi-host synchronization and server administration are outside this CLI slice.

## Commands

```bash
ned goal create "Launch login" --description "Verified sign-in" --priority 1 --json
ned subgoal create "Authentication" --parent <goal-id> --json
ned task create "Implement OAuth" --parent <subgoal-id> --json
ned issue create "Token refresh regression" --parent <subgoal-id> --discovered-from <task-id> --json

ned task list --json
ned goal list --json
ned task get <id> --json
ned task children <goal-id> --json
ned task history <id> --json
ned task block <id> --on <prerequisite-id> --json
ned task start <id> --actor agent:coder --json
ned task done <id> --reason "Implemented and tests passing" --actor agent:coder --json

ned ready --json
ned status --json
ned tree --json
```

Use the IDs returned by creation; do not construct IDs yourself. Goals and subgoals map to Beads epics, tasks to tasks, and issues to bugs. A stored NED type distinguishes subgoals from goals. Parent links organize work without blocking it. Dependencies block work until their prerequisites close; discovered-from records provenance without blocking. Beads rejects cyclic dependencies. Priorities are 0–4, with 0 highest. Titles are required and limited to 500 characters.

`ned task` can inspect and operate on any work item ID. Other item nouns require a matching type. Creation supports title, description, priority, parent, and (issues only) discovered-from. Generic update, reparenting, custom workflows, and deletion are not exposed in this initial slice.

## States and progress

Beads open work maps to `planned`, eligible open work to `ready`, in-progress to `working`, blocked to `blocked`, and closed to `done`. Readiness comes from Beads, not agent guesses. Only ready tasks/issues can be claimed. The assigned actor completes claimed work; repeated claims by the same actor are idempotent. Completion of prerequisites restores dependent readiness automatically.

`status` counts execution tasks/issues. `tree` derives goal/subgoal status and progress from descendant execution leaves, counting each leaf once. A goal's displayed completion does not automatically close its stored record: `storedStatus` preserves that distinction, and explicit completion still uses Beads' child/blocker checks. An empty unfinished goal has 0% progress.

## User-action blockers

```bash
ned task block <id> --reason "Connect GitHub to continue" --service github --json
ned task unblock <id> --json
```

This stores `{reason, service, requiresUserAction}` metadata and prevents claiming or completing blocked work. After access is restored, unblock the task and retry the original work; no Hermes restart is needed. Unblock clears a user-action blocker, while dependency blockers resolve through prerequisite completion. This feature does not connect accounts, retrieve credentials, or implement `ned access`.

## Output and errors

Readable output is the default. `--json` writes one JSON result to stdout; errors write `{error, message}` to stderr. Exit code 0 means success, 2 means invalid input/missing setup/not-ready work, and 1 means backend failure. Backend failures deliberately omit raw subprocess output and arguments. Use `bd version` and inspect local backend availability when diagnosing failures.

The shared service exposes initialization, item creation/read/list, children, dependencies, ready work, claiming, blocking/unblocking, completion, goal progress, activity, status, and tree. No public HTTP API or dashboard is added here; future HTTP routes must authenticate users and bind their project before calling this service.

## Verification

```bash
npm test
npm run check
NED_TEST_BEADS=/absolute/path/to/bd node --test tests/ned-create/tasks.test.js
python -m pytest
```

The real-backend test creates temporary project databases and covers hierarchy, persistence, isolation, dependency cycles, automatic readiness, competing claims, discovered provenance, user-action blockers, history, and derived progress. It is skipped when `NED_TEST_BEADS` is absent. The standard unit tests still validate parsing, domain projection, project routing, and cloud-independent dispatch.
