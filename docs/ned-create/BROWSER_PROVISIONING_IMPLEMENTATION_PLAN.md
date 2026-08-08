# Browser-first `ned create` implementation plan — PARKED

Status: FUTURE SCOPE AFTER DAYTONA CLI V1

Do not deploy, extend, or treat this plan as the primary CUJ. AWS PR #28 was closed without deployment. The authoritative v1 contracts are PRD/CUJ/TECH_SPEC v3.0 for the one-command Daytona CLI.
PR mode: MERGEABLE
Issues: [#22](https://github.com/DataNavAI/no-ego-dev/issues/22), [#23](https://github.com/DataNavAI/no-ego-dev/issues/23)
Design input only: review-only PR [#25](https://github.com/DataNavAI/no-ego-dev/pull/25); never merge it.

## TL;DR

The smallest dependency-safe vertical slice is a provider-neutral model connection contract shared by the existing provisioning core and a browser-facing API. It keeps Daytona compute authorization separate, supports OpenAI, Anthropic, Gemini, and OpenRouter, preserves the existing OpenRouter PKCE CLI path, and does not create paid resources without model authorization. A deployable browser service follows on the same branch, but production promotion remains blocked on identity, hosting/region, managed-compute authority, model authorization, and exact-SHA independent approval.

## Product contract

Primary journey: sign in → connect compute → connect model provider → create NED → send first request.

- Browser is the primary onboarding surface; CLI/bootstrap remains a fallback and provisioning primitive.
- OpenRouter is one provider, not product terminology or a mandatory intermediary.
- Official delegated authorization is preferred only when the provider exposes a supported browser/API grant for this product. OpenRouter PKCE is currently implemented. Direct OpenAI, Anthropic, and Gemini API paths use secure API-key fallback; no unsupported OAuth promise is made.
- No generic remote command endpoint. Browser jobs submit typed allowlisted operations only.
- Compute creation is gated on both compute and model authorization.

## Slice boundaries

### Slice 1 — provider-neutral provisioning core

- Add an allowlisted model-provider registry and public capability contract.
- Keep credentials transient and non-serializing; expose one-time consumption to the compute adapter.
- Add provider-specific Daytona secret names, environment variables, egress hosts, Hermes providers, and fixed models.
- Add `ned create --model-provider <openai|anthropic|gemini|openrouter>` while retaining OpenRouter as the backwards-compatible CLI default.
- Persist only the selected provider ID with existing non-secret workspace metadata.

### Slice 2 — browser session and connection API

- Serve the selected guided browser flow from a deployable Node HTTP process.
- Require an authenticated server session, HttpOnly/Secure/SameSite cookie, CSRF token, origin check, bounded JSON bodies, and per-session rate limits.
- Accept model credentials only in HTTPS POST bodies, immediately transfer them to an injected secret store, and return only a connection ID/status.
- Expose typed operations: `connect_compute`, `connect_model_provider`, `create_ned`, `send_request`, `resume_ned`, `destroy_ned`, and `cancel_job`.
- Bind jobs and idempotency keys to the authenticated session; make state resumable and cancellation compensating.
- Default production startup fails closed until a real identity adapter, durable encrypted secret store, and durable job store are configured. A clearly labeled development adapter may support local browser QA without cloud creation.

### Slice 3 — hosted lifecycle and release

- Select staging and production hosting/region and approve spend/resource authority.
- Configure real identity, durable encrypted storage, queue/worker isolation, quotas, monitoring, alerts, and rollback.
- Verify create → first inference → stop/resume → second inference → destroy → direct Daytona zero-resource readback against one immutable SHA.
- Require fresh independent exact-SHA review before merge, staging, production, or paid resource creation.

## Security invariants

Credentials, OAuth codes, PKCE verifiers, prompts, and responses must never enter URLs/query strings, localStorage, analytics, error reporting, access logs/traces, argv/process listings, source control, fixtures, screenshots, or plaintext durable fields. OAuth uses state, PKCE, nonce where applicable, short-lived server-side transactions, and single-use callbacks. Jobs are session-bound, CSRF-protected, idempotent, isolated, rate-limited, cancellable, resumable, and compensating. Logs and analytics use allowlisted stage/result classes only.

## Event taxonomy

No delivery is enabled until collector, privacy, retention, region, and consent are approved.

- `web_setup_started`
- `compute_authorization_completed`
- `model_authorization_completed`
- `instance_create_started`
- `instance_activation_completed` — activation
- `instance_create_failed` — sanitized stage/class only
- `browser_request_completed` — primary journey completion; no prompt/response content
- `instance_resumed`
- `instance_repair_completed`
- `instance_destroyed`

## Verification matrix

| Boundary | Automated evidence | External evidence |
| --- | --- | --- |
| Provider registry | focused Node contract tests | official Hermes provider docs inspected |
| CLI compatibility | full `tests/ned-create` suite and package smoke | no cloud call |
| Daytona mapping | fake-SDK contract tests; egress/env assertions | authenticated zero-workspace readback |
| Browser security | request-level auth/CSRF/origin/body/rate/idempotency tests | browser desktop/mobile runtime capture |
| Lifecycle | deterministic fake worker and compensation tests | real immutable-SHA lifecycle plus zero-resource readback |
| Release | static analysis, Python suite, audit, pack, gitleaks, CI | staging/production smoke, monitoring, rollback |

## Current blockers

- Identity provider/account recovery is not selected.
- Hosting provider, staging/production region, and spend authority are not approved; AWS account access does not authorize resource creation.
- Platform-managed compute quota/abuse/cost policy is not approved.
- No model-provider authorization is currently available, so a real Daytona lifecycle must not start.
- Independent exact-SHA approval is required before merge or deployment, but this mission explicitly has one active worker; self-review is evidence, not approval.

## Refactoring task

After the browser API slice is green, consolidate provider/runtime metadata behind one tested boundary, remove remaining OpenRouter-specific lifecycle aliases that are no longer needed for compatibility, inject session/secret/job stores through narrow interfaces, and keep provider, browser-security, compensation, and existing CLI behavior covered by deterministic tests.
