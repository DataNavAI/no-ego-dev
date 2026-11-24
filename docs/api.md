# NED API v1

Status: implemented source candidate; live deployment is verified separately.
The API's official name is **NED API v1**, not NED COM API or a separate Core API.

Base path: `/api/v1`. Both the full Core listener and COM listener use one
Core-owned handler. COM adds browser assets and authenticated Hub/public transport;
it does not maintain a separate backend. Backend-only ephemeral CLI listeners
enable only coordination resources. Every API requires authentication. See [architecture](architecture.md) and
[API behavior/acceptance](features/ned-api/SPEC.md).

## Resource families and callers

| Family | Purpose | Access |
| --- | --- | --- |
| `GET /api/v1` | Identity/version and authentication requirement | Authenticated |
| `GET /api/v1/health` | `{status:"ok",service:"ned-api",version:1}` | Authenticated |
| `GET /api/v1/auth/context` | Stable opaque `{instanceId}` for browser credential binding | Authenticated; no-store |
| `GET /api/v1/capabilities` | UI capabilities; service ned-api/version1 | Authenticated |
| `/api/v1/projects` | Project UI read models, delivery, attempt/session inspection | Authenticated; read-only presentation methods |
| `/api/v1/chat` | Selected Hermes sessions, messages, attachments and turns | Authenticated; same-origin, bounded mutations/streams |
| `/api/v1/workspace/events`, `/api/v1/activity/events` | Read-model SSE updates | Authenticated |
| `/api/v1/secrets` | Explicit private vault operations and secret cards | Authenticated; explicit privacy headers/Origin |
| `/api/v1/project-registrations` | Paged project registry | Authenticated |
| `/api/v1/{context,task-management,coordinator,execution-capabilities}` | Context, task commands, reconciliation and execution capabilities | Authenticated |
| `/api/v1/projects/:id/{tasks,goals,attempts,automations,events,metrics}` | Task management, execution and automation resources | Authenticated |

Project presentation and paged project registration are different
documented read models of the same SQLite registry. `GET /projects` always has
the browser schema, even when a bearer happens to be supplied. Paged registry
registration is `GET /project-registrations`; credentials never select a different
schema on the same URL. Resource-specific JSON shapes remain explicit below;
coordination envelopes use `data`, browser endpoints retain their existing typed
objects. Errors consistently use `{error:{code,message}}`.

### Client selection and compatibility

CLI task commands use `--api <loopback-listener-origin>`, then `NED_API_URL`,
then legacy `NED_CORE_URL`. Configured origins are HTTP loopback without a path,
embedded credential, query or fragment. With no configured origin, the CLI starts
a backend-only server using the persistent instance bearer, verifies runtime/database
fingerprints, makes the same HTTP request and closes it. No coordinator starts.

Legacy `/api/core/v1/*` remains an authenticated coordination alias. Its registry,
health, work and capabilities retain their old `data` envelopes; canonical health,
capabilities and work use presentation shapes, registry uses
`/api/v1/project-registrations`, and execution capabilities use
`/api/v1/execution-capabilities`. The canonical `/api/v1/operator` namespace is
removed (404 after authentication). Existing
`/api/{health,capabilities,projects,chat,secrets,workspace,activity}` maps directly
to the matching `/api/v1/*` family. These are non-redirecting compatibility
aliases: bodies, response shapes, request keys, query strings, SSE IDs and
cancellation survive. Legacy health/capabilities retain service `nedcom` without
new version metadata. A request key replayed through another alias retains the
same operation identity and creates no duplicate work.

Aliases remain supported for v1. No removal date, blind mutation fallback or
separate database is introduced. Deploy the co-released backend/CLI/browser
together; canonical clients require the new backend. Rollback reinstalls the prior
generation and reloads browser assets. Existing legacy clients continue working.
Hermes upstream routes such as `/api/sessions` and `/v1/runs` are not NED API
routes and are unchanged.

### Shared trust boundary

Every API and legacy alias, including discovery/health and streams, authenticates
before dispatch. Missing or invalid credentials return401 with a bounded error and
`WWW-Authenticate: Bearer realm="NED"`. Listeners also require the
exact loopback Host and absent or exact same Origin. Unknown API families and
malformed paths are denied by transport adapters. Requests cannot select DB,
profile, gateway origin or provider credentials.

