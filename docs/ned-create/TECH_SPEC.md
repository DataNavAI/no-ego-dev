# Technical Specification: Browser-first provider-neutral NED provisioning

Contract version: 2.0
Status: implementation candidate; production adapters blocked
Last updated: 2026-08-06
Supersedes: TECH_SPEC v1 OpenRouter-only/CLI-first architecture and state schema. CLI compatibility remains explicitly supported below.

The review-only design PR #25 is input, not approved technical authority. This specification and its executable tests govern the browser service.

## Architecture

```text
Browser UI
  -> Node HTTP boundary: origin/query/auth/CSRF/body/rate validation
  -> owner session + idempotency registry
  -> typed job controller
  -> authoritative durable job service (create/get/cancel)
  -> compute adapter
  -> owner-scoped transactional secret vault (put/delete)

CLI fallback
  -> provider-neutral core -> Daytona adapter -> local non-secret state
```

Production replaces every in-memory development adapter with durable isolated implementations. The loopback development simulation is not production, creates no cloud resources, and performs no inference.

## HTTP contract

All `/api/*` routes fail closed on non-empty query strings before authentication, body reads, or adapter calls: HTTP 400 `{ "error": "query_not_allowed" }`. Browser code constructs same-origin path-only requests; credentials, OAuth material, prompts, and responses are forbidden in URLs, browser storage, logs, analytics, argv, source, fixtures, and screenshots.

| Method/path | Purpose |
| --- | --- |
| `POST /api/session` | authenticate and create owner session |
| `GET /api/session` | refresh connections, authoritative last-job status, readiness |
| `DELETE /api/session` | abandon session and verify owner-secret cleanup |
| `GET /api/model-providers` | return finite provider capability registry |
| `POST /api/compute-connections` | connect Daytona compute separately |
| `POST /api/model-connections` | create/supersede owner-scoped provider connection |
| `POST /api/jobs` | submit one typed operation |
| `GET /api/jobs/:id` | reconcile from authoritative job service |
| `DELETE /api/jobs/:id` | `cancel_job` for queued/running jobs only |

Every mutation requires canonical same-origin, session ownership, CSRF, bounded JSON, per-session rate limit, and operation-specific closed fields. Jobs and idempotency keys are bound to owner plus session. No generic command operation exists.

## Typed operation allowlist

- `create_ned`: requires compute and model connections; cannot run when already ready or after cleanup.
- `send_first_request`: requires ready NED; bounded prompt enters only the trusted job adapter body.
- `resume_ned`: requires an existing ready NED and resumes the same resource.
- `destroy_ned`: requires an existing NED; success is committed only after remote destroy and owner-secret revocation are verified.
- `cancel_job`: represented by `DELETE /api/jobs/:id`; allowed only from queued/running. Create cancellation requests compensation and commits `cancelled` only after verification.

## Job state machine

Legal transitions:

```text
queued  -> running | succeeded | failed | cancelled | blocked
running -> succeeded | failed | cancelled | blocked
terminal: succeeded | failed | cancelled | blocked
```

Terminal states never transition. Before cancellation the controller refreshes authoritative status, preventing cancellation-after-success. Adapter job ID and operation must remain exact. Illegal regressions such as running → queued fail closed.

Readiness rules:

- `create_ned:succeeded` sets ready only after authoritative completion.
- failed/blocked/cancelled create revokes the owner model connection after verified workspace compensation, then records not-ready.
- `resume_ned:succeeded` preserves ready.
- `destroy_ned:succeeded` clears readiness and compute/model references only after verified remote deletion and vault revocation.
- requests after completed cleanup return stable `409 session_cleaned_up`.

## Secret lifecycle

Required vault interface:

```js
put({ ownerId, providerId, method, value }) -> { id }
delete({ ownerId, id }) -> { id, status: 'deleted' }
```

`delete` is mandatory and owner-scoped. A put is provisional until its ID validates and session commit succeeds. Any post-write validation/commit failure deletes the provisional record and verifies the receipt. Reconnection deletes the superseded record; if that deletion fails, the new record is compensated and the old connection remains authoritative. Session expiry, explicit abandonment, failed/cancelled create, and destroy all verify deletion. Tests require zero orphaned records.

## Provider authorization policy

- OpenRouter: supported OAuth PKCE is preferred; environment key remains CLI/headless fallback.
- OpenAI, Anthropic, Gemini: secure server-side API-key fallback is allowed because no unsupported product OAuth grant is promised.
- OAuth/delegated authorization is preferred whenever an official supported grant exists.
- Compute and model authorization remain separate.

Provider registry maps finite provider IDs to fixed secret names, environment variables, egress hosts, Hermes provider IDs, and models. Caller-controlled hosts, environment names, shell commands, or model aliases are rejected.

## State schema and migration

Browser production state is owner-scoped and durable: session ID/expiry, compute connection ID, model connection ID, lifecycle, readiness, last job ID, and idempotency receipts. Secret values are stored only in the encrypted vault.

CLI local non-secret state adds:

```json
{
  "provider": "daytona",
  "modelProvider": "openai|anthropic|gemini|openrouter",
  "workspaceId": "non-secret identifier",
  "workspaceName": "ned-product-partner",
  "profile": "ned",
  "hermesVersion": "pinned version",
  "secretId": "non-secret resource identifier",
  "secretName": "non-secret resource name",
  "cleanupPending": false
}
```

Migration/backward compatibility: missing `modelProvider` in v1 state means `openrouter`; v2 writes always persist an allowlisted ID. Existing CLI commands and OpenRouter defaults remain valid. Browser session/job state does not reuse local CLI files.

## Compute ownership assumption

The browser beta assumes platform-managed, quota-limited compute only as a working product boundary. It requires approved quotas, abuse policy, spend authority, and support before production. User-owned Daytona is future-compatible only after official third-party delegated OAuth is verified. A browser Daytona API-key form is prohibited.

## Verification and release boundary

Required local evidence: focused transition/interleaving/secret/query tests; bare static/full Node/Python/package/audit/leak commands; clean tarball install and startup/health; real mobile/desktop browser journeys against an asynchronous synthetic adapter.

Required production evidence: exact-SHA create → health → first request → resume → second request → destroy, direct Daytona zero-resource readback, zero orphaned secrets, tenant isolation, monitoring, rollback, and fresh independent exact-SHA approval.

No development simulation, synchronous-success fake, review-only design artifact, or self-review can satisfy production release evidence.
