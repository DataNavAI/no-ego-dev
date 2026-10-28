# Feature: NED Communicator

Status: planned
Related issues: native Hub OAuth [#140](https://github.com/DataNavAI/no-ego-dev/issues/140), Hub registration [#138](https://github.com/DataNavAI/no-ego-dev/issues/138), [#113](https://github.com/DataNavAI/no-ego-dev/issues/113), skeleton #114, CLI #115, projects/previews #116, artifacts #117, tasks #118, Retry focus [#131](https://github.com/DataNavAI/no-ego-dev/issues/131).

## User outcome and scope
Local NED users browse a selected project's work through a web app. Delivery is serial. #114 supplies server lifecycle and an honest navigation shell; it does not open databases/project folders or implement CLI/domain routes. Existing onboarding is separate. See [technical design](TECH_SPEC.md), [UI brief](design/ui-brief.md), [tokens](design/design-system.md) and [specimen](design/mockup.html).

Non-goals: provisioning remote hosting, multi-user auth, editing, GitHub sync, credential brokering, arbitrary app startup/build/deploy or duplicate artifact/task stores. The #114 server and navigation shell are implemented; skeleton acceptance is complete; project/preview implementation and domain acceptance are pending. Production must never show synthetic projects as registered data.

## Requirements
Parent IDs remain stable:
- FR-001: `ned com` starts NEDCOM, reports usable local URL and handles startup/shutdown failures. #114 internal lifecycle; #115 CLI.
- FR-002: List registered projects; retain one explicit selected-project context. #116.
- FR-003: Read selected-project goals/subgoals/tasks/issues with hierarchy, state, ownership, blockers, dependencies, history and derived progress where available. #118.
- FR-004: Browse supported canonical artifacts without duplicate store/tracker. #117.
- FR-005: Open a configured running local WIP app or explain unavailability; never build/start/deploy it. #116.
- FR-006: Reuse shared database resolution and task read semantics; explicit configuration > NED_DATABASE_URL > ~/.ned/ned.sqlite. Preserve unrelated data/project isolation. The #116 slice adds an explicitly readonly existing-database opener; no init/migration/chmod/mkdir or application writes. SQLite live WAL may coordinate through sidecars; record actual sidecar behavior separately from preserved database records/project files.
- FR-007: Loopback only and read-only; restrict files to registered selected project; reject traversal, symlink escapes, sensitive runtime/auth files and cross-project leaks. Safely render untrusted content. Skeleton owns HTTP perimeter; domain slices own data enforcement.
- FR-008: Loading, empty, folder/preview unavailable and database-error states recover without task/file changes. A keyboard-activated Retry restores focus to Retry when it remains actionable after settlement, or the content heading when Retry disappears. Never override focus moved to another control during loading; project/section navigation cancels the prior Retry focus intent. Skeleton owns shell states; actual domain recovery is planned.
- FR-009: Skeleton semantic responsive project-first shell follows A1–A6/UI-AC-01–05 in UI brief, with honest capability-unavailable state and no demo inventory.
- FR-010: Fixed assets and GET/HEAD health/capability contracts are stable; invalid local context/method/routes fail safely. Close is idempotent, releases listener, and startup rejection leaks no listener.

- FR-016: Explicit NED_HUB_URL, stable NED_HUB_SLUG and an explicit or saved Hub credential configure authenticated automatic registration only after COM listens; optional NED_HUB_NAME defaults to slug. Slugs match authoritative Hub admission: first lowercase letter, then 2–39 lowercase letters/digits/hyphens, excluding api/auth/tunnel/healthz/assets/connect/favicon/robots/login/logout; retained trailing-hyphen identities remain valid. No configuration preserves local-only startup without outbound calls. Partial/invalid configuration exits 2 with sanitized guidance. Remote origins require HTTPS and tokens stay server-side.
- FR-017: Register via bearer POST /api/instances with {slug,name}; retry transient failures using bounded backoff, including reconnect with unchanged identity. Registration 400/401/403/409 stops remote retries while local COM remains available. Never follow redirects or send credentials to an untrusted returned tunnel endpoint. Default trusted proxy is proxy.<Hub hostname>; explicit NED_HUB_PROXY_URL overrides it (required for differing local proxy ports). For loopback-only local API/proxy origins, NED_HUB_INSTANCE_ORIGINS defaults false (shared origin) and explicit true uses slug.localhost; remote origins require isolation and reject false. Other mode values reject. API and proxy URLs are HTTP(S) origins without credentials, path, query or fragment.
- FR-018: Stream authenticated Hub HTTP traffic to loopback COM without buffering responses. At most 64 concurrent channels; bounded registration body, connection deadlines, heartbeat and idle resources; stop releases timers, sockets and listeners. Validate forwarded instance host, scheme, slug and exact browser Origin before translating Host/Origin to the local COM origin. Preserve unchanged local COM perimeter. The bridge has no public listener; only token-authenticated outbound data channels reach it.

- FR-019: `ned hub login [--hub <origin>] [--no-browser]` uses external-browser authorization code OAuth with S256 PKCE, random state and an ephemeral `http://127.0.0.1:<port>/oauth/callback`; only explicit --hub or NED_HUB_URL selects an issuer. The Hub public client is `ned-cli`. No Google client secret, provider access token or refresh token is handled by NED CLI. A five-minute deadline, SIGINT/SIGTERM and exact callback Host/path/state validation bound the attempt. No secrets appear in URLs or output.
- FR-020: Exchange the single callback code by JSON POST to the exact configured origin's /api/oauth/token without redirects, with bounded response and timeout. Require a Bearer ned_ token, token identity and account shape before atomically saving per-canonical-origin credentials under ~/.ned/hub-credentials (directory0700/file0600, owned regular files, no symlinks or unsafe write permissions). Failed/denied/cancelled login preserves existing credentials. Atomic replacement is authoritative: auxiliary lock cleanup failure returns successful login with a fixed recovery warning and must never revoke the saved credential. COM uses explicit NED_HUB_TOKEN first, then the configured origin's saved token; absent all Hub configuration remains local-only.
- FR-021: `ned hub logout [--hub <origin>]` sends native bearer DELETE /api/oauth/token, accepts 204 or already-revoked401, then removes only the matching local credential. Network/server failure returns1 and retains it for retry. No saved credential succeeds without a network request. No global provider logout or other Hub credential deletion occurs. Local removal is authoritative: a later lock cleanup failure keeps the successful logout result and reports recovery guidance instead of falsely claiming credentials were retained. Failures before mutation still propagate; cleanup never removes a replacement lock.

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

### CUJ-010: Authenticate the native CLI with the Hub
Actor: COM operator; priority P1. Starting state: an explicit Hub origin and a browser account eligible for that Hub. Run `ned hub login --hub <origin>` (or set NED_HUB_URL), approve the named CLI request in the browser, and return to the terminal. Success saves a private per-origin credential and subsequent configured COM startup uses it without copying a token. Denial, timeout, interruption, malformed callback, wrong state or failed exchange leave the previous credential unchanged. `ned hub logout` revokes the saved token and then removes that matching local credential; offline failure keeps it for retry. This is critical because browser identity must never be guessed or copied across Hub origins.

### CUJ-009: Connect running COM through NED Hub
Actor: an invited Hub owner with a CLI token and permanent instance slug. Set the variables described in [Hub setup](HUB.md), run ned com and open that instance from Hub. Local URL prints first; remote registration occurs after readiness. Repeated starts use the same slug. A transient Hub outage reports offline/retrying while local access remains usable; recovery registers the same identity and resumes the tunnel. Invalid/revoked credentials require a new token/restart. SIGINT/SIGTERM closes remote and local resources. This journey is critical because browser registration is intentionally absent.

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
- Level / automation: unit and client integration; [`tests/TC-002.test.js`](tests/TC-002.test.js), inline synthetic inventory fixtures and deferred fetches through the actual browser client.
- Preconditions / fixtures: pure state helpers; production capabilities from TECH_SPEC; injected rows `{id:"fixture-a",name:"Alpha"}` / `{id:"fixture-b",name:"Beta <script>"}`, empty rows, sanitized project_unavailable/database_unavailable errors. No production mock adapter.
- Given: loading without selected project.
- When: success/failure, retry, select ID, select section, switch project; resolve delayed old response.
- Then: unavailable differs from empty; error -> loading -> settled recovery; only one pending retry; IDs retained separately from labels; project change clears old content/resets Tasks and ignores stale response; unknown ID unavailable; absent selection disables sections.
- Steps and assertions: exercise each transition/copy mapping and hostile-name text handling; production capabilities cannot create fixture rows. DOM safety additionally manual below.
- Variants / negative cases: error->success/error; long names; delayed response after selection change. Pagination/providers/mutation inapplicable to skeleton.
- Cleanup: reset state/mock requests, no persistence.
- Pass evidence: named state assertions on exact candidate.

TC-002 Retry regression: start with one selected project and an unconfigured preview, focus Retry and activate it. Hold its detail response; assert Retry is disabled and duplicate activation makes no request. Release with unconfigured preview or database error: Retry is visible, enabled and focused. Release with available preview: Retry is hidden and heading focused. Move focus to Project during the hold: settlement preserves Project focus. Switch project or section during the hold: stale completion cannot restore old Retry focus. No database/files are used or changed by this client integration case; discard the isolated harness after each variant. Browser pass evidence additionally records the same keyboard interaction on the served candidate.

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

### TC-016: Native OAuth, credential isolation and COM reuse
- Purpose / journey / requirements: CUJ-010 / FR-019–021; authenticate public native clients without exposing credentials to URLs or terminal logs.
- Level / automation: integration; [tests/TC-016.test.js](tests/TC-016.test.js), local HTTP issuer/browser callback and real private temporary credential files.
- Preconditions / fixtures: Node20+, synthetic issuer using the frozen Hub public client `ned-cli`, fresh temporary home, no live provider credentials. Hub origin is explicit; HTTP is permitted only for loopback fixtures.
- Given: a fresh or previously authenticated native installation with a stable configured COM slug.
- When: login starts, the browser fixture returns an authorization code, and the CLI exchanges its original PKCE verifier; repeat with wrong state/Host/path, denial, timeout, cancellation, exchange failure and logout failure.
- Then: callback listener is loopback-only and bounded; only the exact successful code/state exchange writes a private credential. Tokens/verifiers never appear in the browser URL or output. Failures preserve the prior credential; logout revokes then removes only the matching saved token. Different Hub origins cannot reuse it. COM prefers an explicit environment token and otherwise loads only its configured Hub's saved credential after valid configuration.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-016.test.js`; named cases assert S256 challenge, exact redirect/token endpoint with redirect rejection, callback validation and single settlement, mode0700 directories/mode0600 files, unsafe/symlink rejection, host separation, logout semantics and COM token selection.
- Variants / negatives: malformed response, denial, wrong callback/state, timed-out and interrupted login, unsafe existing file, unconfigured local COM. Inject post-rename and post-unlink lock cleanup EIO through the real credential store: login/logout exit0 with correct saved/deleted state, exact remote revocation count and recovery warning; clearing the owned stale lock permits retry. Inject pre-rename failure: exit1, old credential unchanged and newly issued token revoked. No live Google grant is performed by automated fixtures.
- Cleanup: stop each loopback issuer/callback listener and remove only test-owned temporary homes. No runtime credentials are committed.
- Pass evidence: focused assertions and canonical gates on the exact candidate. Hosted Google approval and real remote-COM access remain separate release evidence; these fixtures do not certify them.

### TC-015: Hub registration, real COM streaming and trust boundary
- Purpose / journey / requirements: CUJ-009 / FR-016–018; automatically publish only a running COM while keeping credentials and local isolation intact.
- Level / automation: integration; [tests/TC-015.test.js](tests/TC-015.test.js).
- Preconditions / fixtures: ephemeral loopback HTTP/WebSocket Hub protocol fixture, real COM server with nonexistent synthetic database path, synthetic ned_ token; no provider login or persisted records.
- Given: either no Hub environment, incomplete/invalid environment, or complete explicit configuration.
- When: run CLI; registration first receives503 then201; authenticate control/data channels, request health/assets, disconnect/reconnect, return hostile endpoint and stop.
- Then: unconfigured startup makes no Hub call; invalid config rejects; registration follows local readiness; stable {slug,name} and bearer are sent only to configured origins; health/assets stream through real COM; foreign Origin and protocol-relative path reject; reconnect repeats same identity; stopping tunnel leaves local health usable until CLI stops.
- Steps and assertions: run node --test docs/features/communicator/tests/TC-015.test.js. Named cases assert exact ordering, POST route/body/auth,503 recovery,200health/CSS,403foreignOrigin,400invalidpath, repeated stable registration, endpoint rejection and no hostile request.
- Variants / negative cases: insecure remote URL, missing fields, malformed token/slug and non-origin proxy rejected. Existing moon- and 40-character identities accepted; leading digit/reserved names rejected. Actual localhost default and explicit isolated modes stream real COM; remote shared mode rejects. Real ownership/permanent slug enforcement lives in Hub API tests. Live hosted SSO, TLS, cross-account browser access and deployment are separate Hub acceptance; this local fixture does not certify them.
- Cleanup: stop connection and COM, terminate fixture channels, close all fixture servers; no real credentials/files are created. Existing manual browser cases remain independently required for UI changes; this CLI-only enhancement changes no COM UI.
- Pass evidence: named automated assertions at exact candidate; hosted verification recorded separately by Hub operator.

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
| FR-019–021 | CUJ-010 | TC-016 native fixture; hosted provider acceptance separate |
| FR-016–018 | CUJ-009 | TC-015 real COM/protocol fixture; hosted provider acceptance separate |

Skeleton acceptance needs TC-001/002 automated, TC-003 rendered evidence and onboarding regression. Before commit run lint, all Node/spec cases and Python pytest. Parent closure additionally needs all serial domain/CLI cases and integrated two-project/CLI-refresh/preview evidence.

## Open questions and coverage gaps
Skeleton TC-001/002/003 acceptance landed in PR #120. TC-004 CLI tests pass locally; final candidate gates, printed-URL browser evidence and independent review remain pending. TC-005/006 are implemented and pass focused checks, including live WAL/SHM coordination, independent CLI registration, readonly preservation and bounded preview/config trust boundaries. #116 TC-003 browser evidence and exact-candidate independent review remain pending; automated results do not establish browser acceptance. Artifact formats/limits/enumeration and readonly task adapter remain future gaps; preview contract is frozen in TECH_SPEC. Add future TC headings with executable tests/manual procedure; no phantom automated paths. Planned browser interfaces are not certification.
