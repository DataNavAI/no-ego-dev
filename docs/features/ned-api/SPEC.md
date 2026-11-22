# Feature: NED API v1

Status: implemented
Release verification and deployment remain separate gates.
Related issues: durable tasks ned-b9914f9f-d82c-40a4-9ffd-c50e90399a62 and ned-c5c39b1c-4be2-4f61-ad49-feccd060a42b.

## User outcome and scope

CLI, COM and trusted integrations use one backend contract named **NED API v1**,
owned by Core and rooted at `/api/v1`. COM hosts the web UI and relays this same
API; it does not maintain a second backend. Existing data, public CLI commands,
private credential storage, Hermes upstream protocols and runtime isolation stay
unchanged. Every API requires authentication, locally and through transports.
This does not authorize database migration or automatic agent dispatch.

Canonical interface: [API reference](../../api.md). System responsibilities and
security boundaries: [architecture](../../architecture.md).

## Requirements

Source extension: [persistent tokens and direct sign-in](INSTANCE-TOKENS.md),
tracked by native188/Hub142. Release and deployment remain separate gates.

Authentication design: [AUTHENTICATION.md](AUTHENTICATION.md). Implementation and
release/deployment verification are separate; no staging rollout is implied.

- FR-001: One Core-owned API handler serves `/api/v1` on both the full Core and
  COM listeners. Core owns chat, project read models, activity and secret API
  services as well as coordination. COM owns static UI and transport adapters.
  Backend-only ephemeral CLI servers enable only coordination operations, after authentication.
- FR-002: All resources share `/api/v1` without a privilege path group.
  Presentation resources retain their canonical schemas. Coordination resources
  use direct context/task-management/coordinator and project execution/automation
  paths. Paged project registrations use `/project-registrations`; execution
  capabilities use `/execution-capabilities`. Credential type never selects a
  response schema. Former `/api/v1/operator` paths404 after authentication.
- FR-003: CLI and shipped browser clients use canonical routes. Existing
  `/api/core/v1/...` and unversioned COM endpoints remain non-redirecting aliases
  with their existing payloads, status codes, query/cursor semantics and streaming
  behavior. Canonical and alias mutations share the same idempotency namespace.
  Hermes upstream `/api/sessions` is not a NED route and is not renamed.
- FR-004: Every API route, including health, discovery, reads, streams, mutations
  and aliases, requires a valid instance bearer or browser Basic credential.
  Missing/invalid authentication401s before dispatch, without data or gateway/work
  side effects. Exact Host/Origin policy remains enforced. Hub grants authority
  only through its authenticated instance-bound channel; public tunnels never
  inject credentials. Malformed/encoded paths and unknown families cannot bypass
  authentication or remote validation. The public COM shell asks for a token before loading data.
- FR-005: Chat submission/attachments/stop retain their existing Origin, type,
  size, session/context and receipt checks. Secrets retain X-NED-Secrets, Origin,
  reveal/entry constraints. No credential reaches browser bundles, logs, URLs or
  error bodies. A user-entered token is stored only after validation, bound to the
  browser origin and instance identity. Presentation reads do not start coordination work.
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
- FR-009: Native CLI and listeners reuse one private persistent instance token.
  NED_API_TOKEN or absolute NED_API_TOKEN_FILE imports a valid64hex token; invalid,
  ambiguous, unsafe or conflicting input fails without replacement or fallback.
  Instance identity persists independently of credential rotation.
- FR-010: Direct UI validates access before loading private data, remembers it
  across reloads when storage permits, offers Forget, and returns to sign-in on401.
  Storage failure permits tab-only use with a notice. Reauthentication never replays
  a message. Fetch streams carry Bearer headers and stop on logout/auth failure.
  The authenticated shell remains hidden/inert until controllers mount; access
  revoked during module loading cannot be restored by that pending load.

## Critical user journeys

### CUJ-004: Sign in directly and resume safely
Actor: direct browser owner. Starting state: public static shell, no browser token,
private instance token available to the owner. Enter a token, validate it, then
load data; reload reuses origin/instance-bound storage. Wrong or expired access
returns to sign-in without data loading or message replay. Storage failure keeps
the session tab-only. Forget removes browser access and closes active streams.
This is critical to replace the browser-native password prompt without exposing
unauthenticated API data. TC-006/007; existing new/existing chat cases remain required.

### CUJ-005: Bootstrap a stable native/container credential
Actor: local CLI or authorized container provisioner. Starting state: empty or
existing private runtime and optional token input. Generate only when no input or
saved token exists; otherwise import/reuse the matching token. Restart preserves
token and instance identity. Invalid/conflicting input fails without mutation or
fallback. This is critical to keep Hub, CLI and browser access stable across runs.
TC-005; managed custody/provisioning is owned by Hub142.

### CUJ-001: Use the same API through Core, CLI and COM

