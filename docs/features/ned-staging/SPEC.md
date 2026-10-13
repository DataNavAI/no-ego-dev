# Feature: Isolated main-tracking NED staging

Status: implemented
Related issues: [#123](https://github.com/DataNavAI/no-ego-dev/issues/123)

## User outcome and scope

The owner selected a **local Hermes NED staging profile**, with matching NED CLI/NEDCOM, to try merged changes independently of normal agent profiles. Staging tracks verified immutable `main` releases and retains its own sessions, memories, model authorization, configuration, projects and SQLite database. This is an independent named profile, not a clone of a normal profile.

The installed Hermes profile distribution installer/update owns installation semantics. Staging uses an explicit custom Hermes root outside normal `~/.hermes`, named profile `ned-staging`, and owned launch wrappers; it never changes HOME, the normal active profile, global aliases or global `ned`. Automatic controller execution uses Codex's already-authorized repository access, not credential inheritance into the staging agent.

Non-goals: remote/cloud provisioning; cloning normal profiles; copying production credentials/state/projects; enabling Telegram/gateway by default; public exposure; silently granting staging GitHub/cloud access; zero-downtime deployment; tracking unmerged branches. Artifact/task browser availability follows the selected merged revision's capabilities. Model authorization is owner-provided separately after setup; credential-free profile loading can be verified before inference.

## Requirements

- FR-001: Setup provides an explicitly named staging root outside repository checkouts, synthetic project folders and a dedicated SQLite database. It neither reads nor changes production `.ned`, Hermes configuration, credentials or global CLI launchers. Install named `ned-staging` using the native distribution installer from the verified immutable release, in a separate Hermes root. Never clone another profile or change normal active-profile/aliases.
- FR-002: An owned staging launcher explicitly binds the custom `HERMES_HOME`, named profile, staging-only shared-auth directory, `GH_CONFIG_DIR`, database and IFA credential policy. It sanitizes inherited provider/service credential environment variables, rejects database/profile/root overrides, and fails closed on global/cross-profile fallback. NED CLI wrapper uses a verified pinned private Node runtime; the Hermes wrapper uses the inspected installed Hermes runtime. Normal HOME remains unchanged. Model authorization needs explicit owner action; no credentials are copied.
- FR-003: User-started staging NEDCOM serves a stable loopback-only URL on a chosen unused port; no gateway or always-on daemon is required. Updates defer while a profile session, communicator or writer is active, preserving user work. Occupied ports fail clearly without stopping unrelated processes. Health and project-list smoke checks must pass before the instance is announced ready. Logs and receipts identify the active immutable SHA without credentials or project content.
- FR-004: A recurring Codex automation reconciles `main` after setup. Only the exact current main SHA with all configured required main-push workflow jobs successful may promote. Missing, pending, cancelled, stale, failed or ambiguous results fail closed. No new SHA causes no build, restart or data reset.
- FR-005: Updates prepare a clean manifest-owned profile source independently of the CLI dependency installation (native installer rejects all source symlinks), build immutable release directories, verify source/runtime/dependency identities and local smoke checks, then serialize promotion. Candidate preparation preserves the current service and staging data. Native profile update refreshes distribution-owned SOUL/AGENTS/skills from the immutable release while preserving existing config/auth/.env/sessions/memories; no force-config or install --force is used. SHA-bound source hashes and a fresh credential-free runtime prompt/skill loading probe must pass. Final promotion rechecks main SHA and CI identity. Unmerged or superseded candidates never become current.
- FR-006: Failed promotion restores the prior verified release and matching pre-promotion SQLite backup and protected full staging-profile snapshot, then verifies bounded CLI health; the configured stable URL is available when the owner starts NEDCOM. Interrupted promotion has a durable recoverable transaction record. Concurrent updates converge to one promotion. Live owned children/background groups survive launcher/controller death and block mutation. Completed owned groups converge after verified quiescence; interrupted uncertain ownership requires the guarded recover-work action or investigation. Unknown processes are never killed from an unverified PID file.
- FR-007: Staging SQLite and profile config/auth/.env/session/memory data survive ordinary updates. Profile snapshot/restore occurs only while the profile is quiesced; sensitive snapshot contents remain local with restrictive permissions and are never printed or committed. No public destructive reset is exposed. Any future destructive reset requires an explicit owner request; backup/restore is tested before migration-bearing updates. Automatic reconciliation stops on incompatible schema or failed restore rather than discarding data.
- FR-008: The owner can inspect active SHA, last check/promotion/error and health; start/stop user-owned communicator sessions; pause/resume automation; roll back; and remove owned runtime resources while retaining data by default. Failure or required action triggers notification; unchanged healthy checks remain quiet.

## Critical user journeys

### CUJ-001: First use and repeat testing
Actor: owner. Critical because the user needs an accessible independent testing environment. Starting state: target selected, local staging root absent, pinned runtime and controller GitHub read access available. Native Hermes installer is available. Setup creates synthetic data and reports readiness/SHA; user starts communicator and optional demo at the stable URL; owner verifies the staging profile prompt and skills, browses a demo project and invokes a task command. Model login is a separate owner action if needed; missing login does not authorize fallback. Repeat use uses the same data. Port/runtime/access failure leaves normal installation intact and supplies a recovery action.

### CUJ-002: Receive merged changes
Actor: update automation. Critical because the owner requested automatic main updates. Starting state: healthy staging, required workflow identities configured. Check main and exact-SHA CI; build candidate; verify; recheck; promote; verify URL/data; record SHA. Pending/failed CI leaves current healthy release unchanged. No-change is quiet. A superseding main commit returns to reconciliation without promoting stale work.

### CUJ-003: Recover from failure or interruption
Actor: controller/owner. Critical because experimental changes must not destroy testing state. Starting state: release A serving, independent backup available, release B ready. Promotion failure/interruption restores A and its matching SQLite/profile data and records an actionable error. Recovery failure stops promotion and exposes the failure; no success or healthy claim is emitted.

### CUJ-004: Control and retire staging
Actor: owner. Critical because persistent local services and updates need a reversible lifecycle. Starting state: staging running and update automation active. Inspect; pause; stop; restart; roll back or remove owned service and automation. Data remains unless explicitly reset/removed; production installation and unrelated processes remain unchanged.

## Detailed test cases

### TC-001: Setup, command boundaries and isolation
- Journey / requirements: CUJ-001 / FR-001–003, FR-007
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: temporary staging root; sentinel normal `.ned/state.json`, normal Hermes active-profile/aliases/config/auth and database/launcher files; synthetic projects Alpha/Beta; pinned runtime fixture. Initial staging database absent.
- Given: staging is absent and production sentinel bytes/modes are recorded.
- When: native fresh profile installation and matching `task init`, `task create`, `task list`, `com` commands run through explicit staging wrappers; a fresh credential-free Hermes prompt/skill loading probe executes.
- Then: exit 0; task appears only in staging DB; stable loopback URL returns health 200 and expected synthetic project IDs; release SHA is exact; production sentinels remain byte/mode identical.
- Steps and assertions: initialize Alpha/Beta; create `Stage task` in Alpha; assert Alpha list contains it and Beta does not; GET health/projects; repeat setup and assert data retained. Assert installed SOUL/AGENTS and each owned skill digest match source, runtime prompt includes a source-bound sentinel and skill registry resolves a known skill from staging. Run database/profile/root overrides, asserting exit 2; run missing-auth resolution with fake normal-root credentials and assert no borrowing/network; exercise synthetic normal Codex/Qwen grants, provider/auxiliary/fallback overrides and normal shell-init credential/PATH sentinels, asserting no access/import/write, stage cwd and stage ned in actual native terminal foreground/background. Unsafe preserved config fails before provider/terminal loading; positive stage-only provider config is accepted by the guard; actual secret/model resolver needs separate authorized native evidence; independently set a staging model grant and assert it is preserved without exposing values.
- Variants / negative cases: absent runtime, unwritable owned root and occupied port fail before readiness; occupying process survives. Model authentication is intentionally absent during setup; fresh runtime loading is credential-free, inference remains unavailable until owner grants staging-only model access.
- Cleanup: stop owned child, await exit, remove temporary root/sentinels only.
- Pass evidence: exact output/exit, HTTP assertions, release identity, sentinel/data comparisons.

- Launch interleaving variant (FR-003/005/006): pause after selecting release A, promote verified B, then resume the second locked preflight. Refuse the stale complete identity before spawning; no A execution marker, status/data remain B. A selected identity with the same SHA but altered CLI digest also refuses; a complete unchanged B identity launches and its durable work record reconciles after exit. The automated barrier is explicit, with no timing sleep.

### TC-002: Exact-main CI gate and no-change reconciliation
- Journey / requirements: CUJ-002 / FR-004–005, FR-008
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: fake GitHub HTTP boundary supplying immutable SHA A/B/C and realistic workflow/job statuses; real temporary release/data roots; A healthy/current.
- Given: main is B while A is served.
- When: reconciliation sees success for B's configured required main-push jobs.
- Then: B alone promotes and active SHA/URL/profile source and owned-file hashes match B. Seed staging config override, synthetic .env/auth, session and memory sentinels; assert their bytes persist across native update, while changed SOUL/AGENTS/skill files refresh. A fresh process must load B prompt/skills, rather than a prior process cache.
- Steps and assertions: assert missing/pending/failure/cancelled/stale-SHA/PR-only/duplicate ambiguous runs each leave A and its data untouched; then supply exact valid success and assert one promotion. Repeat with B current and assert no install/restart/reset/notification. Change main to C during candidate preparation and assert B is discarded, current remains A until valid C completes.
- Variants / negative cases: API authentication/rate limit/offline errors preserve current and record actionable check error; unexpected workflow identities fail closed. Provider fixtures contain no real credentials.
- Cleanup: close fixture API and owned service; remove temporary roots.
- Pass evidence: release/readiness/status assertions and counted process/promotion/notification actions.

### TC-003: Promotion rollback, concurrency and interrupted recovery
- Journey / requirements: CUJ-003 / FR-005–007
- Level / automation: integration; [TC-003.test.js](tests/TC-003.test.js).
- Preconditions / fixtures: A healthy; B startup-failing fixture; SQLite with `Stage task`; separate pre-promotion SQLite backup and protected full staging-profile snapshot; independent controllers using one staging root.
- Given: A is current and verified.
- When: B promotion fails, or controller is terminated at each durable promotion boundary.
- Then: recovery serves A at the same URL with pre-promotion task and profile config/auth/session/memory data; transaction records identify failure, never false success.
- Steps and assertions: fail B startup; assert A restored and task retained; terminate at every TECH durable pending/completed phase, including source retarget, partial native update, each profile/SQLite/pointer restore and receipt-before-committed; repeat interruption during rollback; restart controller and assert deterministic rollback/convergence. Run two controllers behind an explicit barrier and assert one promotion, no duplicate serving processes. Substitute PID metadata with unrelated process and assert it survives.
- Variants / negative cases: snapshot operation/base substitution, inventory/mode/digest corruption, missing/corrupt profile snapshot or SQLite backup and failed A restart stop recovery with actionable error; schema-incompatible B is not promoted. WAL backup uses SQLite backup/checkpoint-safe API, not a bare main-file copy.
- Cleanup: stop/await all owned children and fixture unrelated process; delete temporary root.
- Pass evidence: URL/SHA/data assertions, child cleanup, transaction-state observations. Added regression variants cover killed-launcher live child refusal and quiescent recover-work; fast-child output/exit; injected flush failure without successful promotion; interrupted native archive retry with exact binary/executable-mode inventory; retained promotion-failure cause. Native configuration/foreground/background/npm probes are separate credential-free runtime evidence.

### TC-004: Service control, retention and retirement
- Journey / requirements: CUJ-004 / FR-007–008
- Level / automation: integration; [TC-004.test.js](tests/TC-004.test.js).
- Preconditions / fixtures: staging A running, synthetic data present, external scheduler registration verified separately after merge, unrelated process and production sentinels.
- Given: staging and automation are active.
- When: status, pause, stop, start, rollback and remove operations execute.
- Then: status accurately reports SHA/check/health; paused updates do not promote; stopped service releases port; restart retains data; removal unregisters only owned resources and retains SQLite and profile user data by default; normal active-profile and aliases remain unchanged.
- Steps and assertions: assert status schema and no sensitive values; scheduler registration/pause is root-owned external acceptance; user-started communicator lifecycle is verified separately; no service start/stop interface is implemented; default retirement retains data and sentinel/unrelated process survives. Public destructive reset is not implemented or claimed.
- Variants / negative cases: stale process identity cannot authorize signals; symlinked owned root or path escaping fails before removal; running update lock prevents destructive reset until quiescent.
- Cleanup: remove only owned temporary data after final assertions.
- Pass evidence: persisted records, service/port/process identity and root-owned scheduler readback after merge.

### TC-005: Owner browser acceptance at the promoted revision
- Journey / requirements: CUJ-001–002 / FR-001, FR-003, FR-005
- Level / automation: manual; procedure below; affected-scope installed IAB/native acceptance PASS, linked in [ACCEPTANCE.md](ACCEPTANCE.md).
- Preconditions / fixtures: disposable local profile installed; active SHA/CLI/profile/native archive identities recorded; synthetic Alpha/Beta; GUI files unchanged from merged project-browsing baseline. Owner install and scheduler readback occur after source review/merge.
- Given: readiness checks passed for that exact SHA.
- When: owner opens the stable URL, chooses Alpha, tests each available merged browse capability, then Beta; refreshes after update.
- Then: matching project content and revision remain coherent; absent planned capabilities are visibly unavailable; no production projects appear.
- Steps and assertions: record exact NED SHA, CLI/profile digests, complete owned Hermes archive SHA/digest, manager source identity, URL and browser version; start owned Alpha demo4216 and stage com4215 with installed wrappers; run focused affected-scope IAB desktop/newtab and 390/320 cases against the identical installed CLI/UI digest; verify synthetic project isolation, WIP demo marker, artifacts/tasks only when merged; after promotion reload and confirm release receipt + health + retained data. Record screenshots and per-interface PASS separately.
- Variants / negative cases: stopped WIP displays recovery; pending/failed update keeps prior usable UI. No LAN/phone claims from responsive desktop emulation.
- Cleanup: close only test-created tabs; preserve staging unless owner requests stop.
- Pass evidence: immutable release receipt, interface registry gate, actual browser screenshots/results. Record actual staging IAB evidence; native Safari/Chrome baseline may be reused only with an exact unchanged GUI digest and explicit provenance, never labeled a fresh native staging PASS. Staging changes profile/controller/launch guards, not GUI code; scoped native CLI/loader/terminal proof covers the changed interface. New artifact GUI changes remain independently subject to their browser gate.

## Coverage and acceptance

| Requirement | Journey | Test cases | Verification |
| --- | --- | --- | --- |
| FR-001–003 | CUJ-001 | TC-001, TC-005 | Integration and affected-scope native/browser acceptance PASS; see ACCEPTANCE.md |
| FR-004–005 | CUJ-002 | TC-002, TC-003, TC-005 | Integration and affected-scope native/browser acceptance PASS; see ACCEPTANCE.md |
| FR-006 | CUJ-003 | TC-003 | Integration implemented |
| FR-007 | CUJ-001,003,004 | TC-001, TC-003–004 | Integration implemented |
| FR-008 | CUJ-002,004 | TC-002, TC-004 | Integration implemented |

Acceptance: all applicable automated cases pass; exact-SHA local readiness succeeds; supported interface release gate passes; one verified main update and one forced rollback preserve staging data; normal-installation sentinels unchanged. TC-001–004 execute fixture-backed integration assertions; TC-005 requires separate native/owner browser evidence. Native provider/terminal behavior is not inferred from fixtures.

## Open questions and coverage gaps

- Permanent owner root `~/Library/Application Support/NED/staging` is healthy at initial main SHA `0e599dd14a0fff82eb98c048e71f03a8b12f6f52`. Native load/config/terminal/npm/ownership evidence and affected-scope installed IAB/browser/CLI acceptance passed; [ACCEPTANCE.md](ACCEPTANCE.md) separates actual results from planned checks.
- Codex heartbeat `ned-staging-updates` is registered ACTIVE every 15 minutes. Registration/readback passed; a scheduled execution has not yet been observed. Host/app availability can delay it; active owned sessions defer promotion.
- Required main-push workflows: NED CLI and Smoke test. Required jobs: test (20), test (22), macos-smoke, windows-eval-runner, install-profile. All five passed for the initial installed SHA.
- Actual verified-main promotion `0e599dd… → 5edb6ce…`, explicit rollback to `0e599dd…`, and repeat promotion to `5edb6ce…` passed. Staging task/SQLite logical state, config/env/memory and project-file hashes stayed unchanged; normal profile inventory/protected metadata stayed unchanged. Pending main CI also preserved the healthy release without building a candidate. [ACCEPTANCE.md](ACCEPTANCE.md) records the evidence. No physical power-loss claim.
- Model access remains `login_required`. Separate stage-owned OpenRouter authorization is required for chat; no normal credentials are copied. Live inference and skill behavioral evaluation are NOT RUN and are not prerequisites for credential-free browsing/install acceptance. Codex/Qwen/external fallback remain denied.
- Scheduler pause/removal is a Codex app operation, not a controller API. Pause/remove the exact schedule before runtime retirement. There is no daemon/service-control or public destructive-reset command.

Supporting design: [TECH.md](TECH.md). Operations: [RUNBOOK.md](RUNBOOK.md). Acceptance: [ACCEPTANCE.md](ACCEPTANCE.md).

Implementation ownership: manager and complete clean native Hermes runtime archive are separately pinned; automatic changes refresh NED profile distribution/CLI. Source dotenv fallback is closed with owned archive PYTHONPATH, required stage .env and environment-key/secret-source preflight; empty .env alone is insufficient. Generated root/projects/AGENTS.md has an ownership digest and actual native context loading; edits are preserved with a fail-closed error. Initial setup has an ownership-backed retry. Fixture-backed automated cases are separate from real native/browser evidence. Owner installation and scheduler readback passed; live model authorization remains optional owner work.

TC-005 scope rationale: staging adds no rendered GUI source. Focused disposable IAB actual-instance checks and unchanged-UI baseline provenance are sufficient for its web subset; locked native browsers are not an additional invented staging gate. Actual native profile load, full source identity, environment/provider/argv rejection, foreground/background shell execution and durable recovery remain mandatory. Owner install, automation ID/status and no-change readback are verified. Live model inference stays NOT RUN until authorized.
