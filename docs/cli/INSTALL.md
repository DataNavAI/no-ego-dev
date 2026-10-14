# Install the NED CLI

```bash
curl -fsSL https://raw.githubusercontent.com/DataNavAI/no-ego-dev/main/scripts/install.sh | bash
ned --help
```

The canonical installer verifies pinned private Node.js and package downloads, serializes installation, and activates complete generations atomically. It does not request credentials or provision workspaces. Use a reviewed commit SHA instead of `main` for reproducible installation. Reruns verify the existing generation and repair PATH configuration.

Use `ned task init` to initialize local project work, `ned ready` to find available tasks, and `ned com` for the local project browser. The launcher delegates directly to the installed CLI and does not look up, prompt for, store, or retry cloud credentials. Existing legacy local state and credential files are left untouched.

The installer runs the locked production dependency installation, including the SQLite native module's install script. If a prebuilt binary is unavailable, its source build requires the platform's compiler/Python toolchain; a failed dependency installation stops activation and preserves the prior generation.

See [quickstart](QUICKSTART.md) and [task commands](../tasks.md).
