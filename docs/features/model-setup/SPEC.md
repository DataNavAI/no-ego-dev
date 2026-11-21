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
- Journey / requirements: CUJ-001; FR-005 and privacy.
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

Reuse existing NED neutral controls and settings styling. Prompt title “Choose a
model provider”; local fields “Provider”, “Model”, “API key”; actions “Connect
provider”, “Set up in NED Hub”, “Check connection”. Status: “Model provider is
configured.” / “Model provider is required before chatting.” / “Model settings
are unavailable. Check configuration and try again.” Error: “Provider connection
could not be saved. Check the credentials and try again.” Never show provider
response bodies. Existing credentials are never repopulated into the password
input. A compact card above the composer preserves the existing conversation.

## Coverage and acceptance

FR-001–004/006 → CUJ-001/002 → TC-001; FR-007–010 → CUJ-003 → TC-003 and actual-Hermes adapter integration; FR-005 → CUJ-001 → TC-002;
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

The compact card uses a two-column provider/model row, a full-width password field
and neutral actions with a black Connect provider primary action. It scrolls only
when space requires, keeping the composer/draft below it. Model provider toggles
the card on desktop/mobile. Check connection obtains authoritative status after
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

Design: extend the existing approved compact card/design captures. Provider/model fields stay; Gemini/Claude add provider choices. Device login replaces the password field with verification instructions, external noopener link, copyable code, waiting/error status and Cancel. Buttons disable double submission; narrow screens wrap within the existing card. No new navigation/layout or approval gate. Capture desktop/320px from the served UI and self-review reflow/focus/secret exclusion.
Metrics: existing sanitized API status and bounded job-state outcomes only; no codes, tokens, prompts, account identifiers or new analytics service.

Commit boundary: after provider approval, the current NED API authority and unchanged snapshot authorize the private commit. Cancellation/expiry before that point prevents persistence; authorizing is no longer cancellable (409/readback). Shutdown or a filesystem failure during Hermes multi-file persistence is uncertain and requires authoritative readback; per-file atomicity is not a cross-file/provider transaction, and no blind exchange replay or grant rollback is claimed.

Resource reservation includes terminating login processes until actual child exit; cancel response waits for owned cleanup before admitting a replacement. The installed adapter admits at most2 subprocesses including discovery/configuration, and non-inference credential HTTP operations are capped at8. Regression TC-003 holds child exit after cancellation and proves a replacement cannot start early.

Shutdown also fences interpreter discovery before spawn and awaits pending commit-authorization/lock cleanup before releasing an operation slot; closed adapters cannot reopen. Commit-check errors retain their NED401/409 domain classification instead of becoming an opaque helper error.
