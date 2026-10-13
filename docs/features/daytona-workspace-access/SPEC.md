# Feature: Daytona workspace access

Status: implemented
Related issues: [V0 PR #119](https://github.com/DataNavAI/no-ego-dev/pull/119)

## User outcome and scope

NED agents and CLI users access existing Daytona workspaces for chat, health checks, recovery and owned cleanup. This contract covers the provider transport used by those commands; command-level recovery journeys remain a coverage gap in the inventory. Preserve existing API-key authentication, endpoint overrides, command/result fields, binary profile uploads, gateway status downloads and exact-owned Secret operations. New workspace provisioning, image builds, interactive SDK sessions and a general-purpose SDK replacement are non-goals.

The implementation uses Daytona's official generated API and toolbox clients pinned to 0.200.1, matching the previous SDK's protocol. This removes the unused image-building dependency chain rather than suppressing GHSA-vfj7-8cjw-p6xm. No change to provider accounts, cost, permissions or Secret host scopes is intended. Credential-free HTTP fixtures verify protocol compatibility; live-provider acceptance is not claimed by these cases.

## Integration operation notes

Research date: 2026-10-12. Sources: [Daytona generated clients](https://github.com/daytona/clients), [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Upgrading the SDK alone still includes fast-glob; maintaining a custom braces fork would retain package and security-patch ownership. Generated clients remove that chain with unchanged provider protocol and no additional service or billing setup. API keys retain existing sandbox and Secret scopes; consult [credential guide](../../cli/CREDENTIALS.md) for storage and rotation. Endpoint override values and toolbox URLs never contain keys. Requests carry Bearer headers and reject redirects; lifecycle polling is bounded and does not replay mutations. A failed poll preserves local ownership for retry through normal recovery/cleanup commands.

## Requirements

- FR-001: Use the configured API endpoint (explicit option, DAYTONA_API_URL, DAYTONA_SERVER_URL, then https://app.daytona.io/api) with Bearer API-key authentication. Do not follow credential-bearing redirects.
- FR-002: Resolve each workspace's toolbox proxy and append its encoded ID; keep concurrent workspaces isolated. Execute commands with command, cwd, envs and seconds timeout; return exitCode (or legacy code) and result.
- FR-003: Upload Buffer data to the exact destination and download raw file bytes without glob expansion or local file discovery.
- FR-004: Starting waits until started; deletion with wait waits for destroyed or verified 404. Error/build_failed states and bounded timeouts reject; no speculative mutation retries.
- FR-005: List every page with the original label filter and advancing cursor. Secret get/update/delete/list preserve exact IDs and supplied host scope. Ownership remains enforced by the existing provider's readback checks.
- FR-006: Production installation has no braces, micromatch, fast-glob or high-level Daytona SDK dependency; the normal npm production audit must pass without exceptions.

## Critical user journeys

### CUJ-001: Access and repair an existing workspace
Actor: CLI user. Critical because chat and recovery need authenticated command execution and binary profile/status transfer. Starting state: saved workspace and API key, workspace stopped or started. Actions: get workspace, start if needed, resolve toolbox, upload profile bytes, execute command, download status. Success: exact workspace receives bytes/command and returns result. Failure: authorization/network/state/timeout errors reject without retrying writes; user retries the existing command after correcting access. Interrupted calls have no automatic replay.

### CUJ-002: Verify ownership and clean up
Actor: NED agent. Critical because cleanup must not declare success before absence is proven. Starting state: managed workspace labels and exact Secret identity. Actions: enumerate all pages, update/read Secret as needed, delete exact workspace, poll/read absence, delete/read Secret. Success: exact IDs absent; provider rejects inconclusive readback. Failure: 401/403/500 propagate, terminal errors/timeouts reject; rerunning cleanup treats confirmed 404 as absent.

## Detailed test cases

### TC-001: Authenticated workspace transport preserves command and binary data
- Journey / requirements: CUJ-001 / FR-001, FR-002, FR-003
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js)
- Preconditions / fixtures: local HTTP server from tests/helpers.js; synthetic key, stopped sandbox a, binary Buffer, no real credentials or persisted state.
- Given: control API returns a toolbox URL and workspace identity.
- When: start, upload, execute and download run through the real generated clients.
- Then: every request has the synthetic Bearer header; start completes after started readback; toolbox requests target a only; multipart upload contains exact bytes and destination; command JSON and response fields match; download remains byte-identical.
- Steps and assertions: inspect recorded method/path/body/header for each call; exercise both exitCode and legacy code responses.
- Variants / negative cases: binary zero bytes and non-ASCII content; env omitted vs supplied; distinct simultaneous sandbox IDs. Invalid authentication is TC-002. No real-provider side effects.
- Cleanup: close HTTP server and all connections via test teardown; no local files or DB written.
- Pass evidence: exact assertions in named TC-001 test; npm production audit separately establishes FR-006.

### TC-002: Fail closed on authorization, redirects, failed states and timeout
- Journey / requirements: CUJ-001, CUJ-002 / FR-001, FR-004
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js)
- Preconditions / fixtures: synthetic local server, forbidden key response, failed/stalled lifecycle states; short bounded test timeout.
- Given: access denied, redirect, failed start or a transition that never finishes.
- When: get/start/delete is attempted.
- Then: original HTTP status or bounded lifecycle error rejects; redirect destination receives no request; mutations occur once; no command/file operation follows a failed start.
- Steps and assertions: test 401/403, 302, error/build_failed, stalled start and stalled delete with exact call counts; blank key rejects before network.
- Variants / negative cases: a 500 polling read must propagate; deletion 404 succeeds only after delete request; invalid timeout rejects before mutation. Interrupted operation is represented by timeout; writes are never automatically replayed.
- Cleanup: server teardown; no remote writes, persisted data, auth files or live dependencies.
- Pass evidence: named assertions/subtests; finite test-runner timeouts.

### TC-003: Paginated listing, Secret operations and confirmed deletion
- Journey / requirements: CUJ-002 / FR-004, FR-005
- Level / automation: integration; [TC-003.test.js](tests/TC-003.test.js)
- Preconditions / fixtures: local server with two list pages, two workspace IDs, exact synthetic Secret and delete-to-404 transition.
- Given: query labels and an owned Secret ID.
- When: list both pages; list/get/update/delete Secret; delete workspace with wait.
- Then: both IDs appear once, labels remain on page two, next cursor advances, Secret methods/path/body preserve identity/hosts, workspace deletion is followed by 404 proof.
- Steps and assertions: inspect GET/PATCH/DELETE requests and JSON responses; assert non-404 lookup errors do not count as absent (TC-002 and existing provider cleanup regressions).
- Variants / negative cases: pagination repeat cursor rejects to avoid unbounded work; retry cleanup with already absent Secret is covered by existing tests/cli/daytona.test.js. Project persistence/isolation belongs to task-management; transport has no DB.
- Cleanup: server teardown; no real resources created or removed.
- Pass evidence: TC-003 plus existing provider ownership/readback regression tests.

## Coverage and acceptance

| Requirement | Journey | Test cases | Automated test / procedure |
| --- | --- | --- | --- |
| FR-001 | CUJ-001 | TC-001, TC-002 | authenticated HTTP and redirect cases |
| FR-002, FR-003 | CUJ-001 | TC-001 | real generated clients against local server |
| FR-004 | CUJ-001, CUJ-002 | TC-002, TC-003 | lifecycle and 404 checks |
| FR-005 | CUJ-002 | TC-003 | pagination and Secret wire checks; tests/cli/daytona.test.js |
| FR-006 | CUJ-001, CUJ-002 | TC-001 | npm ci; npm ls braces micromatch fast-glob @daytona/sdk (none); npm audit --omit=dev |

Acceptance requires all three cases, existing provider regressions, full lint/spec/Node/Python suites, clean packed-package install and unmodified security CI. Written cases alone are not passing evidence.

## Open questions and coverage gaps

Live-provider acceptance requires an explicitly authorized disposable fixture under QA.md; this transport change's credential-free evidence does not claim a live round trip. Command-level recovery journeys still need a complete feature spec backfill. SDK-only facilities intentionally absent from this private adapter are not supported public APIs.
