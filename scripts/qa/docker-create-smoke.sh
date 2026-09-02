#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${NED_DOCKER_IMAGE:-no-ego-dev/ned-create-manual:local}"
SECRETS_DIR="${NED_SECRETS_DIR:-$HOME/.config/no-ego-dev/secrets}"
DAYTONA_KEY_FILE="$SECRETS_DIR/daytona_api_key"
HERMES_AUTH_FILE="${NED_HERMES_AUTH_FILE:-$SECRETS_DIR/hermes_auth.json}"
STATE_DIR="${NED_STATE_DIR:-$SECRETS_DIR/state}"

if [[ ! -r "$DAYTONA_KEY_FILE" ]]; then
  printf 'The owner-only Daytona runtime credential file is required at %s.\n' "$DAYTONA_KEY_FILE" >&2
  exit 2
fi

umask 077
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
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp/ned-home \
  --tmpfs "/tmp/ned-home:uid=$(id -u),gid=$(id -g),mode=700" \
  --volume "$SECRETS_DIR:/tmp/ned-home/.config/no-ego-dev/secrets:ro" \
  --volume "$HERMES_AUTH_FILE:/tmp/ned-home/.hermes/auth.json:rw" \
  --volume "$STATE_DIR:/tmp/ned-home/.ned:rw" \
  "$IMAGE" create --verbose