## Presentation resource contract

Paths below are relative to `/api/v1`. IDs are retained opaque ASCII IDs, not
display titles or filesystem paths. Browser mutations require the exact Origin;
read requests may omit Origin. All require the same instance authentication.

### Projects and visible task outputs

- `GET /projects` -> `{projects:[{id,name,displayPath}]}`.
- `GET /projects/:project` -> `{project:{id,name,displayPath},preview}`.
  Preview is an existing bounded loopback HEAD probe with explicit availability;
  it never accepts a request-selected destination. Missing/symlink/raced project
  folders fail closed without recreating a directory.
- `GET /projects/:project/work` -> the existing workspace/project work projection:
  goal/task status, delivery, readiness and safe attempt summaries. Its detailed
  behavioral authority is [Goals & Tasks](features/communicator/SPEC.md).
- `GET /projects/:project/tasks/:task?offset=N` -> description, impact, visible
  outputs and at most20 newest attempt summaries, plus `nextOffset`.
- `GET /projects/:project/tasks/:task/attempts/:attempt` -> captured result flags
  and persisted session bindings.
- `GET /projects/:project/tasks/:task/attempts/:attempt/sessions/:session/messages?offset=N`
  -> at most50 sanitized rows for a persisted binding matching the selected
  gateway/profile. Never attach by session title.
- `GET /projects/:project/tasks/:task/outputs/:output` -> PNG bytes or plain text,
  never a client-selected file path or remote URL. Project and task ownership
  are revalidated; image metadata does not inline private paths.

Retain raw IDs, `nextOffset` and registry cursors separately from labels. An
invalid/stale cursor/page or unavailable project returns the domain's bounded
4xx/503 error; never guess the next ID, silently select another project or
publish a cached output without revalidation.

### Chat, uploads and progressive delivery

| Method/path | Request | Successful response |
| --- | --- | --- |
| GET `/chat/sessions?offset=N` | optional numeric offset | Existing sessions page |
| POST `/chat/sessions` | JSON `{}`, exact Origin | Validated new session |
| POST `/chat/sessions/fixed` | JSON `{}`, exact Origin | `{session:{id:"nedcom-main",title:"NED Chat",source:"api_server"}}`; resolves/create-once, never selects by title |
| GET `/chat/sessions/:session/messages?offset=N` | numeric offset | Existing chronological sanitized history page |
| POST `/chat/sessions/:session/attachments` | supported raw media bytes, Content-Type, encoded X-NED-Filename and exact Origin | 201 `{attachment:...}`, single-use session/gateway-bound receipt |
| POST `/chat/sessions/:session/chat` | JSON `{input,attachments?,references?}`, exact Origin | 202 `{turn:{id,status:"pending"}}` before inference completion |
| GET `/chat/sessions/:session/turns/:turn?cursor=N&wait=1` | optional numeric prose cursor / bounded long wait | Turn state, optional bounded stream delta and final result |
| GET `/chat/sessions/:session/turns/:turn/events?cursor=N` | optional numeric cursor | text/event-stream with activity/delta/terminal frames |
| POST `/chat/sessions/:session/turns/:turn/stop` | exact Origin, JSON type; no new prompt | Matching run stop result; ambiguous stop is not success |

Chat JSON bodies are at most32768bytes; input is at most8000characters and cannot
be empty without accepted attachments/references. Unknown fields and invalid
session/cursor/receipt combinations fail. Upload types/limits and task reference
resolution remain the [chat/media contract](features/communicator/SPEC.md), not an
arbitrary file path or URL fetch facility. Missing gateway/authentication returns
503 without exposing configuration. Upstream authorization never reaches clients.

Only one pending turn per session/gateway is admitted; conflict returns409.
Accepted turn IDs and session IDs must be retained before opening a stream.
SSE `activity` carries only bounded allowlisted categories, not tool arguments,
reasoning or raw tool output. `delta` carries `{cursor,next,text}`; clients retain
`next` exactly. `terminal` carries final turn/session/message state. No whole-body
buffer or redirect substitutes for incremental HTTP streaming. Disconnect releases
stream listeners; explicit stop controls the run. History remains paged and
older messages load progressively. Do not resend a message merely because a
transport acknowledgement is uncertain; inspect/reload the session first.

