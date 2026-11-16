# NED Core orchestration design

Designed against NED `802db16415c5cc12de98a5b9138a50a9590b202a`; behavioral authority [SPEC.md](SPEC.md), consumer contract [API.md](API.md). Source now follows the user-requested [app project roots](../app-layout/SPEC.md); compatibility imports remain under `src/`.

## Grounding

`src/tasks.js:createTaskService` owns canonical project identity, dependency/hierarchy/claim/completion. `src/database.js` owns runtime-selected SQLite/WAL/FULL and schema1. `communicator/work.js` duplicates some projection SQL; move authoritative readers into core and retain compatibility wrapper. `server.js` loopback origin checks do not authenticate local tools. `hub.js`/`tunnel.js` rewrite trusted headers: deny normalized core namespace before forwarding.

Installed Hermes source inspected at `962e205e5e206e286658d965ca46e832debff3f4`: `gateway/platforms/api_server.py` accepts known session `id`, `title`, `source`; duplicate creation atomic409, GET and PATCH title available. `api_server_runs.py` exposes `/v1/runs`, run GET/events/stop and durable Idempotency-Key fingerprinting body+session-key. Same-key lookup precedes concurrency admission; duplicate payload converges, changed payload409. `/v1/capabilities` includes `features.runs_idempotency:{supported,durable,retention_seconds}`. Run owner scope is credential/profile-specific. Use exact same key/body recovery; no GET-by-key assumed. These are source observations, not live model execution. No invented metadata/title parameter on delegate_task. No Hermes upgrade authorized.

R2 safety refinement: that upstream same-key convergence is finite-retention behavior, not a safe indefinite fencing primitive. NED v1 therefore does **not** invoke same-key POST recovery after an ambiguous sent admission. Safe recovery means unmarked intent or GET of known session/run only; local NED mutation-response idempotency remains supported.

## Components

`apps/ned-core/src/` owns the headless facade/store/coordinator/Hermes adapter/HTTP handler. `apps/ned-com/src/` owns COM and its assets; `apps/ned-cli/src/` owns command dispatch. `ned core serve` runs loopback HTTP; COM lazily mounts the same authenticated handler under `/api/core/v1` and consumes the shared Core work reader. Existing project/filesystem readers are reused, not forked. Existing task service's shared database connection seam makes task claim+attempt/event/outbox one transaction. Old COM response shapes and source import wrappers remain compatible. Shared task/runtime/security code stays in root `src/`; shared gateway settings and ProjectError no longer require Core to depend on COM.

Core owns independent accepted-run observers, not reconcile request/browser. Tick deterministic and bounded, no LLM coordinator conversation. No background dispatch scheduling starts by default. Trusted startup configuration selects one Hermes settings/profile through existing `resolveGatewaySettings`; requests cannot override it. Store opaque origin+credential/profile fingerprint; key rotation/identity mismatch blocks continuation for operator review, never cross-profile bind. Never expose raw keys/URLs.

Enrollment authorizes eligibility but does not itself create instructions or queue execution. Only an explicit attempt request or due enabled automation creates a queued attempt. Reconcile admits those persisted attempts; it does not sweep all enrolled tasks into new runs or re-run a completed/failed attempt. Automation target input snapshots the canonical task title/description at occurrence creation; template target snapshots its validated template. Thus every admitted payload has an auditable immutable source.

## Operator auth and transport

Create32-byte random token once in `<runtime>/.ned/core/operator-token`,0700 parent/0600 file, no symlink/unsafe-owner modes; fail closed. HTTP reads/writes require bearer from private file; no token in URL/HTML/localStorage/logs. Full selected-runtime operator authority, no invented multi-user ACL. Actor only audit identity. In-process COM backend facade uses trusted process authority; existing browser read routes gain no new write privilege. Privileged browser UI/auth is future scope. Exact bound loopback Host; absent/exact Origin; no cookies/CORS. Both tunnel and Hub deny all normalized/encoded core namespace before header rewriting, even a valid bearer. Use one normalization routine that rejects malformed encodings/ambiguous paths.

## Additive schema

Separate versioned `ned_core_schema` leaves `ned_schema.version=1`. All writes BEGIN IMMEDIATE through existing guard, FK scoped by project:

