# NED architecture

## Hosted idle maintenance

Core owns idle truth and the SQLite work/maintenance admission barrier described
in [managed maintenance](features/managed-updates/SPEC.md). COM passes the same
guard to its authenticated Hub control adapter. Hub owns release qualification,
owner preferences, scheduling and Kubernetes replacement; neither browser assets
nor the public HTTP bridge can commit or release maintenance.

Five quiet minutes alone are insufficient: background chat, Core attempts, work
scopes, provider login, pending drafts and unknown/container processes defer the
update. Polling/health/stream traffic does not extend the quiet clock. Work and
maintenance commit contend on the same SQLite write transaction, including
transient CLI processes. Preparation expires; committed barriers survive socket
loss and same-generation restarts. Only cancellation of the exact intent or a
trusted higher-generation replacement clears them. Unknown work is retained
conservatively rather than declared complete after a timeout.

The managed wrapper supplies `NED_MANAGED_INSTANCE_ID`,
`NED_MANAGED_GENERATION` and actual `NED_PLATFORM_PIDS`. Linux process inspection
binds platform PIDs to start identities and allows only the fixed health helper;
unavailable inventory defers updates. These variables are trusted deployment
configuration. Unmanaged/older adapters do not advertise support. This source
does not enable Hub scheduling or certify a deployed Linux image; Hub182 and
its container/test/staging gates own that rollout.

Status: NED API v1 consolidation is a source candidate; deployment is a
separate acceptance gate. The existing CLI/Core/COM responsibilities below are
retained, with API ownership consolidated in Core.

## Components and flows

```text
CLI / trusted integrations -> /api/v1/* -> Core task/coordination service
COM browser -> /api/v1/* -> Core browser services -> Hermes / project data / vault
COM static host + Hub/public bridge -> the same Core-owned NED API handler
```

- `apps/core` owns the NED API v1 router, route exposure policy, project read
  models, chat/attachment/stream services, secret operations and coordination.
- `apps/com` owns browser assets, local web hosting and Hub/public transport
  adapters. It consumes the same API contract as other clients, not a separate
  COM-specific backend API. Legacy module entrypoints remain compatibility shims.
- `apps/cli` owns command parsing/presentation and uses the authenticated API. Ordinary
  task commands start a bounded backend-only loopback server with an in-memory
  bearer; configured servers must match the selected runtime and database.
- Shared root `src` owns runtime selection, SQLite task graph and encrypted vault
  primitives. One root lockfile/installer releases all three apps together.

The authoritative HTTP contract is [NED API v1](api.md). Core execution ownership,
outbox/admission/verification and automation details remain in the supporting
[orchestration design](features/core-orchestration/DESIGN.md).

## State and ownership

The selected runtime's `.ned` directory owns SQLite, private operator credentials
and encrypted secrets. Project/task/goal/attempt/session IDs are opaque retained
identifiers, never reconstructed from display titles. Core is the only owner of
task mutations, transactions, idempotency receipts, worker admission and completion
verification. Project UI data is a read model of this same store. Chat session
history and model execution belong to the selected Hermes gateway; transient turn
and attachment state stays bounded and is scoped to session/gateway identity.

No API unification migration moves databases, creates another work graph, changes
actor identity or copies host profiles. Existing durable-volume replacement and
backup/restore ownership remains in the [container contract](features/standalone-container/SPEC.md)
and [deployment runbook](features/aws-staging-deployment/RUNBOOK.md).

For an owned in-flight Stop, an authenticated matching cancellation can establish
stopped completion before the HTTP acknowledgement; partial text is retained.
Unsolicited/foreign cancellation remains failed (Communicator TC-039).

Account-level provider inheritance and guided setup are planned in Hub#135/native#182,
not enabled by API consolidation. Hub/ned-iac retain hosted Kubernetes/account
storage ownership. This source does not certify hosted images, OAuth or paid
inference; preserve user workspaces and configured profiles across deployment.

