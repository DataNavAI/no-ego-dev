# Technical Specification: Daytona NED CLI V1

Contract version: 4.0
Status: candidate implementation pending exact lifecycle verification
Last updated: 2026-08-07

## Verified upstream contracts

Design was checked against the current official Hermes provider documentation and exact pinned Hermes commit `3ef6bbd201263d354fd83ec55b3c306ded2eb72a` before implementation.

- Hermes provider ID: `openai-codex`; API mode: Codex Responses; base URL: `https://chatgpt.com/backend-api/codex`.
- Device start: `POST https://auth.openai.com/api/accounts/deviceauth/usercode` with Hermes Codex client ID.
- Browser: fixed `https://auth.openai.com/codex/device`; user enters the short code.
- Poll: `POST https://auth.openai.com/api/accounts/deviceauth/token` using `device_auth_id` and `user_code`.
- Exchange/refresh: `POST https://auth.openai.com/oauth/token`; authorization-code exchange uses fixed `https://auth.openai.com/deviceauth/callback`; refresh grant may rotate the refresh token.
- Hermes resolves singleton `providers.openai-codex.tokens` or compatible device-code pool entries, refreshes expiring JWT access tokens, and atomically persists rotated credentials.
- Device authorization is not loopback OAuth. NED must not bind a callback port or trust a response-supplied verification URL.

## Architecture

```text
checksum-pinned one-line command
  -> scripts/install.sh
     -> private pinned Node runtime + commit-addressed NED source
  -> ned CLI
     -> safe local Hermes-compatible auth resolver
        -> reuse owner-only HERMES_HOME/auth.json when unambiguous
        -> otherwise fixed ChatGPT device flow
        -> refresh locally and atomically preserve rotation
     -> Daytona SDK 0.200.1
        -> organization Secret: current access token, host chatgpt.com
        -> Sandbox env: opaque Secret placeholder only
        -> remote Hermes auth.json: placeholder + non-secret refresh sentinel
        -> private persistent Sandbox
        -> checksum-pinned Hermes + NED profile
     -> $HOME/.ned/state.json (non-secret exact ownership only)
```

The local official Hermes-compatible auth store is the sole refresh/revocation authority. NED sends no refresh token to Daytona. Before every remote inference/health/repair, it resolves a sufficiently fresh local access token and updates the exact Secret. The Sandbox never sees plaintext Secret value; Daytona substitutes its opaque placeholder only at egress to `chatgpt.com`.

## Fixed plan

- Daytona SDK: `@daytona/sdk` 0.200.1 from committed lockfile.
- Image: `ubuntu:24.04`; TypeScript toolbox.
- Resources: 2 CPU, 4 GiB memory, 20 GiB disk.
- Automatic target; private, persistent, non-ephemeral; auto-stop 15 minutes; auto-archive 10,080 minutes; auto-delete disabled.
- Labels: `app=ned`, `managedBy=ned-cli`; lifecycle adds a unique non-secret candidate label through its controlled harness.
- Hermes commit: `3ef6bbd201263d354fd83ec55b3c306ded2eb72a`; installer bytes must match the pinned SHA-256 before execution.
- Hermes provider/model: `openai-codex` / `gpt-5.6-sol`.

## CLI contract

- `ned create [--dry-run --json]`: default provider is `openai-codex`; checks ownership; resolves local OAuth; creates Secret/Sandbox; bootstraps; verifies; atomically saves state.
- `ned chat "prompt"`: resolves/refreshes OAuth; updates exact Secret; starts the saved Sandbox; executes bounded Hermes one-shot.
- `ned doctor`: resolves/refreshes OAuth; updates Secret; starts and checks Sandbox, Hermes, profile, inference.
- `ned repair`: same credential preflight, reinstalls pinned profile/runtime configuration, reruns health. `reset` aliases repair.
- `ned destroy --yes`: deletes exact Sandbox/Secret, directly proves both absent, then clears local state. No OAuth is required to destroy.

No generic command, arbitrary host, arbitrary environment-variable name, default model chooser, OpenRouter dependency, or default API-key prompt exists.

