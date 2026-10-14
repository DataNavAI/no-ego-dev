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
