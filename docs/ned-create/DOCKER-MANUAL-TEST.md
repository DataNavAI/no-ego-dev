# Manual Docker setup test

This is the live acceptance test for a complete `ned create` setup in a fresh container. It is intentionally **not** part of CI and never runs automatically because it provisions Daytona and requires interactive ChatGPT OAuth plus a disposable Telegram bot token.

## Preconditions

- Docker Desktop is running.
- `DAYTONA_API_KEY` is stored at `~/.config/no-ego-dev/secrets/daytona_api_key` (mode `600`).
- The disposable Telegram token is stored at `~/.config/no-ego-dev/secrets/telegram_bot_token` (mode `600`).
- The secret directory uses mode `700`; `expect` is installed for the local hidden-TTY relay.
- ChatGPT OAuth can be completed interactively if the cached authorization expires.

The runner reads both values locally without printing them. It injects the Daytona key only into Docker's named runtime environment slot, and sends the Telegram token only to NED's hidden TTY prompt; the Telegram token is never mounted, exported to Docker, passed in argv, or logged.

## Run

From the repository root:

```bash
./scripts/qa/docker-create-live.sh
```

The runner persists the ChatGPT OAuth store at `~/.config/no-ego-dev/secrets/hermes_auth.json` (mode `600`) and mounts only that file into the disposable container. After first authorization, later runs reuse or refresh it. It also persists NED ownership state at `~/.config/no-ego-dev/secrets/state/` (mode `700`) so the workspace can be cleaned up after the disposable container exits.

The script builds `docker/ned-create.Dockerfile` from the current checkout and runs `ned create --verbose` in a PTY. After create succeeds, test the bot's first response, run `ned repair` from the same image/state, test a second response, then run `ned destroy --yes` and verify provider readback. `QA.md` is the canonical acceptance/evidence runbook.

## Acceptance criteria

1. The container builds from a clean Node 22 image.
2. `ned create --verbose` reaches the real Daytona/Telegram setup path.
3. Verbose output contains stage diagnostics but no token-shaped value.
4. The resulting workspace reaches the documented ready state, or the command fails with a redacted actionable error.
5. If a workspace was created, run `ned destroy --yes` from the same container image or use the normal recovery path and verify cleanup.
6. The token is revoked in BotFather after the test.

The normal unit/integration suite must remain credential-free. Tests use synthetic token-shaped fixtures and provider doubles only; this script is the manual live boundary.