- enrollments(project_id,task_id,enabled,timestamps)
- attempts(id,project_id,task_id,number,role,state,dispatch_key,request_json,request_hash,gateway_identity,session_id,run_id,admission_sent_at,admission_deadline,timestamps,error_code,result_text,result_truncated,result_complete,evidence_json)
- bindings(id,attempt_id,project_id,gateway_identity,profile_identity,session_id,role,worker_index,delegation_id,parent_session_id,expected_title,naming_state)
- automations(id,project_id,kind,enabled,interval_seconds,next_due_at,target_json,overlap_policy,revision,timestamps)
- occurrences(id,automation_id,scheduled_at,state,attempt_id,task_id,reason)
- owner(name,instance_id,generation,started_at), singleton diagnostic identity, not timeout authority
- tick_requests(id,idempotency_scope,state,counts_json,created_at,finished_at), explicit reconciliation requests only
- outbox(id,attempt_id,kind,state,owner_generation,attempt_count,next_at,payload_hash)
- idempotency(scope,key,request_hash,status,response_json)
- events(sequence AUTOINCREMENT,project_id,entity_type,entity_id,event_type,payload_json,created_at)

Use `ned_core_` table prefixes. Unique task/attempt-number, dispatch-key, automation/scheduledAt, gateway+profile+session and attempt+role+index; partial unique task active attempt index includes unknown/awaiting_verification. Outbox unique attempt/kind. Unknown blocks new execution until explicit resolution; verification settles succeeded/failed, task completion separate. Instructions/results private; ledger metadata only. Retain records/idempotency indefinitely initially, subject to fail-closed capacity below. No silent delete/automatic migration from other runtime.

## One process-lifetime execution and observation owner

Replace expiring execution leases with OS-managed SQLite exclusion. Every process opens the same private `<runtime>/.ned/core/execution-lock.sqlite` using the existing local SQLite dependency, rollback-journal mode (not WAL), and holds `BEGIN EXCLUSIVE` for its entire effect-owning lifetime. This is a dedicated lock DB, not the task DB, so normal API/task writes remain available. Acquire with immediate timeout0; SQLITE_BUSY means owner_busy/read-and-control-only mode. No lock age, PID liveness guess, generation timeout or operator unlink/replacement permits takeover. Never delete/rename/recreate this file while any core process may exist. Reject symlink/unsafe-owner paths; require same canonical runtime and stable inode/path, local filesystem supporting SQLite locking. Unsupported lock/storage environment fails closed to effects. Existing same-OS-user malicious inode replacement is outside current local operator trust boundary, not a claimed security guarantee.

SQLite's kernel-backed file locks release only when the owning connection closes or process dies. A suspended but living process keeps exclusion indefinitely; another process cannot dispatch even after provider retention expires. Generation is written to main DB only after exclusive acquisition, for audit/fencing of callbacks, not proof of death. PID is diagnostic only. Recovery needs successful OS lock acquisition, never a PID check. API hosts which lose acquisition can still read and persist control/tick requests; retry lock acquisition on a1s maintenance timer with one bounded attempt. Owner instance processes pending explicit ticks FIFO, at most1 tick at once; repeated tick IDs idempotent. Timer without explicit ticks cannot materialize occurrences or admit queued work.

Owner maintenance independently checks at most10 active runs per second (round-robin), processes stop intents and restart recovery and keeps exactly one upstream SSE subscription per run. Its authority persists after any tick's10s deadline; no30s execution/observation lease exists. Other processes never subscribe. Shutdown marks closing, stops accepting tick work, aborts and awaits all outbound requests/streams/callbacks before closing lock connection; if drain cannot finish, keep lock until process termination, never release early. Newly acquiring owner GET-reconciles persisted runs, marks potentially missed result/child mapping incomplete, then attaches at most one stream. Installed upstream SSE is destructive single-consumer, not broadcast or replay; lost child events remain explicitly unrecoverable. No synthetic child mapping from status/title.

## Canonical claim and verification authority

Use existing shared connection seam in createTaskService, not a new task implementation. Trusted core actor is fixed `agent:ned-core`, never caller-selectable. Claim plus attempt atomic; ready tasks can be claimed, same actor's working tasks may retry, other-owned tasks409. Core retains canonical claim on failed/cancelled/unknown attempts; no unsupported release/reassignment API invented. HTTP bearer holder may ask core to verify/complete, but completion invokes canonical service as its actual core owner, not an impersonated human. Local CLI remains trusted local access with existing actor contract; actor labels do not authenticate HTTP.