Actor: contributor/operator. Starting state: isolated runtime, database and project,
full Core or COM listener; private instance credential. Authenticate, discover API
identity, read project data, execute a CLI/task command, and read back authoritative
state. Critical because unified naming without
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

Actor: authenticated owner and unauthenticated caller. Starting state: synthetic
private credential, isolated vault, local API and controlled bridge. Try every
resource/method class without valid credentials, then authenticate through bearer,
Basic or trusted Hub channel. Public tunnels must not authenticate callers merely
because they know the URL. Critical because all instance data and operations
require authority. Failures expose no storage/credentials and start no work.

## Detailed test cases

### TC-001: Namespace classification and transport perimeter
- Journey / requirements: CUJ-003 / FR-002, FR-004, FR-005.
- Level / automation: integration; tests/TC-001.test.js and existing Core/COM bridge cases.
- Preconditions / fixtures: synthetic HTTP requests, loopback origin, fixed test
  bearer; no provider, user vault or external tunnel connection.
- Given: canonical and legacy resource paths plus malformed variants and synthetic private credentials.
- When: classify paths and exercise local/remote guards with and without a bearer.
- Then: only known resource families are eligible for remote forwarding;
  unauthenticated API requests401, authenticated requests reach the same resources,
  and unknown/malformed paths cannot bypass policy. Encoded/double-encoded removed paths, duplicate slashes, traversal,
  backslashes, query confusion and invalid escapes remain denied.
- Steps and assertions: execute the case; table-driven positive/negative vectors
  assert classifications, mapped targets and actual HTTP status/forwarding counts.
- Variants / negative cases: forged Host/Origin, missing/wrong bearer or Basic,
  GET/HEAD/POST across health, discovery, streams, reads, mutations and aliases;
  removed operator namespace404 after authentication; no task writes occur. Public
  bridges forward no authority; trusted Hub bridges overwrite client authorization
  only after channel validation. Real browser navigation uses the token-entry screen and shared Bearer client.
- Cleanup: close only owned test servers/bridges.
- Pass evidence: named assertions and existing bridge regression results; no skips.

### TC-002: Shared listener, compatibility and idempotency
- Journey / requirements: CUJ-001, CUJ-002 / FR-001–FR-003, FR-005, FR-007.
- Level / automation: integration; tests/TC-002.test.js.
- Preconditions / fixtures: new temporary runtime/project/SQLite database, synthetic
  actor and bearer; full Core and COM listeners, no live gateway/model.
- Given: empty registered project and the same authoritative task service.
- When: call canonical discovery/project resources, create a task through canonical
  coordination API, replay the same key through the legacy alias, then read back state.
- Then: API identity is NED API v1, both listeners expose browser resources,
  unauthenticated callers fail, replay creates exactly one task/event, changed
  body conflicts, old payloads remain compatible and backend-only disables browser
  resource families. Startup creates a private credential; no secret appears in responses.
- Steps and assertions: inspect JSON/status and actual persisted task/event counts;
  exercise CLI canonical request URLs through existing task transport cases. With
  no explicit databasePath, start full Core listeners using supplied home and env
  database selection, and a shared handler using databaseUrl. Set the process DB
  to a distinct synthetic nonexistent path; assert selected-project work returns
  200 with an empty items array, activity SSE returns that project with empty
  updates, and no process-context database is created. Also inject a real database
  with a conflicting explicit path; authenticated registry reads and
  browser work/activity must use the injected store. Close the handler and assert
  the caller-owned database remains queryable, then close it in cleanup. Restore
  the process env.
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
  path and explicit disabled-server restrictions remain covered by the secret regression suite; both authenticated transports retain the same privacy checks.
- Cleanup: remove only the owned vault/runtime after closing handlers.
- Pass evidence: exact state/privacy assertions; no real secret in outputs.

### TC-005: Stable token generation, injection and CLI reuse
- Journey / requirements: CUJ-001, CUJ-005 / FR-003, FR-004, FR-007; INSTANCE-TOKENS.md bootstrap contract.
- Level / automation: integration; tests/TC-005.test.js.
- Preconditions / fixtures: owned temporary runtime/project; synthetic64hex tokens, private input file, no gateway/model; empty private auth directory.
- Given: no stored key or a previously persisted key.
- When: use environment/file injection, reopen without injection, repeat the same input, then present conflicting/invalid/unsafe input; run two command-scoped CLI API clients.
- Then: generated/imported key persists privately and both clients reuse it; conflicts preserve source and saved bytes; invalid input never generates a replacement.
- Steps and assertions: execute the case; check exact synthetic token bytes,0600 persisted mode, input unchanged, matching restart, both injection modes and actual authenticated CLI service initialization/readback.
- Variants / negative cases: empty/malformed token, both inputs, missing/relative/symlink/unsafe-permission file; no model/provider side effects. Concurrent lifecycle is additionally covered by existing private-credential/CLI cases; Hub bootstrap concurrency has separate Hub tests.
- Cleanup: close owned API servers and remove only temporary home/project/input files.
- Pass evidence: named assertions, RED old ignored injection/transient CLI key, GREEN exact candidate.

