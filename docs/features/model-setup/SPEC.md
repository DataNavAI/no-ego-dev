# Feature: Model setup and Hub inheritance

Status: implemented source; release/cluster acceptance remains separate. Related: no-ego-dev#191, historical #182, DataNavAI/ned-hub#135–137.
Canonical APIs: [NED API v1](../../api.md); [architecture](../../architecture.md).

## User outcome and scope

A user sees a provider setup prompt before sending chat unless the selected
Hermes profile already has usable credential configuration. Preserve existing
local configuration. A newly registered instance can inherit its owner's Hub
account default, using only its own revocable Hub capability. Raw account
provider keys/refresh grants stay in Hub. Both hosted and local instances can explicitly configure their own provider.
OpenAI/OpenRouter keys retain the existing adapter; Gemini/Claude keys use the installed Hermes provider configuration. OpenAI device login delegates to Hermes, storing its own instance grant. Hub provider OAuth is retired; optional account API-key defaults remain.
No OpenAI hosted ChatGPT OAuth eligibility or paid inference is implied.

## Requirements

- FR-001: Core owns `/api/v1/model-setup` on full NED API/COM listeners; backend-only
  coordination listeners do not expose setup. Every request requires the current
  NED API credential; public transports do not inject authority. Exact Host,
  Origin, JSON and `X-NED-Models:1` protect writes; no keys in readback/storage/logs.
- FR-002: Existing authenticated profile configuration takes precedence. Missing
  configuration prompts; unreadable/ambiguous configuration fails closed without
  replacing it. Preserve all unrelated YAML/profile/workspace data.
- FR-003: Registration supplies exact Hub origin/instance/capability internally.
  Fresh profiles inherit the account default automatically. Owned inherited config
  revalidates before chat and updates capability/model after generation/default
  change. Missing/revoked connection blocks a turn and offers account setup.
- FR-004: Local API-key setup (or explicit replacement with a fresh intent) validates fixed HTTPS provider credential endpoints
  before private atomic YAML replacement, with a current-API-credential/caller recheck after provider awaits, one-use opaque setup intent and
  stale-state detection. Repeated/uncertain writes require status readback.
- FR-005: UI shows selected provider/model and authentication/recovery action when
  missing; configured users continue chat. Composer preserves drafts during setup.
  Hosted users can authenticate inside their own instance; inherited account keys stay in Hub.
- FR-006: Bound file/body/provider operations and cleanup; reject symlinks and
  unsafe secret permissions; no arbitrary URL/subprocess or operator-key discovery.

- FR-013: The authenticated workspace header shows the saved current instance model from model status, never an unsaved selection. It updates after successful configuration/refresh, shows “No model configured” when unconfigured and “Model unavailable” after failed verification, and clears on access loss. Long IDs remain readable via accessible label/title without horizontal overflow.

## Critical user journeys

### CUJ-001: Configure before first chat
A local or hosted user opens a fresh profile, selects a provider/model and supported authentication, then chats. The optional Hub API-key default remains available through the linked account settings. Cancel/rejection leaves profile and draft intact;
status readback allows a fresh explicit attempt. Configured users bypass setup.

### CUJ-002: Create an instance with an account default
Registration authenticates the exact instance. Native setup reads metadata and
writes only a scoped Hub capability to its private inherited provider entry.
Hermes SDK calls the Hub relay; a current model turn streams to the browser.
Stop/revoke or missing account configuration blocks new inference. Existing
valid local overrides are retained. Workspace deletion is not part of setup.

## Detailed test cases

### TC-001: Private configuration and Core API boundaries
- Journey / requirements: CUJ-001/002; FR-001–004,FR-006.
- Level / automation: integration; tests/TC-001.test.js.
- Given fresh/existing profiles and synthetic provider/Hub HTTP boundaries.
- When status, key setup, inheritance, stale/replayed writes and revocation occur.
- Then assert private atomic persistence, unchanged unrelated fields, no raw
  provider grant in inherited profile/readback, exact model/capability and denial
  before chat. Reject unsafe files, Origin/media/header/path and unauthenticated exposure.
- Cleanup: close owned listeners, abort requests and remove temporary profiles.
- Evidence: named assertions; synthetic endpoints do not certify hosted OAuth.

