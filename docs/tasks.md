# NED task management

Behavioral contract and required test coverage: [feature spec](features/task-management/SPEC.md). This file is the CLI usage guide.

NED stores project work in its shared database. No Beads installation, external task service, model authorization, cloud account, or Hermes restart is required.

All CLI task operations use Core's authenticated HTTP API. Without configuration,
the CLI starts and closes a temporary local backend (no coordinator/model dispatch).
For an existing same-profile Core/COM use `--api http://127.0.0.1:18791` or
`NED_CORE_URL`; never use the public Hub/tunnel URL. Runtime/database identities
must match. Explicit connection failures do not fall back to another store.
Operator credentials remain private files, never CLI arguments. See the
[API contract](features/core-orchestration/API.md) and
[agent skill](../skills/task-management/SKILL.md).

## Shared database configuration

The default is `<agent-home>/.ned/ned.sqlite`, selected by [runtime storage rules](cli/RUNTIME_HOME.md): explicit `NED_AGENT_HOME`, active Hermes/Codex context, then configured agent home. Standalone with no context retains `~/.ned/ned.sqlite`. Projects within one runtime share the file and are isolated by canonical project ID; different agent homes do not share tasks. Other NED features can use `openNedDatabase` from `src/database.js` and its namespaced feature records or versioned feature tables. Task initialization never replaces unrelated feature data. Existing stores remain untouched; there is no automatic migration.

Choose a different SQLite file with `NED_DATABASE_URL` or `--database`. The explicit flag wins over the environment. Local file URLs and paths are supported:

```bash
export NED_DATABASE_URL=file:/absolute/path/ned.sqlite
ned task init --project /absolute/project
ned task init --project /absolute/project --database /another/path/ned.sqlite
```

Database engine support in this revision is SQLite. PostgreSQL/MySQL/remote URLs are rejected explicitly. `:memory:` is available for programmatic temporary tests; use a file for persistence across CLI processes. The SQLite dependency is installed with the NED npm package, including its platform binding; source builds may require platform build tools if a prebuilt binding is unavailable.

The project defaults to cwd, resolved through realpath. Explicitly pass the same root path from nested working directories. Moving the project creates a different identity; symlink aliases resolve to the same project. Actors default to `human:<OS username>`; agents should pass a stable `--actor agent:<id>`. Actor labels are not authenticated identities.

## Create and inspect work

```bash
ned task init --project /absolute/project
ned goal create "Build authentication" --json
ned task create "Implement callback" --goal <goal-id> --json
ned subgoal create "Sign-in" --parent <goal-id> --json
ned task create "Implement OAuth" --parent <subgoal-id> --description "Synthetic acceptance" --priority 1 --json
ned issue create "Refresh regression" --parent <subgoal-id> --discovered-from <task-id> --json

ned goal list --json
ned task list --json
ned task get <id> --json
ned task children <id> --json
ned task history <id> --json
ned ready --json
ned status --json
ned tree --json
```

A goal is a milestone. A task can be standalone or belong to a goal via `--goal`; do not combine it with `--parent`.

Creation returns stable IDs; use them literally. Titles are nonempty and at most 500 characters, descriptions at most 20,000, and priority is 0–4 with 0 highest. A subgoal needs a parent; supplied parents must be unfinished goals/subgoals in the same project. Discovery provenance does not imply a parent or blocker. The generic `task` noun can inspect any work item; other nouns require matching types.

## Claim, block and complete

```bash
ned task block <dependent-id> --on <prerequisite-id> --json
ned task start <ready-id> --actor agent:coder --json
ned task done <id> --reason "Implemented and verified" --actor agent:coder --json

ned task block <id> --reason "Connect GitHub to continue" --service github --actor agent:coder --json
ned task unblock <id> --actor agent:coder --json
```

Ready work is computed from the database. A claim atomically records the actor, working state, and history. Another actor cannot claim or complete that work; repeated claims by its owner are idempotent. Execution work must be claimed before completion. Completion unblocks dependents automatically. Cycles and invalid references are rejected transactionally. Duplicate dependencies and repeated owner completion do not duplicate history.

Reason blockers store only explanatory metadata. Clear them after the external condition is resolved; remaining dependencies still apply. This feature does not obtain credentials or check service access. Blocked work cannot finish; another actor cannot alter a claim. Explicit goal completion requires done children. Goal progress/tree state is derived from execution leaves without changing the goal's stored state.

## Durability, errors and limits

Mutation, history and API receipt commit in one transaction; failed transactions roll back. SQLite writes serialize with a 5-second busy timeout. Use `--request-id <stable-key>` for recoverable mutations. Reuse only the same key with identical operation/arguments in the same project/actor; changed input returns `idempotency_conflict`. After an ambiguous response, read state before retrying. CLI never retries mutations automatically. No automatic import of earlier Beads prototype databases exists, and they are left untouched.

JSON success writes one result to stdout with exit 0. Errors write `{error,message}` to stderr, exit 2 for invalid input/configuration/setup/ownership and exit 1 for database failures. Raw SQL, database paths, and private inputs are omitted from DB error messages. Normal output is readable. CLI-owned connections close after each operation; programmatic callers close their service or shared database explicitly.

No generic graph editing, reparenting, deletion, cloud execution or public task-write API is included. COM provides a Goals & Tasks view of the same runtime/project. GitHub Issues/PRs may supply delivery evidence; no synchronization between those trackers is implemented.

## Publish progress and inspect attempts

```bash
ned task delivery <id> --json
ned task delivery <id> --file /private/work/delivery.json --request-id publish-1 --json
ned goal delivery <goal-id> --file /private/work/goal.json --json
ned task attempts <id> --json
ned task attempts <id> --cursor <returned-nextCursor> --json
```

Delivery files completely replace impact, remainingSeconds, estimatedFinish and
outputs; omitted fields clear. Read first and intentionally preserve wanted
outputs, omitting read-only updatedAt. Unknown estimates are null. Use actual
short documents or PNG/JPEG data URIs, not local paths or remote URLs. Bounds and
examples are in the [Core delivery contract](features/core-orchestration/API.md#delivery-metadata-for-goals--tasks).
Commands never dispatch work. Attempts return20 newest summaries per task plus
an opaque continuation; keep it unchanged and scoped to the same task/project.
Managed attempts still require verification before task completion.

## Verify all or selected spec cases

```bash
npm run test:spec -- --all
npm run test:spec -- --feature task-management
npm run test:spec -- --feature task-management --case TC-004
npm run test:spec -- --feature task-management --journey CUJ-003
npm test
npm run check
python -m pytest
```

Tests are colocated in `docs/features/task-management/tests/TC-NNN.test.js`. The runner validates spec mappings and rejects missing/unknown cases, skips, cancellations, and TODOs. Automated cases use disposable SQLite files and real loopback HTTP, including process races and crash recovery. TC-012 separately evaluates realistic skill behavior in a disposable environment; it is not a code-test pass. The commit gate runs every automated feature case, not only the selected developer subset.
