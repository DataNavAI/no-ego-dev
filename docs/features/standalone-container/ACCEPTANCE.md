# Standalone container acceptance

Executed 2026-10-13 America/Los_Angeles (UTC execution 2026-10-14 06:25–06:40). Base: authoritative NED main `ebfcabb7f69ef11973d82f974adfc1226c912f6c`. This report covers standalone-container TC-003/004 only; unrelated pre-existing manual cases were not rerun. No live model credentials or paid model requests were used.

## Candidate and environment

Docker 29.3.0, dedicated Colima `ned-container` Linux arm64 VM (4 CPU, 8 GiB RAM, 40 GiB disk); Docker Compose 5.6.0. Base index digest and upstream source identity are recorded in [runbook](RUNBOOK.md#upstream-image-research). Final tested image ID: `sha256:04f07e46d06fdcdc928ab7c1a4a341121c4dcd7fd4e94abc9bbca0105431547c`. Final build used repository Dockerfile and npm lock, including an actual native SQLite construction at image build.

Runtime input bindings (SHA-256):

| File | Hash |
| --- | --- |
| Dockerfile | `1ec91950a540cd90a471538d77dfa5562434d8e3eac8106a13265554a5089940` |
| compose.yaml | `e708016aa70086f6e89839a0b380b24f40410e9b9f2ccaf79eec86cecd721d71` |
| com.mjs | `c8e8d189a4540e5e33434cd99b38767a367666e77666b49b8dc1c4f02a3943eb` |
| database.mjs | `8f3a766939086586d579924306a9e5db35562d70c869187c083d634e5ebb5fd7` |
| health.mjs | `a5651d72548018306d9659afb459f72b2c2e35d77c14b1463663a99536c61435` |
| initialize.py | `f66c5144d9d606b150d632fda4edafea0e38e1bda5b4d0a0b4a9e1a99b660f8f` |
| run-com | `b44fef25d2d64244b0a06f40163ad06c11577ba7eb03adbf5829b5366224da02` |
| setup | `c1c2d4ead8871ae23a5315277a9c3a8d9a9df5226973b83173c8afaaaf9ca40a` |

## TC-003 — PASS (real Docker and HTTP)

- `docker --context colima-ned-container build -t ned-standalone:acceptance .` succeeded; subsequent Compose build of final input produced the image ID above. Build context was 3.63 MB initially and a positive allowlist excluded git, runtime env/auth/database/cache files. The Dockerfile explicitly copies manifest-owned components rather than a host profile.
- Documented `docker run` with three fresh test volumes, synthetic private runtime env file and host-loopback 9119/8787 mappings started both services; Docker health became `healthy`.
- Actual Hermes `/api/health`: HTTP 200, `ok:true`, `auth_required:true`, version 0.22.0 and upstream commit `e06df9c2eae6901f4c88f464e0ae6e753c0428b8`.
- Dashboard `/`: 200 HTML. Unauthenticated `/api/config`: 401. POST `/auth/password-login` with synthetic `basic` provider credentials: 200 and session cookies; cookie-authenticated `/api/config`: 200. Request body/cookies were never printed or retained.
- COM `/`: 200 HTML; `/api/health`: 200 exact `status:ok,service:nedcom`; `/api/projects`: 200 `{"projects":[]}` on fresh volume. Foreign Host and Origin each returned 403. Capabilities remain main's projects/preview true and tasks/artifacts false.
- `docker exec --user hermes ... ned --version`: 0.2.1, exit 0. An in-container manifest read verified every `distribution_owned` entry exists, and initial terminal cwd is `/projects`.
- Docker process listing showed both the actual Hermes dashboard Python process and COM Node process as UID 10000. s6 remains privileged PID 1 for supervision.
- Missing dashboard credentials exited 1. Unrecognized occupied profile exited 1; its sole `sentinel` file retained `unchanged` bytes and no NED files were seeded.
- Compose `config --quiet`, `up -d --build` on isolated project `ned-container-compose-test` succeeded; both authenticated dashboard and COM HTTP checks passed and Docker health was healthy. This also verifies actual Compose-created fresh volume behavior.

## TC-004 — PASS (real process and persistent-volume boundaries)

- Created `/projects/acceptance`, profile/project sentinel files, appended `# operator retained` to profile config, initialized project using `ned task init`, and created task `Container persistence acceptance` with the public CLI. No fake COM routes were used.
- Used `/command/s6-svc -k /run/service/dashboard` and `/command/s6-svc -k /run/service/ned-com`. On final image, dashboard PID 155 became 318 and COM PID 154 became 326. Both HTTP services responded correctly afterward, including a fresh successful dashboard login. Docker health was healthy.
- `docker stop --timeout 30` completed in approximately 3.5 seconds and exited 0; no forced SIGKILL. Removed container only, then recreated using the same three volumes.
- Profile/project sentinels and config comment persisted exactly. Public `ned task list --project /projects/acceptance --json` returned the original task ID `ned-c9bacb19-c7a5-456a-af56-ee3abcc80686`, title and creation timestamp. COM returned the registered project at `/projects/acceptance`.
- Repeated persistence and authenticated HTTP verification after upgrading the test container to the final Compose-built image ID above. State remained intact.
- Removed only the named acceptance/noauth/unrelated test containers and `ned-container-test-{profile,db,projects,unrelated}` volumes. `compose down -v` removed only the isolated Compose test project's containers/network/volumes. Removed synthetic runtime password file and temporary credential-handling HTTP probe. Dedicated VM/images remain available for review; no service is left published.

## Automated checks and limits

Focused container integration cases: 12 assertions/subtests passed. Full spec gate passed all 29 automated case files; it separately reports manual cases NOT RUN. `npm test` passed CLI/regression and all automated spec cases. `python -m pytest`: 208 passed, 9 pre-existing opt-in cases skipped; those skips do not establish behavioral acceptance. ESLint and pinned Ruff passed; shell/bootstrap syntax checks passed.

HTTP acceptance meets the requested browser-or-HTTP boundary. Native browser visual inspection, Linux amd64 execution, remote exposure, UID remapping and actual model replies were not performed. No changes to existing Hermes profiles, unfinished artifact worktree, old staging data or schedules were made. No claim that unrelated manual cases or planned COM artifact/tasks are complete.

## Repeatable image-test script — 2026-10-14

FR-007 / TC-003/004: the committed source script `tests/container_acceptance.py` (SHA-256 `eaa3d8ac3f7a527a9dffe51fd26b8582d0fd2292d8cbf58a16bb4be5c05490da`) is exposed by `npm run test:container`. It is an on-demand end-to-end test, separate from the fast default spec gate.

- `npm run test:container -- --context colima-ned-container`: PASS, actual image `sha256:e870db72004ad0b96e27baf7cfcfdcde1d9f2e98ff57cb2dbaeef3ccfee72621`, Linux arm64, timestamp `2026-10-14T07:07:24.719363+00:00`. Both services/auth/HTTP perimeter, complete profile/CLI, unprivileged service PIDs, separate service replacement, retained task/profile/project state, missing auth and unrelated-profile refusal passed. Shutdown exited0 in 3.3 seconds. Owned containers/volumes/runtime credential file removed before emitting PASS.
- `--image ned-standalone:final`: PASS against a supplied image, which was preserved. Random Docker-assigned host ports allowed concurrent runs without fixed-port collisions.
- Deliberately failing-entrypoint image: expected failure, exit1, no PASS receipt; authoritative Docker inventory confirmed every owned container/volume absent. The supplied fixture image was preserved by the script and separately removed by its fixture owner.
- SIGTERM during a real running test: expected exit1, no PASS receipt; owned resources removed.
- Docker absent from PATH: expected exit1 with `Docker is required; no acceptance cases were run`; no skip/pass claimed.
- ESLint/Ruff and shell/source syntax gate passed. Existing fast integration cases remain TC-001/002; default spec gate still reports on-demand TC-003/004 as NOT RUN and requires this separate evidence.

No real model key or host profile was used. Compose's original acceptance remains the unchanged wiring evidence; this script tests the actual Docker image directly.

## Compatibility with current main — 2026-10-14

Main `02b39209e48778e02a3514be8b6e7b565e54eb0f` removed the retired Daytona transport. The PR was reconciled with that authoritative main without restoring removed integrations. `npm run test:container -- --context colima-ned-container` passed against the combined contents: image `sha256:5dfa1d204d5641315a71dc883a7bdafbfeaae643d867a4630cf9fc39346e0104`, timestamp `2026-10-14T07:24:31.033520+00:00`, ARM64, stop exit0 in 3.3 seconds. The same actual HTTP/authentication, unprivileged-service, recovery, volume persistence and negative-startup assertions passed, and all owned resources/credentials were removed. Earlier evidence and suite counts above describe their original snapshots; the current suite excludes main's retired Daytona cases.

## Explicit architecture verification — 2026-10-14

AMD64, x64 and x86-64 mean the same CPU architecture. Earlier verified container executions were ARM64 only. The new `--expected-architecture` option compares host, Docker daemon, built image and executed Node binary; the new native CI matrix runs both AMD64 and ARM64.

- Fresh `--expected-architecture arm64`: PASS, image `sha256:246c34ac3dd9db39c86dde82bbe6def248a7782b0fba0c8c36028eb093817843`, timestamp `2026-10-15T04:56:55.380650+00:00`; host/daemon/image/Node all ARM64, native execution true; full TC-003/004 and cleanup passed.
- Requesting `--expected-architecture amd64` on this ARM64 machine: expected nonzero rejection and no PASS receipt.
- Initial local AMD64 execution under QEMU exited during initialization (139), and a subsequent diagnostic instance showed a supervised child SIGSEGV before later becoming ready. This is not a native x64 PASS or a waived test; native x64 CI must establish the architecture result.
- A subsequent complete local AMD64 acceptance run passed under QEMU: image `sha256:7efac03875553205d542ab75bd86a4dcb60cb5a7ecdbcc8e066987bbd453e441`, timestamp `2026-10-15T05:03:56.840614+00:00`, image/Node AMD64 with host/daemon ARM64, native execution false; full TC-003/004 and cleanup passed. Earlier startup failures remain unresolved emulation reliability evidence.
- Native GitHub matrix results are recorded in the PR checks and final `.github/manual-test-result.json`, with actual run links and candidate identity. This document alone does not establish a native AMD64 pass.
- No live provider credentials exist in the task environment or repository CI secrets. A live model reply requires a dedicated runtime-only test credential file and explicit provider/model; existing Hermes profile credentials will not be copied. No live reply is claimed.
