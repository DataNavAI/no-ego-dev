# NED Core API v1

Status: implemented source candidate; release verification is tracked separately.
This reference describes the v1 contract, not a claim of live-provider acceptance.

Repository: [DataNavAI/no-ego-dev](https://github.com/DataNavAI/no-ego-dev).
Backend modules: `apps/core/src/` (`src/core/` compatibility exports).
Related app roots: `apps/cli/` and `apps/com/`.
Behavioral authority: [SPEC.md](SPEC.md).
Architecture, lifecycle and rollout: [DESIGN.md](DESIGN.md).

## Connection and authentication

Base path: `/api/core/v1` on the configured loopback Core or COM listener.
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

CLI uses `--api` > `NED_CORE_URL`, or a command-scoped temporary Core listener
without coordinator startup if neither is set. Temporary listeners use a random
process-private bearer instead of creating a persistent operator token; only
backend-only programmatic construction accepts that credential override. Full
Core/COM listeners keep their existing private-token storage requirement.
Explicit failure never falls
back. URLs are loopback HTTP roots only; the client never retries mutations
automatically. Use `--request-id` for identical retry recovery. Behavioral tests:
[task-management TC-013](../task-management/SPEC.md).

### Delivery metadata for Goals & Tasks
`PUT /projects/:projectId/tasks/:taskId/delivery` replaces one item's presentation record without starting work or changing status. Normal operator bearer/origin/idempotency rules apply. Goal IDs are accepted for explicit finish estimates.

```json
{"impact":"Reduce checkout abandonment.","remainingSeconds":1200,"estimatedFinish":"2026-11-20T12:00:00.000Z","outputs":[{"id":"brief","kind":"document","title":"Implementation brief","text":"Customers can check out with fewer fields."}]}
```

Omitted fields reset on replacement: impact becomes empty, estimates null, outputs empty. Impact: single line≤240characters; remainingSeconds: null or integer0–31,536,000; estimatedFinish: null or canonical UTC ISO timestamp. Outputs:≤3 unique ASCII IDs1–64characters and titles1–120characters. Documents use `text`≤16,384characters. Images use `kind:"image"`, `image:"data:image/png;base64,..."` (or JPEG),≤32,768characters. The existing64KiB body cap applies. Images are decoded≤4million pixels, resized≤1024px, re-encoded as PNG; URLs, paths, SVG and arbitrary HTML are not accepted. Same key/body returns the original timestamp; different body under that key returns409. A new key atomically replaces the record and removes omitted outputs. Data stays in the runtime DB, with no filesystem copies or public uploads.

Work snapshots return compact `delivery`: impact, remainingSeconds, estimatedFinish, updatedAt, nullable trackedSeconds and output IDs/kinds/titles. Descriptions and output bodies stay out of bulk reads. Tracked time means claimed working intervals excluding recorded blockers, not CPU time or verified labor. Legacy work without history/metadata retains null estimates/time.

COM browser read facade: `/api/projects/:project/tasks/:task` returns description/impact/outputs and20 newest attempts with `nextOffset`; `?offset=N` continues. `/attempts/:attempt` returns captured result flags and bound sessions. `/attempts/:attempt/sessions/:session/messages?offset=N` returns≤50 sanitized rows only for a persisted binding matching current gateway identity. `/outputs/:output` serves PNG or plain text without client-selected paths. These inherit existing COM access boundaries, not an operator credential in the browser. Public bridges still block privileged Core routes. Behavioral authority and tests: [communicator FR-066–070 / TC-042](../communicator/SPEC.md).

All paths below are relative to `/api/core/v1`. `projectId`, `taskId`,
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

The six executable cases in [SPEC.md](SPEC.md#detailed-test-cases) are the
acceptance matrix; release evidence records their actual results. Live agent work,
public operator access and new
COM orchestration controls are not claimed by this backend milestone.
