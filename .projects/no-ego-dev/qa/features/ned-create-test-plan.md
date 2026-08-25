# NED CLI V1 Release Test Plan

Status: BLOCKED until separately authorized live Daytona and disposable Telegram acceptance credentials are available.

## Purpose

Verify the installable Daytona-only CLI delivers the V1 create/chat journey without exposing credentials, preserves always-on Telegram reachability, and can diagnose, repair, or delete its exact workspace safely. Hosted browser onboarding and AWS provisioning are V2, not V1.

## Environment

- Release candidate: npm tarball built from the exact candidate version.
- Supported interfaces: `cli-macos`, `cli-linux`.
- Required account: disposable Daytona test account/target with a scoped API key.
- Required model authorization: ChatGPT OAuth through Hermes `openai-codex`; reuse a safe local credential or complete the fixed device flow.
- Required Telegram authorization: a disposable BotFather bot token supplied only through the approved hidden input or named Keychain item.
- Secret handling: use documented local credential channels only; never capture values in transcripts, screenshots, logs, fixtures, source, or PR comments.

## NED-SMOKE-01 — Package install and dry-run

Persona: new user on each supported CLI interface.

1. Build with `npm pack --json`.
2. Install the produced tarball into a fresh temporary npm prefix.
3. Run `ned create --dry-run` with no credentials.
4. Assert exit 0, zero prompts, a fixed private persistent Daytona plan (2 CPU, 4 GiB RAM, 10 GiB disk), always-on `auto-stop=0`, seven-day auto-archive, pinned Hermes release, ChatGPT OAuth default, no OpenRouter requirement, and no secret-like output.
5. Run `ned --help` and assert `create`, `chat`, `doctor`, `pair`, `repair`, `reset`, and `destroy` are discoverable.

Expected: package works independently of the source checkout and includes the NED distribution.
Evidence: command transcript and package manifest.
Cleanup: remove temporary prefix and tarball.

## NED-SMOKE-02 — Live create, Telegram value, recovery, and destroy

Persona: first-time user with a disposable Daytona account and disposable Telegram bot.

1. Make the scoped Daytona authorization available through the documented local channel.
2. Run installed `ned create`; reuse safe ChatGPT OAuth or complete the fixed ChatGPT device authorization.
3. Complete the BotFather actions and supply the disposable token only through the approved hidden input or named Keychain item.
4. Confirm exactly one private persistent Daytona Sandbox appears with `auto-stop=0`, one model Secret scoped to `chatgpt.com`, and no Telegram Secret or token in output/logs.
5. Confirm create health reports Sandbox, Hermes, NED profile, inference, and Telegram polling gateway readiness; the Telegram token is injected only through the runtime Daytona SDK environment map.
6. Open the verified bot link, tap **Start**, send `hello`, approve a returned owner code with `ned pair <code>` if required, and send a distinct marker request. Record the redacted response marker as the V1 value moment.
7. Run `ned chat "Reply with exactly: smoke-ready"`; assert a successful model response.
8. Directly stop the Sandbox, then run `ned doctor` or `ned repair`; assert the exact Sandbox is resumed/repaired, pairing survives, the polling gateway receives fresh runtime injection, and a second distinct Telegram marker receives a response without creating another Sandbox or model Secret.
9. Run `ned destroy --yes`; directly verify the exact Sandbox and model Secret are absent and local state is removed only after that readback.

Expected: the Daytona-only V1 CLI journey, runtime-only Telegram boundary, recovery, and safe cleanup pass.
Evidence: redacted transcript, direct Daytona lifecycle readback, exact candidate/tarball hash, and no-disclosure scan.
Negative/recovery: force bootstrap failure in a disposable workspace and confirm exact cleanup/rollback; verify invalid or revoked ChatGPT/Telegram authorization stops before unsafe compute mutation.

## Release decision

- PASS only when both supported CLI interfaces have current evidence for the exact candidate and the immutable lifecycle records the two distinct Telegram response markers.
- BLOCKED when either interface is not run or separately authorized live Daytona/Telegram acceptance evidence is absent.
- Any secret disclosure, public workspace, non-runtime Telegram persistence, auto-stop enabled, failed cleanup, or inference/gateway failure is a release blocker.
