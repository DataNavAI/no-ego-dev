# NED API v1

Status: implemented source candidate; live deployment is verified separately.
The API's official name is **NED API v1**, not NED COM API or a separate Core API.

Base path: `/api/v1`. Both the full Core listener and COM listener use one
Core-owned handler. COM adds browser assets and authenticated Hub/public transport;
it does not maintain a separate backend. Backend-only ephemeral CLI listeners
enable only the operator family. See [architecture](architecture.md) and
[API behavior/acceptance](features/ned-api/SPEC.md).

## Resource families and callers

| Family | Purpose | Access |
| --- | --- | --- |
| `GET /api/v1` | Identity/version and operator path | Loopback/same-origin browser-safe |
| `GET /api/v1/health` | `{status:"ok",service:"ned-api",version:1}` | Browser-safe |
| `GET /api/v1/capabilities` | UI capabilities; service ned-api/version1 | Browser-safe |
| `/api/v1/projects` | Project UI read models, delivery, attempt/session inspection | Browser-safe, read-only |
| `/api/v1/chat` | Selected Hermes sessions, messages, attachments and turns | Same-origin, bounded mutations/streams |
| `/api/v1/workspace/events`, `/api/v1/activity/events` | Read-model SSE updates | Browser-safe |
| `/api/v1/secrets` | Explicit private vault operations and secret cards | Privacy headers/Origin; never public quick tunnel |
| `/api/v1/operator` | Registered projects, task commands, execution and automation | Private operator bearer; never Hub/public tunnel |

Browser project presentation and operator project registration are different
documented read models of the same SQLite registry. `GET /projects` always has
the browser schema, even when a bearer happens to be supplied. Paged operator
registration is `GET /operator/projects`; credentials never select a different
schema on the same URL. Resource-specific JSON shapes remain explicit below;
operator envelopes use `data`, browser endpoints retain their existing typed
objects. Errors consistently use `{error:{code,message}}`.

### Client selection and compatibility

CLI task commands use `--api <loopback-listener-origin>`, then `NED_API_URL`,
then legacy `NED_CORE_URL`. Configured origins are HTTP loopback without a path,
embedded credential, query or fragment. With no configured origin, the CLI starts
a backend-only server with a process-private bearer, verifies runtime/database
fingerprints, makes the same HTTP request and closes it. No coordinator starts.

Legacy `/api/core/v1/*` maps directly to `/api/v1/operator/*`. Existing
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

Listeners require the exact loopback Host and absent or exact same Origin.
Operator paths and their malformed/encoded aliases are denied before forwarding
on both Hub and quick-public bridges, even with a bearer. Unknown API families
are not implicitly exposed. Quick public tunnels also deny secrets; authenticated
Hub secret operations retain their existing explicit privacy controls. Browser
routes never expose an operator bearer. Requests cannot select DB, profile,
gateway origin or provider credentials.

## Browser resource contract

Paths below are relative to `/api/v1`. IDs are retained opaque ASCII IDs, not
display titles or filesystem paths. Browser mutations require the exact Origin;
read requests may omit Origin. No browser mutation inherits operator authority.

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

Retain raw IDs, `nextOffset` and operator cursors separately from labels. An
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
These read models are distinct from authenticated operator lifecycle event
streams below, which use durable event IDs and opaque continuation tokens.

### Secrets and private entry/reveal cards

All operations require `X-NED-Secrets: 1`, reject cross-site requests and query
strings, and retain the selected runtime's encrypted vault. Non-list operations
also require exact Origin. Values never appear in list responses, logs, task
metadata or chat. Public quick-tunnel mode disables this family completely.

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

## Operator contract

Everything below applies to `/api/v1/operator`, not the browser families.
The implementation remains Core, but this is the operator family of NED API v1,
not a second product API.

## Connection and authentication

Base path: `/api/v1/operator` on the configured loopback Core or COM listener.
Core is a backend for COM and trusted local integrations, not a public unauthenticated
automation endpoint. Every route, including health, requires:

```http
Authorization: Bearer <runtime-private-operator-token>
```

The token is stored in `<selected-runtime>/.ned/core/operator-token`, with private
directory/file permissions. Never place it in a URL, browser bundle, browser
storage or a log. The operator has authority over the selected runtime; an actor
label is not an authentication credential. COM's backend uses the in-process Core
facade; it does not expose this token to its browser UI.