### TC-006: Direct browser first/repeat use, expiration and storage failure
- Journey / requirements: CUJ-002, CUJ-004 / FR-004–FR-007; INSTANCE-TOKENS.md browser contract.
- Level / automation: end-to-end; tests/TC-006.test.js.
- Preconditions / fixtures: real served COM, actual Chromium, owned SQLite/runtime, synthetic gateway, no preexisting browser storage or external credentials.
- Given: the static access form and hidden app with no API authority.
- When: enter wrong then correct token, reload, Forget; rotate the fixture's key and request Debug health, reauthenticate; separately make Storage.setItem throw.
- Then: wrong access loads no gateway data; successful access persists only after validation, survives reload, and never puts tokens in URLs. Forget removes storage.401 clears stale access and preserves unsent draft without sending a turn. Blocked storage works for this tab and requires sign-in on reload.
- Steps and assertions: execute the real browser case at390px and1280px; verify form/app visibility, empty gateway captures before access, stored fixture token/instance identity, cleared password input, reload, settings Forget,401 recovery and zero sent messages.
- Variants / negative cases: wrong token, changed key, browser storage denial; external provider/SSO is inapplicable to this synthetic direct-access flow. Existing Hub bridge cases cover delegated authentication.
- Delayed-load variants: hold `/chat-entry.js` after valid access. The shell stays
  hidden/inert. Release it and submit once: one turn and no document navigation.
  Alternatively Forget during the hold, release, and wait for Connect to become
  enabled: the shell stays hidden and storage stays empty. Hold initial context
  restoration separately: manual Connect remains disabled until it settles.
- Cleanup: close browser/COM/gateway/SQLite and delete test-owned profiles.
- Pass evidence: actual DOM/network assertions; no skips or screenshots containing keys/private conversations.

### TC-007: Authenticated HTTP event streaming and cancellation
- Journey / requirements: CUJ-002, CUJ-004 / FR-004, FR-006; INSTANCE-TOKENS.md streaming contract.
- Level / automation: integration; tests/TC-007.test.js plus real browser chat cases.
- Preconditions / fixtures: synthetic token/storage and fetch responses with bounded byte-split Unicode SSE, opaque event ID and retry hint; second connection401.
- Given: a validated token and active fetch SSE reader.
- When: consume frames, reconnect, receive401; separately Forget during an active response and try an external resource URL.
- Then: incremental Unicode/event identity survives, reconnect uses Last-Event-ID and Bearer,401 clears access/stops reconnect, Forget aborts the request, and no token can be sent to an external URL.
- Steps and assertions: execute the case; assert exact message/ID/headers, two connections only, closed state, storage deletion, aborted signal and rejected foreign resource. Existing served Chromium flows verify the assembled stream before withheld terminal.
- Variants / negative cases: invalid auth/URL, disconnect/reconnect, split multibyte characters; no real gateway/model or unbounded polling.
- Stale-response variant: hold an old authenticated health request, validate a new
  token, then release the old401. The old request aborts, current storage retains
  the new token, and no access-lost notification is emitted.
- Cleanup: close readers/streams and cancel owned retry timers; no filesystem state.
- Pass evidence: named assertions and actual browser streaming regressions.

## Coverage and acceptance

| Requirements | Journeys | Cases / evidence |
| --- | --- | --- |
| FR-001–FR-003, FR-007 | CUJ-001, CUJ-002 | TC-002, CLI transport and legacy regression suites |
| FR-004, FR-005 | CUJ-003 | TC-001, TC-004, existing bridge/secret cases |
| FR-006 | CUJ-002 | TC-003, served browser new/existing chat flows |
| FR-008 | CUJ-001–CUJ-003 | Canonical docs reviewed against implementation; full gates |
| FR-009 | CUJ-005 | TC-005 |
| FR-010 | CUJ-004 | TC-006, TC-007; communicator new/existing chat cases |

Release requires complete automated cases, independent exact-candidate review,
native container acceptance, green CI, merge and verified default local install/
COM restart. Existing paid/live-provider and hosted-auth acceptance remains
separate; synthetic gateway coverage is not represented as a live provider pass.

## Open questions and coverage gaps

Implementation and cases exist; release results are recorded separately.
No alias removal date is set; removal is explicitly out of scope. Existing privacy-
safe request diagnostics and Core events remain the operational evidence; no new
analytics service or payload/credential logging is introduced by this refactor.

### Delegated browser presentation (FR-010 / TC-006, TC-007)
Hub Connect never renders private-token entry, including initial/delayed access validation, failed network checks and Hub-marked401 responses. Reconnect reloads the instance origin so Hub can restore the owner session. The response header `X-NED-Hub-Access: 1` is a presentation hint only: successful authenticated auth-context and instance identity remain mandatory. Legacy saved direct tokens are cleared after authenticated Hub context; direct unmarked401 still permits explicit token entry.
