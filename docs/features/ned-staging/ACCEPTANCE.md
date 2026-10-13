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

Remaining before #123 closure: after this documentation merges and its exact-main CI passes, perform a controlled promotion, rollback and repeat promotion, verifying the staged task, synthetic memory/project files, config and data isolation. Record exact before/after SHA/health and preservation results in external receipts and the issue. This supplies live main-update proof in addition to automated rollback/interruption cases. Scheduler pause/resume/remove use the Codex app; controller remove only retires owned runtime and retains data. No public destructive reset is exposed.

NOT RUN / separate owner work: live model inference, model login and skill behavioral evaluation. Model access remains login_required; separate staging-only authorization is needed for chat. No public/LAN, physical phone, screenreader, physical power-loss or fresh native-browser certification claimed. NEDCOM artifacts/tasks remain unavailable until their individual changes merge.

Runtime roots, DBs, snapshots, logs, raw native reports and screenshots remain outside this distribution. [Runbook](RUNBOOK.md) gives reproducible owner commands; [SPEC](SPEC.md) maps acceptance to stable FR/CUJ/TC IDs. This documentation is not a secret store or a runtime snapshot.
