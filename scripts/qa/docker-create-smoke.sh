#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${NED_DOCKER_IMAGE:-no-ego-dev/ned-create-manual:local}"

if [[ -z "${DAYTONA_API_KEY:-}" ]]; then
  printf 'DAYTONA_API_KEY must be set in the host shell; it is passed only to the container runtime.\n' >&2
  exit 2
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
  "$IMAGE" create --verbose