A matching authenticated cancellation during an owned in-flight Stop may precede
the HTTP Stop acknowledgement. The API retains stopped completion and accumulated
text. Unsolicited or foreign cancellation fails. TC-039 deliberately holds the
acknowledgement until terminal stream consumption; API consolidation retains this
ordering guarantee from native#181/Hub#134.

Process health alone is not proof of configured inference. Account-level provider
inheritance and guided setup remain planned in native#182/Hub#135; provider/OAuth
acceptance and hosted image rollout are separate from deterministic transport tests.

### Activity streams

`GET /workspace/events` emits the existing workspace/project inventory snapshots;
`GET /activity/events?project=<id>` emits the latest visible goal/task changes.
Both are SSE with heartbeat, bounded pending writes and disconnect/shutdown cleanup.
These read models are distinct from authenticated lifecycle event
streams below, which use durable event IDs and opaque continuation tokens.

### Secrets and private entry/reveal cards

All operations require `X-NED-Secrets: 1`, reject cross-site requests and query
strings, and retain the selected runtime's encrypted vault. Non-list operations
also require exact Origin. Values never appear in list responses, logs, task
metadata or chat. Authenticated access uses these same explicit privacy checks
locally and through either transport. Embedders may disable the family with
`secretsEnabled:false`.

- GET `/secrets` -> `{secrets:[...safe metadata...]}`, never values.
- PUT `/secrets/:KEY` with JSON `{value}` -> saved metadata.
- DELETE `/secrets/:KEY` -> deletion metadata.
- POST `/secrets/:KEY/reveal` -> explicit `{key,value}`.
- POST `/secrets/requests/:request/submit` with JSON `{value}` -> saved entry
  status; POST `/secrets/requests/:request/status` -> status without a value.
- POST `/secrets/shares/:share/reveal` -> explicit bounded reveal from an
  unexpired, selected-profile native sharing reference.

Keys match `[A-Z][A-Z0-9_]{0,127}`; requests/shares are opaque64hex identifiers.
Writing accepts only a JSON object containing `value`, with the existing400000byte
request cap. Reveals/status/deletion reject request bodies. Retain the native
successful tool-result IDs exactly; never synthesize secret cards from prose.
Expired/foreign/invalid references fail without revealing a value. The detailed
storage/card contract is [Secret management](features/secret-management/SPEC.md).

## Coordination resources

These resources share `/api/v1` and the same authentication as presentation/chat
resources. The implementation remains Core. There is no privileged path group.

## Connection and authentication

Base path: `/api/v1` on the configured Core or COM listener. Every API route,
including health, requires authentication. CLI/integrations send:

```http
Authorization: Bearer <runtime-private-instance-key>
```

The token is stored in `<selected-runtime>/.ned/core/operator-token`, with private
directory/file permissions. Never place it in a URL, shipped browser bundle or log.
Authenticated callers have authority over the selected runtime; an actor label is
not an authentication credential. The public COM shell asks for the access token,
validates it with `GET /api/v1/auth/context`, then saves it in local storage bound
to the origin and private stable instance identity. Settings offers Forget token.
401 clears saved access and returns to sign-in without resubmitting messages.
Fetch-based event streams carry the same Bearer header. Basic username `ned`
with the instance key remains accepted for compatibility. Existing key storage is
retained. `NED_API_TOKEN` or `NED_API_TOKEN_FILE` imports a provisioned token;
see [instance token bootstrap](features/ned-api/INSTANCE-TOKENS.md) for validation
and conflict behavior. Auth context returns only `{instanceId}` and requires the
same authentication as every other API.

Container COM also accepts `NED_COM_USERNAME`/`NED_COM_PASSWORD`; absent a separate
pair it accepts plaintext dashboard credentials. A dashboard password hash is
not a plaintext API password; the instance key still works. Container health
checks authenticate with the instance key. Keys/passwords remain outside Git.

The socket-less Hub bridge injects the target instance credential only after
authenticated, instance-bound Hub channel and Origin validation; incoming client
headers cannot grant this authority. Public quick tunnels inject no credential:
clients must sign in. Both transports expose the same authenticated resources.

Only the exact bound loopback Host is accepted. Origin must be absent or exactly
the listener's origin. There is no cookie authentication or cross-origin access.
Clients cannot select a database, Hermes URL, credential or profile in a
request. Only the task-management endpoint accepts an absolute existing
project directory for canonical initialization/selection; other routes use IDs.

