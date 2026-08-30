# Manual live QA

This runbook is the credentialed, human-visible acceptance boundary for the NED Daytona CLI. It is separate from deterministic CI: `npm test`, `npm run test:all`, package checks, and pull-request CI must not require live credentials or create Daytona resources.

## Scope and gate

Use this process only for an exact committed release candidate. Record the candidate SHA, PASS/FAIL/BLOCKED outcome, redacted evidence location, lifecycle-handle status, and provider/local cleanup readback. Do not record credential values, device codes, prompts, responses, resource IDs, or secret IDs.

A passing live run proves the following sequence:

1. A fresh container installs and runs the exact candidate.
2. `ned create --verbose` completes a real Daytona lifecycle and reaches the documented ready state.
3. The verified Telegram bot completes the primary user journey.
4. `ned repair` preserves pairing and the bot completes a second request/response.
5. `ned destroy --yes` proves the created Sandbox and model Secret are absent by direct provider readback; local ownership state is cleared only afterward.
6. The disposable Telegram token is revoked in BotFather.

A container build failure, missing access, OAuth failure, incomplete Telegram interaction, or failed cleanup is `BLOCKED` or `FAIL`, never a passing agent test.

## Secret boundary

On the approved macOS host, the owner-only QA secret root is:

```text
$HOME/.config/no-ego-dev/secrets
```

For the current host, this resolves to `/Users/moonk/.config/no-ego-dev/secrets`.

Required permissions:

```text
secret root: 0700
daytona_api_key: 0600
telegram_bot_token: 0600
```

The live-QA-only credentials are stored only at:

```text
$HOME/.config/no-ego-dev/secrets/daytona_api_key
$HOME/.config/no-ego-dev/secrets/telegram_bot_token
```

The Daytona Personal Access Token requires only `write:sandboxes`, `delete:sandboxes`, and `manage:secrets`. Neither credential may enter chat, Git, source, screenshots, logs, shell history, command arguments, URLs, Docker build context, or persistent NED state.

The live runner reads both files only in its owner-only host process. Daytona is inherited through Docker's named runtime environment slot; the Telegram token is *not* exported to Docker. It is sent exactly once to NED's hidden TTY prompt by `scripts/qa/docker-create-live.expect`, then removed from that process. It is never mounted, passed in argv, logged, or created as a Daytona Secret.

Keep ChatGPT OAuth cache and non-secret NED lifecycle state under the same owner-only root. Mount only the minimum needed file or state directory into a disposable container.

## Full end-to-end scenario

### Preconditions

1. Verify Docker is healthy and has sufficient writable storage before building.
2. Verify only ownership and modes of the configured secret root and the two credential files; do not print or inspect their values.
3. Confirm the candidate SHA and working tree are exact and clean.
4. Run deterministic verification (`npm test`, `npm run test:all`, `npm run check`, `npm run pack:check`, `git diff --check`, and a redacted secret scan).
5. Ensure `hermes_auth.json` is an owner-only OAuth cache. If authorization expires, the operator completes the official browser flow; passwords, cookies, and 2FA codes are never given to the agent.

### Run

From the exact candidate checkout, start the PTY-backed fresh-container run:

```bash
./scripts/qa/docker-create-live.sh
```

The runner verifies the secret-root modes, builds `docker/ned-create.Dockerfile`, mounts only the OAuth cache and non-secret lifecycle state, and starts `ned create --verbose`. It automatically delivers the host-local Telegram token only when NED renders its hidden input prompt.

### Acceptance sequence

1. Record the candidate SHA and redacted start time.
2. Confirm `ned create --verbose` completes real Daytona provisioning and reports ready without token-shaped output.
3. Send a short request to the created Telegram bot from the approved owner chat; capture the bot's response as redacted evidence.
4. Run `ned repair` from the same image/state, then send a second distinct Telegram request and confirm a second response.
5. Run `ned destroy --yes` in a `finally` path from the same candidate/image.
6. Read back the provider: the created Sandbox and model Secret must be absent before local ownership state is cleared.
7. Revoke `telegram_bot_token` in BotFather, remove/replace the host-local test token, and record only the redacted cleanup outcome.

A create timeout, absent first or second bot response, repair failure, failed readback cleanup, or credential exposure is `FAIL` or `BLOCKED`, never a pass.

## Evidence-only follow-up

After a passing exact-candidate run, make `.github/manual-test-result.json` an evidence-only follow-up commit. Its `candidate_sha` must match the final code candidate's SHA. The evidence contains only redacted outcome metadata and commands; it contains no secrets, resource identifiers, device codes, or user messages. The `manual-test-gate` check must pass before merge.
