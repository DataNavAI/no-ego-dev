# Provider authorization decision record

Status: research decision for issues #81, #82, and #83; not an implementation approval

Accessed: 2026-09-01 UTC

## Scope and evidence boundary

This record covers the advanced, explicit provider path only. It does not alter the V1 default: ChatGPT OAuth through `openai-codex`. It records current public first-party documentation and the repository contract, not credentials, provider access, or live inference results.

Installed Hermes evidence: `hermes --version` reported Hermes Agent `v0.20.5 (2026.8.19)`; `hermes auth --help` exposes generic auth management but no provider capability listing. Therefore no Anthropic or Gemini Hermes runtime/OAuth compatibility is asserted here. #82 and #83 must prove the exact pinned Hermes provider contract before enabling either provider.

Remote egress means the Daytona Sandbox model-request allowlist. Interactive authorization remains local to the owner machine and must not be widened by an inferred or undocumented host list.

## Anthropic

### Official methods and decision

- Direct Claude API: supported with an `ANTHROPIC_API_KEY` sent as `x-api-key` to `https://api.anthropic.com`; this is a static API-key credential, not delegated user authorization.
- Workload Identity Federation: Anthropic documents an OAuth token exchange at `/v1/oauth/token` that returns a short-lived bearer access token for an external workload identity. This is a service/workload federation contract, not evidence of an owner-delegated browser flow for NED.
- Claude Code: Anthropic documents browser sign-in for Claude subscription and Console accounts. The recommended Console sign-in keeps an OAuth profile rather than creating an API key; Claude Code refreshes it automatically and requires the user to sign in again when refresh fails. Anthropic documents this for Claude Code, not for Hermes.
- Decision: do not label Anthropic delegated authorization as available to NED until #82 demonstrates that the exact pinned Hermes provider can safely consume the applicable official Claude Code/profile contract. The only presently implementable direct-API fallback is an API key, and it is product-gated below.

### Runtime contract

