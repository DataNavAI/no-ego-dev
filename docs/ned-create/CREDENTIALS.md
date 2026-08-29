# Credentials, revocation, destroy, and troubleshooting

Canonical public page: https://ned.datanav.app/docs/v1/credentials/

## Boundaries

- ChatGPT OAuth refresh credentials stay local. Only the current short-lived runtime credential reaches its installation-owned Daytona Secret.
- The Telegram token enters NED through hidden TTY input or macOS Keychain service `no-ego-dev/telegram`, account `TELEGRAM_BOT_TOKEN`. It is validated in-process, retained only in controller memory for the active lifecycle, and passed to gateway child processes only through the Daytona SDK environment map. It is never stored in a Daytona Secret, file, URL, command, log, or local state.
- The Daytona credential remains local and is never uploaded as a Sandbox Secret.

## Daytona API key permissions

Create a **Personal Access Key** at <https://app.daytona.io/dashboard/keys> and grant:

- `write:sandboxes`
- `delete:sandboxes`
- `manage:secrets`

The read-only preflight runs before ChatGPT OAuth, Telegram setup, or resource creation. If Daytona rejects the key, NED reports that a Sandbox-only key is insufficient and points back to this key-creation page.
- Logs, analytics, errors, state, screenshots, fixtures, and evidence contain no credential values.

## Maintainer manual live-QA protocol

Live `ned create` acceptance is separate from credential-free CI. The approved host-local QA material belongs under `$HOME/.no-ego-dev/`; it is **not** stored in macOS Keychain, the NED install directory, or a `$HERMES_HOME` subtree. The manual QA runner receives this QA root through its approved host configuration and must not search alternate locations, append profile segments, or fall back to Keychain. Treat a missing configured QA root as a configuration blocker rather than silently choosing another credential source.

Before a live run, verify only that the configured directory is owner-only (`0700`) and its regular credential files are owner-only (`0600`). Do not print, copy, enumerate into reports, pass through argv or URLs, or place credential values in chat, source, logs, screenshots, fixtures, or persistent state. The accepted credential handoff remains hidden and runtime-only. After the run, record only the candidate SHA, PASS/FAIL/BLOCKED outcome, redacted evidence locations, created lifecycle handle status, and provider/local cleanup readback.

## Revoke and destroy

1. In BotFather, use `/revoke` for only the disposable NED bot.
2. Run `ned destroy --yes`.
3. NED waits for exact Sandbox deletion and directly proves the Sandbox and model Secret absent.
4. Local ownership state clears only after that proof.
5. On macOS, remove a test-only Telegram Keychain item with `security delete-generic-password -s no-ego-dev/telegram -a TELEGRAM_BOT_TOKEN`.

Destroy is idempotent. If cleanup fails, keep local ownership state and retry. Never delete unrelated Daytona resources or Telegram bots.

## Troubleshooting

- Token rejected: do not put it in a command. Revoke it and use a new disposable bot through hidden input.
- Gateway disconnected: run `ned doctor`, then `ned repair`.
- Bot does not answer: send `hello`, approve the fresh code with `ned pair <code>`, and retry.
- Cleanup blocked: retry `ned destroy --yes`; do not clear local ownership state manually.