Add completion invariant inside canonical `completeItem` transaction in `src/tasks.js`, not only HTTP: when core tables exist and task has any attempt, latest attempt must be succeeded and no unresolved active attempt exists, otherwise verification_required. Absent core schema or no attempts preserves unmanaged compatibility. Goals still require their canonical child conditions. Current CLI and HTTP share this guard. Historical binaries cannot enforce a newly added invariant; operational rollback must first disable dispatch and stop/resolve all managed runs, then retain state with explicit warning that old executable has historical behavior. Do not promise old binaries enforce new rules.

## Dispatch state machine

1. Recheck enrollment/catalog/ready ownership/dependencies, claim task and persist queued attempt+canonical input+dispatch identity+outbox atomically. Owner processes one explicit tick at a time,<=1 admission/10 observations/10 outbox operations/10s deadline. Trusted active capacity1 default,1–4 allowed; unknown/stopping/waiting-for-approval consume capacity until explicit settlement. Queued/preparing count toward pending capacity, not active-run capacity; awaiting_verification holds task/automation overlap slot but no execution slot.
2. Known session ID `ned_<attempt UUID>`; title `ned.<task SHA256 prefix12>.<attempt UUID>.<role>.<index>`<=100 chars. Full canonical task ID separately stored. POST `{id,title,source:"api_server"}`; on lost response/409 GET exact ID and validate against persisted intent/title/source. Conflicting foreign session unknown, never overwrite. Bound-session title PATCH retry does not respawn worker. Child IDs only trusted correlated lifecycle events; label is never ownership proof.
3. Discover durable run support+retention>60s. Persist immutable `{input:<instructions>,session_id:<known ID>}`, stable key and irreversible admission_sent_at before the **sole POST**. Only live call that changed unmarked→marked can send; reading marked row never authorizes send. Restart/ambiguous outcome with marker/no run ID becomes unknown, never replayed even inside retention. Crash between marker and bytes may be unknown despite zero execution: accepted v1 at-most-once tradeoff. Definitive400/401/403 failed; lost/network502/503/504 unknown. Known run recovers GET only. Process lock excludes old paused sender and marker excludes same-owner late replay after cache expiry. Stable key redundancy, not fencing. Deadline diagnostic/pre-send validation only; no claim local clock fences suspended send. Harmless capability/session GET recovery bounded3; no ambiguous run POST retry.
4. Persist returned run ID; owner-only upstream SSE bounded64KiB frame, allowlisted child/status/text only;1MiB result cap/truncated flag. Reconnect first GET owned run. EOF not terminal,404/interrupted unknown. Stream is not durable replay; mark result/mapping incomplete after gaps rather than guess delta dedup/reconstruct output. Terminal success awaits verification even when result incomplete; explicit evidence required. Approval wait stays running with waiting_for_approval diagnostic, no automated approval control.
5. Stop intent persists; queued/preparing with no admission sent cancels locally and removes pending outbox; dispatch already sent/ambiguous moves stopping until readback or unknown. Owned run stop acknowledgement is not terminal. Success winning stop remains awaiting_verification. Unknown resolution requires evidence and uncertain-side-effects acknowledgement; settles failed/cancelled/awaiting_verification, never queued. Retry explicit new attempt after failed/cancelled, no automatic new attempt. Child lifecycle never auto-creates separate task unless explicit task model exists.

Task APIs remain available without gateway execution capability. Disabling blocks new effects, not accepted Hermes work. No real backlog dispatch during rollout.

### Closed transition and authority table

All local transitions persist one metadata event transactionally and retain task claim. Terminal succeeded/failed/cancelled are immutable except explicit retry creates another attempt; no automatic retry on later ticks. Unknown/awaiting_verification hold task and automation overlap slots. No-match event is ignored with bounded diagnostic, never guessed success.