## Security and transport

All listeners bind loopback and require the exact bound Host and permitted Origin.
Every API, including health/discovery/reads/streams and legacy aliases, requires
instance authentication. CLI uses a persistent private bearer. The public browser
shell requests a token, validates before loading data and saves access bound to
origin/instance identity. Forget and401 clear access and stop active streams.
HTTP streaming uses fetch with Bearer headers. URLs, shipped assets and logs never
contain the key. Legacy Basic credentials remain accepted. Container COM may additionally
accept its configured Basic credentials. The socket-less Hub bridge injects the
target instance credential only on authenticated instance-bound channels after
metadata/Origin validation; public quick tunnels never inject credentials.
There is no privilege path group: all resources share `/api/v1`. Browser mutations retain
their resource-specific CSRF/media/receipt checks; secret access requires explicit
privacy headers and reveal/entry intent. Unknown future API families are not
automatically exposed by transport adapters.

The full Core listener and COM listener share one handler. Backend-only CLI servers
intentionally enable only coordination operations and do not start browser/chat/vault
services or an automatic coordinator. API services close owned streams, probes,
workers and listeners on disconnect/shutdown; they do not stop a host Hermes.

## Compatibility, failure and rollback

Canonical clients use `/api/v1`; old Core/COM URLs are direct compatibility aliases,
not redirects, so request bodies, SSE streams, cursors and idempotency remain intact.
Operator and browser project views have distinct paths, never auth-dependent response
shapes. API unavailability produces bounded errors; CLI never writes directly as a
fallback or blindly retries ambiguous mutations. Reuse a retained idempotency key
with identical input after authoritative readback.

Rollback reinstalls the prior co-released CLI/COM/Core generation and reloads the
browser. No irreversible data/schema migration is introduced. Legacy aliases stay
until an explicit future migration removes them with consumer/rollback evidence.

## Operational evidence and verification

Reuse privacy-safe chat request phase/status/duration diagnostics and persisted
Core lifecycle events/metrics. Never add request payloads, credentials, raw secret
values or model text to routing telemetry. This internal contract refactor adds no
analytics provider or personal-data collection. Stream tests use deterministic held
chunks; ownership/idempotency tests use real SQLite/HTTP. Native container tests,
self-review and installed-local readback establish release acceptance, not
merely the presence of these documents. Live/paid provider acceptance is separate.

## Model configuration and account inheritance

Core's model-setup service owns the NED API v1 status/setup family and the
pre-chat readiness gate. COM owns the provider prompt and reports authenticated
Hub registration internally; it does not introduce another backend/API. Existing
credential-configured Hermes profiles take precedence. Fresh profiles can inherit
the owning Hub default after exact instance registration. The Hub account service
stores encrypted provider grants and proxies fixed provider inference; a native
profile stores only its own scoped Hub capability, private0600 YAML and an opaque
connection/model version marker. No provider refresh token is cloned into hosted
containers. Every inherited turn rechecks Hub metadata/authentication; current
model/capability updates precede Hermes execution. Permanent Hub origin/instance
identity and generation-scoped credential checks remain Hub-owned.

Private local setup supports API keys against fixed provider credential endpoints,
then performs atomic profile replacement under a private lock after snapshot and
one-use intent checks. Unrelated configuration/workspaces are preserved; explicit
replacement and readback are separate from automatic inheritance. Malformed,
symlinked or unsafe credential files fail closed. The public quick tunnel never injects authority; setup requires the same NED API
authentication plus Origin/privacy guards. Backend-only coordination listeners do not mount it. Setup and COM/Hermes
health are distinct. Existing history can load while a missing provider disables
sending; drafts survive setup. Provider rejection/revocation offers reconfiguration
through Hub or the private local control, without replaying the failed message.

