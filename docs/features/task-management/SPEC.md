# Feature: Project task management

Status: implemented — shared SQLite revision supersedes the Beads prototype
Related issue: [#111](https://github.com/DataNavAI/no-ego-dev/issues/111)

## User outcome and scope

Humans and Hermes agents maintain durable goals, subgoals, tasks, discovered issues, dependencies, ownership, blockers, and progress through the NED CLI. NED remains a Hermes profile. The user's shared-database requirement supersedes the historical Beads recommendation: no Beads executable, adapter, metadata, or runtime service is used.

One shared NED database defaults to `~/.ned/ned.sqlite`. Configure its SQLite location with `NED_DATABASE_URL` or a task command's `--database`; explicit configuration takes precedence over the environment. `file:` URLs and filesystem paths are supported. Other database engines, remote SQL servers, dashboards, credential brokering, external tracker synchronization, deletion/reparenting, and automatic import of the previous Beads stores are outside this revision. Existing prototype data is left untouched; migration requires a separately reviewed import procedure. Shared storage does not mean actor authentication or tenant authorization.

Supporting usage: [tasks.md](../../tasks.md). Implementation: [tasks.js](../../../src/tasks.js), [database.js](../../../src/database.js), [task-cli.js](../../../src/task-cli.js). Colocated automated cases live in [tests/](tests/). All cases are credential-free; no manual acceptance or live-provider test is required for this feature.

## Requirements

- **FR-001 — Context:** Explicit, idempotent `task init`. Realpath resolves project identity; SHA-256 identifies the path within the shared database. Cwd is the default project. Actor defaults to `human:<OS username>` or accepts `agent:<id>`/`human:<id>` with 1–100 alphanumeric, dot, underscore, @, or hyphen characters. No project hooks/instructions are modified.
- **FR-002 — Shared persistence:** Tasks use the common NED SQLite module and database, not a feature-specific database. Projects, work items, dependencies, and history share the file with other NED feature records. Configure through `--database` > `NED_DATABASE_URL` > local default. Versioned schema creation is transactional/idempotent; reject unsupported engines and newer schemas without destruction. Foreign keys and project-scoped lookups enforce isolation; runtime DB/WAL/journal files stay out of packages and source control.
- **FR-003 — Hierarchy:** Fixed types goal/subgoal/task/issue, stable generated IDs, nonempty trimmed title <=500 input characters, string description <=20,000 characters, integer priority 0–4 (default 2). A subgoal requires an unfinished goal/subgoal parent in the same project. Any parent must meet that rule; parent links never block work. Fixed hierarchy prevents cycles.
- **FR-004 — Provenance:** Issues alone accept `--discovered-from`; source must exist in the current project. Provenance is independent of parent/blocking links and does not block readiness. Preserve it after resolving a same-source dependency.
- **FR-005 — Dependencies/readiness:** Compute ready work from persisted state and unresolved dependencies in a consistent read transaction. Return only open, unassigned execution work; repeated owner claims use the working state. Missing/self/cyclic/cross-project references are rejected without side effects. Duplicate edges are idempotent. Completion restores downstream readiness automatically.
- **FR-006 — Ownership:** Claim ready execution work atomically with ownership/state/history in one write transaction. At most one actor succeeds in a competing claim. Same-owner repetition is idempotent; others cannot claim working items or complete assigned work. Ownership validation and completion happen in the same transaction. Actors are labels, not authenticated identities.
- **FR-007 — Completion:** Execution work must be claimed by the completing actor first. Blocked work cannot complete. Goals/subgoals can explicitly complete only when all children are done and no dependency/blocker remains. Repeated completion is idempotent for its owner. No derived goal result silently closes a stored item.
- **FR-008 — Blockers:** `block --on <id>` adds a prerequisite; `block --reason <text> [--service <name>]` records an explicit blocker. Reject mixed forms, empty/oversize reasons, completed work, and mutation of another actor's claim. Service makes `requiresUserAction=true`; no credentials are stored. Unblock clears only explicit metadata and re-evaluates dependencies; a second unblock fails. Reclaim after unblock uses the existing owner when applicable.
- **FR-009 — Visibility:** Status counts execution tasks/issues. Tree progress counts descendant execution leaves once and rounds completed/total*100. Empty unfinished/done goals show 0/100%. Aggregate goal precedence: all leaves done, any working, any blocked, otherwise planned. Preserve `storedStatus`; get/list return stored/readiness state. Honor explicit parent blockers in the aggregate state. Detect invalid orphan/cyclic hierarchy rather than omit work.
- **FR-010 — Reads/history:** Normalized records contain IDs, project, types, titles, descriptions, priority, parent, dependency IDs, provenance, assignee/creator, timestamps, blocker, and applicable goal ID. Immediate children differ from recursive tree. Persist attributable ordered creation/dependency/claim/block/unblock/completion events with previous and resulting values. Reads and idempotent retries do not append mutation events.
- **FR-011 — CLI:** Preserve goal/subgoal/task/issue commands and ready/status/tree. `task` is the generic item noun; others enforce type. Strictly validate flags, IDs, actor, integer priority, argument counts, and transitions before mutation. JSON writes one stdout result on exit 0; errors write `{error,message}` to stderr with exit 2 for domain/configuration/setup errors or 1 for DB failure. Default output is readable. Parameterize SQL; never execute title/description as code. Close owned DB connections on success and failure.
- **FR-012 — Failure/recovery:** SQL mutation and its event commit together or roll back together. Busy timeout is bounded (5s default); invalid/corrupt/unwritable DB errors omit raw SQL, URL, and filesystem details. A process killed inside a transaction leaves no partial work/event; restart reads committed state. A response lost after commit is uncertain: inspect history/state before replaying create, which has no exactly-once token. Persisted unsupported schema or invalid hierarchy fails clearly.
- **FR-013 — Packaging/independence:** Include shared DB implementation and task usage/spec docs; exclude colocated test fixtures and all runtime DB files. Operations require no Beads, Daytona, Telegram, model OAuth, or Hermes process. The retired hosted-workspace commands (`create`, `chat`, `doctor`, `repair`, `reset`, `pair`, `destroy`) reject with exit 2 and local-task usage before network, credential lookup, prompts, telemetry or local-state changes. Existing unrelated regression tests remain runnable. Profile archive includes the behavior/usage docs without tests or runtime data.
- **FR-014 — Domain boundary:** Other NED features can use the same DB module and namespaced feature records without task initialization overwriting their data. Legacy workspace ownership files and retained telemetry JSON stores are not silently migrated or deleted. Future HTTP adapters use the domain API and add their own authentication. GitHub Issues tracks development of NED itself; the task CLI tracks work performed by a NED agent for its user's project.

## Critical user journeys

- **CUJ-001 — Initialize/reuse:** Human/agent with an existing project initializes shared storage, creates work, and repeats initialization. Critical for durable first/repeat use with no repository edits. Missing setup/config/DB access must explain recovery. TC-001, TC-010, TC-011.
- **CUJ-002 — Plan/discover:** Agent builds goal → subgoal → execution work and records discovered issues. Critical to connect execution to user outcomes; invalid references must not create work. TC-002, TC-003.
- **CUJ-003 — Claim/finish:** Two agents compete for ready work; one owner verifies then completes it. Critical to prevent duplicate ownership and unauthorized completion; repeat owner operations are idempotent. TC-004, TC-005.
- **CUJ-004 — Follow dependencies:** Planner blocks B on A, rejects cycles, completes A, and sees B ready. Critical to compute scheduling rather than ask the LLM to guess. TC-005.
- **CUJ-005 — Resolve user action:** Agent records missing-access reason; human resolves it externally; agent clears explicit blocker and retries without restarting Hermes. Critical to preserve context; remaining dependencies still apply. TC-006.
- **CUJ-006 — Supervise:** Human reads counts, nested progress and history independently of chat. Critical for accurate visibility; derived completion remains distinct from stored closure. TC-007, TC-008.
- **CUJ-007 — Resume/isolate:** A new client process resumes P while Q sees only its own work in the same database. Critical for persistence/project separation; moved paths are new identities, symlinks are aliases. TC-001, TC-008.
- **CUJ-008 — Recover safely:** Human/agent sends malformed requests or encounters DB failure/interruption; errors are bounded and committed state is inspected before retry. Critical for actionable errors and absence of partial writes. TC-009, TC-010.

## Detailed test cases

All tests use disposable homes/projects/SQLite files and clean them in `t.after`; no real credentials or live resource cleanup applies. Commands are invoked from the checkout through `node bin/ned.js`, with HOME and `--project` set to the disposable context. Returned IDs are used literally. Every `TC-NNN` file covers the required variants below through named subtests/assertions. No case is manual, skipped, or considered covered by an unrelated passing test. Independent-process races and interrupted transactions use disposable workers.

### TC-001: Initialize and reuse shared storage

- Journey / requirements: CUJ-001, CUJ-007 / FR-001, FR-002, FR-013, FR-014.
- Level / automation: integration and unit assertions in [TC-001.test.js](tests/TC-001.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Existing empty P/Q, disposable HOME, unrelated namespaced feature record and sentinel instructions.
- When / ordered steps: Initialize P, create task, initialize again, reopen through a symlink; compare default/env/explicit database locations; inspect Q and sentinel files.
- Then / assertions: One shared SQLite DB preserves unrelated records and task IDs. P alias uses same identity, Q differs; no project hooks/instructions change. Before init reads fail not_initialized.
- Variants / negative cases: Default path, explicit URL precedence, cwd resolution, invalid directory/actor/unsupported URL, schema idempotency, namespace sharing and isolation.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-002: Create and inspect hierarchy

- Journey / requirements: CUJ-002 / FR-003, FR-010, FR-011.
- Level / automation: integration and unit assertions in [TC-002.test.js](tests/TC-002.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Initialized P, actor planner, synthetic Login/Security/OAuth titles.
- When / ordered steps: Create goal/subgoal/task, inspect typed lists/children/get; try invalid parents and title/description/priority boundaries.
- Then / assertions: Stable records link G→S→A with goalId=G; priority/description/creator preserved. Invalid creation leaves counts/events unchanged.
- Variants / negative cases: Orphan subgoal, absent/foreign/task/done parent, exact title/description limits, empty/nonstring fields, integer bounds and noun/type mismatch.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-003: Record discoveries independently

- Journey / requirements: CUJ-002 / FR-004, FR-005, FR-010.
- Level / automation: integration and unit assertions in [TC-003.test.js](tests/TC-003.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Unfinished task A, goal/subgoal S and ready issue B.
- When / ordered steps: Create B discovered from A with/without parent, inspect readiness, then block on A and resolve A.
- Then / assertions: Provenance remains A, parent independent, discovery alone does not block; explicit dependency blocks and then restores readiness.
- Variants / negative cases: Missing/foreign source, non-issue discovery option, coexistence with same-source dependency, persistence and activity.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-004: Claim and complete with atomic ownership

- Journey / requirements: CUJ-003 / FR-006, FR-007, FR-012.
- Level / automation: integration and unit assertions in [TC-004.test.js](tests/TC-004.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Ready A, two independent worker processes with different actors and one shared DB.
- When / ordered steps: Race claims, inspect winner, repeat owner claim, try loser claim/completion/blocking, finish with owner, repeat completion.
- Then / assertions: Exactly one owner wins; loser cannot mutate work. Same-owner retries add no events. Completion/event remain atomic.
- Variants / negative cases: Goal/blocked/done claims, unclaimed completion rejected, cross-actor changes rejected, two DB connections and independent-process contention.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-005: Block on prerequisites and reject cycles

- Journey / requirements: CUJ-003, CUJ-004 / FR-005, FR-007, FR-008.
- Level / automation: integration and unit assertions in [TC-005.test.js](tests/TC-005.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Open A/B/C and a goal with unfinished children.
- When / ordered steps: Block B on A, repeat edge, query ready, try self/cross/multi-edge cycles, complete A, inspect B; attempt premature goal closure.
- Then / assertions: Only unresolved dependencies block; cycles/missing edges change nothing; duplicate link has one edge/event. B restores readiness, not completion. Goal closure requires done children.
- Variants / negative cases: Self, reverse and longer cycles, foreign/missing IDs, completed item blocker, dependencies of goals, unblock on dependency-only work.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-006: Explain external blockers and resume

- Journey / requirements: CUJ-005 / FR-008, FR-011, FR-013.
- Level / automation: integration and unit assertions in [TC-006.test.js](tests/TC-006.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Ready or owned execution item, synthetic GitHub service, no credential/provider process.
- When / ordered steps: Block with reason/service, refuse start/done, unblock, reclaim/finish; repeat with another unresolved prerequisite.
- Then / assertions: Explicit metadata indicates required user action, clears on unblock, and remaining dependencies still block. No OAuth call or restart occurs.
- Variants / negative cases: Reason-only, empty/oversize reason/service, mixed flag modes, owner checks, done item block, repeated unblock, owner retention and recovery.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-007: Derive progress and preserve stored state

- Journey / requirements: CUJ-006 / FR-009, FR-010.
- Level / automation: integration and unit assertions in [TC-007.test.js](tests/TC-007.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Nested goals with execution leaves done/ready/working/blocked; empty and standalone items.
- When / ordered steps: Inspect counts/tree/progress/get at 0/50/100%, mixed states, empty goals and explicit parent blockers; inject invalid hierarchy in a disposable DB.
- Then / assertions: Counts exclude hierarchy/events; leaves counted once; exact rounding/precedence; derived state does not close stored goals. Corrupt hierarchy fails rather than disappear.
- Variants / negative cases: Empty unfinished/done goals, nested rounding, standalone task root, working vs blocked precedence, manual parent blocker, invalid goal query, orphan/cycle.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-008: Resume and inspect attributable history

- Journey / requirements: CUJ-006, CUJ-007 / FR-002, FR-010, FR-014.
- Level / automation: integration and unit assertions in [TC-008.test.js](tests/TC-008.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: P contains completed work, Q initialized empty in same shared file; clients close before restart.
- When / ordered steps: Reopen via new service and CLI process; inspect records/children/events; try P IDs in Q; read repeatedly; move/canonicalize path.
- Then / assertions: P retains state, timestamps/provenance/ownership; ordered events have expected actor/old/new values. Q cannot read or mutate P records. Reads do not write history.
- Variants / negative cases: Fresh process persistence, foreign IDs in every relation/mutation, immediate vs recursive children, symlinks and moved paths, shared feature record preservation.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-009: Validate CLI and safe data/output

- Journey / requirements: CUJ-008 / FR-001, FR-003, FR-004, FR-011, FR-013.
- Level / automation: integration and unit assertions in [TC-009.test.js](tests/TC-009.test.js); named variants are mandatory. Retired-command process variants use a temporary HOME with synthetic legacy state/key files, a network-blocking preload, and no credential tools on PATH. Each command exits 2, writes local-task usage only to stderr, and leaves state and credentials byte-identical. Network attempts fail the test. Cleanup removes only test-owned files.
- Preconditions / fixtures / Given: Initialized disposable context, stdout/stderr capture and factory sentinel; no external authorization.
- When / ordered steps: Run malformed arguments and valid operations in JSON/readable mode; create literal SQL/shell-looking titles and inspect database/sentinel.
- Then / assertions: Invalid requests produce exit 2 structured stderr without mutation. Valid results use stdout/exit 0; data is literal; connections close. Retired commands reject before network/authentication and preserve legacy files.
- Variants / negative cases: Unknown/repeated/missing flags, arity, IDs/actor/priority whitespace coercion rejected, type mismatch, unknown actions, exact JSON schema/channel, child-process safety.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-010: Recover from DB errors and interrupted mutations

- Journey / requirements: CUJ-001, CUJ-006, CUJ-008 / FR-002, FR-011, FR-012.
- Level / automation: integration and unit assertions in [TC-010.test.js](tests/TC-010.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Disposable invalid/corrupt/locked/newer-version DBs, SQL trigger to abort event insertion, worker with open transaction.
- When / ordered steps: Attempt init/read/write, inject event failure, kill worker mid-transaction, reopen and inspect records/history; inspect state after simulated lost response.
- Then / assertions: Failures omit raw SQL/paths/input. Failed and interrupted mutations leave neither item change nor orphan event; busy wait bounded; newer schemas preserved. Committed lost-response state is discoverable, not replayed automatically.
- Variants / negative cases: Unsupported configuration, non-directory/unwritable path, corrupt file, newer schema, invalid stored JSON, closed DB, real lock timeout, crash rollback, read-only operation failure.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

### TC-011: Package docs and exclude runtime DBs

- Journey / requirements: CUJ-001 / FR-002, FR-013, FR-014.
- Level / automation: integration and unit assertions in [TC-011.test.js](tests/TC-011.test.js); named variants are mandatory.
- Preconditions / fixtures / Given: Dependencies installed, disposable packaging checkout with synthetic DB/WAL/journal/Beads/test fixtures.
- When / ordered steps: Inspect npm dry-run manifest and profile archive against a shared distribution contract.
- Then / assertions: Packages contain the distribution, shared DB/tasks/docs/spec, current CLI/browser guides and complete identity skill; exclude credentials, caches, repository metadata, runtime SQLite/Beads data and colocated tests. Credential-free task execution is covered by TC-001 and TC-009.
- Variants / negative cases: All SQLite sidecar suffixes, nested fixture DBs, preserved broader regression discovery, usage/spec documentation paths and default installer runtime compatibility.
- Cleanup: close all DB connections and child processes; remove only test-created directories through fixture cleanup; verify no source-tree state.
- Pass evidence: all assertions in this case and its subtests pass with no skip/cancel; runner output identifies this case. Live/manual/authentication QA is inapplicable because all inputs and databases are synthetic/local.

## Coverage and acceptance

| Requirement | Cases |
| --- | --- |
| FR-001 | TC-001, TC-009 |
| FR-002 | TC-001, TC-008, TC-010, TC-011 |
| FR-003 | TC-002, TC-009 |
| FR-004 | TC-003 |
| FR-005 | TC-003, TC-005 |
| FR-006 | TC-004 |
| FR-007 | TC-004, TC-005 |
| FR-008 | TC-006 |
| FR-009 | TC-007 |
| FR-010 | TC-002, TC-003, TC-007, TC-008 |
| FR-011 | TC-009, TC-010 |
| FR-012 | TC-004, TC-010 |
| FR-013 | TC-001, TC-009, TC-011 |
| FR-014 | TC-001, TC-008, TC-011 |

Run `npm run test:spec -- --all`, or select with `--feature task-management`, `--case TC-004`, or `--journey CUJ-003`. Every selected case must have an executable file. The runner rejects missing/unknown mappings and any skip/cancel. `npm test` includes broader regression coverage plus the spec gate. Run `npm run check` and `python -m pytest` before committing. Every mandatory case must pass before a commit; no external Beads or manual gate may conceal a coverage gap.

## Open questions and explicit limits

SQLite file location is configurable; PostgreSQL/MySQL/remote-engine drivers are not implemented. No hidden automatic migration of prototype Beads stores or existing workspace/telemetry JSON state. The shared DB is available to all NED features through one module and namespaced feature data, with feature schema added through versioned migrations. Local actors are trusted labels, not authenticated users. Renaming a project changes its identity; no automatic move/backup/delete command exists. A lost response after a committed create requires readback to avoid duplication. These are scope limits, not skipped test cases. Future additions must update this spec and its cases.
