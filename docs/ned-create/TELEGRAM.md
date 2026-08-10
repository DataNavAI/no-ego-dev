# Telegram setup and owner pairing

Canonical public page: https://ned.datanav.app/docs/v1/telegram/

## Create a disposable bot

Do not reuse or disrupt an existing production Telegram bot.

1. Open https://t.me/BotFather.
2. Send `/newbot`.
3. Choose a display name.
4. Choose a unique username ending in `bot`.
5. Copy the token and return to the exact hidden prompt: `Paste the Telegram bot token (input hidden): `.

NED never accepts the token through argv, shell history, chat, logs, analytics, screenshots, source, fixtures, or product-controlled URLs/query strings. Telegram's provider-mandated token-in-path `getMe` request stays in-process; errors are replaced with fixed recovery text. Only a validated bot username is displayed.

## Start and pair

1. Open the exact verified `https://t.me/<username>` link printed by NED.
2. Tap **Start**.
3. Send `hello`.
4. If Hermes returns an 8-character pairing code, run `ned pair <code>`.
5. Return to the bot and send `hello` again.

The pinned Hermes adapter uses polling by default, deletes stale webhook state before polling, and keeps direct-message owner pairing enabled. NED does not configure webhook mode. Pairing state survives gateway and Sandbox restarts.

## Recovery

- Invalid or revoked token: revoke the disposable bot with BotFather, destroy the installation, and create a new disposable bot.
- No reply: run `ned doctor`, then `ned repair`.
- Expired pairing code: send `hello` for a fresh code and rerun `ned pair <code>`.

See [Credentials, revocation, destroy, and troubleshooting](CREDENTIALS.md).

## Manual live acceptance controller

For release QA, use the repository-only controller from the exact candidate checkout:

```bash
node scripts/qa/live-telegram-acceptance.js
```

The controller runs the real `ned create`, prints a readiness marker only after the
gateway is ready, and remains alive while the operator tests the disposable bot. It
accepts only these control words; it never reads or records message text:

1. Send a fresh `hello` to the disposable bot and visually confirm the first reply.
2. Enter `first-response-confirmed` in the controller.
3. The controller runs `ned repair`, reinjecting the runtime-only token, and prints
   the second readiness marker.
4. Send a distinct second message and confirm the second reply.
5. Enter `second-response-confirmed`.

The controller always runs `ned destroy --yes` in its cleanup path, including timeout,
abort, failed repair, or interrupted acceptance. Do not treat readiness or a worker
notification as response evidence. Store no bot token in shell arguments or files;
the CLI obtains it through the approved hidden/keychain path.
