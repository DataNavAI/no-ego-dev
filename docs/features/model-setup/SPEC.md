# Feature: Model setup and Hub inheritance

Status: implemented source; release/cluster acceptance remains separate. Related: no-ego-dev#182, DataNavAI/ned-hub#135–137.
Canonical APIs: [NED API v1](../../api.md); [architecture](../../architecture.md).

## User outcome and scope

A user sees a provider setup prompt before sending chat unless the selected
Hermes profile already has usable credential configuration. Preserve existing
local configuration. A newly registered instance can inherit its owner's Hub
account default, using only its own revocable Hub capability. Raw account
provider keys/refresh grants stay in Hub. Hosted authentication takes place on
the Hub control origin; local private setup can save an OpenAI/OpenRouter API key.
No OpenAI hosted ChatGPT OAuth eligibility or paid inference is implied.

## Requirements

- FR-001: Core owns `/api/v1/model-setup` on full NED API/COM listeners; backend-only
  operator listeners and public quick tunnels do not expose setup. Exact Host,
  Origin, JSON and `X-NED-Models:1` protect writes; no keys in readback/storage/logs.
- FR-002: Existing authenticated profile configuration takes precedence. Missing
  configuration prompts; unreadable/ambiguous configuration fails closed without
  replacing it. Preserve all unrelated YAML/profile/workspace data.
- FR-003: Registration supplies exact Hub origin/instance/capability internally.
  Fresh profiles inherit the account default automatically. Owned inherited config
  revalidates before chat and updates capability/model after generation/default
  change. Missing/revoked connection blocks a turn and offers account setup.
- FR-004: Local API-key setup (or explicit replacement with a fresh intent) validates fixed HTTPS provider credential endpoints
  before private atomic YAML replacement, with one-use opaque setup intent and
  stale-state detection. Repeated/uncertain writes require status readback.
- FR-005: UI shows selected provider/model and authentication/recovery action when
  missing; configured users continue chat. Composer preserves drafts during setup.
  Hosted users authenticate in Hub; no provider keys copied to hosted containers.
- FR-006: Bound file/body/provider operations and cleanup; reject symlinks and
  unsafe secret permissions; no arbitrary URL/subprocess or operator-key discovery.

## Critical user journeys

### CUJ-001: Configure before first chat
A local user opens a fresh profile, selects OpenAI/OpenRouter and model, submits
an API key, then chats. A hosted user follows Set up in NED Hub and checks the
account connection afterward. Cancel/rejection leaves profile and draft intact;
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
  before chat. Reject unsafe files, Origin/media/header/path and public exposure.
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

FR-001–004/006 → CUJ-001/002 → TC-001; FR-005 → CUJ-001 → TC-002;
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
