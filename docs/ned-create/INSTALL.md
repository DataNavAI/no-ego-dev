# One-line NED bootstrap

On a supported macOS or Linux x64/arm64 computer, open a terminal and run:

```bash
curl -fsSL https://ned.datanav.app/install.sh | bash
```

The hosted bootstrap downloads the immutable installer at commit `cf4570b2ec46c22b90eb257e504c165c8edb5579` and verifies SHA-256 `581c433a990c1b29a427a9fb227736b482519e983044acd8ea83e3da1f187429` before execution. The installer then verifies pinned private runtime and NED downloads. It does not request credentials or provision a workspace; after installation, run `ned create`.

On macOS, the launcher first reads Keychain service `no-ego-dev/daytona`, account `DAYTONA_API_KEY`. Otherwise, enter a Daytona API key created at <https://app.daytona.io/dashboard/keys> with only `write:sandboxes`, `delete:sandboxes`, and `manage:secrets` through hidden TTY input. The key is never placed in command arguments or installer output; non-Keychain fallback storage is `~/.config/ned/daytona-api-key` with owner-only mode `600`.

Model access defaults to ChatGPT OAuth through Hermes provider `openai-codex`. NED reuses `HERMES_HOME/auth.json` only when it is an unambiguous, owner-only, user-owned, non-symlink Hermes OAuth store. Otherwise it opens the fixed `https://auth.openai.com/codex/device` page and displays a short device code. NED runs no loopback callback. Refresh tokens stay in the local Hermes-compatible auth store; only a current access token enters an exact `chatgpt.com`-scoped Daytona Secret, and the Sandbox stores only Daytona's opaque placeholder. `chat`, `doctor`, and `repair` refresh locally and update that exact Secret before remote use. OpenRouter is not required or prompted.

Telegram is the V1 user surface. NED explains that the user must perform BotFather legal/ownership actions, opens or links <https://t.me/BotFather>, and prints numbered instructions to send `/newbot`, choose a display name, choose a unique username ending in `bot`, and copy the issued token. It then prompts exactly `Paste the Telegram bot token (input hidden):` without echo. On macOS it first checks Keychain service `no-ego-dev/telegram`, account `TELEGRAM_BOT_TOKEN`.

NED never accepts the Telegram token from argv, environment variables, shell history, chat, logs, analytics, screenshots, source, fixtures, or product-controlled URLs/query strings. It validates the bot through in-process Telegram `getMe`, stores only the verified username as safe metadata, and injects the token only at runtime through the Daytona SDK environment channel. Pinned Hermes uses long polling, not a NED webhook. After gateway health succeeds, open the verified bot URL, tap **Start**, send `hello`, and approve any returned owner code with `ned pair <code>`.

Public guides:

- <https://ned.datanav.app/docs/v1/quickstart/>
- <https://ned.datanav.app/docs/v1/telegram/>
- <https://ned.datanav.app/docs/v1/credentials/>

These are stable release URLs represented by the repository web/docs surface. They must return HTTP 200 in the supported clean environment and after deployment before release; this document does not claim they are currently live in production.

Claude Max, Nous Portal, and GitHub Copilot are optional advanced extension points only; they do not appear in first run. Direct API keys are hidden-input advanced fallback only where a provider can support the same security contract.

Rerunning the command is safe: the private Node version and persisted runtime, complete installed app tree, lockfile, and launcher hashes are revalidated before a complete matching installation is reused; `ned create` is not repeated. Installs are serialized, built as complete generations on the destination filesystem, and activated with an atomic `current` pointer while prior complete generations remain available on failure. A failed download integrity check activates no runtime, app, launcher, PATH change, or credential file.

## Cleanup and credential revocation

Delete the hosted workspace first:

```bash
ned destroy --yes
```

Then revoke the Daytona key in the Daytona dashboard and remove local files:

```bash
rm -rf "$HOME/.local/share/ned" "$HOME/.config/ned"
rm -f "$HOME/.local/bin/ned"
```

The exact block between `# >>> NED user commands >>>` and `# <<< NED user commands <<<` can be removed from `~/.profile`, `~/.zprofile`, and `~/.bashrc` if desired.

## Maintainer verification

Installer tests use synthetic local archives and synthetic credentials only. They make no Daytona, ChatGPT, or other cloud calls:

```bash
node --test tests/ned-create/installer.test.js
```

Live hosted lifecycle verification remains gated on separately authorized Daytona credentials and is not part of the deterministic installer suite.
