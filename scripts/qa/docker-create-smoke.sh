#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${NED_DOCKER_IMAGE:-no-ego-dev/ned-create-manual:local}"
SECRETS_DIR="${NED_SECRETS_DIR:-$HOME/.config/no-ego-dev/secrets}"
DAYTONA_KEY_FILE="$SECRETS_DIR/daytona_api_key"
HERMES_AUTH_FILE="${NED_HERMES_AUTH_FILE:-$SECRETS_DIR/hermes_auth.json}"
STATE_DIR="${NED_STATE_DIR:-$SECRETS_DIR/state}"

if [[ -z "${DAYTONA_API_KEY:-}" && -r "$DAYTONA_KEY_FILE" ]]; then
  DAYTONA_API_KEY="$(<"$DAYTONA_KEY_FILE")"
  export DAYTONA_API_KEY
fi

if [[ -z "${DAYTONA_API_KEY:-}" ]]; then
  printf 'Set DAYTONA_API_KEY or store it at %s; it is passed only to the container runtime.\n' "$DAYTONA_KEY_FILE" >&2
  exit 2
fi

umask 077
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
if [[ ! -e "$HERMES_AUTH_FILE" ]]; then
  if [[ -f "$HOME/.hermes/auth.json" ]]; then
    cp "$HOME/.hermes/auth.json" "$HERMES_AUTH_FILE"
  else
    printf '{}\n' > "$HERMES_AUTH_FILE"
  fi
  chmod 600 "$HERMES_AUTH_FILE"
fi

printf 'Building a fresh NED create test image: %s\n' "$IMAGE"
docker build \
  --file "$ROOT_DIR/docker/ned-create.Dockerfile" \
  --tag "$IMAGE" \
  "$ROOT_DIR"

cat <<'INFO'

The container will now run `ned create --verbose` interactively.
- Complete ChatGPT OAuth when prompted.
- Paste the disposable Telegram token only into NED's hidden prompt.
- The token is not an environment variable, Docker argument, file, or log value.
- NED must finish or fail closed; after the result, rerun `ned destroy --yes` if a workspace was created.

INFO

exec docker run --rm --init --interactive --tty \
  --env DAYTONA_API_KEY \
  --volume "$HERMES_AUTH_FILE:/root/.hermes/auth.json:rw" \
  --volume "$STATE_DIR:/root/.ned:rw" \
  "$IMAGE" create --verbose
