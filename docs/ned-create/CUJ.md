# Critical User Journey and Acceptance Contract

Contract version: 2.0
Status: implementation candidate; external lifecycle evidence blocked
Last updated: 2026-08-06
Supersedes: CUJ v1 CLI-only acceptance. The CLI journey remains a backward compatibility fallback; browser-first provider-neutral acceptance is primary.

The review-only design PR #25 is input, not approved journey authority. Issue #23, PRD v2.0, TECH_SPEC v2.0, and this CUJ govern acceptance.

## CUJ-1: Create a working NED from the browser

Given a signed-in owner, separately authorized compute, and an authorized OpenAI, Anthropic, Gemini, or OpenRouter model connection,
when the owner submits `create_ned`,
then the server creates one session-owned idempotent job and the browser observes authoritative queued → running → succeeded progress across GET polling and refresh.

Success requires remote health verification before readiness. Synchronous success is not the only acceptance path. The browser then enables `send_first_request`; activation is `instance_activation_completed`.

Failure contract: failed/blocked/cancelled create verifies workspace compensation and owner-secret revocation before not-ready/cleanup state is committed. Retry creates no duplicate workspace and leaves zero orphaned secret records.

## CUJ-2: Complete first value

Given authoritative create success,
when the owner submits bounded `send_first_request`,
then a typed job executes without a generic command surface and returns bounded output rendered as text. The prompt/response never enters URL, browser storage, logs, analytics, argv, source, fixtures, or screenshots.

Primary journey completion is `browser_request_completed` only after authoritative success.

## CUJ-3: Refresh and resume the same NED

Given a queued/running job or an existing stopped NED,
when the browser refreshes or the owner returns,
then `GET /api/session` and `GET /api/jobs/:id` reconcile authoritative status and preserve one owner/session-bound intent.

When the owner submits `resume_ned`, the same NED resumes; no duplicate resource is created. A second typed request can complete afterward.

## CUJ-4: Cancel safely

Given a queued/running create,
when the owner invokes `cancel_job`,
then the server first refreshes authoritative state, requests compensation, verifies `cancelled`, revokes the model connection, and only then commits not-ready.

If create already succeeded, cancellation returns `409 job_not_cancellable`; it does not destroy the NED or contradict readiness. Illegal job regressions fail closed.

## CUJ-5: Destroy and stop future resource use

Given an existing NED,
when the owner submits `destroy_ned`,
then remote deletion is awaited and owner-scoped secret revocation is verified before readiness/connections clear.

After cleanup, `create_ned`, `send_first_request`, `resume_ned`, and `destroy_ned` requests on that cleaned session return `409 session_cleaned_up`. Direct production evidence must show zero Daytona resources and zero vault orphans.

## CUJ-6: Reconnect, expire, or abandon without secret orphans

- A replacement model connection revokes the superseded record.
- An invalid post-write receipt or failed state commit compensates the provisional record.
- Session expiry and explicit `DELETE /api/session` abandonment revoke the owner connection before session removal.
- Failed/cancelled create and successful destroy revoke their owned connection.
- Every delete uses owner ID plus record ID and requires a verified `deleted` receipt.

## CUJ-7: Fail closed on URL privacy boundary

For every auth/session, provider, connection, and job API endpoint, any non-empty query string returns stable HTTP 400 `query_not_allowed` before authentication, body parsing, or adapter calls. Browser request constructors use path-only same-origin URLs. URL fragments are never used for credentials, OAuth material, prompts, or responses.

## Browser acceptance evidence

At desktop and mobile widths, use a real browser against an asynchronous synthetic adapter to verify:

- queued → running → succeeded progression and refresh;
- failure, retry, cancellation, and cancellation-after-success interleaving;
- first request, refresh, `resume_ned`, second request, and `destroy_ned`;
- zero horizontal overflow and usable controls;
- no secrets/prompts/responses in URL, localStorage, sessionStorage, console, logs, analytics, or captured artifact metadata;
- zero synthetic vault orphans after reconnect, expiry, abandonment, cancel, and destroy;
- programmatic focus on the destination heading after sign-in, compute, model, terminal create/recovery, refresh restoration, and verified destroy, without focus theft during polling;
- concise live-region announcements and delayed DELETE versus terminal GET reconciliation that renders authoritative ready/failure/polling state.

Review-only prototype pixels may guide comparison but are not approved authority or production evidence.

## Automated evidence

Run each canonical command bare after the final edit:

- changed-file syntax/static checks and `npm run check`
- focused Node lifecycle/security tests and `npm test`
- `python -m pytest`
- `npm run pack:check`
- clean tarball install plus installed `ned` dry-run and `ned-web` fail-closed/startup/health smoke
- `npm audit --omit=dev`
- `gitleaks detect --source . --log-opts='--all' --no-banner --redact`

## Migration and backward compatibility journey

Existing v1 CLI state without `modelProvider` behaves as OpenRouter. Existing `ned create/chat/doctor/reset/destroy` and OpenRouter PKCE remain supported. New state writes an allowlisted provider ID. Browser onboarding never requires CLI tooling or a Daytona raw key form.

## Development simulation and production gate

The development simulation is explicit, loopback-only, non-durable, and creates no cloud resource or model inference. It can prove browser behavior but cannot prove production readiness.

Production remains blocked on identity/account recovery, durable encrypted owner-scoped stores, queue/workers, approved platform-managed quota-limited beta policy or verified delegated user-owned compute, hosting/region/spend, provider authorization, monitoring, rollback, and fresh independent exact-SHA review.

Final external smoke for one immutable candidate: create → health → first request → stop/resume → second request → destroy → direct Daytona zero-resource readback plus zero orphaned secret readback. No merge/deploy/cloud creation is authorized without that evidence and approval.
