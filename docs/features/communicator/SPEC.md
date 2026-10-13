# Feature: NED Communicator

Status: planned
Related issues: [#113](https://github.com/DataNavAI/no-ego-dev/issues/113), skeleton #114, CLI #115, projects/previews #116, artifacts #117, tasks #118.

## User outcome and scope
Local NED users browse a selected project's work through a web app. Delivery is serial. #114 supplies server lifecycle and an honest navigation shell; it does not open databases/project folders or implement CLI/domain routes. Existing onboarding is separate. See [technical design](TECH_SPEC.md), [UI brief](design/ui-brief.md), [tokens](design/design-system.md) and [specimen](design/mockup.html).

Non-goals: remote hosting, multi-user auth, editing, GitHub sync, credential brokering, arbitrary app startup/build/deploy or duplicate artifact/task stores. The #114 server and navigation shell are implemented; skeleton acceptance is complete; project/preview implementation and domain acceptance are pending. Production must never show synthetic projects as registered data.

## Requirements
Parent IDs remain stable:
- FR-001: `ned com` starts NEDCOM, reports usable local URL and handles startup/shutdown failures. #114 internal lifecycle; #115 CLI.
- FR-002: List registered projects; retain one explicit selected-project context. #116.
- FR-003: Read selected-project goals/subgoals/tasks/issues with hierarchy, state, ownership, blockers, dependencies, history and derived progress where available. #118.
- FR-004: Browse supported canonical artifacts without duplicate store/tracker. #117.
- FR-005: Open a configured running local WIP app or explain unavailability; never build/start/deploy it. #116.
- FR-006: Reuse shared database resolution and task read semantics; explicit configuration > NED_DATABASE_URL > ~/.ned/ned.sqlite. Preserve unrelated data/project isolation. The #116 slice adds an explicitly readonly existing-database opener; no init/migration/chmod/mkdir or application writes. SQLite live WAL may coordinate through sidecars; record actual sidecar behavior separately from preserved database records/project files.
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

Future journeys remain gaps: CUJ-006 safe artifact list/open (#117); CUJ-007 task hierarchy/history/CLI refresh (#118). Their owners add detailed cases before implementation.

### CUJ-004: CLI start, stop and restart
Actor: local user. Prerequisites: Node/dependencies, no listener. Run `ned com`, open printed URL, stop with SIGINT/SIGTERM, restart released port. Critical public entry point. Flags: --port decimal integer 0–65535 (default 0 ephemeral), --database SQLite-path/local-fileURL, --help. Explicit database > NED_DATABASE_URL > ~/.ned/ned.sqlite. Unknown/duplicate/missing flags and invalid configuration exit 2/no URL; startup failures exit 1/no URL. Normal shutdown exits 0. No browser launch, credentials or telemetry.
The command passes resolved databasePath to server options without initializing or creating a DB. #116 server reads an existing DB; missing DB permits startup with recoverable database error. Raw DB path is not an HTTP field; registered project folder context is deliberately visible metadata.

### CUJ-005: Browse registered projects and open a local preview
Actor: local project owner; critical first useful project workbench. Prerequisites: existing schema-v1 NED DB with registered canonical directories; app started separately. Start NEDCOM, choose a project by readable folder context, inspect Tasks/Artifacts placeholders or WIP app, open reachable app, change projects and retry failures. No automatic selection. Repeat refresh reads current registry/config; CLI registry changes appear on next request. Missing DB/schema/empty registry/folder/removed project produce distinct recoverable states without application writes. Preview failure never breaks valid project selection. Interrupted/stale reads cannot restore another project's link; shutdown closes every DB/probe handle.

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

### TC-004: CLI entry and cleanup
- Purpose / journey / requirements: credential-free lifecycle; CUJ-004 / FR-001, FR-006, FR-007, FR-010.
- Level / automation: integration; [tests/TC-004.test.js](tests/TC-004.test.js), spawned-process and injected configuration assertions.
- Preconditions / fixtures: temporary HOME and sentinel DB bytes; Node/dependencies; no provider authorization/listener.
- Given: isolated HOME, no listener, explicit/environment/default database configuration.
- When: spawn `node bin/ned.js com`, fetch printed URL/health, signal, restart same port.
- Then: loopback URL remains live until signal; exits 0, listener released, fixture bytes/directories unchanged; config precedence reaches server options. Missing DB does not get created.
- Steps and assertions: bounded readiness/exit waits, root/health reads, SIGINT and SIGTERM separate runs, exact-port restart. Help exits 0 with usage and no listener.
- Variants / negative cases: default/explicit 0; file URL overrides invalid environment; environment/default resolution; missing DB succeeds; invalid remote/empty DB, negative/fractional/>65535/missing port, unknown/duplicate flags -> 2/no URL; occupied port -> 1/no URL. Provider auth inapplicable; domain DB failures deferred #116.
- Cleanup: terminate/await children, close collision listener, remove only temporary directories.
- Pass evidence: named assertions/exact candidate output; coordinator records printed-URL browser acceptance separately.

### TC-005: Read-only registry and project-root isolation
- Purpose / journey / requirements: live registered selection and safe recovery; CUJ-005 / FR-002, FR-006–008.
- Level / automation: integration; [tests/TC-005.test.js](tests/TC-005.test.js).
- Preconditions / fixtures: temporary HOME, database schema v1 initialized by fixture writer, two real directories `a/shop` and `b/shop`, distinct registered opaque IDs, sentinel project bytes and unrelated task/feature rows; fixtures/helper remain inside tests/, runtime files in temp only.
- Given: running loopback NEDCOM configured for existing fixture DB.
- When: GET registry, choose each ID, modify registry with separate CLI/domain writer, refresh, close/restart.
- Then: capability projects/preview true, tasks/artifacts false; registry returns both matching names with distinct readable displayPath and opaque IDs. Detail returns only requested registered project metadata; no scanning/auto-registration. Next read observes committed writer update. Registry empty is 200 empty; absent/unreadable/corrupt/unsupported-schema DB is sanitized 503 database_unavailable, shell still boots; unknown/malformed ID 404 project_unavailable; missing/non-directory/replaced-symlink root 404 project_folder_unavailable. Preview failures remain separate from valid metadata.
- Steps and assertions: inspect GET/HEAD shapes; compare main DB logical task/feature/project records, project bytes and permissions before/after; assert opener cannot execute writes and no initialization/migration/chmod/mkdir/journal-mode change; close all connections; repeat read after restoration recovers. Separate writer-authorized modifications from communicator effects.
- Variants / negative cases: explicit/env/default config precedence; missing parent DB directory stays absent; unsupported schema; concurrent reads/live WAL writer; duplicate names; arbitrary path/encoded separators/other nonregistered ID; replace registered directory with symlink to other project's root, deny until restored. Record WAL/SHM sidecar creation or coordination honestly; do not assert impossible zero SQLite coordination writes. No remote provider authentication applies.
- Cleanup: stop NEDCOM/fixture writer, restore replaced roots, remove temp fixture only; no production DB touched.
- Pass evidence: named variants, before/after records/files/permissions and observed sidecars on exact candidate, plus browser project switch evidence under TC-003.

### TC-006: Preview validation, probe and stale selection
- Purpose / journey / requirements: truthful safe WIP access; CUJ-005 / FR-002, FR-005, FR-007–009.
- Level / automation: integration and client-state assertions; [tests/TC-006.test.js](tests/TC-006.test.js).
- Preconditions / fixtures: TC-005 projects; temporary preview HTTP servers with HEAD 204, 302, 500 and >1s delay; fixed `.nedcom.json` configs; injected deferred client responses. No actual project execution.
- Given: selected registered project, no cached authority for preview link.
- When: read detail/preview, vary config/probe, Retry or switch selected ID while old success/error is pending.
- Then: validated configured HEAD 2xx -> available with safe URL; absent config -> unconfigured; invalid config/URL -> invalid; unreadable config -> unavailable; timeout/refused/non2xx/redirect -> stopped. Detail remains selected. Only available current response produces Open app link with target=_blank, rel=noopener noreferrer and accessible new-tab label. Switch/retry immediately removes link; stale successes and errors ignored; chooser remains enabled during detail load; Retry single-flight for current generation.
- Steps and assertions: assert 4096-byte config bound, HEAD/no credentials/no redirects/<bounded completion>, full raw URL validation before normalization, no query/body data or unsafe target traffic, zero app spawn/build/write calls; inspect task/artifact placeholders and refresh config recovery.
- Variants / negative cases: missing config, >4096 bytes, non-object/malformed/unknown keys/wrong version/nonstring URL, symlink config, path-root escape; remote hostname/localhost/nonliteral IP/nonloopback/alternate numeral IPv4/userinfo/query/fragment/HTTPS/missing explicit port; HEAD 200/204 success, 302 denied without follow, 500/refused/timeout stopped; delayed A after B success/error and after same-project retry; invalid config never probes. Only exact IPv4 127.0.0.1 accepted this revision, IPv6 deferred.
- Cleanup: close probe fixture servers/client requests and temp files; restore intercepted browser traffic.
- Pass evidence: named validation/probe/stale-response assertions, byte/record preservation, TC-003 desktop/mobile running/unavailable/retry/duplicate-name keyboard/link evidence at candidate SHA. No source-only browser pass.

## Coverage and acceptance
| Requirement | Journey | Coverage |
| --- | --- | --- |
| FR-001 | CUJ-001/004 | TC-001/003 internal; TC-004 CLI |
| FR-002 | CUJ-005 | TC-005/006 implemented; TC-003 browser evidence pending |
| FR-003 | CUJ-007 | #118 gap |
| FR-004 | CUJ-006 | #117 gap |
| FR-005 | CUJ-005 | TC-006 implemented; TC-003 browser evidence pending |
| FR-006 | CUJ-004/005/007 | TC-004 configuration; TC-005 readonly registry; task adapter gap #118 |
| FR-007 | CUJ-003/005–007 | TC-001/003 perimeter; TC-005/006 projects/preview; artifact/task isolation gaps |
| FR-008 | CUJ-002/005–007 | TC-002/003 renderer; TC-005/006 project/preview recovery; task/artifact gaps |
| FR-009 | CUJ-002 | TC-002/003 |
| FR-010 | CUJ-001/003 | TC-001 |

Skeleton acceptance needs TC-001/002 automated, TC-003 rendered evidence and onboarding regression. Before commit run lint, all Node/spec cases and Python pytest. Parent closure additionally needs all serial domain/CLI cases and integrated two-project/CLI-refresh/preview evidence.

## Open questions and coverage gaps
Skeleton TC-001/002/003 acceptance landed in PR #120. TC-004 CLI tests pass locally; final candidate gates, printed-URL browser evidence and independent review remain pending. TC-005/006 are implemented and pass focused checks, including live WAL/SHM coordination, independent CLI registration, readonly preservation and bounded preview/config trust boundaries. #116 TC-003 browser evidence and exact-candidate independent review remain pending; automated results do not establish browser acceptance. Artifact formats/limits/enumeration and readonly task adapter remain future gaps; preview contract is frozen in TECH_SPEC. Add future TC headings with executable tests/manual procedure; no phantom automated paths. Planned browser interfaces are not certification.
