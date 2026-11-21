# Feature: NED API v1

Status: implemented
Release verification and deployment remain separate gates.
Related issues: none; durable task ned-b9914f9f-d82c-40a4-9ffd-c50e90399a62.

## User outcome and scope

CLI, COM and trusted integrations use one backend contract named **NED API v1**,
owned by Core and rooted at `/api/v1`. COM hosts the web UI and relays this same
API; it does not maintain a second backend. Existing data, public CLI commands,
private credential storage, Hermes upstream protocols and runtime isolation stay
unchanged. This is not permission to expose operator coordination publicly,
remove authentication, migrate databases or enable automatic agent dispatch.

Canonical interface: [API reference](../../api.md). System responsibilities and
security boundaries: [architecture](../../architecture.md).

## Requirements

- FR-001: One Core-owned API handler serves `/api/v1` on both the full Core and
  COM listeners. Core owns chat, project read models, activity and secret API
  services as well as coordination. COM owns static UI and transport adapters.
  Backend-only ephemeral CLI servers enable only operator operations.
- FR-002: Browser resources are `/api/v1/{health,capabilities,projects,chat,secrets,
  workspace,activity}`. Privileged resources are `/api/v1/operator/...`, retaining
  the previous operator resource hierarchy and response envelopes. Project read
  models and paged operator project registration are distinct documented views,
  never different responses selected by the presence of a credential.
- FR-003: CLI and shipped browser clients use canonical routes. Existing
  `/api/core/v1/...` and unversioned COM endpoints remain non-redirecting aliases
  with their existing payloads, status codes, query/cursor semantics and streaming
  behavior. Canonical and alias mutations share the same idempotency namespace.
  Hermes upstream `/api/sessions` is not a NED route and is not renamed.
- FR-004: Exact loopback Host and same-origin policy remain enforced. Operator
  routes require the existing runtime-private bearer and are blocked on Hub and
  public tunnels even with a valid bearer. Public quick tunnels also block secret
  operations. Canonical, legacy, encoded, repeated-encoding, slash/dot and malformed
  variants cannot bypass these boundaries. Unknown versioned API families are
  denied by remote adapters rather than implicitly made public.
- FR-005: Chat submission/attachments/stop retain their existing Origin, type,
  size, session/context and receipt checks. Secrets retain X-NED-Secrets, Origin,
  public-mode and reveal/entry constraints. No credential reaches browser bundles,
  logs, URLs or error bodies. Browser-safe APIs do not start an operator service
  or expose its token merely to read chat/projects/health.
- FR-006: Chat and activity/event streams retain progressive delivery, event IDs,
  cursor validation, bounded buffering, disconnect cleanup and stop semantics.
  Aliases are dispatched directly, without redirects or buffering whole responses.
- FR-007: Existing storage, ownership/verification fences and failure semantics
  remain authoritative. No alternate task graph or secret store is introduced.
  API failure never falls back to direct CLI writes or retries a mutation blindly.
- FR-008: `/docs/api.md` is the canonical complete interface reference;
  `/docs/architecture.md` describes request/data flows and deployment. Previous
  Core references link to this contract rather than maintain competing versions.
  Legacy aliases remain supported for v1; removal requires a separately reviewed
  migration and evidence that consumers have moved. Rollback reinstalls a prior
  release and reloads browser assets; no irreversible data migration is needed.

## Critical user journeys

### CUJ-001: Use the same API through Core, CLI and COM

Actor: contributor/operator. Starting state: isolated runtime, database and project,
full Core or COM listener; operator token kept outside the browser. Discover API
identity, read browser project data, execute a CLI/task command through the operator
family, and read back authoritative state. Critical because unified naming without
shared backend ownership would retain divergent behavior. Failure preserves data,
returns the existing bounded error, and requires readback before mutation retry.

### CUJ-002: Upgrade clients without breaking existing sessions

Actor: browser/CLI integration. Starting state: new backend and a canonical or
legacy client. Create/resume chat, submit input, observe incremental streamed
response, stop/disconnect and reopen. Read project/task delivery and activity.
Repeat safe reads and idempotent writes through aliases. Critical because UI,
active streams and existing trusted integrations cannot all upgrade atomically.
On interrupted writes preserve IDs/keys and inspect status instead of resending.

### CUJ-003: Preserve local and remote trust boundaries

Actor: operator and authenticated Hub/public-tunnel user. Starting state: synthetic
private token, isolated vault, local API and controlled bridge. Access browser-safe
resources remotely, attempt privileged paths and malformed variants, and verify
denial before forwarding. Secrets remain unavailable through public quick tunnels.
Critical because combining namespaces must not turn local authority into remote
authority. Authentication failures never expose storage, credentials or handlers.

## Detailed test cases

### TC-001: Namespace classification and transport perimeter
- Journey / requirements: CUJ-003 / FR-002, FR-004, FR-005.
- Level / automation: integration; tests/TC-001.test.js and existing Core/COM bridge cases.
- Preconditions / fixtures: synthetic HTTP requests, loopback origin, fixed test
  bearer; no provider, user vault or external tunnel connection.
