# Feature: Web app previews

Status: implemented registration/status control plane; private embedded HTTP/WS delivery remains planned.
Related issues: [single preview #210](https://github.com/DataNavAI/no-ego-dev/issues/210), [design #155](https://github.com/DataNavAI/no-ego-dev/issues/155), [delivery #157](https://github.com/DataNavAI/no-ego-dev/issues/157), [Hub #81](https://github.com/DataNavAI/ned-hub/issues/81).

## User outcome and scope

NED manages **one active preview per agent instance**, across projects. The agent starts the web app, waits for HTTP readiness and registers it. Users do not select apps or enter ports. Replacing the preview is an explicit agent operation, never an implicit last-writer-wins switch. Other server processes may still run: NED does not execute or stop them.

The user's single-app decision supersedes DEC-01 and the historical multi-app menu/tabs mockups. Those mockups are archived exploration, not the implementation target. The existing COM shell and legacy project Open app behavior stay intact. This release adds NED API registration/status/removal, API-backed CLI and the [web-app-preview skill](../../../skills/web-app-preview/SKILL.md). It does **not** expose a proxy, embedded frame or new public route. API readiness is not proof of a rendered or remotely reachable app. A loopback URL refers to the instance, not a remote user's computer.

Private app-origin relay, authenticated HTTP/WS/HMR, remote browser access and automatic embedded presentation are separate unimplemented delivery work (#157/#81). Do not weaken COM's CSP, forward secrets to apps, or mount executable app content on COM's origin to simulate completion. No DNS/cloud deployment, arbitrary command API, port scanning, process supervision, app chooser or public sharing is in scope here.

## Requirements

- FR-001: Authenticated `GET`, `PUT`, `DELETE /api/v1/preview` are available on full Core, COM and backend-only CLI listeners. GET has no body/query. PUT accepts exactly `{project,port,name?,expectedRevision,replace?}`; DELETE exactly `{expectedRevision}`. JSON bodies max4096bytes, exact same Origin required for mutations. Invalid/unknown fields, queries, methods, auth/Host/Origin fail before publication; errors use existing NED API envelopes.
- FR-002: Persist in the existing NED SQLite feature namespace partitioned by the private durable selected-home instance ID. Shared explicit DB does not join distinct homes. File-backed SQLite is required; :memory: returns503 rather than claiming durable publication. Canonical existing directory required; registering may create project metadata but no task/goal or project config. State survives new API/CLI processes and COM restart. Deleting a missing project folder makes status unavailable without recreating it.
- FR-003: Return `{revision,preview,delivery}`. Revision is monotonically increasing, starts0, remains after removal. Mutations require the observed nonnegative safe integer revision. Same-input PUT retry may return the current record without a revision advance; changed stale writes409. A different active preview requires `replace:true` and matching revision. DELETE cannot remove a later generation; exact repeated DELETE is idempotent while the tombstone still matches. Compare-and-swap and project publication are atomic.
- FR-004: Ports are integers1024–65535; target is always `http://127.0.0.1:<port>/`. No caller URL/path/command/host. Reject current API listener and configured gateway/control ports. A bounded HEAD request to `/` must receive HTTP before register; never follow redirects, forward authorization, read response bodies or log application content. Registration rechecks authorization after awaits. GET reports available (HTTP100–499), app_error (500–599), stopped (no response), unavailable (project missing). These are observations, not listener identity or rendering guarantees; PID/port reuse protection is a future **routing** gate. No routing exists in this slice.
- FR-005: At most one preview in the instance, regardless of project or concurrent writers. A new registration returns an opaque ID; replacement changes ID/revision. No multi-app list/selector or automatic fallback. Removal leaves no active managed preview and does not stop app processes.
- FR-006: `ned preview register --port N [--name TEXT] [--project PATH] [--replace] [--expected-revision N] [--json]`, `ned preview status [--json]` and `ned preview clear [--expected-revision N] [--json]` call the same API. `--api`, NED_API_URL then NED_CORE_URL select a loopback listener; otherwise create/close a backend-only listener. Match runtime/database fingerprints before preview operations. A configured failure or mismatch never starts a fallback or mutates another home. Default project is cwd; default name is project basename. CLI reads current revision if omitted; a conflict requires readback, not blind retry.
- FR-007: Planned delivery must use a generation-specific app origin separate from COM/control, authorize the current user and revoke old routes. No such origin is issued by this control plane.
- FR-008: Planned delivery grants/cookies must never expose bearer credentials to app content, URLs or tool prose. Registration/status returns no auth material and its `localUrl` is explicitly instance-local.
- FR-009: Planned isolated HTTP/WS forwarding must preserve COM/secret isolation and bounded resource behavior. Existing COM CSP remains unchanged in this slice.
- FR-010: Planned private delivery needs real supported-browser, lifecycle, ownership, HMR, origin/cookie and revocation proof. Status alone cannot satisfy these gates. Historical technical discovery remains a reference, not a deployed contract.
- FR-011: Clear unregisters only the active metadata and preserves a revision tombstone. A stale clear returns409 and leaves a newer registration intact. No process termination, unrelated project/home mutation or legacy config deletion.
- FR-012: Timeout each HTTP probe at1second; bounded4KiB JSON;1 active record; no unbounded port scan or retained response data. Shutdown/caller disconnect cancels in-flight probes. Revalidate current singleton after asynchronous observations so stale status cannot label a replaced registration.
- FR-013: Existing `.nedcom.json` behavior is retained unchanged and not automatically registered/tunneled. CLI/skill explain local-link versus future private delivery; they never tell a remote user to open the instance localhost URL. API `delivery` is `{mode:"local-link",remoteAvailable:false}`.
- FR-014: Add no new analytics/provider and persist no app content, secrets or command arguments. Agent skill is self-contained with EVAL.yaml/evaldata; realistic task evidence is separate from code tests.

## Critical user journeys

### CUJ-001: Agent registers the working app
Actor: agent; primary outcome. Start with selected home, known existing project and no preview. Start a durable dev server, wait for HTTP, register using CLI/API, read exact ID/revision/status. Success: one persisted registration with truthful local-only delivery metadata. Missing server/invalid input/auth fail without publication. Agent reports transport limitations rather than inventing a visible frame.

### CUJ-002: Explicitly replace the sole preview
Actor: agent; avoids user app-selection complexity. Read current state; keep same registration for an identical retry. To show another app, use explicit replace and observed revision. Concurrent writers: one wins, stale writer reads state. Success: one new registration, prior app no longer active; chat, processes, other homes and legacy config unchanged.

### CUJ-003: Recover and remove
Actor: agent. On HTTP failure status is stopped, never silently switch apps. Restart belongs to agent; re-register when needed. On uncertain writes read status before retry. Clear with observed revision; repeat safely only against unchanged tombstone. Success: no active registration; revision persists across process restart. A later preview survives stale clear.

## Detailed test cases

### TC-001: Register, readiness and isolation
- Journey / requirements: CUJ-001 / FR-001–005, FR-012–014.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: Temporary homesA/B, shared SQLite file, existing project and real synthetic loopback HTTP server; no real credentials. Empty state revision0.
- Given: A fixture app responds to HEAD, including404/503 variants.
- When: PUT then GET and reopen listener; repeat same input; change selected home; stop server/remove project folder.
- Then: One persisted registration, no goals/tasks/config; retry stable ID/revision; B empty despite shared DB; stopped/app_error/unavailable truthful and no folder recreated.
- Steps and assertions: Run named Node test. Check exact delivery envelope, ID and monotonic revisions; fixture records no Authorization and only HEAD `/`. Reject invalid ports, controls, unknown keys, URLs, symlink project and absent server with unchanged singleton.
- Variants / negative cases:1second timeout, invalid JSON/size/type, auth/Host/Origin denial, denied current API port. No routing/process identity assertion: no proxy exists.
- Cleanup: Test teardown closes servers/DB and removes only temporary fixture homes.
- Pass evidence: Named assertions, no skip/cancellation; runtime provider access inapplicable.

### TC-002: Replace, concurrency and stale removal
- Journey / requirements: CUJ-002, CUJ-003 / FR-003, FR-005, FR-011–012.
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: Synthetic appA/appB, temporary homes/DB; active A revision1.
- Given: A is active.
- When: Change target without replace; race changed writes with replace/revision1; retry lost reply; clear with old/current revisions; register a new app after clear.
- Then: Implicit replace409; exactly one concurrent changed write succeeds; one singleton; changed stale writes/clears409; same-input retry stable; exact repeat clear idempotent; stale clear cannot delete a later app. No process is killed.
- Steps and assertions: Execute Node case; query public GET after each outcome and reopen API to prove persistence/tombstone. Use Promise.all for competing mutations, not sequential claims of concurrency.
- Variants / negative cases: Readiness failure preserves active app; stale observation returns409 rather than publishing replaced app health. Interrupted network requires status readback; no automatic command replay.
- Cleanup: Close synthetic resources and remove temporary homes.
- Pass evidence: Assertions of outcomes and final persisted singleton, including losing write side effects.

### TC-003: API-backed CLI and runtime selection
- Journey / requirements: CUJ-001–003 / FR-001, FR-006, FR-013.
- Level / automation: integration; [TC-003.test.js](tests/TC-003.test.js).
- Preconditions / fixtures: Real NED API and spawned CLI, synthetic selected homes/project/app.
- Given: Same home/DB as API.
- When: Register/status/clear via configured API and ephemeral default mode; use malformed flags and wrong home/DB/unreachable configured API.
- Then: Both modes share persistent singleton and revision semantics; mismatch/failure nonzero with no local fallback, no stdout secrets. Invalid flags fail before API mutation. Help documents supported commands and local-only delivery.
- Steps and assertions: Run Node case; verify JSON, exit codes and public API readback. Close ephemeral listeners before CLI exit.
- Variants / negative cases: --replace, explicit stale revision, invalid API URL, duplicate/unknown flags, invalid name/port/project. Auth unavailable fails safely.
- Cleanup: Terminate/await child processes, stop fixtures, delete only test resources.
- Pass evidence: CLI exit/output and independent API readback, no live Hermes/model call.

### TC-004: Private embedded delivery
- Journey / requirements: CUJ-001 / FR-007–010.
- Level / automation: manual; planned #157/#81, NOT RUN.
- Preconditions / fixtures: Future authorized isolated relay, disposable browser/app and synthetic auth.
- Given: Implemented HTTP/WS private origin and supported browser tuple.
- When: Register, embed/interact/update HMR, replace, disconnect, revoke and try old routes.
- Then: Correct app renders remotely; old routes/streams close, COM/secrets remain inaccessible, no credential forwarding or public access.
- Steps and assertions: Future #157/#81 must supply executable browser/ownership/auth/WS procedures before claiming delivery complete; current API status cannot pass this case.
- Variants / negative cases: Old Hub, wrong user, cross-origin cookie/worker hazards, reused port/PID, stream saturation and unsupported framing/HMR require proof. Current coverage gap intentional and tracked.
- Cleanup: Remove disposable routes/apps and retain redacted evidence outside source.
- Pass evidence: Real browser and transport readbacks; not mock screenshots or HTTP readiness.

### TC-005: Uncertain registration and recovery
- Journey / requirements: CUJ-003 / FR-003–004, FR-011–012.
- Level / automation: integration; [TC-005.test.js](tests/TC-005.test.js), retry/tombstone boundary.
- Preconditions / fixtures: TC-002 singleton fixtures.
- Given: A write succeeded but caller lost reply.
- When: GET then identical PUT or exact repeated DELETE; start a newer registration before replaying stale clear.
- Then: No duplicate/new revision for same-input retry; later generation survives. Empty tombstone survives restart.
- Steps and assertions: TC-005 named retry/tombstone assertions.
- Variants / negative cases: Changed input with stale revision409; readiness failure cannot clear current preview.
- Cleanup: Shared case teardown.
- Pass evidence: Named persisted API state assertions in TC-005.

### TC-006: Legacy preview compatibility
- Journey / requirements: CUJ-001, CUJ-003 / FR-013.
- Level / automation: integration; [TC-006.test.js](tests/TC-006.test.js) plus existing [communicator TC-006](../communicator/tests/TC-006.test.js).
- Preconditions / fixtures: Existing synthetic project config fixtures.
- Given: Legacy .nedcom.json is present.
- When: Read project preview before/after singleton control-plane registration/removal.
- Then: Legacy file is unchanged; no implicit registration or tunnel. Existing Open app remains local-only behavior.
- Steps and assertions: Run existing TC-006 plus TC-001 no-config-write assertions; these cover separate config-read and singleton-write boundaries.
- Variants / negative cases: Existing malformed URL/symlink/readiness cases remain enforced.
- Cleanup: Existing fixtures own cleanup.
- Pass evidence: Both relevant named suites pass; no remote delivery claim.

### TC-007: Agent uses the single-preview workflow
- Journey / requirements: CUJ-001–003 / FR-005–006, FR-013–014.
- Level / automation: manual; [skill EVAL](../../../skills/web-app-preview/EVAL.yaml) with [synthetic scenarios](../../../skills/web-app-preview/evaldata/scenarios.md).
- Preconditions / fixtures: Disposable explicit agent home, two synthetic HTTP apps, project, current CLI; no live profile/provider auth or secrets.
- Given: User asks to see the working app, then requests another app.
- When: Agent follows the skill: inspect/status, start/readiness/register/readback, explicit replace, recover and clear.
- Then: One preview throughout, no user port/app-selector questions, no invented tunnel success, no secret output or process supervision claim. If transport missing, explain in user language and retain pending delivery work.
- Steps and assertions: Run realistic model-backed eval or documented manual agent task against EVAL fixtures; save transcript and state separately. Loading YAML/prose assertions is not behavioral acceptance.
- Variants / negative cases: Wrong selected home, stopped listener, API unavailable, stale update, remote-browser request, user asks to preserve current app.
- Cleanup: Stop only fixture processes, clear fixture singleton and remove disposable home.
- Pass evidence: Transcript commands and persisted API state; evaluation status recorded in issue/PR separately from code gates.

## Coverage and acceptance

| Requirements | Journey | Cases | Evidence |
| --- | --- | --- | --- |
| FR-001–004, FR-012 | CUJ-001,003 | TC-001–003,005 | API/CLI integration |
| FR-005–006, FR-011 | CUJ-001–003 | TC-001–003,007 | Singleton/CAS plus skill evaluation |
| FR-007–010 | CUJ-001 | TC-004 | Planned private-delivery gate, NOT RUN |
| FR-013–014 | CUJ-001–003 | TC-001,003,006,007 | Legacy tests, no-leak assertions and skill evaluation |

Accept registration/control-plane scope only after exact API/CLI tests and skill behavior evidence. Do not call the whole preview delivery feature verified until TC-004 ships. Historical multi-app TC-002/DEC-01 direction is superseded by the user's single-active-app decision; IDs retained for the simplified replacement journey.

## Open questions and coverage gaps

Private embedded local/Hub delivery is unimplemented (#157/#81), including listener ownership/generation revocation, HTTPS/site tuple, cookie/worker isolation and HMR. No remote user should be sent localUrl as if it were a reachable public preview. Native-tool registration is optional future work: the implemented agent interface is the requested CLI backed by NED API. Legacy per-project URLs remain compatibility links, not additional managed registry slots.
