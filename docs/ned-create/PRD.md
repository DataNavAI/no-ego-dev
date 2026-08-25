# PRD: One-command Daytona NED CLI

Contract version: 6.0
Status: candidate implementation pending immutable lifecycle evidence and independent review
Owner: NoEgoDev
Last updated: 2026-08-25

## Product outcome

A builder runs one checksum-verifiable bootstrap and receives one usable private NED VPS without installing Node.js, npm, Git, Homebrew, or using sudo. “Private NED VPS” is product language; Daytona calls the underlying persistent compute a Sandbox.

## Authoritative V1 journey

1. Run the documented one-line bootstrap; it downloads, verifies, then executes the installer.
2. The installer activates a pinned private runtime; the user then runs `ned create` to begin provisioning.
3. Daytona authorization comes from secure local state or hidden TTY input.
4. NED securely reuses one compatible Hermes `openai-codex` OAuth credential when `HERMES_HOME/auth.json` is an owner-only, user-owned, non-symlink store. Otherwise NED opens one fixed ChatGPT device-authorization page and displays its short user code. There is no model chooser and no loopback callback.
5. NED prints numbered BotFather actions, opens or links `https://t.me/BotFather`, and accepts a newly created disposable bot token only through hidden TTY input (or the named macOS Keychain item used for controlled verification).
6. NED validates Telegram `getMe` in-process and shows only the verified username. Invalid/revoked tokens stop before compute mutation with a direct public recovery link.
7. NED checks local ownership state and directly lists NED-managed Daytona Sandboxes before creating anything.
8. NED creates one private persistent Daytona Sandbox, stores the current ChatGPT access token as an egress-scoped installation-owned Daytona Secret, injects the Telegram token only at runtime through the Daytona SDK environment channel, installs checksum-pinned Hermes plus NED, configures Hermes provider `openai-codex`, starts and verifies the exact polling Telegram gateway, runs inference health, and prints owner-pairing actions.
9. The owner opens the verified bot link, taps **Start**, sends `hello`, and, when required, approves the Hermes pairing code with `ned pair <code>`.
10. Before `chat`, `doctor`, or `repair`, NED resolves or refreshes the local Hermes OAuth credential in-process and updates that exact model Secret. `repair` restores the gateway without replacing pairing state. The refresh token never crosses into Daytona.
11. `destroy --yes` deletes the exact Sandbox plus model Secret, proves direct absence readback, clears the in-memory runtime Telegram token, and removes local state only after cleanup succeeds.

Activation event: `instance_activation_completed` after remote install, health, and first inference health check succeed.
Primary journey completion event: `chat_completed` after the first user-request inference succeeds.

## Fixed V1 scope

- Compute provider: Daytona only.
- Compute: one private persistent Ubuntu 24.04 Sandbox; 2 CPU, 4 GiB RAM, 10 GiB disk; automatic target; always-on by default (`auto-stop=0`) so the messaging gateway can receive messages anytime; auto-archive after seven days.
- Default model authorization: ChatGPT OAuth using Hermes native provider `openai-codex` and default model `gpt-5.6-sol`.
- Default onboarding: secure compatible-credential reuse, otherwise one ChatGPT device browser step. OpenRouter is not required and is not prompted.
- Commands: `create`, `chat`, `doctor`, `pair`, `repair` (`reset` compatibility alias), `destroy --yes`.
- Local state: one owner-only `$HOME/.ned/state.json`, containing non-secret ownership metadata for the exact Sandbox, model Secret, and verified Telegram username/link.
- No generic arbitrary-command API.

## Advanced provider policy

Claude Max (`anthropic` OAuth), Nous Portal (`nous` OAuth), and GitHub Copilot (`copilot`/`copilot-acp`) are optional advanced extension points. They do not appear in the default journey or a first-run chooser. Implementations must be enabled through an explicit advanced flag and satisfy the same local refresh, egress scope, exact cleanup, and leak tests before release. Direct API keys are permitted only as hidden-input advanced fallback where Hermes safely supports them; V1 exposes no default API-key prompt. OpenRouter is neither a prerequisite nor a GATE-01 dependency.