## Local OAuth implementation

1. Candidate store is `HERMES_HOME/auth.json` when explicitly set; otherwise the normal Hermes auth path is considered. New device credentials use a dedicated Hermes-compatible local profile path.
2. Reuse requires an auth file under user home that is regular, owner-owned, mode `0600` or stricter, with non-symlink user-owned parent directories that are not group/world writable.
3. Reuse requires one unambiguous refreshable `openai-codex` credential. Unsafe, malformed, ambiguous, exhausted, or unsupported entries are not copied.
4. Access JWTs expiring inside the bounded remote-operation window are refreshed at the official token endpoint. Rotated access/refresh tokens update the same auth record through a same-directory `0600` temporary file, fsync, and atomic rename under a NED authorization lock.
5. New device flow opens only the fixed ChatGPT device URL. Response verification URLs are ignored; no listener exists. Cancel/timeout produces no auth file. Restart creates a new transaction.
6. Raw tokens stay in closures and request bodies, are single-consumption values at the Daytona boundary, and are omitted from serialization/errors/output.

## Remote Secret and placeholder implementation

- Secret name: generated `ned_model_openai_codex_<random>`; exact ID/name stored locally for cleanup.
- Secret host allowlist: only `chatgpt.com`.
- Sandbox mapping: `NED_OPENAI_CODEX_ACCESS_TOKEN` references the Secret name and receives an opaque placeholder.
- Bootstrap writes the environment placeholder—not plaintext—to `$HOME/.hermes/profiles/ned/auth.json` with mode `0600`, configures `openai-codex`, and sets a non-secret `ned-local-refresh-managed` sentinel as remote refresh token.
- Opaque placeholders are not JWTs, so Hermes does not attempt proactive remote refresh. Local NED refreshes and calls `SecretService.update(secretId, {value, hosts})` before each remote operation. Identity and host scope are verified from the update result.
- If a remote call receives authorization failure, it fails closed; no refresh token is available remotely.

## Optional provider extension points

Explicit advanced flags may later bind Claude Max (`anthropic` OAuth), Nous Portal (`nous`), or GitHub Copilot (`copilot`/`copilot-acp`) to the same `modelConnection` interface. Each needs its own safe local resolver, exact Daytona host scope, placeholder runtime contract, refresh/revocation tests, and destroy proof. Direct API-key fallback is allowed only through hidden input when safely supported. None is prompted during default first run.

## Parked architecture

Hosted browser onboarding, AWS provisioning/deployment, dashboards, domains, multi-cloud compute, and a default provider chooser remain future scope. Existing browser/AWS code is not a V1 deployment or acceptance surface.

## Installer invariants

- Prerequisites: bash, curl, tar, and sha256sum or shasum only.
- Darwin/Linux x64/arm64; fail closed elsewhere.
- Verify every archive before mutation; pin Node and NED source revisions/digests.
- Private npm/Node only; `npm ci --omit=dev --ignore-scripts`.
- Stable per-user lock, complete same-filesystem generation, manifest validation, atomic activation, rollback, signal-safe cleanup.
- Owner-only credential/state files despite caller umask.
- Failed create retries without redownload.

## Failure and cleanup

- Local state present blocks duplicate create; cleanup-pending requires destroy.
- Local absent plus any managed remote Sandbox blocks mutation.
- Secret-created/Sandbox-create failure deletes and directly verifies exact Secret absence; unresolved cleanup saves non-secret recovery metadata.
- Bootstrap/health failure compensates exact Sandbox/Secret.
- Destroy requires direct `get` not-found for both resources before local clear.
- OAuth cancel/timeout/restart cannot create compute or persist partial auth.
- User revocation remains effective through the local Hermes auth authority; refresh failure blocks remote mutation.

## Verification

After final edits run bare: `npm run check`, `npm test`, `python -m pytest`, `npm run pack:check`, `npm audit --omit=dev`, `git diff --check`, Gitleaks, clean installers, CI, and one immutable Daytona lifecycle with direct preflight/final readback.
