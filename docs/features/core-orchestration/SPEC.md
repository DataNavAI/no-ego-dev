# Feature: NED coordination and execution

Status: implemented
Related issues: [#163](https://github.com/DataNavAI/no-ego-dev/issues/163); NED task `ned-2bf32de4-9df7-4544-b6e3-671da58169c9`.

## User outcome and scope

The HTTP interface is the operator family of [NED API v1](../../api.md),
implemented by Core. `/api/core/v1` remains a compatibility alias; it is not a
separate product API. The shared contract and browser families are governed by
the [NED API feature](../ned-api/SPEC.md).

### Delivery metadata extension
The operator-authenticated, idempotent delivery write and compact work projection are governed by [Communicator FR-066–070 / CUJ-024 / TC-042](../communicator/SPEC.md#goals-and-task-delivery-pane). [API reference](../../api.md#delivery-metadata-for-goals--tasks) describes the backend interface; integration tests in [TC-042](../communicator/tests/TC-042.test.js) prove validation, persistence, replacement and project isolation. This extension never starts coordination or completes tasks.

COM and trusted local tools need one headless backend for durable goals, tasks and execution. Explicitly enrolled work progresses independently of a browser, chat session or short coordinator tick. Task identity survives worker replacement. [DESIGN.md](DESIGN.md) specifies interfaces, persistence and current Hermes evidence.

Source implementation lives in `apps/core/`, with compatibility exports under `src/core/`; release acceptance remains separately gated below. Scope: versioned APIs over existing work services, durable attempts/session bindings, disabled-by-default manual/interval automations, bounded reconciliation, capability-gated Hermes run execution, metadata events and recovery. Non-goals: new COM controls, a second task database, arbitrary remote/profile execution, automatic backlog enrollment, installing/activating cron, LLM planning, cloud rollout, automatic review acceptance, or keeping all workers alive. Existing task CLI and COM routes remain compatible. See [API.md](../../api.md) for the consumer-facing API reference and [app layout](../app-layout/SPEC.md) for the separate Core/CLI/COM project roots.

## Requirements

- FR-001: Core reuses runtime-selected SQLite/task service. COM and core share authoritative project/work readers; no duplicate task-state rules or database.
- FR-002: All core HTTP reads/writes require a runtime-private operator bearer credential, exact bound loopback Host and absent/exact same-origin Origin. Actor is audit data, not authentication. Public/Hub bridges deny the whole normalized core namespace before rewriting headers, including encoded variants. No request-supplied gateway URL, key, DB path or profile. The trusted operator task-management endpoint accepts an absolute existing project directory for canonical initialization/selection; other routes use registered project IDs. See [task-management FR-015–018 / TC-013](../task-management/SPEC.md) for that additive CLI contract.
- FR-003: Project membership is revalidated before writes; absent/foreign resources return indistinguishable404. A registered project whose directory is unavailable fails closed for its own mutations/admission without disabling unrelated projects or historical diagnostics; it is not silently recreated or deleted. Bindings carry trusted configured gateway/profile identity; runtime selection follows `runtime-home.js`. No mapping inferred from titles.
- FR-004: Existing backlog is untouched. Enrollment is explicit. Blocked/completed/other-owned tasks cannot dispatch; dependencies and claims rechecked immediately before admission. Fixed trusted actor `agent:ned-core` owns claims and retains them through failure/cancellation/retry. Worker finish never completes a task/goal. Shared current-version task service, including CLI and HTTP, denies completion of tasks with attempts unless latest attempt succeeded and none is active/unverified. Authorized HTTP completion uses that canonical owner after explicit verification; actor strings alone do not authenticate HTTP.
- FR-005: Task has immutable numbered attempts and typed worker bindings. At most one active attempt per task, including unknown/awaiting_verification. Binding holds session ID, gateway/profile identity, role/index and optional authoritative delegation/parent IDs; a session cannot belong to unrelated attempts. Deterministic title combines task+attempt+role+index within100 characters but is only a redundant label.
- FR-006: Mutations require Idempotency-Key1–128 visible ASCII characters. Scope includes runtime/project/route/operator. Canonical request hash, mutation and response persist atomically. Exact replay returns original response; different body409 without effects. Records retained indefinitely initially. JSON max64KiB, instructions max16KiB; reject unknown fields.
- FR-007: A single runtime process owns external execution and upstream observation for its entire lifetime, using a held exclusive SQLite transaction on a dedicated private lock database. No timeout/PID check/manual unlink permits takeover from a living/paused owner. OS-released locking after actual process death permits recovery. Other API processes read/write control intents but never send upstream. Explicit persisted tick admits<=1 task, observes<=10 attempts, claims<=10 operations and has10s deadline. The single admission POST may await acknowledgement for the remaining tick deadline (at most10s), not an unrelated1s read budget; an expired deadline rejects before sending. Other control reads keep their1s bound. A lost/timed-out acknowledgement remains unknown and is never automatically replayed. Global capacity defaults1, trusted configurable1–4, including unknown/stopping/approval-waiting runs. A1s owner maintenance timer handles observation/control/recovery, never implicitly dispatches new work.
- FR-008: Persist immutable attempt/input/dispatch key/known session ID/title before external effects. Create-known-ID ambiguity recovers with exact GET; naming failure retries naming only. No random replacement session on conflict. Children bind only from authoritative correlated lifecycle identifiers, never prompt/text inference.
- FR-009: Run admission requires durable `/v1/runs` idempotency and retention>60s. V1 at-most-once POST persists irreversible admission-sent marker before sole POST; no replay of marked admission after ambiguity/restart, even inside retention. Pre-send crash after marker may be unknown. Stable key/body redundant, not fencing. Known run recovers via GET. Unsupported gateway leaves task APIs usable, zero model calls. No ambiguous POST replay/chat fallback/gateway upgrade.
- FR-010: Accepted Hermes run survives tick/client lifetime. Only process-lifetime owner consumes each single-consumer upstream SSE and persists observations, independently of tick expiry. GET reconciles loss; consumed/missed child events are unrecoverable and result/mapping completeness flags become false. EOF is not completion. Success becomes awaiting_verification; provider404/interrupted/restart ambiguity becomes unknown. Approval wait remains running with `waiting_for_approval` diagnostic, no automatic approval. Stop acknowledgement remains stopping until authoritative terminal.
- FR-011: Attempt states: queued/preparing/dispatching/running/stopping/awaiting_verification/succeeded/failed/cancelled/unknown. New attempt retry is explicit after failed/cancelled; unknown requires explicit operator resolution/evidence and acknowledgement of uncertain side effects first. No automatic new attempts.
- FR-012: Automation definitions default disabled; manual or interval>=60s, explicit enrolled target or task template, overlap policy skip. A nonterminal prior occurrence/attempt of the same automation, including template-created work and awaiting_verification/unknown, prevents another task/attempt; record skipped overlap. Unique automation/scheduledAt prevents duplicates. At most latest missed interval materializes, no catch-up flood or clock-backward duplicate. Pause prevents future starts, not current run termination. No dispatch scheduler/cron starts on installation/startup; owner maintenance is not scheduling authority.
- FR-013: Durable monotonic metadata ledger supports GET pagination and SSE Last-Event-ID recovery. Events contain IDs/status codes, never instructions/output/tool args/reasoning/keys. Private result GET exposes separately stored text capped1MiB with completeness/truncation flags. Metadata subscriber queue256KiB then disconnect; heartbeat15s; page limit1–100 default50. Opaque malformed/stale/foreign cursors400 without disclosure.
- FR-014: Additive transactional orchestration schema leaves canonical schema1/storage compatible. Restart recovers outbox/process ownership, never resends marked admission. Current CLI enforces verification guard; old binary cannot, so disable and stop/resolve managed work before operational rollback. Records retained; runtime data outside repo.
- FR-015: Local ledger metrics provide outcomes/unknown count/dispatch latency/skipped occurrences without payloads/external analytics. New materialization/admission fails closed at watermarks; historical reads and stop/resolution remain available subject to actual storage health. Defaults:100 definitions,32 pending attempts/occurrences combined,1000 retained attempts,50000 events,256MiB retained results,1GiB selected SQLite+WAL/SHM and512MiB minimum filesystem free bytes. Automation input snapshot>16KiB UTF-8 becomes skipped/input_too_large without truncation or partial task. Synthetic acceptance/review/remote-main merge/installed identity precede completion; rollout makes no real model/task calls.

## Critical user journeys

### CUJ-001: Execute and verify enrolled work
Actor: operator/COM backend. Critical: preserves ownership and evidence. Starting state: initialized project and ready un-enrolled task. Read catalog/task; enroll; reserve attempt; reconcile; inspect bindings/events/result; verify; complete via canonical owner service. Success: one durable execution and explicit completion. Failure/recovery: readiness conflict409; unsupported provider no dispatch; unknown stays inspectable and blocks replay.

### CUJ-002: Recover and stop safely
Actor: system coordinator/operator. Critical: effects outlive responses. Starting state: persisted dispatch. Restart at boundaries; acquire process ownership; recover unsent intent/known session/run. Marked admission without persisted run ID becomes unknown, never resubmitted. Inspect result/stop; explicit evidenced unknown resolution before new attempt.

### CUJ-003: Operate standing automation
Actor: operator/system tick. Starting state: disabled definition. Enable; tick due instant; inspect occurrence/run; pause. Success: one occurrence per scheduled instant, overlap skip, bounded missed interval; active run remains independent. Failure/readiness changes recorded without claiming success.

### CUJ-004: Consume an isolated backend
Actor: trusted tool/COM backend. Starting state: private runtime credential/catalog ID. Read/mutate through core; compare CLI/COM; reconnect feed. Success: shared authority and no cross-project/runtime/tunnel access. Invalid auth/resource calls cause no state/provider effects.

## Detailed test cases

The following cases have executable Node tests under this feature's `tests/` directory. Their existence does not itself establish a pass: release evidence records exact commands and candidate identity. Tests use real temporary SQLite, disposable homes/projects and a deterministic fake loopback Hermes. Teardown closes DBs/streams/servers, terminates owned children and deletes only test-owned files. No live auth/models/private histories are used. Each test supplies synthetic credentials/instructions and inspects persisted state, not source text.

### TC-001: Authoritative facade and access boundary
- Journey / requirements: CUJ-004 / FR-001–FR-003, FR-014.
- Level / automation: integration; `tests/TC-001.test.js`.
- Preconditions / fixtures: runtime A/B, projects A/B, task CLI-created ready task, private operator token A.
- Given: assembled COM/core share A DB.
- When: read work, API-create goal/task, read through CLI; issue unauthorized/bridged/foreign requests.
- Then: same IDs/statuses across consumers; missing/bad token401, bad Host/Origin403, every core bridge route403 even valid token, foreign resource404; no failure mutation/provider calls.
- Steps and assertions: exercise direct HTTP plus actual Hub/public bridge, raw/encoded letters/slashes/dot segments/trailing slash/query. Reject arbitrary paths/profiles/URLs/keys, unknown fields,64KiB+1 bodies. Remove project membership between read/write and require404. Reopen B and assert untouched.
- Variants / negative cases: symlink/relative runtime selection fails; actor cannot authenticate; credential never embedded in HTML/error/log; no CORS.
- Cleanup: common teardown; compare task rows and provider capture.
- Pass evidence: exact HTTP/CLI/DB assertions and credential-free logs.

### TC-002: Explicit enrollment, claims and binding identity
- Journey / requirements: CUJ-001 / FR-004–FR-006.
- Level / automation: integration; `tests/TC-002.test.js`.
- Preconditions / fixtures: ready, blocked, completed and other-owned tasks; independent DB connections/barrier.
- Given: no enrollment and no upstream requests.
- When: enroll ready task, race two attempt requests, replay winning request and changed body.
- Then: one active attempt/claim, other409; identical replay original response; changed payload409; no dispatch until tick; blocked/completed/other-owned reject.
- Steps and assertions: reopen DB and count attempts/events; reject same session bound elsewhere/cross-project/profile parent; title mismatch cannot change binding. Readiness change before dispatch rejects. Current CLI and HTTP completion deny running/unknown/awaiting_verification with verification_required; worker finish leaves working. After verification, complete as actual agent:ned-core owner through CLI/API variants; wrong owner rejected, no impersonated transfer. Unmanaged completion unchanged.
- Variants / negative cases: missing key400;128/129 length,16384/16385 instruction boundaries; pause blocks queued admission; full IDs separate from display label.
- Cleanup: common teardown, no changes for losers/rejections.
- Pass evidence: real race outcomes, exact identities and persisted state.

### TC-003: Dispatch crash recovery and fencing
- Journey / requirements: CUJ-002 / FR-007–FR-009, FR-014.
- Level / automation: integration; `tests/TC-003.test.js`.
- Preconditions / fixtures: fake durable capability/session/run dedup store; injected clock/crash barriers.
- Given: enrolled attempt with immutable input/key/session intent.
- When: reopen after each dispatch boundary; race owners; suspend live owner immediately before send, advance fake clock beyond terminal-key retention, attempt takeover and resume original.
- Then: paused owner excludes takeover with owner_busy. After sole-send marker no process retries POST, even after retention. Kill/await exit then OS lock allows replacement, which GETs known run or marks unknown/no resend. No timeout/PID takeover.
- Steps and assertions: crash also after marker before network bytes; upstream POST<=1/execution<=1. Missing/nondurable/retention<=60 capability failed/unsupported_gateway zero POST. Definitive400/401/403 failed; network/lost response/502/503/504 unknown, no POST after tick/restart/retention expiry. Positive recovery of unmarked intent/known run GET. Tick/capacity bounds and same lock inode verified.
- Variants / negative cases: conflicting session unknown, naming failure never replacement; actual death positive recovery; paused process past any age cannot be displaced; graceful close retains lock until sends/streams closed and all operations awaited; task APIs usable unsupported. A synthetic accepted run delays its202 started acknowledgement1500ms: it remains running with known run ID, exactly one POST across later ticks/restart. Short explicit50ms admission deadline still aborts a250ms acknowledgement; an already expired deadline sends no request. Lost acknowledgement remains unknown/no replay as before.
- Cleanup: terminate fixture lifecycle, common teardown.
- Pass evidence: reopened DB plus exact upstream payload/key/execution counts.

### TC-004: Independent run, child binding, stop and verification
- Journey / requirements: CUJ-001, CUJ-002 / FR-005, FR-010, FR-011, FR-013.
- Level / automation: integration; `tests/TC-004.test.js`.
- Preconditions / fixtures: deferred run SSE, fragmented text/child/terminal events and stop acknowledgement.
- Given: tick returned while accepted run active.
- When: stream, disconnect, GET status/reconnect, stop and later settle; separately success/failure/404.
- Then: run outlives tick; trusted child IDs bind, absent correlation stays diagnostic; metadata excludes content/tools/reasoning; stop remains stopping until terminal; success awaiting_verification, task not Done.
- Steps and assertions: stop→cancelled and success→verification→succeeded→canonical completion; unknown retry409 until explicit resolution; failed retry new ID/key. Frame>64KiB fails safe, result>1MiB truncated, gap result/mapping incomplete. Run>30s without new tick keeps observing. Two live processes yield exactly one upstream subscriber; other process persists stop intent handled by owner. Kill/await owner before replacement stream; lost child history incomplete.
- Variants / negative cases: EOF/404/interrupted not new run; approval wait stays running/consumes capacity/no approval call. Queued/preparing stop cancels without admission; ambiguous dispatch stop unresolved until readback. Disable/dependency invalidation cancels before admission; definitive rejection failed; success wins stop race truthfully. Forged child cannot reassign bindings.
- Cleanup: settle/close owned lifecycle and common teardown.
- Pass evidence: actual HTTP/SSE and authoritative upstream settlement, task/attempt DB states.

### TC-005: Disabled automations, occurrences and overlap
- Journey / requirements: CUJ-003 / FR-007, FR-012.
- Level / automation: integration; `tests/TC-005.test.js`.
- Preconditions / fixtures: disabled60s interval definition, target/template, injected clock and two tick actors.
- Given: no installed scheduler or default automatic dispatch.
- When: tick disabled; enable; race due tick; repeat; advance10 intervals; roll backward; restart; pause.
- Then: disabled zero effects, one occurrence per due instant, <=1 missed occurrence, no backward duplicates; active overlap skipped; pause prevents future start only.
- Steps and assertions: inspect occurrence/nextDue/counts; manual trigger replay same occurrence. Long-running template blocks another task across ticks/restart, including unknown/awaiting_verification. Interval59/parallel400. Enable waits tick. Snapshot16384 UTF-8 bytes valid,16385 skipped/input_too_large; multibyte boundary, no truncation/partial task. Inject small definition/pending/attempt/event/result/file/free-space limits: reject materialization/admission before effects, preserve history; restore capacity/read pending state before explicit tick.
- Variants / negative cases: readiness/ownership invalidation skipped; pause before materialization leaves occurrence pending without creating a task, and pause after queueing invalidates unsent admission without stopping an admitted run; no automatic failed retry or cron artifacts; read/stop/resolve work at high watermark; actual SQLite ENOSPC truthful503, never success.
- Cleanup: disable fixture, common teardown.
- Pass evidence: DB uniqueness/counts and upstream/scheduler captures.

### TC-006: Events, privacy, migration and assembled acceptance
- Journey / requirements: CUJ-002, CUJ-004 / FR-001, FR-013–FR-015.
- Level / automation: end-to-end; `tests/TC-006.test.js`, with migration, capacity and metrics assertions at the integration layer in the same file. The child CLI → authenticated HTTP → synthetic Hermes → verification → canonical completion flow uniquely proves assembled process/configuration and caller-state continuity; lower-layer tests cannot prove that wiring.
- Preconditions / fixtures: assembled process, synthetic provider, existing task DB snapshot, distinct runtime/project.
- Given: queued→running→awaiting_verification events.
- When: paginate, reconnect Last-Event-ID, overflow slow subscriber, reopen, disable, invoke prior task executable.
- Then: monotonic durable metadata recovery, no cross-scope leakage, old task reads/writes compatible, disable no new effects; metrics contain only counts/latency.
- Steps and assertions: limits1/100 valid0/101 invalid; malformed/foreign cursor400;256KiB queue disconnect/replay;15s heartbeat controlled clock. Migration failure unchanged rows/schema; concurrent opens safe. Temporary backup/restore reproduces tasks. Operational rollback first disables/stops/resolves managed work; prior binary historical behavior does not enforce new verification. Near-capacity ledger reports diagnostic without recurring maintenance-event growth or evidence deletion. Payload/key markers absent metadata/metrics/errors.
- Variants / negative cases: credential file0600, no token HTML;503 dependency failure leaves task open; retired/disabled dispatch denied, records readable.
- Cleanup: restore only test-owned snapshot then common teardown.
- Pass evidence: assembled HTTP/process/SQLite assertions; separate redacted synthetic-provider manual walkthrough audited before release.

## Coverage and acceptance

| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-001–FR-003 | CUJ-004 | TC-001, TC-006 | [TC-001](tests/TC-001.test.js), [TC-006](tests/TC-006.test.js) |
| FR-004–FR-006 | CUJ-001 | TC-002, TC-004 | [TC-002](tests/TC-002.test.js), [TC-004](tests/TC-004.test.js) |
| FR-007–FR-009 | CUJ-002 | TC-003, TC-005 | [TC-003](tests/TC-003.test.js), [TC-005](tests/TC-005.test.js) |
| FR-010–FR-011 | CUJ-001, CUJ-002 | TC-004 | [TC-004](tests/TC-004.test.js) |
| FR-012 | CUJ-003 | TC-005 | [TC-005](tests/TC-005.test.js) |
| FR-013–FR-015 | CUJ-004 | TC-001, TC-006 | [TC-001](tests/TC-001.test.js), [TC-006](tests/TC-006.test.js) |
| FR-019, FR-020 | CUJ-005 | TC-007, TC-008 | Dedicated real-Hermes suite; [procedure](HERMES-TESTING.md), separate external acceptance; [runner/cache regressions](tests/TC-008.test.js) |

Before implementation is accepted: execute all cases and repository-wide spec/lint/Node/Python checks, independent exact-candidate review and assembled synthetic manual walkthrough; merge green reviewed candidate to remote main. Install merged commit via canonical installer, stage canonical skills and verify installed generation/core health/auth/catalog and existing COM reads. Deployment does **not** execute real task/model calls, activate cron or enroll existing backlog. Retain redacted evidence outside repo. Operator reviews unknown/failure metrics daily during rollout; feedback uses existing NED/GitHub channels. Revenue metrics inapplicable to local infrastructure.

## Real-Hermes acceptance requirements

### CUJ-005: Verify the real Hermes integration without paid inference
Actor: contributor or CI operator. Starting state: root npm dependencies and the
documented Python/uv bootstrap prerequisites. Run the dedicated Hermes acceptance
command. It provisions a pinned source/dependency cache, starts a disposable real
Hermes API gateway and model stub, exercises Core, then stops and awaits owned
processes and removes the disposable profile on success or failure. The existing
host gateway, credentials, sessions and scheduled work must remain untouched.

- FR-019: The Hermes acceptance suite, included in the default medium bucket and also directly invocable, replaces only model HTTP
  responses; Hermes API routes, agent loop, sessions, run events and persistence
  remain real. Source revision and stub version are pinned and reported.
- FR-020: Each run owns its ephemeral gateway, loopback ports, profile, Core
  database and mock model. It uses a credential-free allowlisted environment and
  denies non-loopback Python networking. Shutdown, failure and interruption clean
  up owned processes/storage without touching the user's runtime. Missing setup
  or unsupported platforms fail nonzero instead of silently passing/skipping.

Hermes's HTTP202 admission status `started` is a valid acknowledgement, normalized
internally to running; it is not terminal success. Unknown/malformed run states
remain rejected. TC-003 and TC-007 cover this provider compatibility boundary.

### TC-007: Disposable real-Hermes acceptance
- Journey / requirements: CUJ-005 / FR-019, FR-020.
- Level / automation: manual; scripted end-to-end `npm run test:core:hermes`;
  [setup and procedure](HERMES-TESTING.md). Separate from the credential-free fast
  spec gate because provisioning Hermes requires Python dependencies and network
  access on first use. The dedicated suite is automated after invocation; the
  ordinary spec runner reports this external acceptance case NOT RUN, not PASS.
- Preconditions / fixtures: isolated disposable directories; pinned Hermes and
  aimock; no production credentials; scripted model text/tool responses.
- Given: no test-owned gateway is running and no user profile is selected.
- When: invoke the dedicated command from a fresh checkout, then repeat it.
- Then: a new real gateway is started for each run; Core session/run bindings,
  pre-completion text delivery, verified completion and a tool round trip are
  observed through actual HTTP/SSE. Stop is tested while a model response is held.
  No real inference occurs; all owned listeners/processes and temporary profiles
  are removed after each run, including a deliberately failed case.
- Steps and assertions: execute the documented command; require nonzero exit for
  bootstrap failure; assert actual model request journal and Hermes/Core readback;
  use explicit stream barriers rather than timing-only assertions. Assert gateway
  process exit, refused connections and removed profile after teardown.
  If the pre-completion text assertion times out, emit a failure-only observation
  snapshot: Core state/error code, run-ID presence, result character count,
  gateway status/output count and model request/forwarded character counts. Never
  include instructions, output text, keys, or raw provider diagnostics. Verify
  snapshot shape/redaction during the cancellation case. Preserve the same
  assertion, deadline and nonzero failure; no automatic retry. Independent Core
  diagnostic reads run concurrently with one-second deadlines, followed by at
  most one one-second gateway read, so unavailable services cannot consume the
  enclosing case's cleanup budget. Unavailable metadata is reported as null.
- Variants / negative cases: model failure/stop, startup failure, external-network
  denial and repeated runs. Unsupported platform/setup is BLOCKED, never skipped.
  Existing synthetic cases retain exhaustive crash/race/retention coverage.
- Cleanup: stop only owned process groups, await exit, close model/Core servers,
  delete test-owned temporary roots. Immutable source/dependency cache may remain
  outside the repository; it contains no profile state or production credentials.
- Pass evidence: dedicated runner exit zero plus named assertions and reported
  pinned source identity. Live-provider intelligence and every model wire protocol
  are not claimed.

### TC-008: Fail-closed runner and shared dependency cache
- Journey / requirements: CUJ-005 / FR-020.
- Level / automation: integration; [TC-008.test.js](tests/TC-008.test.js).
- Preconditions / fixtures: Node on a supported POSIX host, temporary synthetic
  cache and child commands. No Hermes, credentials or network dependency.
- Given: a cold or previously verified cache, or a child handling TERM with exit0.
- When: two callers publish the same verified archive concurrently, a caller
  reads a warm/corrupt cache, or a command times out/is interrupted.
- Then: publication is atomic; warm cache inode/modified time remain unchanged;
  corrupt bytes are preserved and rejected; no staging files remain. Timeout and
  interruption reject even after exit0 cleanup. Normal exit0 succeeds; exit7 fails.
- Steps and assertions: run the named case. Use an explicit two-download barrier,
  an intentionally old timestamp and a READY handshake proving the TERM handler
  was installed; assert child exit identity plus operation rejection.
- Variants / negative cases: warm cache must not download; corrupt cache must not
  overwrite itself. Missing dependencies remain TC-007 setup failures, not skips.
- Cleanup: await every child and remove only the temporary synthetic cache.
- Pass evidence: named assertions, zero failures/cancellations/skips/TODOs.

## Open questions and coverage gaps

Deployed Hermes capability is detected, not inferred from installed source. Child events lacking trustworthy identifiers remain unmapped diagnostics; lost upstream child events cannot be reconstructed. External scheduler provisioning and COM privileged browser auth/controls are future scope. Tests inject low-space/size watermarks rather than filling a real volume to ENOSPC. Test-owned SQLite backup/restore is covered; it is not certification of an operator's external backup process. Core's private-file/OS-lock execution path is verified on supported POSIX hosts; Windows ACL-based operator-token deployment is not claimed. Live model execution is intentionally excluded from this milestone. Full gates, independent acceptance, merge and installed readback remain release requirements, not implied by source status.