Only the exact bound loopback Host is accepted. Origin must be absent or exactly
the listener's origin. There is no cookie authentication or cross-origin access.
Public-tunnel and Hub bridges reject this entire namespace, even with a valid
bearer. Clients cannot select a database, Hermes URL, credential or profile in a
request. Only the operator task-management endpoint accepts an absolute existing
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
| 401 | Missing or invalid operator bearer |
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

All requests, including these POST reads, require the standard operator bearer,
JSON and Idempotency-Key. Only mutations save receipts: scope canonical
project+actor, hash operation+args, receipt and state atomically committed. Same
key/input returns the original result; a changed operation/body conflicts409.
Reads remain fresh and do not consume a key. Ordinary graph mutations preserve
ownership/history/completion fences. No operation dispatches a worker.
`getTaskAttempts` returns `{data:[summaries],nextCursor}` inside the normal outer
`data` envelope:20 newest task-scoped summaries, no instructions/result text or
credentials. Keep continuation tokens unchanged, scoped to task+project.

CLI uses `--api` > `NED_API_URL` > legacy `NED_CORE_URL`, or a command-scoped temporary Core listener
without coordinator startup if neither is set. Temporary listeners use a random
process-private bearer instead of creating a persistent operator token; only
backend-only programmatic construction accepts that credential override. Full
Core/COM listeners keep their existing private-token storage requirement.
Explicit failure never falls
back. URLs are loopback HTTP roots only; the client never retries mutations
automatically. Use `--request-id` for identical retry recovery. Behavioral tests:
[task-management TC-013](features/task-management/SPEC.md).

### Delivery metadata for Goals & Tasks
`PUT /projects/:projectId/tasks/:taskId/delivery` replaces one item's presentation record without starting work or changing status. Normal operator bearer/origin/idempotency rules apply. Goal IDs are accepted for explicit finish estimates.

```json
{"impact":"Reduce checkout abandonment.","remainingSeconds":1200,"estimatedFinish":"2026-11-20T12:00:00.000Z","outputs":[{"id":"brief","kind":"document","title":"Implementation brief","text":"Customers can check out with fewer fields."}]}
```

Omitted fields reset on replacement: impact becomes empty, estimates null, outputs empty. Impact: single line≤240characters; remainingSeconds: null or integer0–31,536,000; estimatedFinish: null or canonical UTC ISO timestamp. Outputs:≤3 unique ASCII IDs1–64characters and titles1–120characters. Documents use `text`≤16,384characters. Images use `kind:"image"`, `image:"data:image/png;base64,..."` (or JPEG),≤32,768characters. The existing64KiB body cap applies. Images are decoded≤4million pixels, resized≤1024px, re-encoded as PNG; URLs, paths, SVG and arbitrary HTML are not accepted. Same key/body returns the original timestamp; different body under that key returns409. A new key atomically replaces the record and removes omitted outputs. Data stays in the runtime DB, with no filesystem copies or public uploads.

Work snapshots return compact `delivery`: impact, remainingSeconds, estimatedFinish, updatedAt, nullable trackedSeconds and output IDs/kinds/titles. Descriptions and output bodies stay out of bulk reads. Tracked time means claimed working intervals excluding recorded blockers, not CPU time or verified labor. Legacy work without history/metadata retains null estimates/time.

Project read-model resource: `/api/v1/projects/:project/tasks/:task` returns description/impact/outputs and20 newest attempts with `nextOffset`; `?offset=N` continues. `/attempts/:attempt` returns captured result flags and bound sessions. `/attempts/:attempt/sessions/:session/messages?offset=N` returns≤50 sanitized rows only for a persisted binding matching current gateway identity. `/outputs/:output` serves PNG or plain text without client-selected paths. These inherit existing COM access boundaries, not an operator credential in the browser. Public bridges still block privileged Core routes. Behavioral authority and tests: [communicator FR-066–070 / TC-042](features/communicator/SPEC.md).

All paths below are relative to `/api/v1/operator`. `projectId`, `taskId`,
`attemptId`, `automationId` and `tickId` are returned identifiers, not labels.

| Method | Path | Input / outcome |
| --- | --- | --- |
| GET | `/health` | Safe backend status; no private paths or provider credentials |
| GET | `/capabilities` | Execution support and capacity diagnostics |
| GET | `/projects` | Canonical registered project catalog |
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

The six executable cases in [SPEC.md](features/core-orchestration/SPEC.md#detailed-test-cases) are the
acceptance matrix; release evidence records their actual results. Live agent work,
public operator access and new
COM orchestration controls are not claimed by this backend milestone.
