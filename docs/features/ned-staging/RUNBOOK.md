# Local Hermes staging operation proposal

Status: draft; local Hermes profile selected. Controller/wrappers implemented; owner installation and schedule pending. See [SPEC.md](SPEC.md), [TECH.md](TECH.md).

## What will be available

A real native Hermes profile named `ned-staging`, installed from verified immutable main source under an independent local Hermes root. Its owned launch command loads NED SOUL/AGENTS/skills plus independent profile config, sessions, memories and owner-authorized model credentials. Matching task/com CLI uses a staging-only SQLite database and demo projects. Normal `hermes`, active profile/global aliases and global `ned` remain unchanged. Initially only separate stage-owned OpenRouter model access is eligible; Codex/Qwen/external fallbacks are blocked. Model login may require owner action after setup; no normal credentials are copied or borrowed.

| Action | Proposed interface | Result |
| --- | --- | --- |
| Setup | `node bin/ned-staging.js setup --settings <non-secret-json>` | Native profile install, release identities and credential-free prompt/skill proof; readiness URL |
| Inspect | `ned-staging-control status` | Active/source SHA, health, profile probe, last update/check/error |
| Use Hermes | `ned-staging` | Explicit independent root/profile/credential policy; missing auth prompts staging-only action |
| Browse | Open status URL | Loopback NEDCOM synthetic projects; only merged capabilities |
| Edit synthetic tasks | `ned-staging-cli task create "Try staging" --project <alpha-path>` | Explicit staging DB and matching immutable CLI |
| Update once | `ned-staging-control update` | Exact successful main promotion or hold/no-change |
| Stop browsing | Ctrl-C in the communicator/demo terminal | Owned user-started process exits; profile/data retained |
| Rollback | `ned-staging-control rollback` | Full stage profile + matching SQLite + old release restored and verified |
| Remove | `ned-staging-control remove` | Owned automation/service/runtime removed; user profile/data retained by default |

Root creates recurring Codex automation only after setup; pause/resume uses its exact recorded automation ID. Mac sleep/offline delays updates. NEDCOM is user-started; no always-on daemon/gateway is installed. Updates defer while staging agent or communicator sessions are active and never terminate owner work. No public/LAN URL or Telegram gateway is enabled by setup.

## Update semantics and recovery

Finish and close active staging agent/communicator sessions before promotion; controller refuses to overwrite a live profile. Native update replaces owned SOUL/AGENTS/skills, preserving config/auth/.env/memories/sessions and stage DB. Edits inside owned skill files are refreshed from main; user config overrides stay preserved and new template changes are reported as a status boolean. Exact-main CI failure/pending means keep current. Build failure leaves current unchanged. Failed update/probe/readiness restores protected full profile and WAL-aware SQLite backup; failed restore is explicitly unavailable.

After promotion inspect SHA/profile source/digests and fresh runtime prompt/skill result, then URL and retained demo task. Secrets stay in protected local snapshots/auth paths, never receipts, screenshots, chat or repository. Staging GitHub/cloud access is not inherited: guard/isolated GH_CONFIG_DIR/policy are fail-closed, with stage-specific authorization required if later requested.

Implementation must fill verified installed paths, immutable runtime hashes, automation/service IDs, workflow allowlist, actual interface evidence and tested commands/recovery outputs. Disposable native installation/load/terminal evidence is separate; final owner installation and automatic schedule remain pending.

Unsafe preserved provider, auxiliary/fallback, terminal cwd or shell-startup settings cause launch preflight failure. The stage shell wrapper disables normal shell rc and preserves staging PATH; actual native foreground/background and npm probes are recorded separately from adapter tests. Pending transaction blocks agent launch; recovery replays the complete verified paired profile/SQLite snapshot and release, retains snapshots on corruption and reports unavailable. No manual deletion of locks/snapshots or blind retry.

## Concrete test procedure

Non-secret setup JSON specifies canonical absent root; immutable Node/npm paths; installed Hermes Python/source paths; repository DataNavAI/no-ego-dev; requiredWorkflows [NED CLI, Smoke test]; requiredJobs [test (20), test (22), macos-smoke, windows-eval-runner, install-profile]; port4215. Omit modelAuthorized. Setup archives native tracked source into its own runtime, never normal profiles or ignored dotenv.

1. Run setup from reviewed code with explicit settings. Repeat setup returns unchanged; interrupted setup retries while preserving data.
2. Run `<root>/bin/ned-staging-control status`: ready, exact main SHA, model_access=login_required. URL is available only when user-started com runs.
3. Run pinned Node `<root>/projects/alpha/demo-app.mjs` in one terminal (Demo4216); run `<root>/bin/ned-staging-cli com` in another (NEDCOM4215).
4. Open4215, choose Alpha, WIP app, Open app: new tab displays `Synthetic staging app`. Choose Beta: unconfigured, no stale Alpha link. Tasks/artifacts follow merged capability. Record exact SHA/runtime/CLI/profile identities and actual browser evidence. Close test tabs and Ctrl-C owned processes.
5. Stage CLI task create/list with `--project <root>/projects/alpha` changes only stage DB. Normal global ned and profiles stay untouched.
6. Control update returns unchanged for current SHA, deferred for active owner work; future successful main updates profile/CLI and preserves config/auth/env/session/memory/project/DB. Inspect config_template_changed status boolean.
7. Interactive Hermes turn remains blocked until explicit staging-only model authorization. Native --help/skills list and credential-free loader/terminal probes do not require inference. Codex/Qwen/external fallback are disabled.

Operational manager/native archive are separately pinned maintenance tools. Generated root/projects/AGENTS.md is reserved owned content; edits cause a preservation error. No service start/stop commands exist. Schedule registration/pause/removal uses exact Codex automation ID after root completes setup; do not delete locks or protected snapshots manually.

Staging browser acceptance is focused on unchanged merged NEDCOM GUI at the actual staging instance: desktop/newtab and390/320 IAB plus exact source provenance. Existing merged native Safari/Chrome baseline is reused only for unchanged GUI and is not a fresh native staging pass. New artifact/task GUI slices retain their separate acceptance. Root registers and verifies the automatic update schedule after merge/owner setup; missing model authorization does not block credential-free installation/tests.

## Recover interrupted owned work

Run `ned-staging-control status` first. An active managed group means finish/close that staging agent, communicator or terminal task and retry; the updater never kills it. Completed orphan groups converge automatically once empty. For `work_status: ownership_unknown`, run `ned-staging-control recover-work` after closing positively identified staging work. It checks recorded PID/start, child and group quiescence before retiring owned records; it refuses live or reused identities and preserves profile/data/snapshots. Then rerun `update` or `rollback`. If ownership metadata is malformed or identities cannot be proved, retain the root for investigation; do not delete locks, snapshots or PID files manually. Deliberately unmanaged daemons escaping native groups require owner investigation, because this profile is not an OS sandbox.

A failed check remains visible alongside active health; a verified rollback reports its retained promotion-failure cause. `unavailable` means stop launch/promotion and preserve the paired snapshot. Archive setup retry automatically rebuilds only an owned interrupted scratch preparation; an unverified partial final runtime is refused. The operational manager/native runtime stay pinned and require explicit reviewed maintenance.
