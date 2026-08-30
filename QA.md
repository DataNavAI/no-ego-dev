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
```

The Daytona Personal Access Token is stored only at:

```text
$HOME/.config/no-ego-dev/secrets/daytona_api_key
```

It requires only `write:sandboxes`, `delete:sandboxes`, and `manage:secrets`. Never send it through chat or put it in Git, source, screenshots, logs, shell history, command arguments, URLs, Docker build context, or persistent NED state.

Keep ChatGPT OAuth cache and non-secret NED lifecycle state under the same owner-only root. Mount only the minimum needed file or state directory into a disposable container. Telegram remains a disposable hidden-TTY input: do not export it as a shell/Docker environment variable or create a Daytona Secret for it. A test-only owner-only `telegram_bot_token` file may be consumed by a local PTY wrapper solely to write the value to NED's hidden prompt; it is never mounted, passed in argv, logged, copied into the image, or persisted by NED.

## Preflight

1. Verify Docker is healthy and has sufficient writable storage before building.
2. Verify only ownership and modes of the configured secret root and credential file; do not print or inspect credential values.
3. Confirm the candidate SHA and working tree are exact and clean.
4. Run deterministic verification (`npm test`, `npm run test:all`, `npm run check`, `npm run pack:check`, `git diff --check`, and a redacted secret scan).
5. Obtain a disposable Telegram bot token through BotFather. The operator completes any Google/ChatGPT OAuth or 2FA interaction in the official browser flow; passwords, cookies, codes, and tokens are never sent to an agent.

## Execution and cleanup

Build from the checked-out candidate using `docker/ned-create.Dockerfile`. Pass the Daytona key only through the container runtime environment. Run `ned create --verbose` interactively, provide the Telegram token only at NED's hidden prompt, then exercise the Telegram response, pairing, repair, and second response.

Always run `ned destroy --yes` from the same candidate/image in a `finally` path. Verify the exact resources are absent through direct provider readback before clearing local state. If cleanup fails, preserve the ownership state and retry recovery; never delete unrelated Daytona resources or Telegram bots.

## Evidence-only follow-up

After a passing exact-candidate run, make `.github/manual-test-result.json` an evidence-only follow-up commit. Its `candidate_sha` must match the final code candidate's SHA. The evidence contains only redacted outcome metadata and commands; it contains no secrets, resource identifiers, device codes, or user messages. The `manual-test-gate` check must pass before merge.
