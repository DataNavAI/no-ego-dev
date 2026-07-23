# NED CLI 0.2.0 Release Test Plan

Status: BLOCKED until live Daytona authorization is available

## Purpose

Verify the installable CLI delivers the primary create/chat journey without exposing credentials and can recover or delete its workspace safely.

## Environment

- Release candidate: npm tarball built from version 0.2.0
- Supported interfaces: `cli-macos`, `cli-linux`
- Required account: disposable Daytona test account/target with a scoped API key
- Required auth: OpenRouter browser PKCE
- Secret handling: put `DAYTONA_API_KEY` in the invoking process only; never capture its value

## NED-SMOKE-01 — Package install and dry-run

Persona: new user on each supported CLI interface.

1. Build with `npm pack --json`.
2. Install the produced tarball into a fresh temporary npm prefix.
3. Run `ned create --dry-run` with no credentials.
4. Assert exit 0, zero prompts, fixed private/persistent plan, 2 CPU/4 GB/20 GB, 15-minute stop, seven-day archive, pinned Hermes release, and no secret-like output.
5. Run `ned --help` and assert create/chat/doctor/reset/destroy are discoverable.

Expected: package works independently of the source checkout and includes the NED distribution.
Evidence: command transcript and package manifest.
Cleanup: remove temporary prefix and tarball.

## NED-SMOKE-02 — Live create, inference, chat, reset, destroy

Persona: first-time user with a disposable Daytona account.

1. Export a scoped Daytona key locally.
2. Run installed `ned create`; complete OpenRouter browser authorization.
3. Confirm one private, persistent workspace appears in Daytona with secret host allowlist `openrouter.ai` and no secret value in output/logs.
4. Confirm create health check reports sandbox, Hermes, NED profile, and inference ready.
5. Run `ned chat "Reply with exactly: smoke-ready"`; assert a successful model response.
6. Wait for or manually stop the sandbox; run the chat again and confirm automatic resume.
7. Run `ned reset`; assert idempotent profile update and healthy inference.
8. Run `ned destroy --yes`; confirm remote deletion and local state removal.

Expected: full primary CUJ and safe cleanup pass.
Evidence: redacted transcript, Daytona workspace lifecycle status, exact release/tarball hash.
Negative/recovery: force bootstrap failure in a disposable workspace and confirm rollback deletion.

## Release decision

- PASS only when both supported interfaces have current evidence for the exact candidate.
- BLOCKED when either interface is not run or live provider authorization is absent.
- Any secret disclosure, public workspace, failed cleanup, or inference failure is a release blocker.
