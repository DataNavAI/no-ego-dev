# Manual Docker setup test

This is the live acceptance test for a complete `ned create` setup in a fresh container. It is intentionally **not** part of CI and never runs automatically because it provisions Daytona and requires interactive ChatGPT OAuth plus a disposable Telegram bot token.

## Preconditions

- Docker Desktop is running.
- `DAYTONA_API_KEY` is present in the host shell. Do not paste it into chat or commit it.
- A disposable Telegram bot token is available from BotFather. Use NED's hidden prompt; do not pass it in argv, Docker `--env`, files, URLs, or logs.
- ChatGPT OAuth can be completed interactively.

## Run

From the repository root:

```bash
export DAYTONA_API_KEY='(load from your secret store; do not commit)'
./scripts/qa/docker-create-smoke.sh
```

The script builds `docker/ned-create.Dockerfile` from the current checkout, starts a fresh container, and runs:

```text
ned create --verbose
```

Complete ChatGPT OAuth and paste the disposable Telegram token only at:

```text
Paste the Telegram bot token (input hidden):
```

## Acceptance criteria

1. The container builds from a clean Node 22 image.
2. `ned create --verbose` reaches the real Daytona/Telegram setup path.
3. Verbose output contains stage diagnostics but no token-shaped value.
4. The resulting workspace reaches the documented ready state, or the command fails with a redacted actionable error.
5. If a workspace was created, run `ned destroy --yes` from the same container image or use the normal recovery path and verify cleanup.
6. The token is revoked in BotFather after the test.

The normal unit/integration suite must remain credential-free. Tests use synthetic token-shaped fixtures and provider doubles only; this script is the manual live boundary.
