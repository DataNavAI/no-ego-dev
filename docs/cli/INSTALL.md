# Install the NED CLI

```bash
curl -fsSL https://raw.githubusercontent.com/DataNavAI/no-ego-dev/main/scripts/install.sh | bash
ned --help
```

The canonical installer verifies pinned private Node.js and package downloads, serializes installation, and activates complete generations atomically. It does not request credentials or provision workspaces. Use a reviewed commit SHA instead of `main` for reproducible installation. Reruns verify the existing generation and repair PATH configuration.

V0 has no workspace provisioning command. Existing saved Daytona workspaces support chat, doctor, pairing, repair, and explicit destroy. Those commands require Daytona authorization; help, version, and telemetry do not. The launcher reads the named macOS Keychain item or accepts hidden TTY input and stores fallback credentials with owner-only permissions.

See [credential recovery and cleanup](CREDENTIALS.md).
