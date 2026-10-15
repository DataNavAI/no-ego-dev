# Feature: Standalone NED container

Status: implemented
Related issues: None; standalone container request. Communicator artifact #117 and task #118 are separate scope.

## User outcome and scope
Operators run the complete NED profile and CLI with Hermes's real browser dashboard and NED COM in one container. Fresh named volumes isolate this installation from existing host profiles. Image-owned code is immutable; profile, SQLite database and project work persist independently. This replaces the proposed local staging approach without changing its files or schedules.
Non-goals: hosted deployment, messaging delivery, model billing/login automation, new COM artifact/task capabilities, mounting a Docker socket, migrating host credentials or deleting old staging data. Live model calls require operator-supplied runtime credentials and are separate from credential-free service acceptance.
Assumptions: Docker supports Linux arm64 or amd64; ports are published on host loopback. Each installation owns its volumes; concurrent containers sharing volumes are unsupported.

## Requirements
- FR-001: Build from a suitable maintained official Hermes image pinned by digest, recording registry and source evidence. Install locked NED CLI dependencies and every distribution-owned component; exclude host secrets/runtime state from the build context.
- FR-002: Default startup serves the real Hermes dashboard on 9119 and COM on 8787, reachable through loopback-published ports. Preserve COM's loopback-only core and same-origin request policy through a container adapter. Dashboard requires runtime authentication; no insecure dashboard mode.
- FR-003: Supervise both services, restart failed processes, forward logs, stop gracefully on SIGTERM, and declare healthy only when both HTTP services respond correctly. Startup/config failures fail visibly.
- FR-004: Seed a fresh persistent profile with complete distribution contents and container-specific workspace configuration. Repeated startup preserves edited profile/config, credentials, SQLite state and projects. Existing unrecognized nonempty profile volumes fail closed. No automatic overwrites or migrations of operator profile content.
- FR-005: Use separate persistent volumes for Hermes profile, NED database and projects; services run as the upstream unprivileged user. Credentials are supplied only at runtime by environment/secret file, never baked or copied from host profiles.
- FR-007: Provide `npm run test:container` for on-demand actual image build/run acceptance. It must create only uniquely named test containers/volumes, use synthetic runtime credentials outside the checkout, verify both services/authentication/recovery/persistence and negative startup, and remove test containers/volumes/credential files on success or failure. Missing Docker or failed checks exit nonzero, never skip as a pass. It must not use host Hermes profiles or provider credentials.
- FR-006: Document build/run/Compose, service URLs, runtime auth, health/log inspection, backup, upgrade and explicit cleanup. State COM's current projects/preview capability and unavailable artifact/tasks honestly.

- FR-008: Image acceptance must execute both Linux AMD64 (also called x64/x86-64) and ARM64 binaries and record native versus emulated execution honestly. The CI matrix runs natively on each architecture; `--expected-architecture` verifies the host, Docker daemon, image and executed Node binary against its expected architecture and fails on mismatch. Native CI results are a final PR verification gate. Keep live provider testing separate from synthetic-credential image tests.

## Critical user journeys
### CUJ-001: First run
Actor: operator. Critical because assembling both actual services and the entire profile cannot be proven by syntax tests.
Starting state: clean checkout, Docker available, three new volumes, synthetic dashboard password.
Actions: build pinned image, launch with loopback ports and runtime password, wait for health, open dashboard and COM, inspect distribution files and CLI.
Success: authenticated dashboard and COM projects API work; unauthenticated dashboard access is refused; all distribution components exist. Failure: inspect logs, correct runtime configuration, recreate container retaining volumes.
### CUJ-002: Repeat use and recovery
Actor: operator. Critical for protecting work across container lifetimes.
Starting state: healthy installation with synthetic task/project/database and profile edits.
Actions: kill service, verify restart, stop, recreate using same volumes, read data.
Success: services recover and state is unchanged; graceful shutdown exits within 30 seconds. Failure: preserve volumes, inspect logs, restore backups with a compatible image.
### CUJ-003: Safe setup and cleanup
Actor: operator. Critical because images must not contain existing personal runtime state.
Starting state: checkout and runtime-only credential file outside build context.
Actions: inspect build context allowlist, start without auth, try hostile COM Host/Origin, remove test container and test-owned volumes.
Success: missing dashboard auth fails visibly/unhealthy, hostile requests return 403, no host profile changes, cleanup affects only test-owned resources.

