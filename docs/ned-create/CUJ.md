# Critical User Journey and Acceptance Contract: Daytona CLI V1

Contract version: 5.0
Status: Telegram lifecycle and independent review pending
Last updated: 2026-08-07

## CUJ-1: Checksum-verifiable one-line bootstrap

Given supported clean macOS or Ubuntu 24.04 x64/arm64 with bash, curl, tar, and a SHA-256 utility,
when the user runs the documented one-line command,
then it verifies the displayed exact digest before execution, installs private pinned runtime/source without sudo, system Node/npm, or Git, and invokes `ned create`.

Rerun revalidates the active generation, repairs exactly one PATH block, and does not repeat successful create. Interrupted or failed upgrades leave the previous generation active.

## CUJ-2: Resolve Daytona and ChatGPT authorization

Given valid Daytona authorization,
when `ned create` starts,
then NED reuses a compatible `openai-codex` OAuth credential only from a safe explicit Hermes auth store. Otherwise it opens only `https://auth.openai.com/codex/device`, displays the short device code, and polls the verified Hermes/OpenAI device contract with a bounded timeout.

There is no default model chooser, OpenRouter requirement, callback server, credential-bearing browser URL, or remote refresh token. Revoked/failed refresh stops before compute mutation.

## CUJ-3: Create and verify a disposable Telegram bot

Given model authorization and no Telegram token in the exact macOS Keychain item,
when `ned create` reaches Telegram setup,
then NED states that BotFather legal/ownership actions require the user; opens or links `https://t.me/BotFather`; prints numbered `/newbot`, display-name, unique username ending in `bot`, and copy-token actions; then prompts exactly `Paste the Telegram bot token (input hidden):` without echo.

NED never accepts the token from argv, environment variables, shell history, chat, logs, analytics, screenshots, source, fixtures, or product-controlled URLs/query strings. It performs the provider-mandated token-in-path Telegram `getMe` call only in-process with bounded timeout and fixed redacted errors. Invalid/revoked tokens receive recovery copy and the public Telegram docs URL. Output retains only the verified bot username and bot link.

On macOS, a user-owned token may instead be read from Keychain service `no-ego-dev/telegram`, account `TELEGRAM_BOT_TOKEN`.

## CUJ-4: Create one private Telegram-connected NED VPS

Given valid Daytona, ChatGPT, and verified Telegram authorization,
when `ned create` runs,
then NED proves zero managed resources, creates separate installation-owned model and Telegram Daytona Secrets with `chatgpt.com` and `api.telegram.org` scopes respectively, and creates one private persistent Sandbox containing only opaque Secret placeholders.

NED installs checksum-pinned Hermes plus the NED profile, configures `openai-codex`/`gpt-5.6-sol`, starts pinned Hermes Telegram long polling with `gateway run --replace`, and requires runtime status `gateway_state=running` plus `platforms.telegram.state=connected`. It introduces no webhook/public ingress. Exact Sandbox and both Secret identities plus safe bot metadata are persisted in owner-only local state.

Activation: `instance_activation_completed` after inference and Telegram gateway health both succeed.

## CUJ-5: Start, pair, and reach first value

Given a healthy saved NED,
when the user opens the exact verified bot link, taps **Start**, and sends `hello`,
then the pinned Hermes gateway returns an eight-character owner pairing code when required. The user runs `ned pair <code>`; NED validates the pinned alphabet and approves the exact Telegram sender in the exact saved profile. The user sends `hello` again and receives a NED response.

The CLI prints the numbered open, Start, hello, pairing action and links directly to public quickstart/recovery documentation.

Primary journey completion: the first successful Telegram response. This is acceptance evidence, not product analytics containing message content or identifiers.

## CUJ-6: Diagnose, restart, and repair

`ned doctor` and `ned repair` refresh the exact model Secret from local OAuth authority, start the saved Sandbox, recreate/verify the exact polling gateway session, and verify Sandbox, Hermes, profile, inference, and Telegram gateway readiness. `ned reset` remains a compatibility alias.

Pairing state and Telegram Secret identity survive gateway/Sandbox restart. External acceptance performs direct Daytona stop, restart/repair, then a distinct second Telegram request/response marker without creating another Sandbox or Secret.

## CUJ-7: Destroy with direct proof

Given exact state-owned Sandbox, model-Secret, and Telegram-Secret identifiers,
when `ned destroy --yes` runs,
then NED deletes exactly those resources, directly reads each identifier back, requires not-found for all three, and only then clears `$HOME/.ned/state.json`.

A second destroy is idempotent. Final evidence directly proves zero NED-managed Sandboxes, zero `ned_model_` Secrets, zero `ned_telegram_` Secrets, and absent local state. BotFather revocation and removal of the user-owned local Keychain item remain explicit human/local credential cleanup actions.

## Required evidence matrix

1. RED→GREEN tests: exact BotFather/prompt copy; hidden input; Keychain reuse; hostile data; invalid/revoked token; cancel/timeout; `getMe`; separate Secret scope; placeholder-only bootstrap; polling config/start/status; pairing; restart/repair; destroy/failure cleanup; redaction.
2. Canonical bare commands: static checks, full Node and Python suites, public-doc HTTP/link checks, package check, audit, Gitleaks, diff check.
3. Synthetic installer matrix: clean install/rerun, lock, signal/failed-upgrade rollback, spaces, umask `000`, corrupt-generation repair, failed-create retry, exact CLI action copy, docs links, no disclosure.
4. Exact immutable installer on clean Ubuntu 24.04 amd64/arm64 and isolated macOS arm64 without system Node/npm/Git/sudo; idempotent rerun on each.
5. Immutable real lifecycle, only after the user supplies a disposable BotFather token through the exact Keychain item: direct zero baseline; create; gateway health; pair; Telegram response marker A; direct stop/restart; response marker B; destroy in `finally`; direct zero-resource/local-state readback.
6. Exact SHA, runtime/wrapper/source/archive digests, CI, commands/results, redacted leak scans, and cleanup readback in the draft PR and linked issues.

## Parked

Browser onboarding and AWS remain future scope. They cannot substitute for the Daytona CLI and Telegram lifecycle evidence.