## Parked after V1

V2, not V1, may add hosted browser onboarding and AWS provisioning/deployment. Dashboards, custom domains, multi-cloud compute, and a default provider chooser also remain future scope. Existing browser/AWS prototypes cannot substitute for Daytona CLI lifecycle evidence.

## Security and failure contract

- No access token, refresh token, Telegram bot token, device authorization ID, authorization code, verifier, Daytona key, prompt, or response in argv, shell history, chat, credential-bearing URLs/query strings, normal logs, analytics, source, fixtures, screenshots, or PR comments.
- Telegram bot tokens enter only through hidden TTY or named Keychain input, are validated with in-process `getMe`, and are injected only at runtime through the Daytona SDK environment channel. No Telegram Daytona Secret is created. Provider-mandated token-in-path requests are fully redacted.
- ChatGPT device authorization opens only the fixed `https://auth.openai.com/codex/device` page. Provider-returned verification URLs are ignored. NED runs no callback listener, so hostile callback requests have no product endpoint.
- Existing OAuth reuse is allowed only from a regular owner-only auth file under the user home with user-owned, non-writable, non-symlink parent directories. Ambiguous/malformed/unsafe credentials are not reused.
- The official local Hermes-compatible auth store remains the refresh/revocation authority. Refresh rotation is atomically written with mode `0600`; no second plaintext credential copy is created.
- Only the current access token enters the Daytona Secret API in-process. The Sandbox sees an opaque placeholder; Daytona substitutes the token only for `chatgpt.com`. Remote `auth.json` contains that placeholder and a non-secret local-refresh sentinel, never the refresh token or access-token plaintext.
- Before each remote inference/health/repair, local resolution refreshes when required and updates the exact Secret ID/name without changing host scope.
- Daytona credentials enter in-process from Keychain/environment/hidden TTY and never enter the Sandbox.
- Installer generations are staged, validated, atomically activated, and rolled back under one stable lock.
- Local and remote ownership must agree before create. Unmanaged/mismatched resources block creation.
- Provisioning failure compensates the exact Sandbox/Secret; failed compensation persists non-secret cleanup metadata.
- Cancel, timeout, and failed OAuth leave no partial auth file. Rerun restarts the fixed device flow. Revocation/refresh failure stops before compute mutation.
- Destroy clears local state only after direct Sandbox and model Secret not-found readback. Telegram is runtime-only and has no Daytona Secret to delete.

## Event taxonomy

Telemetry remains off by default. If separately enabled:

- `instance_create_started`
- `instance_activation_completed` — activation
- `instance_create_failed`
- `chat_completed` — primary journey completion
- `chat_failed`
- `doctor_completed`
- `instance_repair_completed`
- `instance_destroyed`

No prompt, response, credential, Daytona resource ID, or model Secret ID is collected.

## Release acceptance

- RED→GREEN tests cover safe reuse, hostile callback/verification data, cancel, timeout, restart, refresh rotation, remote placeholder configuration, exact Secret update, and destroy readback.
- Canonical static, Node, Python, package, audit, and leak gates pass.
- Clean Ubuntu 24.04 x64 and isolated macOS install without system Node/npm/Git/sudo; rerun, rollback, spaces, umask, concurrency, and leak checks pass.
- Immutable committed lifecycle: zero-resource preflight → create → install → health → marker A inference → stop/resume or repair → health → marker B inference → destroy → direct zero Sandbox/Secret readback → local-state absence.
- Exact candidate SHA, source/installer digests, commands/results, cleanup evidence, and superseding GATE-01 evidence go to a fresh independent reviewer.
- Draft only: no self-approval, merge, release, or mutable public installer claim before approval.