| From | Trigger / authority | To and effects |
| --- | --- | --- |
| queued | Owner tick, enrollment/readiness/capacity valid | preparing; known-session intent only |
| queued/preparing | Operator stop or disabled enrollment/dependency invalidated before any admission send | cancelled with stopped_before_admission/enrollment_disabled/readiness_changed; drop unsent operations |
| queued/preparing | Capacity/storage high watermark | unchanged with transient capacity diagnostic; no session/admission effect; next explicit tick after recovery |
| preparing | Session confirmed and durable capability available | dispatching, persist admission payload/deadline first |
| preparing | Missing/nondurable capability or definitive session validation/auth rejection | failed with unsupported_gateway/session_rejected/auth_failed; no admission |
| preparing | Ambiguous session identity/conflict or unrecoverable creation readback | unknown, no overwrite/new session |
| dispatching | Accepted same-key response | running, persist run ID; if stop intent exists continue stopping and issue stop |
| dispatching | Definitive admission400/401/403 or other explicit nonretryable no-admission response | failed admission_rejected/auth_failed; no retry |
| dispatching | Network/502/503/504 or marked row after restart without run ID | unknown admission_uncertain; never POST again even inside retention |
| dispatching | Deadline expired before marking/sending | unknown admission_uncertain; no POST |
| dispatching | Stop with request unsent and provably no admission | cancelled; if any admission ambiguity, stopping then readback; unknown if unrecoverable |
| running/stopping | Upstream queued/running | running/stopping respectively; no final settlement |
| running | Upstream waiting_for_approval | running + waiting_for_approval, consumes capacity, no approval sent |
| running/stopping | Authoritative completed | awaiting_verification; result completeness remains truthful, stop race does not cancel success |
| running/stopping | Authoritative failed/cancelled | failed/cancelled respectively, no automatic new attempt |
| running/stopping | interrupted,404, ownership mismatch, unrecoverable restart | unknown; no replay |
| running | Operator stop | stopping; persist intent, stop API repeated only after authoritative readback of same run |
| stopping | Stop response acknowledged | stopping until terminal status; cannot claim cancelled |
| running/stopping | SSE EOF/error | unchanged while GET recovery possible; result/mapping incomplete; unknown after3 bounded failed GET observations, no admission replay |
| awaiting_verification | Authenticated explicit evidence accepted/rejected | succeeded/failed; task remains working until canonical owner completion |
| unknown | Explicit evidenced resolution+uncertain-side-effects acknowledgement | failed/cancelled/awaiting_verification; no upstream admission |
| failed/cancelled | Explicit retry, current readiness/enrollment valid | new queued attempt/new identity; prior unchanged |

Enrollment/automation pause after admission never silently stops a run; use explicit stop. Pending automation occurrences remain pending while disabled, without creating tasks. An already queued but unsent automation attempt fails the admission eligibility recheck with automation_disabled and is cancelled; explicit re-enable does not resurrect that cancelled attempt. Tick deadline leaves other queued intents intact; owner maintenance continues admitted observation/control but only future explicit tick can start new admission. Capability failure is failed with error code, not an undeclared unsupported state. Existing core claim remains working in every unsuccessful state so explicit recovery/completion cannot silently transfer ownership.

### Bounded automation and storage admission

Automation overlap is against its nonterminal occurrence/attempt, even a template which creates a fresh task. Awaiting_verification and unknown are nonterminal for this purpose. A failed/cancelled/succeeded prior occurrence permits later explicit due occurrence, subject to eligibility/capacity; no same-occurrence automatic retries. Skipped occurrences need no task/attempt. If ledger cannot accept even skipped metadata, retain definition nextDue unchanged and return capacity_exhausted; after recovery one latest due occurrence is considered, no flood.

Construct immutable input as exact title + two LF bytes + description, measure Buffer.byteLength UTF-8. If>16384, persist skipped/input_too_large occurrence without creating/enrolling/claiming any task. Creation/update validation rejects template whose snapshot already exceeds limit400. Existing fixed-target task may later grow: due snapshot fails skipped, never truncates. Empty canonical description still preserves title. Template overlap check precedes task creation and capacity is checked inside same immediate transaction.

Trusted defaults (inject smaller limits for tests, never request overrides):100 definitions;32 queued/preparing attempts plus pending unmaterialized occurrences combined;1000 retained attempts;50000 events;256MiB retained result UTF-8 bytes;1GiB selected main SQLite+WAL+SHM file size sum; minimum512MiB filesystem available via statfs. Check at startup and immediately before materialization, attempt reservation, session creation and run admission. If counters/filesystem cannot be read, fail closed to new effects with storage_unavailable. Reserve accounting includes maximum expected1MiB result and bounded metadata per admitted run, not merely current bytes. Refuse admission if reservation crosses any bound; at most4 active runs keeps post-admission growth bounded. Readiness/capacity checks and reservations share transaction; OS free-space cannot be atomic against unrelated applications, so disk exhaustion still reports503 without false durability.

