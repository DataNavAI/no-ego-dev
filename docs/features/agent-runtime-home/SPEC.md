# Feature: Agent-isolated runtime home

Status: implemented — uncommitted source candidate; parent-owned manual acceptance/review/delivery pending
Related issues: [#150](https://github.com/DataNavAI/no-ego-dev/issues/150)

## User outcome and scope

CLI users and COM/native-tool agents keep runtime state within the selected agent/profile rather than sharing the OS user's store. This specification governs runtime selection; task, secret and COM contracts remain in their own specs. No automatic migration, copying, overwrite or deletion of old state is authorized. Installation, Node, caches, deployed skills and project-owned files keep their existing explicit ownership. Gateway settings still select the Hermes profile independently of Codex storage.

## Requirements

- FR-001: Select the absolute agent directory from NED_AGENT_HOME first; otherwise actual Hermes markers (HERMES_SESSION_ID, HERMES_SESSION_KEY, HERMES_SESSION_PLATFORM) select HERMES_HOME or OS ~/.hermes; otherwise CODEX_THREAD_ID/CODEX_SESSION_ID select CODEX_HOME or OS ~/.codex. Hermes outranks inherited Codex markers. Without active markers a single configured HERMES_HOME/CODEX_HOME selects it; both configured is an error requiring NED_AGENT_HOME. No context retains OS ~/.ned. Never infer runtime from directory existence, CWD or parent process.
- FR-002: Runtime root is <selected-agent-home>/.ned. Present selected roots must be nonempty absolute directory paths, not URLs or NUL-containing strings. Reject a symlink selected agent home. Missing directories are created privately on writes. Existing ownership protections in credential/vault stores remain; this is not a same-user sandbox guarantee. Resolver errors are redacted, actionable and caught by CLI/COM; help does not create runtime state.
- FR-003: Task DB, registry/activity, Hub credentials, COM logs, telemetry configuration, secret vault and exports share that runtime root. --database overrides NED_DATABASE_URL, which overrides only the default DB. Injected API home is an explicit legacy storage override, independent of ambient runtime markers; explicit env injection is supported. OS home remains separate for project labels/gateway lookup.
- FR-004: The native Hermes plugin explicitly binds its CLI child to hermes_constants.get_hermes_home unless NED_AGENT_HOME is supplied. With no Hermes package, explicit HERMES_HOME or synthetic HOME provides test/legacy fallback. CLI/Node resolution remains under OS installation home/PATH, never agent home.
- FR-005: Old shared state is untouched. Users reauthenticate and begin a new store; deliberate NED_AGENT_HOME=$HOME reuses legacy ~/.ned. No migration is automatic. Task skill guidance describes isolation without promising synchronization or moving default skill deployment.

- FR-006: `ned com` initializes an empty selected task database before publishing its listening URL, without registering or importing any project/task. Repeated starts retain existing records. Direct read-only server callers keep their existing missing-database failure behavior unless initialization is requested.

## Critical user journeys

### CUJ-001: Select and validate runtime
Actor: CLI user/agent. Critical to avoiding accidental cross-agent reads. Starting from a sanitized environment, set runtime markers/roots and resolve paths; invalid or ambiguous input fails without fallback. Correct the named environment variable and retry. Read-only resolution creates nothing.

### CUJ-002: Persist isolated work and use COM
Actor: two agents working on the same canonical project. Start with two empty temporary agent homes and a retained legacy store. Initialize/create/list via fresh CLI processes, then read through COM. A first COM start with no database returns HTTP200 and an empty project list; each agent sees only its own work. Explicit DB overrides deliberately share only the DB. Interrupted COM is stopped and awaited; old state remains unchanged.

### CUJ-003: Use private runtime stores/native sharing
Actor: Hermes agent and COM user. Start with synthetic credentials/secrets and isolated homes. Write credentials, logs, telemetry and vault exports; invoke native plugin under inherited Codex markers. Sharing uses the actual Hermes profile, not the inherited Codex home. No real provider credentials or profiles are used. Reauthentication is the recovery for a fresh isolated store.

### CUJ-004: Agent follows isolation guidance
Actor: task-management skill evaluator. Run self-contained scenarios under synthetic homes, explain deliberate sharing and preserve default skills deployment ownership. Parent owns behavioral evaluation; code tests do not assert skill prose.

## Detailed test cases

### TC-001: Resolver precedence and invalid roots
- Journey / requirements: CUJ-001 / FR-001, FR-002, FR-003
- Level / automation: unit; tests/TC-001.test.js
- Preconditions / fixtures: injected sanitized env, synthetic OS home, temporary directories for symlink check; no existing runtime state.
- Given: explicit override, active/inherited markers, single/both configured roots or no context.
- When: resolve runtime root and DB paths.
- Then: exact expected path or redacted invalid_agent_home/ambiguous_agent_home error; no directories created by pure resolution.
- Steps and assertions: table-drive each selector, marker, default and precedence; reject empty/relative/NUL/URL roots and symlink selected home; verify explicit legacy home ignores ambient markers and explicit DB precedence.
- Variants / negative cases: inactive empty markers do not identify an agent; missing configured root is valid; irrelevant lower-priority roots do not change explicit selection. Concurrency/provider auth not applicable to pure selection.
- Cleanup: remove temporary fixture; no global env mutations.
- Pass evidence: all named assertions pass.

### TC-002: Fresh CLI isolation and COM boundary
- Journey / requirements: CUJ-002 / FR-002, FR-003, FR-005, FR-006
- Level / automation: integration; tests/TC-002.test.js
- Preconditions / fixtures: real installed project Node dependencies, temp OS/agent/project directories; sanitized child env; retained standalone task DB with synthetic work.
- Given: two agents use one canonical project.
- When: fresh CLI processes initialize/create/list, override DB and launch COM; project/work endpoints require no gateway or model call.
- Then: separate task databases and project registries; COM reads the selected DB; explicit DB precedence works; malformed/ambiguous environments fail redacted without runtime writes; help remains side-effect free; old state unchanged.
- Steps and assertions: execute bounded CLI subprocesses, parse JSON work results and HTTP project/work results, stop/await COM; inspect temporary filesystem.
- Variants / negative cases: configured root initially missing, explicit root override, invalid and ambiguous env, DB override. Provider/network authentication is replaced by local synthetic adapters; no live model calls.
- Cleanup: stop processes/servers and remove only test-owned temp directory.
- Pass evidence: subprocess exits, HTTP assertions and retained-state comparisons pass.

### TC-003: Store alignment and native profile binding
- Journey / requirements: CUJ-003 / FR-002, FR-003, FR-004
- Level / automation: integration; tests/TC-003.test.js
- Preconditions / fixtures: temporary agent homes, synthetic credential and secret; local Python interpreter; no real Hermes installation needed for fixture module.
- Given: selected agent home and inherited Codex environment.
- When: write/read runtime stores and run registered native plugin with fake hermes_constants pointing at the synthetic profile.
- Then: all state resides below that profile's .ned; native result is a checked share reference, not plaintext; the Codex store is not used; installation resolution stays separate.
- Steps and assertions: exercise existing public store APIs and CLI export/share; verify returned paths/reads and untouched other home. Existing crypto/UI cases retain detailed crypto and rendering coverage.
- Variants / negative cases: injected home remains hermetic with ambient markers, operator override preserved; missing Hermes package fallback remains supported by existing fake-registration integration.
- Cleanup: remove only owned temporary files; no live credential calls.
- Pass evidence: exact paths, scoped reads and valid native reference assertions pass.

### TC-004: Skill isolation guidance
- Journey / requirements: CUJ-004 / FR-005
- Level / automation: manual; [task-management EVAL.yaml](../../../skills/task-management/EVAL.yaml), isolation scenario in its evaldata/scenarios.md
- Preconditions / fixtures: evaluator-provided disposable project and two synthetic agent homes, no live profile.
- Given: an agent resumes work in a different runtime and cannot find the first runtime's tasks.
- When: it follows task-management instructions and explains storage selection.
- Then: it does not claim synchronization/migration, does not touch real state, and only deliberately selects a shared root if instructed.
- Steps and assertions: execute the linked scenario; record commands, persisted records and explanation with secrets redacted.
- Variants / negative cases: inherited Codex markers in Hermes; explicit DB versus vault ownership.
- Cleanup: evaluator removes synthetic fixtures.
- Pass evidence: separate behavioral evaluator report; NOT RUN by automated gate.

## Coverage and acceptance

| Requirement | Journey | Cases | Evidence |
| --- | --- | --- | --- |
| FR-001 | CUJ-001 | TC-001 | Resolver matrix |
| FR-002 | CUJ-001/002/003 | TC-001/002/003 | Validation and real stores |
| FR-003 | CUJ-001/002/003 | TC-001/002/003 | DB/COM/store integration |
| FR-004 | CUJ-003 | TC-003 | Native subprocess boundary |
| FR-006 | CUJ-002 | TC-002 | Fresh COM initializes empty DB and repeat startup |
| FR-005 | CUJ-002/004 | TC-002/004 | Old-state preservation and manual skill evaluation |

Acceptance requires all automated variants complete, full lint/test:all and separate parent-owned manual evaluation/review/delivery. Writing cases is not pass evidence.

Implementation-worker evidence: TC-001 was RED through the existing DB resolver (returned OS `~/.ned/ned.sqlite` instead of the configured synthetic home) before implementation. After implementation, `npm run lint` and `npm run test:all` exited 0; all automated feature cases executed without Node skips/TODOs/cancellations. The Python regression suite reported 208 passed and 9 skipped; these are separate from automated feature cases. TC-004 remains NOT RUN; no skill behavioral pass, deployment or independent-review pass is claimed. See `/tmp/ned-agent-home-implementation.md` for the implementation handoff (local evidence, not a versioned release receipt).

## Open questions and coverage gaps

Manual skill evaluation and live profile deployment are parent-owned and not run by the implementation worker. No automatic migration is provided.