## Common request and response rules

- Mutations require `Content-Type: application/json` and `Idempotency-Key`.
- Keys contain 1–128 visible ASCII characters. Reuse the same key and body to
  recover a lost **NED API** response. A changed body under that key returns 409.
- JSON bodies are at most 64 KiB. Unknown fields are rejected.
- Instructions are at most 16,384 UTF-8 bytes; IDs returned by Core are the
  authoritative identities. Display titles are not IDs.
- Object success: `{"data":{...}}`. Collection success:
  `{"data":[...],"nextCursor":null}` or a non-null opaque continuation.
- Errors: `{"error":{"code":"stable_code","message":"Safe explanation"}}`.
- Collection `limit` is 1–100, default 50. Cursors bind the version, project and
  filters. Do not construct, alter or reuse them across projects.

| Status | Meaning |
| --- | --- |
| 400 | Invalid JSON, fields, cursor or idempotency key |
| 401 | Missing or invalid instance authentication |
| 403 | Disallowed transport, Host or Origin |
| 404 | Missing or foreign project/resource; no membership disclosure |
| 409 | State, ownership, revision or idempotency conflict |
| 413 | Request exceeds its size limit |
| 503 | Storage/provider dependency unavailable; no false success |

## Endpoint inventory

### Core-backed CLI tracking

`GET /context` returns `{data:{runtime:"<sha256>",database:"<sha256>"}}`, fingerprints
of the selected runtime root and actual DB filename; no paths or credentials.
CLI compares these with its selected context before sending task arguments.

`POST /task-management` accepts exactly `{project,actor,operation,args}`. `project`
is an absolute existing local directory, canonicalized by Core; `actor` is the
normal human/agent ownership label, not authentication. `args` is a positional
array. The closed operation enum mirrors the domain service:

| Operations | Arguments |
| --- | --- |
| initialize, getItems, getReadyTasks, getTree, getStatus | `[]` |
| createItem | `[type,{title,description?,priority?,parentId?,discoveredFrom?}]` |
| getItem, getChildren, getDependencies, getGoalProgress, getActivity | `[id]` |
| startTask, unblockTask | `[id]` |
| completeTask | `[id,reason?]` |
| blockTask | `[id,{on? OR reason,service?}]` |
| getDelivery | `[id]` |
| setDelivery | `[id,{impact?,remainingSeconds?,estimatedFinish?,outputs?}]` |
| getTaskAttempts | `[id,cursor?]` |

All requests, including these POST reads, require instance authentication,
JSON and Idempotency-Key. Only mutations save receipts: scope canonical
project+actor, hash operation+args, receipt and state atomically committed. Same
key/input returns the original result; a changed operation/body conflicts409.
Reads remain fresh and do not consume a key. Ordinary graph mutations preserve
ownership/history/completion fences. No operation dispatches a worker.
`getTaskAttempts` returns `{data:[summaries],nextCursor}` inside the normal outer
`data` envelope:20 newest task-scoped summaries, no instructions/result text or
credentials. Keep continuation tokens unchanged, scoped to task+project.

CLI uses `--api` > `NED_API_URL` > legacy `NED_CORE_URL`, or a command-scoped temporary Core listener
without coordinator startup if neither is set. Temporary listeners use the same
persistent instance bearer as full listeners; only
backend-only programmatic construction accepts that credential override. Full
Core/COM listeners keep their existing private-token storage requirement.
Explicit failure never falls
back. URLs are loopback HTTP roots only; the client never retries mutations
automatically. Use `--request-id` for identical retry recovery. Behavioral tests:
[task-management TC-013](features/task-management/SPEC.md).

### Delivery metadata for Goals & Tasks
`PUT /projects/:projectId/tasks/:taskId/delivery` replaces one item's presentation record without starting work or changing status. Normal authentication/origin/idempotency rules apply. Goal IDs are accepted for explicit finish estimates.

```json
{"impact":"Reduce checkout abandonment.","remainingSeconds":1200,"estimatedFinish":"2026-11-20T12:00:00.000Z","outputs":[{"id":"brief","kind":"document","title":"Implementation brief","text":"Customers can check out with fewer fields."}]}
```

