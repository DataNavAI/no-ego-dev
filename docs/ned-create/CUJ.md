# Critical User Journey and Acceptance Contract: Daytona CLI V1

Contract version: 4.0
Status: exact lifecycle and independent review pending
Last updated: 2026-08-07

## CUJ-1: Checksum-verifiable one-line bootstrap

Given supported clean macOS or Ubuntu 24.04 x64/arm64 with bash, curl, tar, and a SHA-256 utility,
when the user runs the documented one-line command,
then it verifies the displayed exact digest before execution, installs private pinned runtime/source without sudo, system Node/npm, or Git, and invokes `ned create`.

Rerun revalidates the active generation, repairs exactly one PATH block, and does not repeat successful create. Interrupted or failed upgrades leave the previous generation active.

## CUJ-2: One familiar ChatGPT OAuth step

Given valid Daytona authorization,
when `ned create` starts,
then NED first reuses a compatible `openai-codex` OAuth credential only when its explicit Hermes auth store is owner-only, user-owned, non-symlinked, unambiguous, and refreshable. Otherwise it opens only `https://auth.openai.com/codex/device`, displays the short device code, and polls the verified Hermes/OpenAI device contract with a bounded timeout.

There is no default model chooser, OpenRouter requirement, remote loopback, local callback server, or credential-bearing browser URL. Provider-returned verification URLs are ignored. Cancel/timeout writes no partial credential; rerun starts a fresh device transaction. Revoked/failed refresh stops before compute mutation.

## CUJ-3: Create one Daytona-backed private NED VPS

Given valid Daytona authorization and resolved ChatGPT OAuth,
when `ned create` runs,
then NED checks `$HOME/.ned/state.json` and directly lists Daytona Sandboxes labeled `app=ned, managedBy=ned-cli`. With zero owned resources it creates one private persistent Sandbox, creates one `chatgpt.com`-scoped Secret containing only the current access token, installs checksum-pinned Hermes plus NED, configures `openai-codex`/`gpt-5.6-sol`, writes only the Daytona placeholder to remote Hermes auth state, runs inference health, and persists non-secret ownership state.

The refresh token stays in the official local Hermes-compatible auth store. No OAuth credential crosses through argv, query strings, output, logs, fixtures, screenshots, or persistent plaintext copies outside that store and Daytona Secret.

Activation: `instance_activation_completed` after remote inference health succeeds.

## CUJ-4: Reach first value

Given a healthy saved NED,
when the user runs `ned chat "<request>"`,
then NED resolves/refreshes local ChatGPT OAuth in-process, updates the exact owned Daytona Secret ID/name without broadening `chatgpt.com`, starts the Sandbox if stopped, runs one bounded Hermes inference, and prints only the response.

Primary journey completion: `chat_completed` after the first successful user request.

## CUJ-5: Diagnose and repair

`ned doctor` and `ned repair` first refresh the exact model Secret from local OAuth authority, then start the saved Sandbox. Doctor verifies Sandbox, Hermes, NED profile, and inference. Repair reinstalls pinned configuration into the same Sandbox and reruns health. `ned reset` remains a compatibility alias.

External acceptance performs direct Daytona stop, then `ned doctor` resume or `ned repair`, health, and a distinct second inference marker without creating another Sandbox.

## CUJ-6: Destroy with proof

Given exact state-owned Sandbox and model-Secret identifiers,
when `ned destroy --yes` runs,
then NED deletes exactly those resources, directly reads each identifier back, requires not-found for both, and only then clears `$HOME/.ned/state.json`.

A second destroy is idempotent. Local ChatGPT OAuth remains under the user’s Hermes auth/revocation control; the exact remote access-token Secret is absent. Final lifecycle evidence directly lists zero NED-managed test Sandboxes and zero candidate Secrets.

## CUJ-7: Advanced providers stay advanced

Claude Max, Nous Portal, and GitHub Copilot are documented provider extension points and may be enabled only through explicit advanced flags after equivalent security tests exist. They never appear in default first run. Direct API keys are hidden-input advanced fallback only where safely supported. OpenRouter-specific GATE-01 evidence is superseded and cannot block V1.

## Required evidence matrix

1. RED→GREEN tests: compatible reuse; unsafe/symlink rejection; fixed device URL; hostile verification/callback data; cancel; timeout; restart; local refresh rotation; exact remote Secret update; placeholder-only remote auth; destroy readback.
2. Canonical bare commands: static checks, Node suite, Python suite, package check, audit, leak scan, diff check.
3. Synthetic installer matrix: clean install, rerun, lock, signal/failed-upgrade rollback, spaces, umask `000`, corrupt-generation repair, failed-create retry, no disclosure.
4. Exact production installer on clean Ubuntu 24.04 x64 and isolated macOS without system Node/npm/Git/sudo; rerun on both.
5. Immutable real lifecycle: direct zero baseline; unique candidate label; create; install; health; marker A; direct stop and resume/repair; health; marker B; destroy; direct Sandbox/Secret/local-state absence.
6. Exact SHA, source/installer digests, CI, commands/results, leak scans, and cleanup readback in the draft PR handoff.

## Parked

Browser onboarding and AWS remain future scope. They cannot substitute for Daytona CLI lifecycle evidence.
