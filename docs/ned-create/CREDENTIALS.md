# Credentials, revocation, destroy, and troubleshooting

Canonical public page: https://ned.datanav.app/docs/v1/credentials/

## Boundaries

- ChatGPT OAuth refresh credentials stay local. Only the current short-lived runtime credential reaches its installation-owned Daytona Secret.
- The Telegram token enters NED through hidden TTY input or macOS Keychain service `no-ego-dev/telegram`, account `TELEGRAM_BOT_TOKEN`. It is validated in-process and stored only in a separate installation-owned Daytona Secret scoped to `api.telegram.org`.
- The Daytona credential remains local and is never uploaded as a Sandbox Secret.
- Logs, analytics, errors, state, screenshots, fixtures, and evidence contain no credential values.

## Revoke and destroy

1. In BotFather, use `/revoke` for only the disposable NED bot.
2. Run `ned destroy --yes`.
3. NED waits for exact Sandbox deletion and directly proves the Sandbox, model Secret, and Telegram Secret absent.
4. Local ownership state clears only after that proof.
5. On macOS, remove a test-only Telegram Keychain item with `security delete-generic-password -s no-ego-dev/telegram -a TELEGRAM_BOT_TOKEN`.

Destroy is idempotent. If cleanup fails, keep local ownership state and retry. Never delete unrelated Daytona resources or Telegram bots.

## Troubleshooting

- Token rejected: do not put it in a command. Revoke it and use a new disposable bot through hidden input.
- Gateway disconnected: run `ned doctor`, then `ned repair`.
- Bot does not answer: send `hello`, approve the fresh code with `ned pair <code>`, and retry.
- Cleanup blocked: retry `ned destroy --yes`; do not clear local ownership state manually.
