# Technical Specification: Daytona NED CLI v1

Contract version: 3.0
Status: release candidate pending immutable external verification
Last updated: 2026-08-06

## Architecture

```text
checksum-pinned one-line command
  -> scripts/install.sh
     -> private pinned Node runtime + commit-addressed NED source
     -> transactional generation + atomic current pointer + launcher
  -> ned CLI
     -> OpenRouter loopback PKCE or injected headless credential
     -> Daytona SDK 0.200.1
        -> organization Secret (egress restricted to openrouter.ai)
        -> private persistent Daytona Sandbox
        -> checksum-pinned Hermes install + NED profile archive
     -> $HOME/.ned/state.json (non-secret ownership only)
```

Daytona names the compute unit a Sandbox. User-facing copy may call the resulting product a private NED VPS, provided this mapping remains explicit.

## Fixed plan

- Daytona SDK: `@daytona/sdk` 0.200.1 from the committed lockfile.
- Image: `ubuntu:24.04`; language toolbox: TypeScript.
- Resources: 2 CPU, 4 GiB memory, 20 GiB disk.
- Target/region: Daytona automatic selection; no user choice in v1.
- Private, persistent, non-ephemeral; auto-stop 15 minutes, auto-archive 10,080 minutes, auto-delete disabled.
- Labels: `app=ned`, `managedBy=ned-cli`; lifecycle verification adds one unique non-secret candidate label without changing product defaults.
- Hermes commit: `3ef6bbd201263d354fd83ec55b3c306ded2eb72a`; its installer bytes must match the source constant before execution.
- Model: OpenRouter authorization, Hermes provider `openrouter`, pinned default model in the plan.

## CLI contract

- `ned create [--dry-run --json]`: checks local state, lists NED-managed Daytona Sandboxes directly, authorizes OpenRouter, creates/bootstraps/verifies one instance, then atomically saves state.
- `ned chat "prompt"`: validates non-empty prompt, starts the saved Sandbox if needed, executes one shell-quoted Hermes one-shot with a bounded timeout, and prints only model output.
- `ned doctor`: starts if needed and verifies Sandbox, Hermes, profile, and inference.
- `ned repair`: starts, reinstalls the pinned profile/runtime configuration, and reruns health. `ned reset` remains a compatibility alias.
- `ned destroy --yes`: deletes the exact state-owned Sandbox and model secret, reads both back directly, and clears local state only after both return not found. Missing local state is idempotent success.

There is no generic command, arbitrary host, arbitrary environment-variable name, or arbitrary model API.

## Secret boundaries

- Daytona key: launcher environment only; macOS may source it from Keychain service `no-ego-dev/daytona`, account `DAYTONA_API_KEY`; otherwise use a pre-injected environment or hidden `/dev/tty` input. Never argv or URL.
- OpenRouter: loopback callback bound to `127.0.0.1`, random callback path, S256 PKCE, bounded timeout, HTTPS code exchange, no key output. A pre-authorized environment key is automation fallback.
- Daytona Secret: unique generated name, host allowlist `openrouter.ai`, identifier persisted only for exact cleanup. Plaintext is consumed in-process and never serialized.
- State directory/file modes: `0700`/`0600`; write via same-directory temporary file and atomic rename.

## Installer invariants

- Prerequisites: bash, curl, tar, and sha256sum or shasum only.
- Supported: Darwin/Linux x64/arm64; fail closed elsewhere.
- Download and verify all archives before mutating user-home installation state.
- Pin Node version and all four archive digests; pin NED source revision/archive digest.
- Invoke private npm with private Node first on PATH; lockfile install uses `npm ci --omit=dev --ignore-scripts`.
- Serialize with a stable per-user lock independent of `TMPDIR`; publish lock ownership atomically.
- Stage a complete generation on destination filesystem; validate runtime, app tree, lockfile, launcher, and manifest hashes; atomically switch `current`; roll back activation on failure.
- HUP/INT/TERM cleanup owns only its lock and returns 129/130/143.
- Profile rewrites use unpredictable same-directory `0600` temporary files, preserve exact prior mode, and atomically rename.
- First-run create completion is separate from install completion, so a failed create retries without redownload.

## Daytona API behavior relied upon

SDK 0.200.1 exposes async `Daytona.list({labels})`, `create(...,{timeout})`, `get`, Sandbox `start/delete`, and organization `secret.create/get/delete`. List results expose ID, name, labels, state, and target. Daytona Secret values are write-only; Sandboxes receive an opaque placeholder and Daytona substitutes plaintext only for allowed hosts. Create/delete/start/command calls use explicit bounded timeouts.

## Failure/recovery rules

- Local state present: do not create another Sandbox; cleanup-pending state requires destroy first.
- Local state absent but any NED-managed remote Sandbox present: fail closed and require exact ownership reconciliation.
- Secret created but Sandbox create fails: delete and verify; if cleanup fails, persist non-secret secret ID/name as cleanup-pending.
- Sandbox bootstrap/health fails: delete exact Sandbox/secret; persist cleanup-pending only when compensation fails.
- Destroy must prove absence through direct `get` readback; delete completion alone is insufficient.
- Local Daytona credential is not deleted by destroy; the user can create again. NED-owned OpenRouter Daytona Secret and `$HOME/.ned/state.json` are deleted.

## Parked architecture

Browser HTTP service, AWS adapters, hosted identity, Cognito, App Runner, dashboards, domains, multi-cloud, provider registry expansion, and browser secret vaults are outside v1 and must not be deployed or described as primary.

## Verification

Run bare after final edits: `npm run check`, `npm test`, `python -m pytest`, `npm run pack:check`, `npm audit --omit=dev`, `git diff --check`, and the repository leak scanner. Clean-environment and external lifecycle evidence must bind to one immutable committed candidate and include direct Daytona preflight/final readback.
