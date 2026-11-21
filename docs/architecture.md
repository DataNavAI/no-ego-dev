# NED architecture

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
instance authentication. CLI uses a private bearer; browser navigation challenges
with standard HTTP Basic (username ned, private instance key). Application JS,
URLs, local storage and logs never contain the key. Container COM may additionally
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
independent review and installed-local readback establish release acceptance, not
merely the presence of these documents. Live/paid provider acceptance is separate.
