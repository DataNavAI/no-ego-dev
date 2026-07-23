# PRD: `ned create` MVP

Status: implementation candidate
Owner: NoEgoDev
Last updated: 2026-07-23

## Product classification

This is an **MVP**, not a demo: a fully working, serviceable CLI journey that creates a private persistent NED environment, proves Hermes and NED are usable, reconnects for real work, and supports diagnosis, repair, and deletion.

## Job to be done

When a user wants an AI product partner but does not want to understand VPSs, Linux setup, or Hermes profile installation, they can run one command and receive a private development computer with NED ready within minutes.

## Target user and assumptions

- Product-minded builder on macOS or Linux with Node.js 20+.
- Has a Daytona account and can create a least-privilege API key.
- Can authorize OpenRouter in a browser through OAuth PKCE.
- English CLI for v0.2.0; Korean documentation is supported. Korean CLI localization is planned.
- Daytona target defaults to the SDK/account target (`us` unless configured as `eu`); users are not asked to choose infrastructure.

## Critical user journey

1. Install/run the package.
2. Set one Daytona credential locally; never send it through chat.
3. Run `ned create`.
4. Authorize OpenRouter in the browser if no existing environment key is provided.
5. Wait while NED creates a private persistent sandbox, installs pinned Hermes, installs the bundled NED profile, and runs health checks.
6. Run `ned chat "Build the smallest useful version of …"`.
7. Return later; NED wakes the same workspace.
8. Recover with `ned doctor` or `ned reset`; permanently remove it with `ned destroy --yes`.

## Scope

### Must ship

- Zero infrastructure questions in the default path.
- Fixed private Daytona container: 2 vCPU, 4 GiB memory, 20 GiB disk.
- Persistent filesystem, 15-minute auto-stop, seven-day auto-archive, no auto-delete.
- Official `@daytona/sdk` integration.
- Daytona secret injection for OpenRouter, allowlisted to `openrouter.ai`; plaintext never enters the sandbox.
- OpenRouter OAuth PKCE by default; `OPENROUTER_API_KEY` remains a headless/CI fallback.
- Hermes `v2026.7.20` pinned to commit `3ef6bbd201263d354fd83ec55b3c306ded2eb72a`.
- Bundled, credential-free NED profile archive.
- Secure local workspace metadata at `~/.ned/state.json`, mode `0600`, with no credentials.
- Commands: `create`, `chat`, `doctor`, `reset`, `destroy --yes`.
- Roll back a newly created sandbox if installation or health checks fail.

### Explicitly deferred

- Interactive multi-turn terminal UI; v0.2.0 uses one-shot `ned chat <prompt>`.
- GitHub authorization; users run official `gh auth login` inside NED only when repository work needs it.
- Generic SSH/VPS and Oracle providers.
- Modal provider.
- Always-on messaging gateways.
- KakaoTalk adapter: official APIs do not expose arbitrary inbound personal/channel chat as a Telegram-like bot webhook; see `KAKAOTALK_DECISION.md`.
- Anonymous opt-in analytics delivery until a project-owned collector and privacy notice exist. The CLI must not silently send usage data.

## Follow-up issues

- [#3 — Release after live Daytona smoke and npm authorization](https://github.com/DataNavAI/no-ego-dev/issues/3)
- [#4 — Privacy-safe opt-in telemetry](https://github.com/DataNavAI/no-ego-dev/issues/4)
- [#5 — Compliant KakaoTalk channel gateway](https://github.com/DataNavAI/no-ego-dev/issues/5)
- [#6 — Interactive chat and additional providers](https://github.com/DataNavAI/no-ego-dev/issues/6)

## Success criteria

- Activation: at least 70% of authorized `ned create` attempts reach a passing remote health check within 10 minutes.
- Primary journey completion: at least 60% of activated users complete one successful `ned chat` within 24 hours.
- Reliability: at least 90% of `doctor` runs identify a healthy workspace or return an actionable failure.
- Safety: zero credentials in local state, package archives, command output, or profile archives.
- Cost control: stopped environments retain filesystem state and consume storage only; archived environments consume no active sandbox compute.

## Event taxonomy (planned, opt-in only)

No events ship until the collector and privacy contract are approved.

- `ned_create_started`
- `ned_openrouter_authorized`
- `ned_workspace_created`
- `ned_activation_completed` — **activation event** after remote Hermes/profile/inference health passes
- `ned_create_failed` — stage and sanitized error class only
- `ned_chat_completed` — **primary journey completion event**, duration and success only; never prompt/response content
- `ned_doctor_completed`
- `ned_reset_completed`
- `ned_workspace_destroyed`

Recommended collector: PostHog Cloud’s free tier because it supports anonymous events, funnels, retention, EU/US hosting, and SDK-free HTTP capture. Do not integrate it until a project-owned account, region, public project key, opt-in UX, retention period, and privacy copy are approved.

Review cadence after launch: product owner reviews activation and journey-completion funnels daily for the first two weeks. A >10 percentage-point regression blocks release and opens a defect with failing stage evidence.

## Serviceability and release

- Support channel: GitHub issues in `DataNavAI/no-ego-dev` after public release; private beta uses the project owner’s existing support channel.
- Release target: npm package exposing the `ned` binary.
- QA gates: Node tests, Python regression suite, syntax checks, npm audit, package-content check, clean install smoke, remote Daytona smoke, failed-create cleanup evidence.
- Rollback: deprecate/bump the npm release, restore the previous package version, and keep the pinned Hermes/profile bootstrap unchanged.
- Ownership: NED maintainers own CLI/runtime defects; Daytona/OpenRouter outages are reported as provider failures with retry guidance.

## Platform parity

| Capability | macOS | Linux | Windows |
| --- | --- | --- | --- |
| `create` and Daytona lifecycle | MVP | MVP | Deferred |
| OpenRouter browser authorization | `open` | `xdg-open` | Deferred |
| One-shot chat | MVP | MVP | Deferred |
| Doctor/reset/destroy | MVP | MVP | Deferred |
| Live smoke evidence | Required before release | CI required | Not a release target |

Intentional difference: macOS and Linux browser launchers follow each OS convention. Windows remains unsupported until its package, browser, filesystem-permission, and lifecycle paths have dedicated CI evidence.