Omitted fields reset on replacement: impact becomes empty, estimates null, outputs empty. Impact: single line≤240characters; remainingSeconds: null or integer0–31,536,000; estimatedFinish: null or canonical UTC ISO timestamp. Outputs:≤3 unique ASCII IDs1–64characters and titles1–120characters. Documents use `text`≤16,384characters. Images use `kind:"image"`, `image:"data:image/png;base64,..."` (or JPEG),≤32,768characters. The existing64KiB body cap applies. Images are decoded≤4million pixels, resized≤1024px, re-encoded as PNG; URLs, paths, SVG and arbitrary HTML are not accepted. Same key/body returns the original timestamp; different body under that key returns409. A new key atomically replaces the record and removes omitted outputs. Data stays in the runtime DB, with no filesystem copies or public uploads.

Work snapshots return compact `delivery`: impact, remainingSeconds, estimatedFinish, updatedAt, nullable trackedSeconds and output IDs/kinds/titles. Descriptions and output bodies stay out of bulk reads. Tracked time means claimed working intervals excluding recorded blockers, not CPU time or verified labor. Legacy work without history/metadata retains null estimates/time.

Project read-model resource: `/api/v1/projects/:project/tasks/:task` returns description/impact/outputs and20 newest attempts with `nextOffset`; `?offset=N` continues. `/attempts/:attempt` returns captured result flags and bound sessions. `/attempts/:attempt/sessions/:session/messages?offset=N` returns≤50 sanitized rows only for a persisted binding matching current gateway identity. `/outputs/:output` serves PNG or plain text without client-selected paths. These require the same instance authentication as all other resources. Behavioral authority and tests: [communicator FR-066–070 / TC-042](features/communicator/SPEC.md).

All paths below are relative to `/api/v1`. `projectId`, `taskId`,
`attemptId`, `automationId` and `tickId` are returned identifiers, not labels.

| Method | Path | Input / outcome |
| --- | --- | --- |
| GET | `/health` | Safe backend status; no private paths or provider credentials |
| GET | `/execution-capabilities` | Execution support and capacity diagnostics |
| GET | `/project-registrations` | Paged registered project records; `{data,nextCursor}` |
| GET | `/projects/:projectId/work` | Shared authoritative work projection |
| POST | `/projects/:projectId/goals` | Canonical goal creation fields |
| POST | `/projects/:projectId/tasks` | Canonical task creation fields |
| POST | `/projects/:projectId/tasks/:taskId/complete` | Evidence-backed canonical owner completion; unverified execution conflicts |
| PUT | `/projects/:projectId/tasks/:taskId/enrollment` | `{"enabled":true}`; eligibility only, no execution |
| PUT | `/projects/:projectId/tasks/:taskId/delivery` | Replace explicit impact, estimates and visible outputs; also accepts goal IDs |
| POST | `/projects/:projectId/tasks/:taskId/attempts` | `{"instructions":"...","role":"worker"}`; reserves queued attempt |
| GET | `/projects/:projectId/attempts` | Paged attempts; retain canonical task and attempt IDs |
| GET | `/projects/:projectId/attempts/:attemptId` | State, bindings and result flags |
| GET | `/projects/:projectId/attempts/:attemptId/result` | Private bounded result text, completeness and verification evidence |
| POST | `/projects/:projectId/attempts/:attemptId/stop` | `{}`; persists stop intent; acknowledgement is not cancellation |
| POST | `/projects/:projectId/attempts/:attemptId/verify` | Accepted/rejected evidence; never implicitly completes task |
| POST | `/projects/:projectId/attempts/:attemptId/resolve` | Explicit evidenced resolution of unknown outcome |
| POST | `/projects/:projectId/attempts/:attemptId/retry` | `{"instructions":"..."}`; new attempt only after failed/cancelled |
| POST | `/projects/:projectId/automations` | Creates a disabled manual/interval definition |
| GET | `/projects/:projectId/automations` | Paged definitions |
| GET | `/projects/:projectId/automations/:automationId` | Definition and current revision |
| PATCH | `/projects/:projectId/automations/:automationId` | Revision-checked enable/pause/schedule update |
| POST | `/projects/:projectId/automations/:automationId/trigger` | `{}`; records a manual occurrence, does not dispatch |
| GET | `/projects/:projectId/automations/:automationId/occurrences` | Paged scheduled/manual outcomes and execution identities |
| POST | `/coordinator/reconcile` | `{}`; 202 with durable tick identity |
| GET | `/coordinator/reconcile/:tickId` | Tick state, bounded counts and owner generation |
| GET | `/projects/:projectId/events` | Durable metadata page, with opaque `after` continuation |
| GET | `/projects/:projectId/events/stream` | Metadata SSE; `Last-Event-ID` reconnect support |
| GET | `/projects/:projectId/metrics` | Outcome, unknown, latency and skipped-occurrence aggregates |