### TC-002: Rendered setup and configured bypass
- Journey / requirements: CUJ-001; FR-005/013 and privacy.
- Header procedure: load a configured synthetic model, change the saved status and refresh, choose an unsaved model, disconnect, fail status and revoke access. Assert current saved label, truthful empty/error states and hidden label after revocation; at320px assert no horizontal overflow. No model calls or configuration writes are triggered by viewing the label.
- Level / automation: browser integration; tests/TC-002.test.js.
- Given served COM with a temporary fresh profile and synthetic provider boundary.
- When selecting/authenticating provider, recovering from failure and loading a
  configured profile. Then setup/composer states, labels, draft, secret clearing,
  desktop/320px geometry and no browser credential storage are verified.
- Cleanup: owned browser/server/profile; captures are explicit synthetic evidence.

## Additional actual Hermes SDK acceptance
- Journey / requirements: CUJ-002; FR-002/003.
- Level / automation: actual-Hermes medium suite; linked live.test.js case.
- Given isolated pinned Hermes source and deterministic model service, with a
  synthetic Hub metadata/capability boundary. When inheriting then sending a real
  chat turn, verify the actual provider SDK uses the scoped capability/model,
  streams completion and no provider key enters the profile. No external egress,
  paid provider or staging OAuth claim. Cross-repository real Hub acceptance is
  owned by Hub#135/136 and its instance integration suite.
- Cleanup: supervised gateway/model servers and all isolated runtime files.

## Design and copy

The light workspace header places a muted12px current model label beside the NED/version brand. On phones it wraps to its own header row; long IDs truncate visually with the full model in the accessible label and title. Reuse the authenticated model status, with no additional request or interactive model picker.


Reuse existing NED neutral controls and settings styling. Prompt title “Choose a
model provider”; local fields “Provider”, “Model”, “API key”; actions “Connect
provider”, “Set up in NED Hub”, “Check connection”. Status: “Model provider is
configured.” / “Model provider is required before chatting.” / “Model settings
are unavailable. Check configuration and try again.” Error: “Provider connection
could not be saved. Check the credentials and try again.” Never show provider
response bodies. Existing credentials are never repopulated into the password
input. First-use setup is a full-screen interstitial; see [layout and interaction contract](design/interstitial.md).

## Coverage and acceptance

FR-001–004/006 → CUJ-001/002 → TC-001; FR-007–010 → CUJ-003 → TC-003 and actual-Hermes adapter integration; FR-005/013 → CUJ-001 → TC-002;
actual SDK compatibility → CUJ-002 → the maintained actual-Hermes medium suite. Capture the implemented card and
compare with this reused design direction before final commit. Canonical full
checks, CI, merged default installation and actual container/test-cluster
qualification precede staging enablement. Self-review is the default.

## Limitations and retirement

No raw provider response/content telemetry or new analytics service. Existing
privacy-safe request diagnostics and status counts cover setup failures; no
prompts/keys in metrics. OAuth availability follows Hub's provider contract.
Stopping preserves profile/workspace; credentials can remain in encrypted-volume
backups under their retention policy. Retiring setup must preserve user config,
remove routes/controls and revoke Hub capabilities without erasing workspaces.

The shared form uses a two-column provider/model row on desktop and one column on mobile, a full-width password field and neutral actions with a black Connect provider primary action. The first-use full-screen interstitial and optional settings dialog scroll vertically when necessary. Model provider opens optional settings on desktop/mobile. Check connection obtains authoritative status after
uncertainty; credentials are never automatically replayed. Rendered synthetic
captures live under `design/` and are produced by TC-002.

Private profile mutation currently requires POSIX file-permission semantics (Linux/macOS). Windows persistence fails closed until an ACL-backed writer is implemented; existing process-provided configuration is not copied into Hub. No Windows persistence acceptance is claimed.

## Instance-owned Hermes authentication revision (#191)

