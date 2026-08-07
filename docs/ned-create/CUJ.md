# Critical User Journey and Acceptance Contract: Daytona CLI v1

Contract version: 3.0
Status: external lifecycle and independent review pending
Last updated: 2026-08-06

## CUJ-1: Checksum-verifiable one-line bootstrap

Given supported clean macOS or Ubuntu 24.04 x64/arm64 with bash, curl, tar, and a SHA-256 utility,
when the user runs the documented one-line command,
then it downloads the installer, verifies the displayed exact digest before execution, installs private pinned runtime/source without sudo, system Node/npm, or git, and invokes `ned create`.

Rerun revalidates the complete active generation, repairs exactly one PATH block, and does not repeat successful create. Interrupted or failed upgrades leave the previous generation active.

## CUJ-2: Create one Daytona-backed private NED VPS

Given valid Daytona authorization and OpenRouter PKCE approval or an already-authorized automation credential,
when `ned create` runs,
then NED checks `$HOME/.ned/state.json` and directly lists Daytona Sandboxes labeled `app=ned, managedBy=ned-cli` before mutation. With zero owned resources it creates one private persistent Daytona Sandbox using fixed defaults, creates one egress-scoped model secret, installs checksum-pinned Hermes plus NED, runs inference health, persists non-secret state, and returns `ned chat`.

If local/remote ownership differs, creation fails closed. Failed setup compensates exact resources; unverified cleanup remains recoverable in non-secret cleanup-pending state.

Activation: `instance_activation_completed` after remote health including inference succeeds.

## CUJ-3: Reach first value

Given a healthy saved NED,
when the user runs `ned chat "<request>"`,
then the saved Sandbox starts if stopped, one bounded Hermes inference runs, and only the response is printed. Prompt and response do not enter argv beyond the local CLI’s ordinary prompt argument boundary inside the user process, URLs, query strings, normal logs, analytics, state, source, fixtures, screenshots, or PR comments.

Primary journey completion: `chat_completed` after the first successful user request.

## CUJ-4: Diagnose and repair

`ned doctor` starts the saved Sandbox if needed and checks Sandbox, Hermes, NED profile, and inference. `ned repair` reinstalls pinned configuration into the same Sandbox, preserves ownership identity, and reruns health. Legacy `ned reset` maps to repair.

External acceptance exercises a direct Daytona stop, then `ned doctor` resume (or `ned repair`), health, and a distinct second inference marker without creating another Sandbox.

## CUJ-5: Destroy with proof

Given state-owned Sandbox and model-secret identifiers,
when the user runs `ned destroy --yes`,
then NED deletes exactly those resources, directly reads each identifier back, requires not-found for both, and only then clears `$HOME/.ned/state.json`.

A second destroy with no local state is idempotent. The local Daytona authorization intentionally remains for a future create; the NED-owned OpenRouter Daytona Secret is gone. Final lifecycle evidence lists zero NED-managed test Sandboxes and zero test secrets directly from Daytona.

## CUJ-6: Keep secrets out of observable surfaces

- Daytona and model credentials never appear in argv, URLs/query strings, logs, output, source, committed fixtures, screenshots, or PR comments.
- Hidden TTY/Keychain/environment reads occur in-process with tracing disabled.
- Local sensitive files are owner-only even under caller umask 000.
- Process-list, captured output, temporary file, installed tree, package, and repository scans contain no real credential bytes.

## Required evidence matrix

1. Focused RED→GREEN tests for remote preflight, installer checksum-before-execution, repair alias, and destroy readback.
2. Canonical bare commands: static checks, Node suite, Python suite, package check, audit, leak scan, and diff check.
3. Synthetic installer matrix: clean install, rerun, concurrent lock, signal rollback, failed upgrade rollback, spaces in HOME/TMPDIR, umask 000, corrupt generation repair, failed create retry, and no secret disclosure.
4. Exact production installer in clean Ubuntu 24.04 x64 without system Node/npm/git/sudo and isolated macOS; rerun in both.
5. Immutable real lifecycle: direct zero-resource preflight; unique non-secret candidate label; create; install; health; first unique inference marker; stop/resume or repair; health; second distinct marker; destroy; direct zero-resource/secret readback; local state cleanup semantics.
6. Exact SHA, installer/source digests, commands/results, leak scans, and cleanup readback in the draft PR review packet.

## Parked

Browser onboarding and all AWS work are future scope. They are not accepted by this CUJ, are not deployed, and cannot substitute for Daytona CLI lifecycle evidence.
