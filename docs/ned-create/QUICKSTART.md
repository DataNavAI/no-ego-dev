# NED V1 quickstart

Canonical public page: https://ned.datanav.app/docs/v1/quickstart/

## Outcome

The installer creates one private, persistent Daytona Sandbox; connects ChatGPT with Hermes-native OAuth; validates a new Telegram bot; starts the pinned Hermes Telegram gateway; and verifies both inference and gateway readiness.

## Journey

1. Run the immutable one-line installer from `README.md` or `INSTALL.md`.
2. Complete ChatGPT device authorization only if no safe reusable Hermes credential exists.
3. Follow the numbered BotFather actions shown by NED.
4. Enter the Telegram token only at `Paste the Telegram bot token (input hidden): `.
5. Open the verified bot link, tap **Start**, and send `hello`.
6. If Hermes returns an owner-pairing code, run `ned pair <code>` and send `hello` again.

## Recovery

1. Run `ned doctor`.
2. Run `ned repair` to restore the exact saved Sandbox and Telegram gateway session.
3. Use `ned destroy --yes` only when replacement is required; local state clears after direct remote absence readback.

See [Telegram setup](TELEGRAM.md) and [Credentials, revocation, destroy, and troubleshooting](CREDENTIALS.md).
