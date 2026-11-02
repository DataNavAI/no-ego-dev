# NED runtime storage

NED CLI, COM and the native Hermes secret tool share an agent-selected runtime root. Installation paths and gateway identity are separate.

Selection, in order:

1. NED_AGENT_HOME: absolute agent directory; runtime files go under its .ned subdirectory.
2. An active Hermes terminal marker (HERMES_SESSION_ID, HERMES_SESSION_KEY or HERMES_SESSION_PLATFORM): HERMES_HOME, or OS ~/.hermes when unset. Hermes wins over inherited Codex markers.
3. An active Codex marker (CODEX_THREAD_ID or CODEX_SESSION_ID): CODEX_HOME, or OS ~/.codex when unset. CODEX_HOME need not be set in actual Codex sessions.
4. Without active markers, exactly one configured HERMES_HOME/CODEX_HOME selects that directory. Both configured is ambiguous: set NED_AGENT_HOME.
5. No agent context: OS ~/.ned retains standalone compatibility.

The selected environment root must be a nonempty absolute directory path, not a URL or symlink. Invalid selected roots fail without fallback. Missing directories are initialized privately when needed for writes. Existing private-store ownership checks still apply; this is not a sandbox against other processes running as the same OS user. Lower-priority roots do not override an explicit selection. Selection never guesses from installed directories, current working directory or parent process.

Within the selected <agent-home>/.ned:

- ned.sqlite: task/project registry, work and activity events;
- hub-credentials/: private per-origin Hub login;
- logs/com-<pid>.jsonl: COM diagnostics;
- telemetry.json: opt-in configuration and installation identity;
- secrets/: encrypted vault, master key and managed plaintext files/ exports.

For example, export NED_AGENT_HOME=/absolute/agent-directory before running both ned task and ned com. An active default Codex session uses ~/.codex/.ned; default Hermes uses ~/.hermes/.ned; a selected Hermes profile uses <profile>/.ned. These stores are distinct even for the same project. Actor/project IDs do not synchronize stores.

--database > NED_DATABASE_URL > selected runtime's ned.sqlite. Database overrides affect only task/project/activity storage, never credentials, logs, telemetry or secrets. Programmatic APIs' injected home option remains an explicit legacy storage override for callers/tests and ignores ambient agent markers. Runtime APIs also accept an injected env. Do not pass OS home as that override unless deliberately opting out of detection.

COM gateway settings continue to use the selected Hermes profile (HERMES_HOME or OS ~/.hermes), independently of NED_AGENT_HOME/CODEX_HOME. Project display labels use OS home, not the automatically selected runtime directory. The native Hermes plugin binds its CLI child's NED_AGENT_HOME to hermes_constants.get_hermes_home() when no operator override is present, avoiding inherited Codex-marker confusion. Without the Hermes package it supports explicit HERMES_HOME or standalone HOME fallback for synthetic/legacy integrations.

## Existing installations

No old databases, authentication or secrets are automatically copied, imported, deleted or overwritten. Switching to agent-isolated storage starts a new store. COM initializes an empty task database on first start without importing projects; initialize projects again, sign in to Hub again, and save needed secrets explicitly through Settings. Telemetry consent is per store. Prior stores remain intact. Do not copy credentials/secrets casually or regenerate the master key for an existing vault.

If you deliberately want the old shared ~/.ned store, set NED_AGENT_HOME="$HOME" for every CLI/COM invocation that should reuse it. This is explicit sharing, not migration. To share only a task database, use the existing --database/NED_DATABASE_URL override instead.

The CLI/Node installation remains under the real OS HOME's .local/share/ned (or existing explicit installation overrides/PATH). Installer, Node/cache ownership, default skills rollout, project files and .nedcom.json are not relocated. Do not set HOME to an agent directory in production merely to choose NED storage.

Contract and executable coverage: [agent runtime home spec](../features/agent-runtime-home/SPEC.md).
