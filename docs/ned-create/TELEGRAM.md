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