At high watermark retain all evidence; no automatic deletion/compaction. API capabilities/metrics expose capacity state, counts and reason, not raw paths. Reads, stop/resolve/verification and owner lifecycle settlement bypass new-work watermark so existing work can settle, but actual SQLite/filesystem failure still fails503 truthfully; no guarantee against another process filling disk. Only transitions emit events; maintenance polls/heartbeats produce no durable recurring records. Further new work remains blocked until operator increases trusted limits/storage or explicitly retires/exports data under a separate authorized retention operation; no pruning API in v1. Recovery requires successful capacity readback plus explicit new tick; no auto-resume dispatch.

## Versioned HTTP contract

Prefix `/api/core/v1`; success `{data:...}`, error `{error:{code,message}}`.401 auth,403 transport,400 invalid,404 absent/foreign,409 state/key/lease conflict,413 oversized,503 dependency. Bounded sanitized errors; no raw upstream text. All mutation methods require JSON+Idempotency-Key. Pages `{data:[],nextCursor:null|string}`; opaque version/project/filter-bound cursor validated, limit1–100 default50. Raw IDs retained separately from display labels.

| Method/path | Request → response → retained state/next action |
| --- | --- |
| GET `/health`, `/capabilities` | safe version/capability flags; no gateway keys/URLs |
| GET `/projects`, `/projects/:projectId/work` | canonical catalog/work; retain returned project/task IDs |
| POST `/projects/:projectId/goals`, `/tasks` | existing create fields/rules → canonical work item; retain ID |
| POST `/projects/:projectId/tasks/:taskId/complete` | evidence → existing owner completion; active/unverified managed attempt409 |
| PUT `/projects/:projectId/tasks/:taskId/enrollment` | `{enabled:boolean}` → enrollment, no execution |
| POST `/projects/:projectId/tasks/:taskId/attempts` | `{instructions,role:"worker"}` → queued attempt; retain attempt ID, tick later |
| GET `/projects/:projectId/attempts[/:attemptId]` | states/bindings/flags, no secret |
| GET `.../attempts/:attemptId/result` | private bounded text/completeness/evidence |
| POST `.../attempts/:attemptId/stop` | `{}` →202 stopping intent, observe until terminal |
| POST `.../attempts/:attemptId/verify` | `{accepted:boolean,evidence:[{kind:"test|review|manual",reference:string}]}` → succeeded/failed; task remains incomplete |
| POST `.../attempts/:attemptId/resolve` | `{outcome:"failed|cancelled|awaiting_verification",acknowledgeUncertainSideEffects:true,evidence:[...]}` → explicit unknown resolution |
| POST `.../attempts/:attemptId/retry` | `{instructions}` → new attempt/new dispatch identity, only failed/cancelled |
| POST/GET `/projects/:projectId/automations[/:automationId]` | disabled manual/interval definition; retain automation ID |
| PATCH `.../automations/:automationId` | `{revision,enabled,...schedule}` → revised definition, stale revision409 |
| POST `.../automations/:automationId/trigger` | `{}` → unique manual occurrence, wait tick |
| GET `.../automations/:automationId/occurrences` | paged occurrence/run identity |
| POST `/coordinator/reconcile` | `{}` →202 persisted tick ID; owner executes bounded tick, never request process unless it owns lock |
| GET `/coordinator/reconcile/:tickId` | bounded counts/state/owner generation; retained ID recovers request lifetime loss |
| GET `/projects/:projectId/events` | `after` opaque cursor → metadata page |
| GET `/projects/:projectId/events/stream` | Last-Event-ID → durable metadata SSE,15s heartbeat,256KiB slow-client disconnect |
| GET `/projects/:projectId/metrics` | aggregate outcomes/unknown/latency/skips only |