Status: implemented source candidate; verification/deployment for #191 is separate from historical #182 acceptance.
- FR-007: Explicit instance setup is available to authenticated hosted/local owners. Retain existing profile/account configuration until a fresh nonce, unchanged snapshot and explicit replacement authorize the change. Preserve optional account API-key inheritance; never automatically replace an instance-selected provider with account defaults.
- FR-008: Gemini/Claude use native Hermes provider semantics and private credential persistence. Fixed non-inference HTTPS validation endpoints; no arbitrary commands, modules, paths, endpoints or raw config editors from browser input. Only supported authentication modes appear.
- FR-009: OpenAI device login uses Hermes's installed implementation. One active process/job per runtime; opaque UUID,15minute expiry, bounded metadata/output. Start202 → retain id → poll authenticated GET → pending/challenge/complete/failed/cancelled/expired. Cancel and credential revocation/shutdown terminate the owned process; tokens remain private, and provider/device secrets never leave the helper. Current API authority and original profile snapshot must still authorize the commit after provider awaits. No grant cloning across instances.
- FR-010: Browser preserves the draft, clears keys on attempt, shows verification URL/code without logging/storage, supports cancel/retry, resumes the exact live job after reload, and enables chat only after authoritative model status. Expired/revoked grants prompt recovery. Stop/start preserves private completed Hermes credentials; incomplete jobs are cancelled on process shutdown.

### TC-003: Instance authentication and private persistence
Given an authenticated instance owner and an isolated Hermes profile, select Gemini or Claude and validate/save a synthetic key; unrelated settings survive and readback/browser contains no key. Start OpenAI device login with the installed Hermes adapter, receive only a public challenge, authorize, then verify the real Hermes auth/config stores and selected provider. Cover rejection, conflict, expiry, cancel, concurrent start, credential revocation during provider wait, malformed adapter output and shutdown. Negative cases must not commit; completed credentials survive reopening the setup service. Use deterministic provider boundaries with the real pinned Hermes code, never a personal grant or paid call.
- Journey / requirements: CUJ-003 (explicit instance provider authentication); FR-007–010.
- Level / automation: integration plus the pinned-Hermes medium suite; no live user grant.
- Inputs: isolated temporary profile, synthetic keys/challenge/grant, fixed fake provider response boundary; no existing profile/credentials or network inference.
- Actions: use authenticated setup status and opaque nonce to start/save once; retain exact job UUID and poll; approve/cancel/revoke/expire/change the profile; reopen private files and compare unrelated settings.
- Expected: configured status only after authorized persistence, no secret readback, no mutation after pre-commit cancel/revoke/conflict, job and process cleanup on shutdown. Exact data/mode and UI draft/key behavior asserted.
- Cleanup: test-owned children stopped/awaited and temporary profile removed by teardown; helper grants are synthetic.

Automated references: tests/TC-003.test.js and tests/hermes/live.test.js (run through npm run test:core:hermes) and the existing TC-002 served browser journey. Existing TC-001/TC-002 remain the API-key/inheritance/authentication regression base, updated for hosted overrides.

Design: retain the existing provider form/design captures; the #196 interstitial revision supersedes the compact layout. Provider/model fields stay; Gemini/Claude add provider choices. Device login replaces the password field with verification instructions, external noopener link, copyable code, waiting/error status and Cancel. Buttons disable double submission; narrow screens wrap within the existing card. No new navigation/layout or approval gate. Capture desktop/320px from the served UI and self-review reflow/focus/secret exclusion.
Metrics: existing sanitized API status and bounded job-state outcomes only; no codes, tokens, prompts, account identifiers or new analytics service.

Commit boundary: after provider approval, the current NED API authority and unchanged snapshot authorize the private commit. Cancellation/expiry before that point prevents persistence; authorizing is no longer cancellable (409/readback). Shutdown or a filesystem failure during Hermes multi-file persistence is uncertain and requires authoritative readback; per-file atomicity is not a cross-file/provider transaction, and no blind exchange replay or grant rollback is claimed.

Resource reservation includes terminating login processes until actual child exit; cancel response waits for owned cleanup before admitting a replacement. The installed adapter admits at most2 subprocesses including discovery/configuration, and non-inference credential HTTP operations are capped at8. Regression TC-003 holds child exit after cancellation and proves a replacement cannot start early.

Shutdown also fences interpreter discovery before spawn and awaits pending commit-authorization/lock cleanup before releasing an operation slot; closed adapters cannot reopen. Commit-check errors retain their NED401/409 domain classification instead of becoming an opaque helper error.

## First-use full-screen setup (#196)

