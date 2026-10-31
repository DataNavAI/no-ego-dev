# Share a secret with NED

Open COM → Settings → Secrets. Enter Key (for example ADMIN_PASSWORD) and Value, then Save secret. Tell NED the key name only. Show reveals a stored value temporarily; Replace saves a new value; Delete removes it. The vault belongs to this OS user/instance and is shared across projects.

CLI (from a checkout use `node bin/ned.js` instead of `ned`):

```bash
ned secret list
ned secret set ADMIN_PASSWORD --stdin < /private/input-file
ned secret get ADMIN_PASSWORD --file
ned secret delete ADMIN_PASSWORD
```

`get --file` returns only a private file path; let the consuming tool read it directly. The file contains exact value bytes and persists until replacement/deletion. Do not cat it into a tool transcript. `ned secret get ADMIN_PASSWORD` deliberately outputs the value: use only when the consumer captures stdout privately, never paste it into chat/logs. Avoid shell tracing and command-line value arguments. `set --stdin` preserves trailing newlines; use an input file with the exact desired bytes. CLI supports `--json` for metadata operations and file-path output, but not raw value reads.

Vault: `~/.ned/secrets/vault.sqlite`, encryption key `master.key`, managed plaintext exports `files/`. Directories0700, files0600, POSIX/macOS/Linux. Back up vault/key privately together while NED is stopped; preserve ownership/modes. Losing the master key makes values unrecoverable. Do not delete/regenerate it to repair a failure. Retain encrypted DB backups safely; prior values can remain in SQLite pages/backups after deletion. This is logical removal, not forensic erasure.

The local account, authorized COM/Hub users and browser origin are trusted. It is not per-project tenant isolation. Use local COM or the authenticated Hub connection. This port does not add a public tunnel or `ned com --public`; embedders can disable every secret endpoint with `secretsEnabled:false`. Encryption does not protect against same-user processes or backups containing both key and DB. Never commit vault files or copied exports. Existing sessions do not auto-redact secrets: give NED key names, and keep raw output out of chat.

Development checkout changes do not automatically upgrade an installed `ned` or restart an existing COM process. Until this candidate is released, run `node bin/ned.js secret ...` and start COM from this checkout. Do not run the release installer expecting it to include uncommitted files.

## Ask Hermes to share a password in chat

The profile archive includes native plugin `plugins/ned`. Enable it explicitly with
`plugins.enabled: [ned]` and toolset `ned` (including any configured platform toolsets).
This port does not change existing profile configuration or running sessions.
Hermes can obtain a managed path with `ned secret get ADMIN_PASSWORD --file`, then
call:

```json
{"action":"secure_share_secret","path":"/absolute/private/NED/export/path"}
```

The `ned` tool validates that the file exists privately and matches the current
vault value. It returns success plus a15-minute reference; no secret value or path
is returned. COM renders Secret ready with Reveal secret from persisted tool
history after the reply finishes. References survive reload but fail after expiry,
rotation or deletion. They require the same protected COM API as Settings and are
not public sharing links. Hidden/revealed values never join the conversation.

Only NED-managed export files are supported. To share a password stored elsewhere,
first save it in the vault through Settings or CLI stdin, then export it. The tool
does not expose arbitrary local files. Hermes installations need the native
PluginContext.register_tool API. Live native-loader/model acceptance is pending
for this port; subprocess registration tests do not establish live discovery.
The template does not patch Hermes core.

For development, set trusted operator environment `NED_CLI_PATH` to this checkout's
absolute `bin/ned.js` and optionally `NED_NODE_PATH` to its Node executable before
starting Hermes. Otherwise the plugin uses the standard installed NED app/runtime
under `~/.local/share/ned/current`. If the standard CLI is absent, it resolves
`ned` on PATH through symlinks only to an actual `.js` file (for example the
container's `/usr/local/bin/ned` → `/opt/ned/bin/ned.js`) and invokes Node with an
argument array, never a shell. An explicit missing NED_CLI_PATH fails closed and
does not fall back. An older
installed NED without `secret share` fails safely; it must be upgraded before live
use. Copy `plugins/ned` into the chosen Hermes profile's plugins folder and enable
plugin `ned` and toolset `ned`; do not assume archive presence enables the tool.
Existing running sessions/gateways require a fresh load; skills-only deployment
does not install or enable plugins or upgrade the CLI.
