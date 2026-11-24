# Claude and Gemini subscription authentication

Status: implemented candidate; release and staging verification pending. Linux only; macOS/Windows subscription OAuth remains unavailable until isolated credential persistence is qualified. Owner: [native #206](https://github.com/DataNavAI/no-ego-dev/issues/206).

## Runtime and responsibilities

Core owns the authenticated model-setup API, intent/snapshot validation and login
job lifecycle. COM renders the existing full-screen setup flow. Hermes owns the
provider transport. The official Claude Code and Google Antigravity clients own
OAuth exchange, credential storage and refresh. Hub neither receives provider
grants nor brokers this login. Each instance must authenticate independently.

Upgrade the tested Hermes source/runtime together; qualify existing model-only,
tool, delegation, stop and ChatGPT device-login journeys before release. Install
immutable provider plugins and vendor clients, recording source/archive digests.
Claude Subscription uses the official Hermes Claude subscription plugin; Gemini
Subscription uses its Antigravity CLI provider. Subscription availability is
account-dependent and must remain distinct from Gemini/Anthropic API-key billing.

## Login flow

1. Status supplies installed provider support and bounded model catalogs. The
   user explicitly selects Claude Subscription or Gemini Subscription
   (Antigravity), a supported model, and Sign in. ChatGPT remains the first-use
   default. Nothing authenticates automatically.
2. Core consumes the current one-use intent and reserves one bounded login job.
   The fixed provider adapter starts the pinned official client with a private
   temporary HOME/config directory. No host credential, global keychain, API-key
   override or arbitrary command may be inherited.
3. The adapter exposes only a validated HTTPS authorization URL, login method
   and expiry. The user reviews the vendor consent in a separate browser tab.
   Remote clients may require one pasted authorization code. That code travels
   only over the authenticated instance POST and private adapter stdin.
4. The client completes its exchange in the private temporary directory. NED
   rechecks the initiating authority, deadline and unchanged original profile,
   then holds the existing profile lock while committing the vendor-owned
   credential directory and selected Hermes provider configuration.
5. Authoritative status confirms readiness. The selected plugin must use that
   exact profile's directory for every request and refresh, including shared
   gateway/multiplexed contexts. No fallback to another profile or OS keychain.

A general Antigravity agent TUI must never receive arbitrary browser input.
Only one authorization-code submission is admitted while the pinned client is
at its verified code prompt. Replays/conflicts return 409; ambiguity requires
status readback rather than automatic replay. After login, kill and reap the
client before it can become a general chat/tool session. No model inference is
needed for credential verification or catalog discovery.

## API extension

Preserve the existing authenticated `/api/v1/model-setup` family. Add the two
subscription providers to the installed support/catalog response only on qualified Linux installations with the installed provider plugins and vendor clients.
Existing ChatGPT device jobs retain their current shape. The new jobs carry `method: manual_code` and `provider`/`model`, preserving the pending selection across reload. Manual-code jobs expose
`verificationUri` and `acceptsCode`, never credentials or a separately returned verifier/state. The official consent URL necessarily contains its opaque vendor challenge.
A fixed `{action: "submit-login-code", id, code}` POST accepts a bounded printable
code once for the exact owned waiting job. Code values never appear in response,
error, telemetry, local storage, issue evidence or saved test captures.

Existing Host/Origin/privacy-header/API-credential checks apply to start, submit,
poll, cancel and disconnect. Revocation after awaits cancels pre-commit jobs.
Cancellation, expiry, shutdown or exchange failure erase the temporary login
home and reap the entire owned process tree. Existing configuration survives.
A filesystem failure during multi-file commit remains uncertain and must prompt
status readback; no cross-file transaction or remote-grant rollback is claimed.

## Acceptance and release

Automated integration coverage must exercise real process/stdin boundaries with
synthetic vendor clients: both successful flows; malformed/foreign URLs; code
replay; cancel/expiry; owner revocation; profile conflict; rejected/missing client;
process cleanup; unchanged existing config; and cross-profile credential denial.
Run the actual pinned Hermes provider/CLI interface checks separately. Served
COM browser coverage verifies full-screen desktop/mobile flow, provider switch,
password clearing, external link and one-shot code submission without browser
storage. Synthetic completion does not certify live provider OAuth/inference.

Live acceptance requires user-completed Claude and Google consent and one real
chat per provider, then instance restart and chat, with workspace preservation.
Qualify the built container in the test namespace before updating staging's
runtime image. Keep the task open until mandatory local installation and
applicable test/staging gates are complete; report unavailable live checks.

## Reproducible provider-interface qualification

After building the Linux image locally, run the fixed client challenge/cancel
probe (vendor network access, no account consent, token exchange or inference):

```sh
docker run --rm -i --user 10000:10000 --entrypoint node IMAGE --input-type=module \
  < docs/features/model-setup/tests/hermes/container-clients.mjs
```

Use the actual immutable candidate image. It must report challenge and cancel
PASS for both providers. This does not establish completed OAuth or paid chat.
The image build installs checksummed Linux amd64/arm64 Claude Code 2.1.331 and
Antigravity 1.5.16; `scripts/subscription-runtime/lock.json` pins their archives
and the Hermes provider sources. The narrow NED Antigravity patch selects only
a private active-profile credential directory and passes a minimal child
environment; the actual-Hermes scope test verifies no launch-profile/keyring
fallback. macOS/Windows vendor keychain persistence is outside this candidate.
