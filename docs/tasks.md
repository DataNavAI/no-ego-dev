# NED task management

Behavioral contract and required test coverage: [feature spec](features/task-management/SPEC.md). This file is the CLI usage guide.

NED stores project work in its shared database. No Beads installation, external task service, model authorization, cloud account, or Hermes restart is required.

## Shared database configuration

The default is a local SQLite database at `~/.ned/ned.sqlite`. All projects share the file and are isolated by canonical project ID. Other NED features can use `openNedDatabase` from `src/database.js` and its namespaced feature records or versioned feature tables. Task initialization never replaces unrelated feature data. Existing workspace and telemetry JSON files remain unchanged.

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

Mutation and history commit in the same transaction; a failed or interrupted transaction rolls back. SQLite writes serialize, with a 5-second busy timeout. Reopen and inspect state/history after a response is lost; committed creation has no exactly-once request token, so blind retries can duplicate items. No automatic import of earlier Beads prototype databases exists, and they are left untouched.

JSON success writes one result to stdout with exit 0. Errors write `{error,message}` to stderr, exit 2 for invalid input/configuration/setup/ownership and exit 1 for database failures. Raw SQL, database paths, and private inputs are omitted from DB error messages. Normal output is readable. CLI-owned connections close after each operation; programmatic callers close their service or shared database explicitly.

No generic editing, reparenting, deletion, cloud execution, public HTTP task API, or dashboard is included. GitHub Issues manages development of NED itself; the task CLI records the work NED performs for user projects. No synchronization between those trackers is implemented.

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

Tests are colocated in `docs/features/task-management/tests/TC-NNN.test.js`. The runner validates spec mappings and rejects missing/unknown cases, skips, cancellations, and TODOs. All task-management cases run locally against disposable SQLite files, including process races and crash recovery; no manual or live-provider case is required. The commit gate runs every automated feature case, not only the selected developer subset.
