#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

NODE_VERSION=22.14.0
NED_REVISION=e4c569de4e13cd5c7bf40d90d44d06bbff790713
NED_SOURCE_SHA256=78bbfeeee8d98a7b8dadf3c260e849f1644587d43a656983f0ab9035924e7225
readonly NODE_VERSION NED_REVISION NED_SOURCE_SHA256

INSTALL_ROOT="${HOME:?HOME must be set}/.local/share/ned"
BIN_DIR="$HOME/.local/bin"
CONFIG_DIR="$HOME/.config/ned"
CREDENTIAL_FILE="$CONFIG_DIR/daytona-api-key"
CURRENT="$INSTALL_ROOT/current"
CREATE_MARKER="$INSTALL_ROOT/create-complete"
LOCK_FILE="/tmp/ned-install-${UID:-$(id -u)}.lock"

fail() {
  printf 'NED installer: %s\n' "$1" >&2
  exit 1
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d ' ' -f 1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d ' ' -f 1
  else
    fail 'SHA-256 utility missing (expected sha256sum on Linux or shasum on macOS).'
  fi
}

verify_archive() {
  local file=$1 expected=$2 actual
  actual=$(sha256_file "$file")
  [[ "$actual" == "$expected" ]] || fail 'download integrity verification failed; nothing was installed.'
}

app_tree_sha256() {
  local app_dir=$1 archive=$2
  rm -f "$archive"
  tar -cf "$archive" -C "$(dirname "$app_dir")" "$(basename "$app_dir")"
  sha256_file "$archive"
}

repair_profile() {
  local profile=$1 temporary= line in_block=0 profile_mode=
  if [[ -e "$profile" ]]; then
    case "$platform" in
      darwin-*) profile_mode=$(stat -f '%Lp' "$profile") ;;
      linux-*) profile_mode=$(stat -c '%a' "$profile") ;;
    esac
  fi
  temporary=$(mktemp "$profile.ned.XXXXXX")
  chmod 600 "$temporary"
  if [[ -f "$profile" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" == '# >>> NED user commands >>>' ]]; then
        in_block=1
        continue
      fi
      if [[ "$line" == '# <<< NED user commands <<<' ]]; then
        in_block=0
        continue
      fi
      [[ "$in_block" == 1 ]] || printf '%s\n' "$line" >>"$temporary"
    done <"$profile"
  fi
  printf '%s\n' '# >>> NED user commands >>>' 'export PATH="$HOME/.local/bin:$PATH"' '# <<< NED user commands <<<' >>"$temporary"
  [[ -z "$profile_mode" ]] || chmod "$profile_mode" "$temporary"
  mv -f "$temporary" "$profile"
}

repair_path() {
  local profile
  for profile in "$HOME/.profile" "$HOME/.zprofile" "$HOME/.bashrc"; do
    repair_profile "$profile"
  done
}

write_launcher() {
  local destination=$1
  cat >"$destination" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
exec "${HOME:?}/.local/share/ned/current/runtime/bin/node" "${HOME}/.local/share/ned/ned-launcher.js" "$@"
LAUNCHER
  chmod 755 "$destination"
}

installation_valid() {
  local generation manifest key value app_tree_actual
  local manifest_node= manifest_revision= manifest_runtime= manifest_app= manifest_app_tree= manifest_lock= manifest_launcher=
  [[ -L "$CURRENT" && -x "$BIN_DIR/ned" && -f "$INSTALL_ROOT/ned-launcher.js" && -f "$INSTALL_ROOT/launcher-runtime.js" ]] || return 1
  generation="$CURRENT"
  manifest="$generation/install-manifest"
  [[ -f "$manifest" && -x "$generation/runtime/bin/node" && -f "$generation/app/bin/ned.js" && -f "$generation/app/bin/ned-launcher.js" && -f "$generation/app/package-lock.json" ]] || return 1
  while IFS='=' read -r key value; do
    case "$key" in
      node_version) manifest_node=$value ;;
      revision) manifest_revision=$value ;;
      runtime_sha256) manifest_runtime=$value ;;
      app_sha256) manifest_app=$value ;;
      app_tree_sha256) manifest_app_tree=$value ;;
      lock_sha256) manifest_lock=$value ;;
      launcher_sha256) manifest_launcher=$value ;;
      *) return 1 ;;
    esac
  done <"$manifest"
  [[ "$manifest_node" == "$NODE_VERSION" && "$manifest_revision" == "$NED_REVISION" ]] || return 1
  [[ "$manifest_runtime" =~ ^[a-f0-9]{64}$ && "$manifest_app" =~ ^[a-f0-9]{64}$ && "$manifest_app_tree" =~ ^[a-f0-9]{64}$ && "$manifest_lock" =~ ^[a-f0-9]{64}$ && "$manifest_launcher" =~ ^[a-f0-9]{64}$ ]] || return 1
  [[ "$("$generation/runtime/bin/node" --version 2>/dev/null)" == "v$NODE_VERSION" ]] || return 1
  [[ "$(sha256_file "$generation/runtime/bin/node")" == "$manifest_runtime" ]] || return 1
  [[ "$(sha256_file "$generation/app/bin/ned.js")" == "$manifest_app" ]] || return 1
  [[ "$(sha256_file "$generation/app/package-lock.json")" == "$manifest_lock" ]] || return 1
  app_tree_actual=$(app_tree_sha256 "$generation/app" "$tmp/app-validation.tar") || return 1
  [[ "$app_tree_actual" == "$manifest_app_tree" ]] || return 1
  [[ "$(sha256_file "$BIN_DIR/ned")" == "$manifest_launcher" ]] || return 1
}