Canonical goal/task input is `{title, description?, priority?, parentId?}`;
validation reuses the existing task service. Core
does not introduce a second task lifecycle. The trusted Core claim owner is
`agent:ned-core`. Both current CLI and HTTP canonical completion enforce the
managed-attempt verification guard.

## Execution lifecycle

1. Read the project/work catalog and retain the returned IDs.
2. Explicitly enroll a ready task. Enrollment alone does not queue anything.
3. Create an attempt with immutable instructions. Retain its ID.
4. Request reconciliation and retain the tick ID. Poll that identity or consume
   metadata events; a tick's HTTP lifetime does not own the agent run.
5. Read attempt bindings/results. A Hermes session title is only a redundant
   task/attempt/role label, never proof of ownership.
6. Verify the result with explicit evidence, then separately complete the task.

States: `queued`, `preparing`, `dispatching`, `running`, `stopping`,
`awaiting_verification`, `succeeded`, `failed`, `cancelled`, `unknown`.
The Hermes admission acknowledgement `started` is normalized to `running`; it
only confirms admission, not successful execution or verification.
At most one unresolved attempt exists per task. `unknown` and
`awaiting_verification` also prevent overlapping automation executions.

Verification request:

```json
{"accepted":true,"evidence":[{"kind":"test","reference":"synthetic acceptance run identifier"}]}
```

Evidence kinds are `test`, `review` or `manual`, with at most 20 entries and
2,048 characters per reference. References are recorded, not fetched or executed.
Unknown resolution requires the same evidence structure, an outcome of `failed`,
`cancelled` or `awaiting_verification`, and
`"acknowledgeUncertainSideEffects": true`.

### Safety and recovery

NED mutation replay and Hermes admission replay are different contracts. NED
persists mutation plus response atomically. For Hermes, Core persists a sent
marker before its **sole** run-admission POST. An ambiguous sent admission is
`unknown`; it is never automatically POSTed again, even with the same provider
key. Finite provider dedup retention cannot fence an indefinitely paused sender.
A crash before sending may therefore require explicit operator resolution.

Known run IDs recover through authoritative GET. EOF does not mean completion;
provider restart/404 or unrecoverable ownership ambiguity does not authorize a
new run. A stop response remains `stopping` until authoritative settlement.
Completed execution becomes `awaiting_verification`, not task Done. Missing or
nondurable Hermes run capabilities fail closed without a chat replay fallback.

One process-lifetime owner controls external effects and the single-consumer
upstream stream. Other backend processes can persist controls and ticks. Observer
maintenance can continue after a tick without starting new work. Lost upstream
stream segments make result/child-mapping completeness false; Core does not invent
missed child identities or claim replayable provider text.

## Automations

Interval example:

```json
{"kind":"interval","intervalSeconds":60,"target":{"taskId":"<returned-task-id>"},"overlapPolicy":"skip"}
```

Manual template example:

```json
{"kind":"manual","target":{"template":{"title":"Synthetic check","description":"Run the approved local fixture","priority":2}},"overlapPolicy":"skip"}
```

Definitions start disabled. Enable explicitly with the current `revision`;
Partial PATCH requests may update only the target or interval without resending
`enabled`; responses consistently expose `enabled` as a boolean. Each accepted
occurrence retains its definition revision, target and exact input snapshot;
editing the definition changes future occurrences, not pending accepted work.
intervals are at least 60 seconds. Enabling schedules the next due instant, not
an immediate run. No cron/timer dispatch is activated by installation/startup.
Only explicit reconciliation materializes due work. Pausing prevents future
starts, not termination of an accepted run; use stop for that.

Overlap is checked against the automation's active occurrence, including template
targets. Missed intervals materialize at most the latest occurrence, not a flood.
Immutable automation input is `title + "\n\n" + description`, measured in UTF-8;
oversized input is rejected/skipped without silent truncation or partial task
creation. Queue/storage watermarks fail closed to new work, retain evidence and
expose capacity diagnostics. Read/control settlement remains available subject to
actual storage health. Recovery does not silently resume dispatch: request a new
tick after capacity is restored.