Evidence strings max2048 chars/item, max20 entries; never server-fetch URLs/paths. Definition: `{kind:"interval",intervalSeconds:60,target:{taskId},overlapPolicy:"skip"}` or `{kind:"manual",target:{template:{title,description,priority}},overlapPolicy:"skip"}`. Template uses canonical task validation; no shell/plugin/profile/URL fields. Input immutable per attempt. Enable sets nextDue=now+interval, no immediate execution; manual trigger only persists occurrence. Tick materializes latest due occurrence once, advances nextDue beyond now, records skipped/missed counts. Active target skipped. Template creates canonical task+enrollment transactionally once per occurrence. Clock rollback never rewinds nextDue. No automatic retry policy in v1.

Trusted Node example (operatorToken loaded privately, never printed):

```js
const headers = {Authorization: `Bearer ${operatorToken}`, 'Content-Type':'application/json', 'Idempotency-Key':'attempt-example-1'};
const response = await fetch(`${core}/api/core/v1/projects/${projectId}/tasks/${taskId}/attempts`, {method:'POST',headers,body:JSON.stringify({instructions:'Run approved synthetic acceptance.',role:'worker'})});
const attemptId = (await response.json()).data.id;
```

Caller enrolls first; retain exact IDs, POST reconcile with own key, then GET attempt/events/result. Lost NED API response safely reuses same key/body because local mutation/response atomic; this does not permit replay of upstream Hermes POST.409 authoritative readback. Lost state queries canonical task ID, not title. No fresh mutation key to recover uncertainty.

## Metrics, deployment, rollback and retirement

Existing local SQLite/event ledger meets infrastructure measurement needs without external analytics or new hosting. Metrics answer dispatch success, duplicate suppression, unknown outcomes and latency; operator reviews daily during initial rollout; existing issue/task channels collect feedback. No payload telemetry. Reuse existing owner backup procedure; prove temporary DB restore. Additive migration transactional; prior CLI canonical task storage remains readable/writable but old binary does not enforce new managed verification guard. Before operational rollback disable triggers/new dispatch and explicitly stop/settle/resolve all managed runs; retain orchestration records. Accepted external work is not cancelled by rollback itself.

Execute the six cases, full gates and synthetic manual walkthrough with independent audit/review; merge green PR, read remote SHA, canonical installer from merged checkout, deploy skills, verify generation and read-only health/auth/catalog/legacy COM behavior. No real task/model execution, cron activation, named profile or AWS changes. Duplicated work-reader authority is consolidated into Core; legacy modules are wrappers only. Retirement disables triggers, explicitly settles active runs, preserves/export evidence under runtime ownership, revokes operator token/removes privileged routes after retention decision; canonical work survives. Test dispatch denial and historical readability.

## Implementation handoff and file ownership

Keep interface seams small; createCoreService receives trusted `{databasePath,home,env,actor:'agent:ned-core',gateway,clock,limits}` and returns async facade. Existing database injection accepted by createTaskService is reused directly. HTTP hosts never supply request values for these trusted options.

| Owner slice | Files / interface |
| --- | --- |
| Store/facade | `apps/ned-core/src/{store,service,work}.js`: open/close, canonical projects/work/goals/tasks, enroll, createAttempt/get/list/result, verify/resolve/retry/complete, automations/occurrences, idempotent mutations, event page/subscribe, metrics; canonical completion guard in `src/tasks.js` |
| Runtime/adapter | `apps/ned-core/src/{owner,coordinator,hermes}.js`: process ownership, maintenance/close, requestReconcile/getTick, owner-only reconcile/observe/processControl; injected Hermes methods capabilities/createKnownSession/getSession/setTitle/submitRun/getRun/events/stop, fixed configured scope |
| HTTP/consumers | `apps/ned-core/src/{http,auth,cli,index}.js`: createCoreHandler({service,credential,boundOrigin}); normalized namespace guard; core `serve` CLI branch; `apps/ned-com/src/` server mount/work wrapper/bridge denials; `apps/ned-cli/src/` dispatch; no independent SQL/task rules |

Facade control methods persist intent and return authoritative object; only owner executes remote effects. Memoized close waits for observers and external requests before lock release, then closes shared resources. Clocks/storage probes and HTTP timers are injectable for deterministic boundary tests; production defaults remain fixed. Six cases target facade/store/adapter/HTTP boundaries and one assembled child-process flow, not duplicate assertion layers. Exact source, review and test results belong to release evidence; this design is not a release receipt.
