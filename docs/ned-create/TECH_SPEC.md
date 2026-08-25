# Technical Specification: Daytona NED CLI V1

Contract version: 6.0
Status: candidate implementation pending exact lifecycle verification
Last updated: 2026-08-25

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
        -> organization Secret: current model access token, host chatgpt.com
        -> runtime env map: Telegram token for gateway child only
        -> remote Hermes auth.json: placeholder + non-secret refresh sentinel
        -> private persistent Sandbox
        -> checksum-pinned Hermes + NED profile
     -> $HOME/.ned/state.json (non-secret exact ownership only)
```

The local official Hermes-compatible auth store is the sole model refresh/revocation authority. NED sends no refresh token to Daytona. Before every remote inference/health/repair, it resolves a sufficiently fresh local access token and updates the exact model Secret. The validated Telegram token remains in controller memory and is passed only as `TELEGRAM_BOT_TOKEN` in the Daytona SDK process environment map; it is never persisted or placed in a command, URL, file, Secret, or diagnostic.

## Fixed plan

- Daytona SDK: `@daytona/sdk` 0.200.1 from committed lockfile.
- Image: `ubuntu:24.04`; TypeScript toolbox.
- Resources: 2 CPU, 4 GiB memory, 10 GiB disk.
- Automatic target; private, persistent, non-ephemeral; auto-stop disabled (`0`) so the messaging gateway remains available; auto-archive 10,080 minutes; auto-delete disabled.
- Labels: `app=ned`, `managedBy=ned-cli`; lifecycle adds a unique non-secret candidate label through its controlled harness.
- Hermes commit: `3ef6bbd201263d354fd83ec55b3c306ded2eb72a`; installer bytes must match the pinned SHA-256 before execution.
- Hermes provider/model: ChatGPT OAuth by default through `openai-codex` / `gpt-5.6-sol`.
- Telegram transport: pinned Hermes polling adapter; no NED webhook or public ingress.

## CLI contract

- `ned create [--dry-run --json]`: default provider is `openai-codex`; checks ownership; resolves local OAuth; securely acquires and validates a Telegram bot; creates one model Secret and one Sandbox; bootstraps; starts and verifies the polling gateway with runtime environment injection; atomically saves state.
- `ned chat "prompt"`: resolves/refreshes OAuth; updates exact Secret; starts the saved Sandbox; executes bounded Hermes one-shot.
- `ned doctor`: resolves/refreshes OAuth; updates Secret; starts and checks Sandbox, Hermes, profile, inference, and Telegram gateway.
- `ned repair`: same credential preflight, reinstalls pinned profile/runtime configuration, recreates the gateway, and reruns health. `reset` aliases repair.
- `ned pair <8-character-code>`: validates the pinned Hermes pairing alphabet and approves the exact Telegram sender in the saved profile.
- `ned destroy --yes`: deletes the exact Sandbox and model Secret; directly proves both absent; then clears local state. No OAuth is required to destroy.

No generic command, arbitrary host, arbitrary environment-variable name, default model chooser, or default API-key prompt exists. OpenRouter is not required.

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

## Telegram gateway contract

1. Bot creation remains an unavoidable human action through official `@BotFather`. NED opens `https://t.me/BotFather` when possible and prints the exact numbered `/newbot`, display-name, unique `bot` username, copy-token journey.
2. NED accepts the token only from macOS Keychain service `no-ego-dev/telegram`, account `TELEGRAM_BOT_TOKEN`, or the exact hidden-TTY prompt `Paste the Telegram bot token (input hidden):`. Argv, environment variables, URLs/query strings, chat, logs, analytics, screenshots, source, and persistent local state are not token inputs.
3. Local validation performs Telegram Bot API `getMe` in-process with bounded timeout and redirect refusal. Provider-mandated token-in-path values and hostile response data never enter errors or output. Only a validated username and `https://t.me/<username>` are retained as safe metadata.
4. The token is passed as `TELEGRAM_BOT_TOKEN` only through the Daytona SDK environment map for gateway start, replacement, health, pairing, repair, and inference. No Telegram Daytona Secret is created.
5. Pinned Hermes reads that environment variable through `gateway.config`, enables Telegram, clears stale webhook state with `drop_pending_updates=False`, then uses resilient long polling. NED does not configure webhook mode.
6. NED launches the exact profile with `nohup hermes --profile ned gateway run --replace` through Daytona process execution. Health requires `gateway_state=running` and `platforms.telegram.state=connected` from the pinned runtime-status file.
7. Unauthorized Telegram DMs follow the pinned gateway's default owner-pairing behavior. The operator approves the restricted eight-character code with `hermes --profile ned pairing approve telegram <code>`. Pairing data lives in the profile and survives gateway/Sandbox restart.
8. Start, doctor, and repair recreate/verify the polling gateway with fresh environment injection. Destroy removes the Sandbox-contained profile/config and the exact model Secret, with direct absence readback.

## Optional provider extension points

Explicit advanced flags may later bind Claude Max (`anthropic` OAuth), Nous Portal (`nous`), or GitHub Copilot (`copilot`/`copilot-acp`) to the same `modelConnection` interface. Each needs its own safe local resolver, exact Daytona host scope, placeholder runtime contract, refresh/revocation tests, and destroy proof. Direct API-key fallback is allowed only through hidden input when safely supported. None is prompted during default first run.

## Parked architecture

V2, not V1, may add hosted browser onboarding and AWS provisioning/deployment. Dashboards, domains, multi-cloud compute, and a default provider chooser remain future scope. Existing browser/AWS code is not a V1 deployment or acceptance surface.

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
- Secret-created/Sandbox-create failure deletes and directly verifies the exact model Secret; unresolved cleanup saves non-secret recovery metadata.
- Bootstrap/health failure compensates the exact Sandbox and model Secret; runtime Telegram memory is discarded.
- Destroy requires direct `get` not-found for the Sandbox and model Secret before local clear.
- OAuth cancel/timeout/restart cannot create compute or persist partial auth.
- User revocation remains effective through the local Hermes auth authority; refresh failure blocks remote mutation.

## Verification

After final edits run bare: `npm run check`, `npm test`, `python -m pytest`, public-doc HTTP/link checks, `npm run pack:check`, `npm audit --omit=dev`, `git diff --check`, Gitleaks, clean installers, CI, and one immutable two-message Daytona/Telegram lifecycle with direct preflight/final readback. The live lifecycle remains blocked until the user separately stores a disposable BotFather token in the exact Keychain item.