## Events and privacy

The durable event ledger carries IDs, states and safe codes—not instructions,
results, tool arguments, reasoning or credentials. SSE sends a 15-second heartbeat
and disconnects a subscriber beyond its 256-KiB pending budget; reconnect from
the last event ID or retrieve a page. Result text is a separate authenticated
resource capped at 1 MiB with explicit truncation/completeness flags.

## Verification status

The [NED API cases](features/ned-api/SPEC.md#detailed-test-cases) and existing
Core/COM cases are the acceptance matrix; release evidence records actual results.
Native container acceptance and the named provider-backed goals/tasks workflow are
verified separately from default small/medium tests. A local source release does
not certify hosted staging, new OAuth flows or the entire skill evaluation inventory.

## Model setup

Core owns these routes on full NED API/COM listeners. Backend-only coordination
listeners do not expose this family. Public transports never inject authority;
authenticated owners use the same API resources with the existing privacy guards. Capabilities add
`modelSetup:true` for private setup, false when private operations are disabled.
Both methods require current NED API authentication, `X-NED-Models:1`, exact bound Host and no cross-site fetch.
POST also requires exact Origin and JSON, with a16KiB body limit.

- `GET /api/v1/model-setup`: `{configured,source:"local"|"profile"|"hub",model?,
  hosted?,settingsUrl,nonce,deviceLogin,canDisconnect?,provider?,login?}`. Model is bounded metadata; never a credential.
  Opaque nonce is server-held, one-use,5minute lifetime, maximum16 pending.
- `POST /api/v1/model-setup`: either `{nonce,provider:"openai"|"openrouter"|"gemini"|"anthropic",model,
  apiKey,replace?:boolean}` for private local setup or `{action:"inherit"}`.
  Returns current configured metadata, no key. Explicit replacement requires a
  fresh nonce/current profile snapshot and `replace:true`; automatic inheritance
  never replaces a valid profile override. Hosted and local owners may explicitly configure their own instance. Gemini/Claude are persisted through the installed Hermes configuration/credential helpers.

Read → retain exact nonce → submit once → read back status is the caller chain.
A failed/timed-out request must not replay the key or automatically retry; obtain
fresh status and explicitly submit again.400 invalid/consumed intent;401 revoked API authentication;403 privacy
boundary;409 profile changed/missing account connection;
422 provider rejected credentials;503 configuration/provider unavailable. Unsafe
or ambiguous profile data is not overwritten. Key input is cleared on submit.

Chat turns require model readiness before creating a turn/invoking Hermes.
Inherited profiles revalidate account metadata/credential before each turn, then
send the selected provider/model internally to Hermes; browser chat input cannot
supply arbitrary provider/runtime/auth overrides. Raw Hub provider grants remain
central. See [model setup specification](features/model-setup/SPEC.md) for local
file ownership, actual-vs-synthetic verification and staged deployment gates.

Private model-profile writes currently require POSIX permissions; Windows mutation fails closed (`model_setup_platform_unavailable`) pending an ACL-backed implementation. No provider credential is written with unverified permissions.

Model setup rechecks the current NED API credential and caller connection after provider/profile awaits and immediately before the atomic profile commit. A credential revoked during authentication cannot save a connection.

### Instance device authentication and disconnect (#191)

All operations retain the model-setup authentication, Host, Origin, privacy header and JSON bounds above. Device authentication is offered only when the installed Hermes adapter is available; it delegates to Hermes's OpenAI Codex device flow, not a Hub OAuth registration. Other provider login methods are not inferred from OpenAI support.

- `POST /api/v1/model-setup` with `{action:"login",nonce,provider:"openai-codex",model,replace?:boolean}` returns202 `{login:{id,state,expiresAt}}`. One active job per runtime;409 rejects a concurrent start. Preserve the opaque UUID exactly. The nonce/snapshot and explicit replacement protect existing configuration.
- `GET /api/v1/model-setup?login=<id>` returns `{login:{id,state,expiresAt,verificationUri?,userCode?}}`. States: starting, waiting, authorizing, complete, failed, cancelled, expired. Only pending jobs expose the fixed verification URI and public user code. No device authorization ID, authorization code, verifier, access token or refresh token is returned. Unknown job404; revoked initiating NED API credential401 cancels further authority. Normal status includes the current active login so reload can resume polling without browser storage.
- `POST /api/v1/model-setup` with `{action:"cancel-login",id}` cancels an owned pending job; no automatic restart or exchange replay. The15minute deadline, revocation and server shutdown bound the child process. Cancel409 during authorizing requires readback. Authorizing is the already-authorized private commit phase: completion/readback, not a new provider exchange, determines the result after an uncertain interruption.
- `POST /api/v1/model-setup` with `{action:"disconnect",nonce,confirm:true}` removes the current NED-owned instance selection/credential using Hermes's helpers (or the inherited local capability), returns configured:false. Only explicit current NED-owned profiles offer this control; it does not revoke the upstream provider account or alter Hub defaults/other instances. Unrelated configuration/credentials are preserved. Read status after a timeout before another attempt.

Gemini/Claude setup uses their native Hermes providers rather than forcing all inference through an OpenAI-compatible endpoint. Non-inference validation is fixed to Google's models endpoint with `x-goog-api-key`, or Anthropic's models endpoint with `x-api-key`/version header. The helper receives secrets only over private stdin; it returns bounded challenge/status only. Hermes owns private auth/env/config files and refresh semantics. Its configured source/interpreter are operator-only settings (`NED_HERMES_SOURCE`, `NED_HERMES_PYTHON`); browsers cannot select commands, modules or paths. Instance workspace persistence preserves completed login across stop/start; pending in-memory jobs end on process shutdown. No grant cloning or provider OAuth token broker is introduced.

Hub-delegated browser access keeps private token controls hidden from initial HTML through validation, load failures and access expiry. An advisory `X-NED-Hub-Access: 1` response header selects reconnect UI and clears legacy browser token storage; it grants no authority. Authentication still requires a successful Core auth-context response and instance identity. Direct unmarked401 responses enable the direct-token form; unavailable verification offers Reconnect without requesting a private credential.

Instance model setup serves provider-specific model choices from the installed Hermes catalog through its authenticated status response (`models`, `catalogSource: installed-hermes`). New selections are constrained to the nonce-bound provider catalog before credential/authentication work. Lists are bounded to 100 IDs/provider (2,000 ID characters/provider) and sanitize identifiers only; no secrets/catalog metadata are exposed. Configured models absent from the catalog stay intact. NED renders a select and no Hub configuration link. This installed-support snapshot does not promise provider-account entitlement or live availability; provider authentication remains unchanged.

OpenAI API choices use Hermes’ native Chat Completions catalog, matching NED’s current local OpenAI transport; Responses-only picker entries are excluded. Other providers retain their native Hermes catalog/transport.

First-time COM model setup defaults to **ChatGPT Subscription** (`openai-codex`) when installed Hermes device authentication is available. It uses the existing explicit device-login flow; no authentication starts automatically. Existing configured provider/model selections and user choices on status refresh are preserved. If device authentication is unavailable, fresh/unconfigured setup selects OpenAI API instead of a disabled subscription option. Provider IDs and the authenticated API contract remain unchanged. Tracked in [#202](https://github.com/DataNavAI/no-ego-dev/issues/202).

On qualified Linux runtimes, `models` also contains `claude-subscription-directsdk-experimental` and `antigravity-subscription-directsdk`. Empty lists disable unavailable subscriptions. Start them with the existing login POST, selecting the exact provider/model and fresh nonce. Manual-code jobs include `provider`, `model`, `method: "manual_code"`, `verificationUri`, and `acceptsCode`; retain the exact job ID and open the vendor URL. POST `{action:"submit-login-code",id,code}` once (6–4096 printable ASCII characters) to submit its code:202 returns the same job's public status;400 invalid code,401 revoked owner,404 unknown job,409 expired/cancelled/already-submitted/nonwaiting job. Read status after an uncertain response; never replay the code automatically. No grant or code appears in readback. Existing cancellation, deadline, Origin and authority checks apply. Subscription credentials are isolated per instance; disconnect removes only the current NED-owned credential and disables that provider. See [subscription authentication](features/model-setup/subscription-auth.md) for storage, platform and release boundaries. This source contract does not imply a completed staging rollout or live provider verification.