platform=
case "$(uname -s):$(uname -m)" in
  Darwin:arm64) platform=darwin-arm64 ;;
  Darwin:x86_64) platform=darwin-x64 ;;
  Linux:aarch64|Linux:arm64) platform=linux-arm64 ;;
  Linux:x86_64) platform=linux-x64 ;;
  *) fail "unsupported platform: $(uname -s) $(uname -m)" ;;
esac

case "$platform" in
  darwin-arm64) node_sha=e9404633bc02a5162c5c573b1e2490f5fb44648345d64a958b17e325729a5e42 ;;
  darwin-x64) node_sha=6698587713ab565a94a360e091df9f6d91c8fadda6d00f0cf6526e9b40bed250 ;;
  linux-arm64) node_sha=8cf30ff7250f9463b53c18f89c6c606dfda70378215b2c905d0a9a8b08bd45e0 ;;
  linux-x64) node_sha=9d942932535988091034dc94cc5f42b6dc8784d6366df3a36c4c9ccb3996f0c2 ;;
  *) fail "unsupported platform: $platform" ;;
esac
# Integrity manifest (kept explicit for review):
# darwin-arm64:e9404633bc02a5162c5c573b1e2490f5fb44648345d64a958b17e325729a5e42
# darwin-x64:6698587713ab565a94a360e091df9f6d91c8fadda6d00f0cf6526e9b40bed250
# linux-arm64:8cf30ff7250f9463b53c18f89c6c606dfda70378215b2c905d0a9a8b08bd45e0
# linux-x64:9d942932535988091034dc94cc5f42b6dc8784d6366df3a36c4c9ccb3996f0c2

node_url="https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-$platform.tar.gz"
source_url="https://codeload.github.com/DataNavAI/no-ego-dev/tar.gz/$NED_REVISION"
source_sha=$NED_SOURCE_SHA256

lock_candidate=$(mktemp "/tmp/ned-install-lock.${UID:-$(id -u)}.XXXXXX")
printf '%s\n' "$$" >"$lock_candidate"
if ! ln "$lock_candidate" "$LOCK_FILE" 2>/dev/null; then
  rm -f "$lock_candidate"
  fail "another installation is in progress or left a stale lock at $LOCK_FILE; remove it only after confirming no installer is running."
fi
rm -f "$lock_candidate"
tmp=
staging=
launcher_staging=
launcher_source_staging=
launcher_runtime_staging=
activation_pending=0
old_current=
cleanup() {
  status=$1
  trap - EXIT HUP INT TERM
  unset DAYTONA_API_KEY 2>/dev/null || true
  if [[ "$activation_pending" == 1 ]]; then
    if [[ -n "$old_current" ]]; then
      ln -s "$old_current" "$INSTALL_ROOT/.current-rollback.$$" 2>/dev/null || true
      mv -f "$INSTALL_ROOT/.current-rollback.$$" "$CURRENT" 2>/dev/null || true
    else
      rm -f "$CURRENT"
    fi
  fi
  [[ -n "$staging" ]] && rm -rf "$staging"
  [[ -n "$launcher_staging" ]] && rm -f "$launcher_staging"
  [[ -n "$launcher_source_staging" ]] && rm -f "$launcher_source_staging"
  [[ -n "$launcher_runtime_staging" ]] && rm -f "$launcher_runtime_staging"
  [[ -n "$tmp" ]] && rm -rf "$tmp"
  lock_pid=
  [[ -f "$LOCK_FILE" ]] && IFS= read -r lock_pid <"$LOCK_FILE"
  [[ "$lock_pid" == "$$" ]] && rm -f "$LOCK_FILE"
  exit "$status"
}
trap 'cleanup $?' EXIT
trap 'cleanup 129' HUP
trap 'cleanup 130' INT
trap 'cleanup 143' TERM
tmp=$(mktemp -d "${TMPDIR:-/tmp}/ned-install.XXXXXX")

if installation_valid; then
  repair_path
  printf 'NED %s is already installed. Run: ned create\n' "$NED_REVISION"
  exit 0