Hub-owned provider OAuth is retired (Hub#137); optional account API-key defaults remain. Instance-owned setup/authentication is native#191. The compact UI exposes OpenAI/OpenRouter/Gemini/Claude keys and, when available, Hermes's existing OpenAI device login. A fixed Python adapter imports installed Hermes configuration/auth helpers; no arbitrary CLI or raw file API is exposed. Keys enter private stdin, only bounded public challenge/status leaves stdout, and the initiating NED API authority plus unchanged profile snapshot authorizes the private commit after provider waits. Hermes owns token exchange, private storage and refresh; NED owns bounded login-job lifecycle, cancellation/expiry, explicit replacement and UI status. Each instance stores its own grant in its persistent workspace. No rotating grant is cloned across instances. OpenAI API keys and ChatGPT device login are separate modes. Current implementation/acceptance lives in [model setup](features/model-setup/SPEC.md), historical no-ego-dev#182, native#191 and Hub#135–137. Actual
Hermes SDK, real container/EKS and live provider consent are separate evidence;
source merge does not certify staging enablement. No new telemetry receives raw
keys, grants, chat content or profile data.

First-use model setup in COM is an authenticated full-screen modal gate driven by Core model status, not a browser completion flag. The workspace remains unavailable until configuration is confirmed; existing configured profiles bypass onboarding. The same form serves optional provider settings. See [model setup](features/model-setup/SPEC.md) and its [interstitial contract](features/model-setup/design/interstitial.md). Provider API/auth ownership is unchanged.

Hub-delegated browser access keeps private token controls hidden from initial HTML through validation, load failures and access expiry. An advisory `X-NED-Hub-Access: 1` response header selects reconnect UI and clears legacy browser token storage; it grants no authority. Authentication still requires a successful Core auth-context response and instance identity. Direct unmarked401 responses enable the direct-token form; unavailable verification offers Reconnect without requesting a private credential.

Instance model setup serves provider-specific model choices from the installed Hermes catalog through its authenticated status response (`models`, `catalogSource: installed-hermes`). New selections are constrained to the nonce-bound provider catalog before credential/authentication work. Lists are bounded to 100 IDs/provider (2,000 ID characters/provider) and sanitize identifiers only; no secrets/catalog metadata are exposed. Configured models absent from the catalog stay intact. NED renders a select and no Hub configuration link. This installed-support snapshot does not promise provider-account entitlement or live availability; provider authentication remains unchanged.

OpenAI API choices use Hermes’ native Chat Completions catalog, matching NED’s current local OpenAI transport; Responses-only picker entries are excluded. Other providers retain their native Hermes catalog/transport.

First-time COM model setup defaults to **ChatGPT Subscription** (`openai-codex`) when installed Hermes device authentication is available. It uses the existing explicit device-login flow; no authentication starts automatically. Existing configured provider/model selections and user choices on status refresh are preserved. If device authentication is unavailable, fresh/unconfigured setup selects OpenAI API instead of a disabled subscription option. Provider IDs and the authenticated API contract remain unchanged. Tracked in [#202](https://github.com/DataNavAI/no-ego-dev/issues/202).

Claude/Gemini subscription authentication is implemented as a Linux candidate in [native #206](https://github.com/DataNavAI/no-ego-dev/issues/206), with release verification pending. Core wraps fixed official vendor clients in a bounded private login process, rechecks authority/profile before commit, and stores only that instance's grant in its persistent profile. Hermes transports and refreshes through pinned provider plugins. The Antigravity plugin uses a context-local credential setting with no launch-profile/keyring fallback; no global environment mutation or Hub provider OAuth is introduced. See [design, API and release boundaries](features/model-setup/subscription-auth.md). macOS/Windows subscription login and live-provider acceptance are not established by this candidate.

## Private provider connections

The native Communicator routes operator-authenticated connection requests through the Core browser API. Provider credentials live in a distinct encrypted runtime vault. Chat surfaces server-owned pending requests and the CLI consumes only confirmed identities. Hosted/container COM, public relays and isolated native staging are excluded. See [provider identity](features/provider-identity/SPEC.md).
