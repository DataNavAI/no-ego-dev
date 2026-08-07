# One-line NED bootstrap

On a supported macOS or Linux x64/arm64 computer, open a terminal and run:

```bash
i=$(mktemp) && curl -fsSL https://raw.githubusercontent.com/DataNavAI/no-ego-dev/f466f0f62daded463a2b43152bab353067ece2d8/scripts/install.sh -o "$i" && { echo "46d34474a61ae8ee1452ced5b146d35abe916f595d8f02876f3b882e10d972a7  $i" | sha256sum -c - 2>/dev/null || echo "46d34474a61ae8ee1452ced5b146d35abe916f595d8f02876f3b882e10d972a7  $i" | shasum -a 256 -c -; } && bash "$i"; s=$?; rm -f "$i"; (exit "$s")
```

The command downloads first and executes only bytes matching the displayed installer SHA-256, so a changed mutable response cannot run. Only the operating system's `bash`, `curl`, `tar`, and SHA-256 utility are used. The installer does **not** use `sudo`, `git`, or a system Node.js/npm. It installs a private Node.js 22.14.0 runtime and NED revision `baa72d48640d9fe2e927d1eb7c852a0c3fba4ca0` under `~/.local/share/ned`, verifies both archives with pinned SHA-256 values, installs lockfile-pinned dependencies, manages an exact PATH block in `~/.profile`, `~/.zprofile`, and `~/.bashrc`, and starts `ned create`.

On macOS, the launcher first reads Keychain service `no-ego-dev/daytona`, account `DAYTONA_API_KEY`. Otherwise, enter a Daytona API key created at <https://app.daytona.io/dashboard/keys> with only `write:sandboxes`, `delete:sandboxes`, and `manage:secrets` through hidden TTY input. The key is never placed in command arguments or installer output; non-Keychain fallback storage is `~/.config/ned/daytona-api-key` with owner-only mode `600`.

Model access defaults to ChatGPT OAuth through Hermes provider `openai-codex`. NED reuses `HERMES_HOME/auth.json` only when it is an unambiguous, owner-only, user-owned, non-symlink Hermes OAuth store. Otherwise it opens the fixed `https://auth.openai.com/codex/device` page and displays a short device code. NED runs no loopback callback. Refresh tokens stay in the local Hermes-compatible auth store; only a current access token enters an exact `chatgpt.com`-scoped Daytona Secret, and the Sandbox stores only Daytona's opaque placeholder. `chat`, `doctor`, and `repair` refresh locally and update that exact Secret before remote use. OpenRouter is not required or prompted.

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
