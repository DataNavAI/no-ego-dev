#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS_DIR="${NED_SECRETS_DIR:-$HOME/.config/no-ego-dev/secrets}"
DAYTONA_KEY_FILE="$SECRETS_DIR/daytona_api_key"
TELEGRAM_TOKEN_FILE="$SECRETS_DIR/telegram_bot_token"
HERMES_AUTH_FILE="${NED_HERMES_AUTH_FILE:-$SECRETS_DIR/hermes_auth.json}"
STATE_DIR="${NED_STATE_DIR:-$SECRETS_DIR/state}"
IMAGE="${NED_DOCKER_IMAGE:-no-ego-dev/ned-create-live:local}"

for secret_file in "$DAYTONA_KEY_FILE" "$TELEGRAM_TOKEN_FILE"; do
  if [[ ! -r "$secret_file" ]]; then
    printf 'Missing required owner-only live-QA secret file: %s\n' "$secret_file" >&2
    exit 2
  fi
  if [[ "$(stat -f '%Lp' "$secret_file")" != '600' ]]; then
    printf 'Live-QA secret file must use mode 0600: %s\n' "$secret_file" >&2
    exit 2
  fi
done

if [[ "$(stat -f '%Lp' "$SECRETS_DIR")" != '700' ]]; then
  printf 'Live-QA secret directory must use mode 0700: %s\n' "$SECRETS_DIR" >&2
  exit 2
fi

umask 077
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
if [[ ! -e "$HERMES_AUTH_FILE" ]]; then
  printf '{}\n' > "$HERMES_AUTH_FILE"
  chmod 600 "$HERMES_AUTH_FILE"
fi

export DAYTONA_API_KEY="$(<"$DAYTONA_KEY_FILE")"
export TELEGRAM_BOT_TOKEN="$(<"$TELEGRAM_TOKEN_FILE")"
export NED_DOCKER_IMAGE="$IMAGE"
export NED_HERMES_AUTH_FILE="$HERMES_AUTH_FILE"
export NED_STATE_DIR="$STATE_DIR"

docker build --file "$ROOT_DIR/docker/ned-create.Dockerfile" --tag "$IMAGE" "$ROOT_DIR"
exec "$ROOT_DIR/scripts/qa/docker-create-live.expect"
