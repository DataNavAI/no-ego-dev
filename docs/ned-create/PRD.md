# PRD: One-command Daytona NED CLI

Contract version: 4.0
Status: candidate implementation pending immutable lifecycle evidence and independent review
Owner: NoEgoDev
Last updated: 2026-08-07

## Product outcome

A builder runs one checksum-verifiable bootstrap and receives one usable private NED VPS without installing Node.js, npm, Git, Homebrew, or using sudo. “Private NED VPS” is product language; Daytona calls the underlying persistent compute a Sandbox.

## Authoritative V1 journey

1. Run the documented one-line bootstrap; it downloads, verifies, then executes the installer.
2. The installer activates a pinned private runtime and invokes `ned create`.
3. Daytona authorization comes from secure local state or hidden TTY input.
4. NED securely reuses one compatible Hermes `openai-codex` OAuth credential when `HERMES_HOME/auth.json` is an owner-only, user-owned, non-symlink store. Otherwise NED opens one fixed ChatGPT device-authorization page and displays its short user code. There is no model chooser and no loopback callback.
5. NED checks local ownership state and directly lists NED-managed Daytona Sandboxes before creating anything.
6. NED creates one private persistent Daytona Sandbox, stores only the current ChatGPT access token as an egress-scoped Daytona Secret, installs checksum-pinned Hermes plus NED, configures Hermes provider `openai-codex`, runs inference health, and returns `ned chat`.
7. Before `chat`, `doctor`, or `repair`, NED resolves or refreshes the local Hermes OAuth credential in-process and updates that exact Daytona Secret. The refresh token never crosses into Daytona.
8. `destroy --yes` deletes the exact Sandbox and model Secret and succeeds only after direct absence readback.

Activation event: `instance_activation_completed` after remote install, health, and first inference health check succeed.
Primary journey completion event: `chat_completed` after the first user-request inference succeeds.

## Fixed V1 scope

- Compute provider: Daytona only.
- Compute: one private persistent Ubuntu 24.04 Sandbox; 2 CPU, 4 GiB RAM, 20 GiB disk; automatic target; auto-stop after 15 minutes; auto-archive after seven days.
- Default model authorization: ChatGPT OAuth using Hermes native provider `openai-codex` and default model `gpt-5.6-sol`.
- Default onboarding: secure compatible-credential reuse, otherwise one ChatGPT device browser step. OpenRouter is not required and is not prompted.
- Commands: `create`, `chat`, `doctor`, `repair` (`reset` compatibility alias), `destroy --yes`.
- Local state: one owner-only `$HOME/.ned/state.json`, containing non-secret ownership metadata only.
- No generic arbitrary-command API.

## Advanced provider policy

Claude Max (`anthropic` OAuth), Nous Portal (`nous` OAuth), and GitHub Copilot (`copilot`/`copilot-acp`) are optional advanced extension points. They do not appear in the default journey or a first-run chooser. Implementations must be enabled through an explicit advanced flag and satisfy the same local refresh, egress scope, exact cleanup, and leak tests before release. Direct API keys are permitted only as hidden-input advanced fallback where Hermes safely supports them; V1 exposes no default API-key prompt. OpenRouter is neither a prerequisite nor a GATE-01 dependency.

## Parked after V1

Hosted browser onboarding, AWS provisioning/deployment, dashboards, custom domains, multi-cloud compute, and a default provider chooser remain future scope. Existing browser/AWS prototypes cannot substitute for Daytona CLI lifecycle evidence.

## Security and failure contract

- No access token, refresh token, device authorization ID, authorization code, verifier, Daytona key, prompt, or response in argv, credential-bearing URLs/query strings, normal logs, analytics, source, fixtures, screenshots, or PR comments.
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
- Destroy clears local state only after direct Sandbox and Secret not-found readback.

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
