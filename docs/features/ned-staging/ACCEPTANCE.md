# Local staging acceptance

Observed on 2026-10-13, macOS. This record separates implementation tests, actual native/owner acceptance, and remaining operations.

| Identity | Verified value |
| --- | --- |
| Source PR | [#124](https://github.com/DataNavAI/no-ego-dev/pull/124) |
| Reviewed exact PR head | `845d412a0387230ef728503a6243924d5d0b2270` |
| Merged / initially installed main | `0e599dd14a0fff82eb98c048e71f03a8b12f6f52` |
| Owner root / profile | `~/Library/Application Support/NED/staging` / `ned-staging` |
| NEDCOM / optional demo | `http://127.0.0.1:4215` / `http://127.0.0.1:4216` |
| Stage Node | 22.14.0, immutable existing private runtime |
| Native Hermes core | `962e205e5e206e286658d965ca46e832debff3f4` |
| Native archive digest | `808eca5299e87545ff7fcacb8e0397cdb2389a59f99982d15f99299f9fddd3eb` |
| Manager controller digest | `fc76c5706a9952256855b81b60233bedb4f436055d287353cc4130c1f40c877b` |
| Schedule | NED staging updates / `ned-staging-updates`, ACTIVE every 15 minutes |

PASS: all automated feature cases (27), general Node tests (129), lint and Python (208 passed; 9 existing platform skips not passes). Both source/evidence commits ran full hooks. Exact-head composite R3 approved all eight resolved findings; report SHA256 `08a879a820ec182ac093df886ef46b0f67d1415258594e123e782962a00c209f`. PR and exact merged main CI passed Node20/22, macOS, Windows and native profile installation; PR manual evidence gate passed too.

PASS actual native credential-free evidence: isolated archive/profile install and fresh source-bound SOUL/AGENTS/skill loading, config/auxiliary route normalization, foreground/background native terminal/npm isolation, parent-death work ownership, durable recovery and correction-specific release-selection race. Synthetic provider resolution made no model calls. Skill loading is not a behavioral skill evaluation.

PASS permanent owner acceptance: setup installs exact successful main and reports ready/idle/login_required; dedicated wrapper creates `Explore NEDCOM staging` in Alpha. Actual IAB Alpha WIP opens Synthetic staging app on4216 in a new tab; Beta has no stale preview link; 390px viewport has no horizontal overflow. Desktop/mobile screenshots were captured and visually inspected outside Git. GUI source files are byte-identical to the accepted merged baseline and prior focused390/320 proof; fresh native Safari/Chrome/zoom were NOT RUN. Normal profile inventory and protected file metadata remained identical without opening credential/config contents. Only positively identified test listeners/tabs were stopped.

PASS operational registration/readback: one Codex thread heartbeat `ned-staging-updates` is ACTIVE, 15-minute cadence, attached to this task. It stays quiet on unchanged/pending/deferred states and reports meaningful verified updates/failures. Actual controller returns unchanged for the installed SHA and deferred/active_work while owned NEDCOM runs. Registration does not claim a completed scheduled run.

PASS live update/recovery: after [PR #125](https://github.com/DataNavAI/no-ego-dev/pull/125) merged, the actual controller first refused pending main CI without a candidate build, preserving healthy `0e599dd14a0fff82eb98c048e71f03a8b12f6f52`. Once exact-main CI passed, promotion to `5edb6ce7f92544598d46bf54910f11ec0314d9f4`, explicit rollback to the initial SHA and repeat promotion all returned exit0/ready. The staged task and SQLite logical dump hash, config/env/memory hashes and project-file hashes matched at every phase; normal profile inventory/protected metadata stayed unchanged. The actual owned NEDCOM restarted from the new release and displayed Alpha's running preview. Its accepted desktop viewport capture was visually inspected; an inconsistent first full-page capture was excluded, with measured1280px layout and a fresh viewport capture used instead. Test listeners/tabs were closed, leaving ready/idle staging.

PASS schedule controls: exact `ned-staging-updates` pause/resume readbacks passed, restoring ACTIVE every15minutes. Actual disposable native `remove` returned retired/data_retained, removed its wrappers/CLI/manager and preserved profile config and its synthetic task DB; the permanent owner instance was untouched. No public destructive reset exists. A scheduled execution is still not claimed.

External live-operation receipt SHA256: `2ff87d23326732b81c8c33b74768eabe66384376993d553c6f10a6adf30c3c58`. The receipt binds immutable before/after release/status, data-hash comparisons, CLI/rollback outputs, schedule controls and accepted screenshot. Private state and raw logs remain outside Git. These results complete credential-free staging acceptance; future current-version checks use the owned status command, not this historical initial-install record.

NOT RUN / separate owner work: live model inference, model login and skill behavioral evaluation. Model access remains login_required; separate staging-only authorization is needed for chat. No public/LAN, physical phone, screenreader, physical power-loss or fresh native-browser certification claimed. NEDCOM artifacts/tasks remain unavailable until their individual changes merge.

Runtime roots, DBs, snapshots, logs, raw native reports and screenshots remain outside this distribution. [Runbook](RUNBOOK.md) gives reproducible owner commands; [SPEC](SPEC.md) maps acceptance to stable FR/CUJ/TC IDs. This documentation is not a secret store or a runtime snapshot.