| Field | Approved research input |
| --- | --- |
| NED/Hermes provider ID | `anthropic` (repository candidate; must be verified against pinned Hermes before #82) |
| Model ID | `claude-sonnet-4` (repository candidate; validate against the selected Anthropic account/API before release) |
| Secret type | Preferred future path: local OAuth/profile refresh material stays owner-local; only a short-lived access token may cross the Daytona boundary. Fallback: `ANTHROPIC_API_KEY`, one-time consumed and stored only as the exact Daytona Secret needed for runtime. |
| Refresh/revocation | Claude Code OAuth profiles refresh automatically; refresh failure requires re-login. Direct keys do not refresh. Anthropic says API keys can be disabled (reversible), deleted (permanent/archive), or expire. WIF access tokens are short-lived and must be re-exchanged from the external identity rather than treated as refresh tokens. |
| Remote egress allowlist | `api.anthropic.com` only for direct Claude API model calls. Do not add browser/OAuth hosts to the Sandbox allowlist. |
| Lifecycle | Resolve/revalidate local authorization before create, chat, doctor, repair, and inference health; update only the exact model Secret when a renewable short-lived token changes; on revocation/refresh failure stop before remote mutation. Destroy must delete and direct-readback the exact model Secret before local non-secret state is cleared. |

### API-key-only fallback warning

An `ANTHROPIC_API_KEY` path is not delegated OAuth and must remain an explicit advanced selection, never a default prompt or hidden fallback. It requires product approval of the API-key risk, billing ownership, and support path. If approved, acquire it only through a named hidden-TTY prompt (`Paste the Anthropic API key (input hidden):`) or supported OS secret store; open `/dev/tty` read/write, verify `stty -echo` before input, restore echo in `finally`, retain it only in memory, consume it once, redact all errors, and never put it in argv, environment, URL, logs, local state, screenshots, fixtures, or PR text.

## Gemini

### Official methods and decision

- Gemini API keys: Google supports standard and authorization API keys. New Google AI Studio keys are authorization keys bound to a Google Cloud service account; Google documents `GEMINI_API_KEY` and `GOOGLE_API_KEY` environment names, with `GOOGLE_API_KEY` taking precedence in its client libraries. Standard keys are being retired and Google documents rejection of standard keys in September 2026.
- Gemini API OAuth: Google explicitly documents OAuth as an alternative when stricter access control is needed. Its OAuth quickstart enables the Generative Language API, configures an OAuth consent screen and desktop OAuth client, creates Application Default Credentials (ADC), and sends a bearer access token to the Gemini endpoint with `x-goog-user-project`. The documented example persists access and refresh tokens locally and refreshes expired credentials.
- Decision: Gemini has an official delegated OAuth path, but it is not approved for NED until #83 proves the exact pinned Hermes `gemini` runtime accepts the chosen bearer/ADC contract and the product approves a local consent-client and callback design. Do not downgrade to an API key merely because Hermes support is unproven.

### Runtime contract

| Field | Approved research input |
| --- | --- |
| NED/Hermes provider ID | `gemini` (repository candidate; must be verified against pinned Hermes before #83) |
| Model ID | `gemini-2.5-pro` (repository candidate; validate account/API availability before release) |
| Secret type | Preferred: owner-local Google OAuth refresh credential plus a renewable bearer access token. API-key fallback: an AI Studio authorization key, passed as `GEMINI_API_KEY` (or `GOOGLE_API_KEY` only when precedence is intentionally tested). |
| Refresh/revocation | Google OAuth access tokens are renewed from the locally protected refresh credential; Google documents that a refresh token can be invalidated or expire, and revoking a refresh token also revokes its corresponding access token. Invalid/expired authorization must stop before remote mutation and require local reauthorization. |
| Remote egress allowlist | `generativelanguage.googleapis.com` only for Gemini API requests. The local OAuth implementation may use only official Google authorization/token endpoints proven in its implementation evidence; none belong in the Sandbox allowlist. |
| Lifecycle | Keep the OAuth client credential, user refresh credential, and consent response owner-local. Before remote operations, obtain a sufficiently fresh access token and update the exact Daytona model Secret; remote configuration gets only an opaque secret reference/placeholder. Destroy deletes and directly reads back that exact Secret. |

### API-key-only fallback warning

A Gemini key, including Google AI Studio's authorization key, is still an API key rather than user-delegated OAuth. It must be an explicit advanced fallback after product approval and must use the same hidden-TTY/OS-secret-store design as Anthropic: verified non-echoing `/dev/tty` input, unconditional echo restoration, memory-only handling, one-time consumption, and complete redaction. Never accept it from argv, regular environment, URL, logs, local state, screenshots, fixtures, or PR text. If this fallback is approved, require an authorization key or a restricted legacy key; reject unrestricted standard keys and plan migration before Google's September 2026 cutoff.

## Precise implementation inputs

### #81 — advanced provider-selection contract

1. Preserve omitted selection as `openai-codex`; accept only explicit `anthropic` or `gemini` after a provider-specific capability receipt is present.
2. Persist only non-secret provider metadata: provider ID, model ID, exact Daytona Secret ID/name, and approved remote host. Do not persist authorization method tokens, OAuth client material, key values, or user/project identifiers.
3. Create one provider-specific resolver interface with `authorize`, `refreshOrReauthorize`, `consumeRuntimeCredential`, and `revokeOrForgetLocal` behavior. It must fail closed before Daytona mutation when the capability receipt, consent, refresh, or revocation state is invalid.
4. Enforce remote host equality: Anthropic `api.anthropic.com`; Gemini `generativelanguage.googleapis.com`. Do not infer authentication hosts into remote egress.
5. Keep direct API-key acquisition behind an explicit advanced confirmation/product-policy gate; reuse the existing hidden-TTY safety contract and one-time credential consumption.

### #82 — Anthropic lifecycle

1. First produce a pinned-Hermes capability receipt showing the exact supported Anthropic authorization input, configured provider ID, model identifier, token location, and no-token serialization behavior. If the receipt cannot prove a Claude Code/profile contract, stop and retain Anthropic as API-key-only pending a separately approved fallback.
2. Add adversarial coverage for local OAuth/profile expiry/relogin when supported, and for disabled/deleted/expired keys in the fallback. Prove revoked/invalid authorization causes no Daytona mutation or orphaned Secret.
3. Exercise create, inference health, Telegram response, repair, and destroy with `api.anthropic.com` egress and exact Secret absence readback. No refresh token may cross to Daytona.

### #83 — Gemini lifecycle

1. First produce a pinned-Hermes capability receipt for Gemini bearer/ADC OAuth: required scopes, supported token field/configuration, access-token refresh handoff, and no-token serialization. Obtain product approval before registering/shipping any NED OAuth client or callback behavior.
2. Keep the Google OAuth refresh credential and OAuth client material owner-local. Test expiry, user revocation, consent cancellation, and local reauthorization; prove each blocks remote mutation before Secret/Sandbox creation.
3. Exercise create, inference health, Telegram response, repair, and destroy with only `generativelanguage.googleapis.com` remote egress and exact Secret absence readback. Treat API-key fallback as separately approved and test key restriction/type validation and September 2026 migration behavior.

## Sources

All sources are first-party and were accessed 2026-09-01 UTC.

1. Anthropic, [Authentication](https://platform.claude.com/docs/en/manage-claude/authentication) — direct API keys, key disable/delete/expiration, and workload identity federation reference.
2. Anthropic, [API overview](https://platform.claude.com/docs/en/api/overview) — `x-api-key`, bearer WIF access token, and `api.anthropic.com` API contract.
3. Anthropic, [Claude Code authentication](https://code.claude.com/docs/en/authentication) — supported login methods, Console OAuth profile behavior, refresh/re-login constraint, and API-key legacy path.
4. Google, [Gemini API OAuth quickstart](https://ai.google.dev/gemini-api/docs/oauth) — OAuth/ADC setup, bearer request example, local token refresh/caching pattern, and `generativelanguage.googleapis.com` endpoint.
5. Google, [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key) — standard versus authorization keys, environment names, restriction policy, and September 2026 standard-key retirement.
6. Google, [OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server) — bearer access tokens, refresh-token semantics, and token revocation.

## Non-goals

This record creates no provider connection, OAuth client, API key, account, deployment, or source-runtime behavior. It does not claim that an Anthropic Claude Code OAuth credential is compatible with Hermes, nor that an arbitrary Gemini OAuth/ADC credential is accepted by Hermes. Those are explicit #82/#83 proof obligations.