- Given: canonical and legacy operator/secret/browser paths plus malformed variants.
- When: classify paths and exercise local/remote guards with and without a bearer.
- Then: only canonical browser families are eligible for remote forwarding;
  operator/unknown/malformed paths cannot bypass policy, and quick tunnels deny
  secrets. Encoded/double-encoded operators, duplicate slashes, traversal,
  backslashes, query confusion and invalid escapes remain denied.
- Steps and assertions: execute the case; table-driven positive/negative vectors
  assert classifications, mapped targets and actual HTTP status/forwarding counts.
- Variants / negative cases: forged Host/Origin, bearer on public operator route,
  unknown version/family, method-independent denial; no data writes occur.
- Cleanup: close only owned test servers/bridges.
- Pass evidence: named assertions and existing bridge regression results; no skips.

### TC-002: Shared listener, compatibility and idempotency
- Journey / requirements: CUJ-001, CUJ-002 / FR-001–FR-003, FR-005, FR-007.
- Level / automation: integration; tests/TC-002.test.js.
- Preconditions / fixtures: new temporary runtime/project/SQLite database, synthetic
  actor and bearer; full Core and COM listeners, no live gateway/model.
- Given: empty registered project and the same authoritative task service.
- When: call canonical discovery/project resources, create a task through canonical
  operator API, replay the same key through the legacy alias, then read back state.
- Then: API identity is NED API v1, both listeners expose browser resources,
  unauthenticated operators fail, replay creates exactly one task/event, changed
  body conflicts, old payloads remain compatible and backend-only disables browser
  resource families. Browser reads never create an operator token on COM startup.
- Steps and assertions: inspect JSON/status and actual persisted task/event counts;
  exercise CLI canonical request URLs through existing task transport cases.
- Variants / negative cases: missing auth, mismatched runtime/DB, unknown resource,
  invalid JSON/key, same key across canonical/alias and body mismatch; existing
  task/Core suites own exhaustive ownership, concurrency and verification fences.
- Cleanup: close listeners and remove owned temporary runtime/project.
- Pass evidence: real HTTP and SQLite assertions plus retained legacy regressions.

### TC-003: Canonical chat streams, attachments and activity
- Journey / requirements: CUJ-002 / FR-001, FR-003, FR-005, FR-006.
- Level / automation: integration; tests/TC-003.test.js and existing browser flows.
- Preconditions / fixtures: loopback synthetic Hermes gateway using deterministic
  held HTTP chunks; isolated runtime/project; no real credentials or model calls.
- Given: a fixed session with deterministic history and a fresh turn.
- When: resolve canonical session, submit input, consume the first stream chunk
  before releasing completion, reopen history, and compare legacy reads.
- Then: HTTP streaming remains incremental, IDs are retained, aliases do not
  redirect, disconnect/stop closes owned streams, and progressive history works.
- Steps and assertions: use explicit barriers, not timing guesses; verify content,
  headers/status, bounded buffers, cancellation and actual gateway request count.
- Variants / negative cases: missing Origin, wrong media type, invalid cursor,
  unavailable gateway and stale/session-mismatched receipts remain rejected;
  existing chat/media/secret suites retain their broader regression coverage.
- Cleanup: close owned upstream/listeners and release all held responses.
- Pass evidence: transport assertions and served-client new/existing-chat tests.

### TC-004: Canonical secret operations retain privacy
- Journey / requirements: CUJ-003 / FR-003–FR-005, FR-007.
- Level / automation: integration; tests/TC-004.test.js and existing secret cases.
- Preconditions / fixtures: temporary vault and synthetic key/value; local listener
  plus secrets-disabled listener. No actual passwords or provider credentials.
- Given: an empty vault selected by an explicit test runtime.
- When: write via canonical endpoint with required headers, list via alias, reveal
  explicitly, then attempt absent Origin/header, cross-site and disabled-mode calls.
- Then: only authorized actions succeed; list never contains values; errors contain
  no value/token/path; aliases share one store; denied operations leave data intact.
- Steps and assertions: check response shape/status and persisted synthetic value;
  delete it through the other alias and verify missing readback.
- Variants / negative cases: query strings, oversized/extra-field JSON, malformed
  path and public-mode restrictions remain covered by the secret regression suite.
- Cleanup: remove only the owned vault/runtime after closing handlers.
- Pass evidence: exact state/privacy assertions; no real secret in outputs.

## Coverage and acceptance

| Requirements | Journeys | Cases / evidence |
| --- | --- | --- |
| FR-001–FR-003, FR-007 | CUJ-001, CUJ-002 | TC-002, CLI transport and legacy regression suites |
| FR-004, FR-005 | CUJ-003 | TC-001, TC-004, existing bridge/secret cases |
| FR-006 | CUJ-002 | TC-003, served browser new/existing chat flows |
| FR-008 | CUJ-001–CUJ-003 | Canonical docs reviewed against implementation; full gates |

Release requires complete automated cases, independent exact-candidate review,
native container acceptance, green CI, merge and verified default local install/
COM restart. Existing paid/live-provider and hosted-auth acceptance remains
separate; synthetic gateway coverage is not represented as a live provider pass.

## Open questions and coverage gaps

Implementation and cases exist; release results are recorded separately.
No alias removal date is set; removal is explicitly out of scope. Existing privacy-
safe request diagnostics and Core events remain the operational evidence; no new
analytics service or payload/credential logging is introduced by this refactor.
