# PRD: One-command Daytona NED CLI

Contract version: 3.0
Status: release candidate pending immutable lifecycle evidence and independent review
Owner: NoEgoDev
Last updated: 2026-08-06

## Product outcome

A builder runs one checksum-verifiable bootstrap and receives one usable private NED VPS without installing Node.js, npm, git, Homebrew, or using sudo. “Private NED VPS” is product language; Daytona’s API and billing call the underlying compute a persistent Sandbox (older product material may say workspace).

## Authoritative v1 journey

1. Run the documented one-line bootstrap; it downloads, verifies, then executes the installer.
2. The installer activates a pinned private runtime and invokes `ned create`.
3. Daytona authorization is read from secure local state or hidden TTY input. OpenRouter authorization uses its supported loopback PKCE browser flow by default.
4. NED checks local ownership state and directly lists NED-managed Daytona Sandboxes before creating anything.
5. NED creates one private persistent Daytona Sandbox with fixed defaults, installs checksum-pinned Hermes plus the pinned NED profile, runs inference health, and returns `ned chat`.
6. The user can run `chat`, `doctor`, `repair`, and `destroy --yes`. `chat`/`doctor` resume a stopped Sandbox. Destroy succeeds only after direct Daytona readback proves the Sandbox and NED-owned model secret absent.

Activation event: `instance_activation_completed` after remote install, health, and first inference health check succeed.
Primary journey completion event: `chat_completed` after the first user-request inference succeeds.

## Fixed v1 scope

- Compute provider: Daytona only.
- Compute: one private, persistent Ubuntu 24.04 Sandbox; 2 CPU, 4 GiB RAM, 20 GiB disk; Daytona-selected target; auto-stop after 15 minutes; auto-archive after seven days.
- Model authorization: OpenRouter PKCE; an already-authorized `OPENROUTER_API_KEY` is headless/automation fallback only.
- Commands: `create`, `chat`, `doctor`, `repair` (`reset` compatibility alias), `destroy --yes`.
- Local state: one owner-only `$HOME/.ned/state.json`, containing non-secret ownership metadata only.
- No generic arbitrary-command API.

## Explicitly parked after v1

Browser-hosted onboarding, AWS/Cognito/App Runner, dashboard, custom domain, multi-cloud, compute-provider abstraction expansion, model-provider selection UI, and additional compute shapes/regions are not v1. Existing browser prototype code remains non-production and is not a primary CUJ, release surface, or deployment target. AWS PR #28 was closed without deployment.

## Security and failure contract

- No credential, OAuth code/verifier, prompt, or response in argv, URLs, query strings, normal logs, analytics, source, fixtures, screenshots, or PR comments.
- Daytona credentials enter in-process from the environment/Keychain-backed launcher context or hidden TTY and are never sent to the Sandbox.
- OpenRouter credentials become a Daytona Secret restricted to `openrouter.ai`; plaintext is write-only and not returned by Daytona.
- Local state and credentials use owner-only directories/files. Installer generations are staged, validated, and atomically activated under one stable lock with signal-safe cleanup and rollback.
- Local and remote ownership must agree before create. An unmanaged/mismatched remote resource blocks creation instead of guessing ownership.
- Provisioning failure compensates the exact Sandbox/secret; failed compensation persists non-secret cleanup metadata.
- Destroy clears local state only after direct readback proves remote Sandbox and secret absence. The local Daytona authorization remains intentionally available for future creates until the user revokes/removes it.
- Network and process operations use bounded timeouts. Repeat create/destroy/install operations fail closed or return idempotent already-complete outcomes.

## Event taxonomy

Telemetry remains off by default. If separately enabled under the documented privacy contract:

- `instance_create_started`
- `instance_activation_completed` — activation
- `instance_create_failed`
- `chat_completed` — primary journey completion
- `chat_failed`
- `doctor_completed`
- `instance_repair_completed`
- `instance_destroyed`

No prompt, response, credential, Daytona resource ID, or model secret ID is collected.

## Release acceptance

- RED→GREEN focused tests plus canonical static, Node, Python, package, audit, and leak gates.
- Clean Ubuntu 24.04 x64 and isolated macOS install without system Node/npm/git/sudo; rerun, interruption rollback, spaces, caller umask 000, concurrency, and leak checks.
- Immutable committed candidate lifecycle: direct zero-resource preflight → create → install → health → unique first inference → stop/direct resume or repair → health → distinct second inference → destroy → direct Daytona zero-managed-resource and secret readback → local-state cleanup verification.
- Exact candidate SHA, source archive digest, installer digest, commands/results, and cleanup evidence handed to a fresh independent reviewer.
- Draft only: no merge, release, or mutable public installer claim before approval.