- FR-011: While authenticated model verification is pending, show a neutral loading interstitial without a provider picker. An authoritative unconfigured result opens the full-screen, keyboard-contained provider picker. An unavailable check offers retry without presenting provider choices. Cancelled login remains in setup. Only authoritative configured status (or explicit model-setup capability absence) admits the workspace. Configured profiles bypass first-use setup; optional model settings can be closed. Access loss closes setup and restored access revalidates it. Preserve drafts and current provider/secret behavior.
- CUJ-001 / TC-002 also cover FR-011. Serve the actual COM UI with synthetic provider boundaries; assert desktop/mobile viewport coverage, keyboard focus containment, Escape cannot bypass missing config, success restores workspace, a held configured status shows neutral loading then bypasses the picker, reload bypass, optional settings dismissal, error recovery and access-loss/reconnect. Remove only test-owned profiles/listeners. Design: [interstitial](design/interstitial.md); captures in design/. No live provider claims.

## Provider-specific model selection — #200
FR-011: NED model setup has no Hub configuration link. Model is a required native select populated from the installed Hermes provider catalog (OpenAI API, OpenRouter, Gemini, Claude and OpenAI ChatGPT device login), with a supported default. Provider changes clear any typed key, replace choices and reset to that provider's first model. No free-text new model entry. Catalog membership describes installed support, not account entitlement or live provider availability. Authentication/account permissions remain separate.

The authenticated status response includes `models` (provider → bounded model ID array) and `catalogSource: installed-hermes`. The nonce binds this snapshot; unsupported/cross-provider new choices fail 400 before authentication or profile writes. Existing configured models outside the catalog remain visible as the current disabled option, preserve chat readiness and are never silently rewritten; a supported model must be selected to replace them. Empty/unavailable lists disable Connect and offer Check connection. No new paid/provider calls are made to populate the picker; the installed Hermes catalog changes with Hermes upgrades/server restart. Legacy `settingsUrl` remains API-compatible but has no UI consumer.

Copy: “Loading models…”, “Models unavailable”, “Models supported by this NED installation. Access depends on your provider account.”, “Model list is unavailable. Check connection to try again.”, and model ID followed by “(current configuration)” for an existing unlisted model. TC-001 covers provider/nonce membership, TC-002 served UI covers switching/empty/retry/preservation and absent link, TC-003 actual Hermes covers the installed catalog boundary.

OpenAI API choices use Hermes’ native Chat Completions catalog, matching NED’s current local OpenAI transport; Responses-only picker entries are excluded. Other providers retain their native Hermes catalog/transport.

First-time COM model setup defaults to **ChatGPT Subscription** (`openai-codex`) when installed Hermes device authentication is available. It uses the existing explicit device-login flow; no authentication starts automatically. Existing configured provider/model selections and user choices on status refresh are preserved. If device authentication is unavailable, fresh/unconfigured setup selects OpenAI API instead of a disabled subscription option. Provider IDs and the authenticated API contract remain unchanged. Tracked in [#202](https://github.com/DataNavAI/no-ego-dev/issues/202).

## Claude and Gemini subscription upgrade (#206)

Planned, not enabled: [architecture, API extension and acceptance](subscription-auth.md). Existing device/API-key behavior remains the implemented contract until this upgrade is qualified.

FR-012 (candidate, #206): On qualified Linux installations, expose Claude Subscription and Gemini Subscription (Antigravity) beside existing API-key choices. Authenticate through the pinned official vendor clients with one-shot manual-code submission to an owned job; isolate completed grants and refresh to the active instance profile. No host/keychain fallback or cross-instance grant cloning. Existing configured profiles and the ChatGPT first-use default remain intact.

CUJ-004: An authenticated hosted-instance user selects a subscription provider/model, opens the vendor consent URL, completes sign-in and pastes its authorization code once. The instance confirms configuration before chat. Cancel, expiry, revocation and conflicting profile writes preserve the prior selection and prevent commit. Disconnect removes only that instance's NED-owned credential. TC-003 covers the API/lifecycle, tests/test_subscription_auth.py covers credential boundaries, the actual-Hermes scope test covers the real pinned plugin, and TC-002 covers the served desktop/mobile flow. Live consent, real inference and restart acceptance are separate release evidence, not certified by synthetic fixtures.

Subscription copy: “Claude Subscription”, “Gemini Subscription (Antigravity)”, “Sign in with Claude”, “Sign in with Google”, “Authorization code”, “Complete sign-in”, and “Open the verification page, sign in, then paste the authorization code below. Credentials stay in this instance.” Reuse the existing full-screen interstitial and secret field styles; no new navigation. Current macOS/Windows installations do not expose these logins until isolated vendor credential persistence is qualified; API keys and existing ChatGPT support are preserved.