## Detailed test cases
### TC-001: Container COM adapter enforces origin and shutdown
- Journey / requirements: CUJ-001, CUJ-003 / FR-002, FR-003
- Level / automation: integration; tests/TC-001.test.js
- Preconditions / fixtures: temporary synthetic SQLite DB; random local listener port; no external dependencies.
- Given: adapter wraps the real loopback COM server.
- When: GET health/capabilities with configured Host/Origin, then hostile Host/Origin, POST and missing route, then SIGTERM/close.
- Then: health 200 and exact service identity; capabilities match authoritative main; hostile access 403; POST 405; unknown route 404; all listeners close.
- Steps and assertions: create adapter on ephemeral local port with explicit synthetic origin; send each request and assert precise status/body; close and assert listener closed.
- Variants / negative cases: invalid/non-HTTP origin rejected before listening; upstream failure returns 502; no credentials/auth needed; persistence/concurrent writes inapplicable to read-only adapter.
- Cleanup: close servers and delete only temporary DB directory.
- Pass evidence: named automated assertions.
### TC-002: Profile initialization preserves ownership and state
- Journey / requirements: CUJ-001, CUJ-002, CUJ-003 / FR-001, FR-004, FR-005
- Level / automation: integration; tests/TC-002.test.js
- Preconditions / fixtures: temporary source/profile directories with synthetic distribution manifest and files, Python with PyYAML.
- Given: empty profile.
- When: initialize, edit config/add synthetic auth and state, initialize again; try unrecognized occupied profile and interrupted initialization.
- Then: complete manifest components copied, container cwd set; repeat initialization retains exact edited/state bytes; occupied or partial profile rejected without overwrites. Reject escaping or symlink distribution paths.
- Steps and assertions: invoke actual initializer subprocess with explicit test paths; assert file bytes, exit codes and no mutation on failures.
- Variants / negative cases: missing component fails before copying; malformed manifest rejected; concurrent init rejected by exclusive marker; external provider auth inapplicable.
- Cleanup: delete temporary fixture roots only.
- Pass evidence: named automated assertions.
### TC-003: Build and run both actual services
- Journey / requirements: CUJ-001, CUJ-003 / FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-008
- Level / automation: manual; scripted end-to-end `npm run test:container` ([script](tests/container_acceptance.py)); [procedure](RUNBOOK.md#acceptance)
- Preconditions / fixtures: Linux Docker with AMD64/ARM64 image execution available; CI uses native runners (`ubuntu-24.04` and `ubuntu-24.04-arm`); local emulation must be labeled as such; fresh test-owned volumes; synthetic dashboard password at runtime; no model key or host profile mount.
- Given: image built from clean candidate using default pinned Hermes base.
- When: launch documented command and request both services and dashboard authenticated API.
- Then: Docker health healthy; dashboard HTML renders and authenticated API responds; unauthenticated protected API refuses; COM /api/projects returns 200 empty list; CLI version works; all distribution-owned files are present. Image/context contains no host state; services run unprivileged.
- Steps and assertions: run `npm run test:container -- --context <Docker-context>` (or omit context to use the current daemon), then follow runbook Compose acceptance; record digest, platform, statuses and redacted service identity.
- Variants / negative cases: run without dashboard password and verify fail-closed; bad COM Host/Origin returns 403. Missing Docker blocks manual acceptance; no skip counts as pass.
- Cleanup: stop/remove test container; retain volumes for TC-004.
- Pass evidence: redacted acceptance report bound to candidate contents, no passwords/log payloads.
### TC-004: Service crash, restart, persistence and cleanup
- Journey / requirements: CUJ-002, CUJ-003 / FR-003, FR-004, FR-005, FR-006, FR-007, FR-008
- Level / automation: manual; scripted end-to-end `npm run test:container` ([script](tests/container_acceptance.py)); [procedure](RUNBOOK.md#acceptance)
- Preconditions / fixtures: TC-003 healthy installation; synthetic DB task, project and profile sentinel files.
- Given: persistent state and running processes.
- When: kill each service separately, wait for recovery; stop within 30 seconds; recreate with same volumes.
- Then: replacement process and successful HTTP prove recovery; shutdown clean; DB/project/profile sentinel bytes persist; no host profiles changed.
- Steps and assertions: run the same script, which records service process replacement and fresh live HTTP readiness, checks stop exit/time, recreates and verifies sentinels and public CLI task readback, and removes only its unique test resources in finally cleanup. Use `--image <existing-image>` to reuse an image; that image must be preserved. A caller interruption exits nonzero and still cleans owned resources. Docker-host crashes may require explicit removal of the printed unique test resource names.
- Variants / negative cases: occupied unrelated profile rejected; concurrent volume sharing unsupported; interrupted init rejected; incompatible schema recovery uses backup/compatible image rather than destructive reset.
- Cleanup: remove test container and explicitly named test volumes only; preserve host credentials/staging/candidate worktrees.
- Pass evidence: redacted acceptance report with exact commands and observed outcomes.

## Coverage and acceptance
| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-001 | CUJ-001, CUJ-003 | TC-002, TC-003 | initializer integration / build acceptance |
| FR-002 | CUJ-001, CUJ-003 | TC-001, TC-003 | adapter integration / real HTTP |
| FR-003 | CUJ-001, CUJ-002 | TC-001, TC-003, TC-004 | shutdown / service recovery |
| FR-004 | CUJ-001, CUJ-002 | TC-002, TC-004 | initializer / volume retention |
| FR-005 | CUJ-001, CUJ-003 | TC-002, TC-003, TC-004 | context and runtime inspection |
| FR-006 | CUJ-001, CUJ-003 | TC-003, TC-004 | documented commands exercised |
| FR-007 | CUJ-001, CUJ-002, CUJ-003 | TC-003, TC-004 | `npm run test:container`; on-demand actual Docker script |

| FR-008 | CUJ-001, CUJ-002 | TC-003, TC-004 | Native GitHub matrix; `--expected-architecture amd64` / `arm64` |

## Open questions and coverage gaps
Linux arm64 Docker build/run and HTTP acceptance passed; see [acceptance](ACCEPTANCE.md). Native AMD64 and ARM64 matrix acceptance is required for the new architecture coverage; recorded results below must identify actual executed candidates. Native browser visual inspection remains separate. Live model calls are outside credential-free acceptance; operators configure a provider through Hermes. No claim of artifact/task support before those independent changes merge.
