# Feature: NED Communicator

Status: planned
Related issues: [#113](https://github.com/DataNavAI/no-ego-dev/issues/113), skeleton #114, CLI #115, projects/previews #116, artifacts #117, tasks #118.

## User outcome and scope
Local NED users browse a selected project's work through a web app. Delivery is serial. #114 supplies server lifecycle and an honest navigation shell; it does not open databases/project folders or implement CLI/domain routes. Existing onboarding is separate. See [technical design](TECH_SPEC.md), [UI brief](design/ui-brief.md), [tokens](design/design-system.md) and [specimen](design/mockup.html).

Non-goals: remote hosting, multi-user auth, editing, GitHub sync, credential brokering, arbitrary app startup/build/deploy or duplicate artifact/task stores. The #114 server and navigation shell are implemented; browser acceptance and remaining CLI/domain behavior are pending. Production must never show synthetic projects as registered data.

## Requirements
Parent IDs remain stable:
- FR-001: `ned com` starts NEDCOM, reports usable local URL and handles startup/shutdown failures. #114 internal lifecycle; #115 CLI.
- FR-002: List registered projects; retain one explicit selected-project context. #116.
- FR-003: Read selected-project goals/subgoals/tasks/issues with hierarchy, state, ownership, blockers, dependencies, history and derived progress where available. #118.
- FR-004: Browse supported canonical artifacts without duplicate store/tracker. #117.
- FR-005: Open a configured running local WIP app or explain unavailability; never build/start/deploy it. #116.
- FR-006: Reuse shared database resolution and task read semantics; explicit configuration > NED_DATABASE_URL > ~/.ned/ned.sqlite. Preserve unrelated data/project isolation. Future readonly opener is required; skeleton opens no DB.
- FR-007: Loopback only and read-only; restrict files to registered selected project; reject traversal, symlink escapes, sensitive runtime/auth files and cross-project leaks. Safely render untrusted content. Skeleton owns HTTP perimeter; domain slices own data enforcement.
- FR-008: Loading, empty, folder/preview unavailable and database-error states recover without task/file changes. Skeleton owns shell states; actual domain recovery is planned.
- FR-009: Skeleton semantic responsive project-first shell follows A1–A6/UI-AC-01–05 in UI brief, with honest capability-unavailable state and no demo inventory.
- FR-010: Fixed assets and GET/HEAD health/capability contracts are stable; invalid local context/method/routes fail safely. Close is idempotent, releases listener, and startup rejection leaks no listener.

## Critical user journeys
### CUJ-001: Start, inspect, stop and restart
Actor: local developer/user. Critical foundation for subsequent views. Prerequisites Node 20+, installed dependencies; initially no listener. Start internal factory, open reported URL, inspect health/shell, stop twice, restart released port. Success: usable loopback shell, no persisted change. Correct invalid config/occupied port then retry; failures leave no listener.

### CUJ-002: Navigate and recover the shared shell
Actor: browser user. Critical because unavailable capability must differ from empty successful inventory. Start loading capabilities; skeleton success shows project browsing unavailable with disabled chooser/sections. Request error shows inventory error/Retry; retry is single-flight and returns to settled state. Test-only intercepted responses supply empty/two-project/folder/database specimens; these prove shared renderer, not actual domain integration. Retain opaque project ID separately from name; changing project clears stale content and resets Tasks.

### CUJ-003: Reject unintended local access
Actor: local owner. With running skeleton, send foreign Host/Origin, mutation methods and unknown/traversal paths. Success: sanitized rejections and no writes/leakage; subsequent valid reads work. Shutdown releases resources.

Future journeys remain gaps: CUJ-004 CLI start/restart (#115); CUJ-005 project selection/preview availability (#116); CUJ-006 safe artifact list/open (#117); CUJ-007 task hierarchy/history/CLI refresh (#118). Each owner must add detailed first/repeat/error/interruption/isolation cases before implementation.

## Detailed test cases
### TC-001: Lifecycle, read contracts and HTTP perimeter
- Purpose / journey / requirements: safe boot/restart/access; CUJ-001/003 / FR-001, FR-007, FR-010.
- Level / automation: integration; [`tests/TC-001.test.js`](tests/TC-001.test.js), named lifecycle/perimeter assertions.
- Preconditions / fixtures: Node 20+, dependencies; disposable temp dir with sentinel.txt bytes `unchanged`, no DB; `{port:0}` factory and raw HTTP helper for unnormalized paths/headers.
- Given: no listener or communicator persistence.
- When: listen, GET/HEAD root/assets/health/capabilities, send negative requests, close twice and restart same port.
- Then: actual loopback URL; health 200 `{status:"ok",service:"nedcom"}`; capabilities match TECH_SPEC; HTML/CSS/JS MIME correct. HEAD same status/type, no body. Foreign Host/Origin -> 403; unsupported method -> 405 with Allow; unknown/traversal -> 404; sanitized JSON errors/no paths/stacks. Valid reads still work.
- Steps and assertions: verify listening address; compare sentinel/directory entries before/after; inspect CSP/nosniff/no-store/no CORS grant; close then connection fails, restart succeeds.
- Variants / negative cases: negative/fractional/>65535 port and nonloopback host reject; occupied port rejects without leaked listener; concurrent reads; POST/PUT/PATCH/DELETE/OPTIONS; /api/projects; raw/encoded traversal; foreign/null Origin; absent/exact Origin accepted. Context validation precedes method/route. Query never expands asset allowlist. No provider/auth dependency applies.
- Cleanup: close servers in finally, remove temp dir, leave no files/DB/processes.
- Pass evidence: named assertions for each variant on exact candidate SHA; written case is not a pass.

### TC-002: Client states, identity and retry
- Purpose / journey / requirements: honest unavailable/navigation/recovery; CUJ-002 / FR-008/009.
- Level / automation: unit; [`tests/TC-002.test.js`](tests/TC-002.test.js), inline synthetic inventory fixtures.
- Preconditions / fixtures: pure state helpers; production capabilities from TECH_SPEC; injected rows `{id:"fixture-a",name:"Alpha"}` / `{id:"fixture-b",name:"Beta <script>"}`, empty rows, sanitized project_unavailable/database_unavailable errors. No production mock adapter.
- Given: loading without selected project.
- When: success/failure, retry, select ID, select section, switch project; resolve delayed old response.
- Then: unavailable differs from empty; error -> loading -> settled recovery; only one pending retry; IDs retained separately from labels; project change clears old content/resets Tasks and ignores stale response; unknown ID unavailable; absent selection disables sections.
- Steps and assertions: exercise each transition/copy mapping and hostile-name text handling; production capabilities cannot create fixture rows. DOM safety additionally manual below.
- Variants / negative cases: error->success/error; long names; delayed response after selection change. Pagination/providers/mutation inapplicable to skeleton.
- Cleanup: reset state/mock requests, no persistence.
- Pass evidence: named state assertions on exact candidate.

### TC-003: Rendered browser acceptance
- Purpose / journey / requirements: usable responsive read-only shell; CUJ-001–003 / FR-007–010.
- Level / automation: manual; procedure below; QA evidence under project run records.
- Preconditions / fixtures: exact candidate loopback server; registry interfaces nedcom-desktop-web/nedcom-mobile-web; TC-002 inventory fixtures through browser interception/test harness only, never production routes/config.
- Given: browser at 1280×800 then 390×844 and 320 CSS px.
- When: load production shell; intercept delayed/failed/successful capability responses; inspect empty/two-project specimens; retry; navigate entirely by keyboard.
- Then: one H1, landmarks/labeled chooser, skip first, visible focus, current section semantics, >=44px controls, no overflow at 320px/200% text; polite loading and single-transition error announcements; distinct unavailable/empty/error; hostile text does not execute.
- Steps and assertions: capture production shell and every state/section desktop/mobile; inspect A1–A6 focus/Retry recovery/selection retention, stale content clearing, contrast and accessible order. Network uses only local assets/read contracts; normal refresh restores honest unavailable state.
- Variants / negative cases: offline/recovery, repeat retry, long names. Folder/database rendered recovery is planned in #116/#118; pure helper copy tests do not establish domain rendering. Physical phone/LAN/provider auth/task writes inapplicable.
- Cleanup: remove interception, close browser/server; no runtime fixture/log commit.
- Pass evidence: candidate SHA/time/browser/version, viewport/state captures, keyboard/contrast results and independent UI review. HTML source alone is insufficient.

## Coverage and acceptance
| Requirement | Journey | Coverage |
| --- | --- | --- |
| FR-001 | CUJ-001/004 | TC-001/003 internal; CLI gap #115 |
| FR-002 | CUJ-005 | #116 domain gap; TC-002/003 shell only |
| FR-003 | CUJ-007 | #118 gap |
| FR-004 | CUJ-006 | #117 gap |
| FR-005 | CUJ-005 | #116 gap |
| FR-006 | CUJ-005/007 | readonly DB gap #116/#118 |
| FR-007 | CUJ-003/005–007 | TC-001/003 perimeter; domain isolation gaps |
| FR-008 | CUJ-002/005–007 | TC-002/003 renderer; actual domain error gaps |
| FR-009 | CUJ-002 | TC-002/003 |
| FR-010 | CUJ-001/003 | TC-001 |

Skeleton acceptance needs TC-001/002 automated, TC-003 rendered evidence and onboarding regression. Before commit run lint, all Node/spec cases and Python pytest. Parent closure additionally needs all serial domain/CLI cases and integrated two-project/CLI-refresh/preview evidence.

## Open questions and coverage gaps
TC-001/002 focused automated cases pass on the dirty implementation candidate; exact commit evidence and TC-003 rendered acceptance remain pending. Future owners freeze artifact formats/limits/enumeration, preview metadata/probe and readonly task adapter before coding. Add future TC headings with executable tests/manual procedure; no phantom automated paths. Planned browser interfaces are not certification.
