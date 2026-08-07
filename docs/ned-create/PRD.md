# PRD: Browser-first provider-neutral NED provisioning

Contract version: 2.0
Status: implementation candidate; production release blocked
Owner: NoEgoDev
Last updated: 2026-08-06
Supersedes: PRD v1 CLI-first/OpenRouter-only product scope. The existing CLI remains a backward compatibility path, but browser onboarding is authoritative for issue #23.

The review-only design PR #25 is input, not approved product authority. This PRD, issue #23, TECH_SPEC v2.0, and CUJ v2.0 govern this implementation.

## TL;DR

A product-minded builder creates and returns to one private NED from a browser without installing Node.js, npm, git, Homebrew, a CLI, or a VPS. Compute authorization and model authorization remain separate. The model connection is provider-neutral: official OAuth or delegated authorization is preferred when supported; secure API-key fallback is allowed for OpenAI, Anthropic, and Gemini, while OpenRouter uses its supported PKCE path.

## Product decisions

- Browser-first is the primary journey; the CLI is an advanced fallback and provisioning primitive.
- Compute ownership working assumption: platform-managed, quota-limited beta. This is not launch approval. Production may move to user-owned Daytona only after a supported third-party delegated grant is verified.
- No Daytona API-key form in browser onboarding.
- OpenRouter is not mandatory product infrastructure.
- No generic command endpoint. Browser execution uses typed allowlisted operations only.
- Development simulation and production are separate trust boundaries. Simulation creates no paid/cloud resources and performs no model inference.

## Critical user journey

1. Open the browser setup application.
2. Sign in; the server binds an HttpOnly, Secure, SameSite session to one owner.
3. Connect compute independently.
4. Connect OpenAI, Anthropic, Gemini, or OpenRouter under the authorization policy.
5. Submit one idempotent `create_ned` operation.
6. Observe authoritative queued → running → succeeded progress across polling and refresh, or a truthful failure/cancel state with verified compensation.
7. After remote health succeeds, submit `send_first_request` and receive bounded output.
8. Return later and submit `resume_ned` for the same NED.
9. Permanently remove it through `destroy_ned`; product state clears only after verified remote deletion and secret revocation.

Activation: `instance_activation_completed` after authoritative create and remote health success.
Primary journey completion: `browser_request_completed` after the first successful browser request. Prompt and response content are excluded.

## Functional scope

### Browser MVP

- One primary create action with fixed safe defaults and no infrastructure form.
- Provider-neutral capability registry for OpenAI, Anthropic, Gemini, and OpenRouter.
- Typed operations: `create_ned`, `send_first_request`, `resume_ned`, `destroy_ned`; `cancel_job` applies only to non-terminal queued/running jobs.
- Refresh-safe server-authoritative status; synchronous success alone is insufficient evidence.
- Legal state transitions and session-owned idempotency.
- Failure, retry, cancellation, resume, destroy, and session-abandonment cleanup.
- Per-session single-flight admission across reconciliation, cleanup checks, idempotency, lifecycle reservation, and adapter submission.
- Durable cleanup-pending retention and a production expiry sweeper independent of request traffic.
- Mandatory owner-scoped secret deletion, supersession, expiry cleanup, and compensation of post-write failures.
- Clear rejection after verified destroy/cleanup.

### CLI migration and backward compatibility

- Existing `ned create`, `chat`, `doctor`, `reset`, and `destroy --yes` remain supported for v0.2 compatibility.
- Existing state without `modelProvider` migrates logically to `openrouter`; new writes persist an allowlisted provider ID.
- Existing OpenRouter PKCE and `OPENROUTER_API_KEY` headless fallback remain supported.
- CLI users may continue to provide Daytona credentials in the invoking process; this does not authorize collecting Daytona keys in the browser.

## Security and privacy contract

- Session ownership, canonical origin, CSRF, rate limits, bounded JSON bodies, idempotency, and typed allowlists are mandatory.
- Credentials, OAuth codes/state/verifiers, prompts, and responses never enter URLs/query strings, fragments, localStorage/sessionStorage, analytics, normal logs, access-log fields, argv, source, fixtures, or screenshots.
- Every API/auth/connection/job endpoint rejects a non-empty query before auth, body parsing, or adapter work with stable `400 query_not_allowed`.
- Secret storage is owner-scoped and transactional through verified delete compensation.
- Cancellation cannot rewrite a terminal success. Readiness changes only after authoritative completion; cleanup state changes only after verified compensation/destroy.
- No success claim may precede compensation verification.

## Event taxonomy

Delivery remains disabled until collector, consent, retention, region, and privacy policy are approved.

- `web_setup_started`
- `compute_authorization_completed`
- `model_authorization_completed`
- `instance_create_started`
- `instance_activation_completed` — activation
- `instance_create_failed` — sanitized stage/class only
- `browser_request_completed` — primary journey completion; no content
- `instance_resumed`
- `instance_repair_completed`
- `instance_destroyed`

## Development and production boundary

Development simulation is loopback-only, explicitly enabled, ephemeral, and blocked from cloud creation/inference. Production startup remains blocked until real identity/account recovery, durable encrypted owner-scoped vault/session/job stores, isolated queue/workers, approved hosting/region/spend, quotas/abuse controls, monitoring, rollback, and provider authorization exist.

## Release evidence

Automated: changed-file and full static checks, focused lifecycle/security tests, bare `npm run check`, bare `npm test`, Python `pytest`, `npm run pack:check`, clean package install/startup/health smoke, `npm audit --omit=dev`, and full-history gitleaks.

Browser: real desktop and mobile evidence for queued/running/succeeded refresh, failure/retry/cancel including delayed cancel-versus-terminal-GET reconciliation, first request, resume, destroy, destination-heading keyboard focus, concise live status, no horizontal overflow, and zero browser storage/URL leakage.

External production gate: exact-SHA create → health → first request → resume → second request → destroy plus direct Daytona zero-resource readback, zero orphaned secret records, monitoring/rollback evidence, and fresh independent exact-candidate approval.

No merge, deployment, AWS resource, Daytona workspace, or paid provider use is authorized by this document.
