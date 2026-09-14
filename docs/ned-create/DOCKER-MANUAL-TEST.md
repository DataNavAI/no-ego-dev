# Manual Docker setup test

This is the live acceptance test for a complete `ned create` setup in a fresh container. It is intentionally **not** part of CI and never runs automatically because it provisions Daytona and requires interactive ChatGPT OAuth plus a disposable Telegram bot token.

## Preconditions

- Docker Desktop is running.
- The owner-only Daytona credential file exists at `~/.config/no-ego-dev/secrets/daytona_api_key`. The runner never reads or exports it; it mounts the containing owner-only directory read-only at the container runtime path. Do not paste it into chat or commit it.
- A disposable Telegram bot token is available from BotFather. Use NED's hidden prompt; do not pass it in argv, Docker `--env`, files, URLs, or logs.
- ChatGPT OAuth can be completed interactively.

## Run

From the repository root:

```bash
./scripts/qa/docker-create-smoke.sh
```

The runner persists the ChatGPT OAuth store at `~/.config/no-ego-dev/secrets/hermes_auth.json` (mode `600`) and mounts only that file into the disposable container. After first authorization, later runs reuse or refresh it. It also persists NED ownership state at `~/.config/no-ego-dev/secrets/state/` (mode `700`) so the workspace can be cleaned up after the disposable container exits.

The script builds `docker/ned-create.Dockerfile` from the current checkout and runs as
the invoking user. It mounts `/tmp/ned-home` and its `.hermes` OAuth parent as user-owned
temporary filesystems before adding nested credential, OAuth, and state mounts, so the
runtime can create its own non-secret HOME directories.

```text
ned create --verbose
```

After a successful create, clean up with:

```bash
docker run --rm --init \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp/ned-home \
  --tmpfs "/tmp/ned-home:uid=$(id -u),gid=$(id -g),mode=700" \
  --volume "$HOME/.config/no-ego-dev/secrets:/tmp/ned-home/.config/no-ego-dev/secrets:ro" \
  --volume "$HOME/.config/no-ego-dev/secrets/state:/tmp/ned-home/.ned:rw" \
  no-ego-dev/ned-create-manual:local destroy --yes
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