else
  install_ready=0
  if [[ -e "$CURRENT" || -e "$BIN_DIR/ned" ]]; then
    printf 'Existing installation integrity mismatch; reinstalling pinned files.\n'
  fi
fi

if [[ "$install_ready" != 1 ]]; then
  printf 'Installing pinned private Node.js %s and NED %s...\n' "$NODE_VERSION" "$NED_REVISION"
  curl -fsSL "$node_url" -o "$tmp/node.tar.gz"
  verify_archive "$tmp/node.tar.gz" "$node_sha"
  curl -fsSL "$source_url" -o "$tmp/ned.tar.gz"
  verify_archive "$tmp/ned.tar.gz" "$source_sha"

  mkdir -p "$INSTALL_ROOT/generations"
  staging="$INSTALL_ROOT/.staging.$$"
  mkdir "$staging" "$staging/runtime" "$staging/app"
  tar -xzf "$tmp/node.tar.gz" -C "$staging/runtime" --strip-components=1
  [[ "$("$staging/runtime/bin/node" --version)" == "v$NODE_VERSION" ]] || fail 'downloaded Node.js version did not match the pin.'
  tar -xzf "$tmp/ned.tar.gz" -C "$staging/app" --strip-components=1
  [[ -f "$staging/app/package-lock.json" && -f "$staging/app/bin/ned.js" && -f "$staging/app/bin/ned-launcher.js" ]] || fail 'NED source archive is incomplete.'
  (
    cd "$staging/app"
    PATH="$staging/runtime/bin:$PATH" "$staging/runtime/bin/npm" ci --omit=dev --ignore-scripts --no-audit --no-fund
  )

  write_launcher "$staging/ned-launcher"
  launcher_source_staging="$INSTALL_ROOT/.ned-launcher.$$"
  cp "$staging/app/bin/ned-launcher.js" "$launcher_source_staging"
  chmod 600 "$launcher_source_staging"
  launcher_runtime_staging="$INSTALL_ROOT/.launcher-runtime.$$"
  cp "$staging/app/src/launcher.js" "$launcher_runtime_staging"
  chmod 600 "$launcher_runtime_staging"
  runtime_sha=$(sha256_file "$staging/runtime/bin/node")
  app_sha=$(sha256_file "$staging/app/bin/ned.js")
  app_tree_sha=$(app_tree_sha256 "$staging/app" "$tmp/app-install.tar")
  lock_sha=$(sha256_file "$staging/app/package-lock.json")
  launcher_sha=$(sha256_file "$staging/ned-launcher")
  printf 'node_version=%s\nrevision=%s\nruntime_sha256=%s\napp_sha256=%s\napp_tree_sha256=%s\nlock_sha256=%s\nlauncher_sha256=%s\n' \
    "$NODE_VERSION" "$NED_REVISION" "$runtime_sha" "$app_sha" "$app_tree_sha" "$lock_sha" "$launcher_sha" >"$staging/install-manifest"

  repair_path
  mkdir -p "$BIN_DIR"
  launcher_staging="$BIN_DIR/.ned.$$"
  cp "$staging/ned-launcher" "$launcher_staging"
  chmod 755 "$launcher_staging"

  generation_name="generation-$NODE_VERSION-$NED_REVISION-$(date +%s)-$$"
  generation="$INSTALL_ROOT/generations/$generation_name"
  mv "$staging" "$generation"
  staging=
  [[ ! -e "$CURRENT" || -L "$CURRENT" ]] || fail "conflicting path is not an installation pointer: $CURRENT"
  [[ ! -d "$BIN_DIR/ned" ]] || fail "conflicting path is a directory: $BIN_DIR/ned"
  if [[ -L "$CURRENT" ]]; then old_current=$(readlink "$CURRENT"); fi
  ln -s "generations/$generation_name" "$INSTALL_ROOT/.current.$$"
  activation_pending=1
  rm -f "$CURRENT"
  mv "$INSTALL_ROOT/.current.$$" "$CURRENT"
  mv -f "$launcher_source_staging" "$INSTALL_ROOT/ned-launcher.js"
  launcher_source_staging=
  mv -f "$launcher_runtime_staging" "$INSTALL_ROOT/launcher-runtime.js"
  launcher_runtime_staging=
  mv -f "$launcher_staging" "$BIN_DIR/ned"
  launcher_staging=
  activation_pending=0
fi

printf 'NED installed under %s (no sudo or system Node.js used).\n' "$INSTALL_ROOT"
printf 'Next step: run `ned create` to connect Daytona, ChatGPT, and Telegram and create your private workspace.\n'
printf 'If `ned create` fails, rerun it with `--verbose` for redacted stage diagnostics.\n'
printf 'Install complete. Open a new shell, or run: export PATH="$HOME/.local/bin:$PATH"\n'
