# Feature: NED Communicator

## Consistent control styling enhancement

- FR-045: The project picker uses a locally bundled, pinned Web Awesome select with a NED-themed popup, explicit selected state, text-safe project labels and preserved project identity. Arrow keys, typeahead, Enter, Escape and focus restoration remain usable. Loading, disabled and unavailable states reflect the existing inventory state. If the enhancement cannot initialize, the labeled native picker remains usable. Changing a project invokes the same existing controller transition; it must not change the chat session or replay a message.
- FR-046: The composer uses a neutral outer-card focus treatment instead of a blue rectangle around its textarea. Keyboard users retain a clearly visible focus indicator on the composer and all actionable controls; textarea behavior, sizing, attachments, sending, streaming and draft recovery are unchanged. Buttons, tabs and project-menu options share existing NED typography, radius and neutral focus tokens. No external fonts, icon requests, CDN scripts or relaxed CSP are introduced.

### CUJ-014: Choose a project and continue writing
Actor: NED user. Critical because the project picker and message input are repeated entry points. Start with a loaded project inventory and an optional unsent draft. Open Project, use keyboard or pointer to choose a labeled project, dismiss/reopen the menu, then focus Message and continue writing. Success: themed popup, correct project content and preserved draft/session, with visible neutral focus. On loading or inventory failure, reflect the existing recovery state; failed component initialization leaves the native picker available.

### TC-027: Styled control adapter and asset boundary
- Journey / requirements: CUJ-014 / FR-045–046.
- Level / automation: controller and HTTP integration; `tests/TC-027.test.js`.
- Preconditions / fixtures: synthetic native picker/options, custom-element picker and inventory states; real temporary communicator server with no provider credentials.
- Given: native project state. When: component initialization, option updates and selection occur. Then: matching labels/value/disabled state, exactly one existing change event, safe literal labels and usable fallback on initialization failure.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-027.test.js`; assert state synchronization, no repeated replacement for unchanged inventory, invalid selection rejection, no event loop, fixed local JS/CSS routes and unchanged restrictive CSP. Verify generated assets reproduce from the pinned build inputs.
- Variants / negative cases: missing component, empty/loading/unavailable inventory, long duplicate project names distinguished by display path, hostile markup labels and stale selected IDs. No new persistence, authentication or provider calls.
- Cleanup: dispose owned controllers/listeners and temporary HTTP servers. Pass evidence: named assertions and deterministic build comparison; visual keyboard/focus behavior requires TC-028.

### TC-028: Rendered project menu and composer focus
- Journey / requirements: CUJ-014 / FR-045–046.
- Level / automation: manual; real browser with synthetic project/chat data, current kit bundle and existing CSP.
- Given: desktop 1280×800 and mobile 390×844/320×740. When: open menu by pointer and keyboard, navigate options/typeahead, select, dismiss with Escape, tab to Message and type a draft. Then: menu matches NED styling, selected option is apparent, long labels wrap/fit without page overflow, focus returns sensibly, and the composer has a visible neutral outer focus indicator with no blue textarea rectangle.
- Steps and assertions: capture open menu and focused composer; measure viewport/scroll widths, inspect accessibility names/selection and computed focus styles; switch left tabs and projects and verify exact draft/session retention. Check network/console for unexpected external asset requests or CSP violations. Exercise the native fallback with enhancement unavailable. Repeat keyboard-only navigation and 200% text/reflow.
- Variants / negative cases: no projects, disabled picker, inventory failure, clipped popup near viewport edges and enhancement failure; no automatic message submission. Close only test-owned fixtures after capturing evidence.
- Pass evidence: screenshots and browser interaction/geometry observations bound to the candidate. Written cases and unit tests do not establish a rendered pass.

Coverage: FR-045–046 → CUJ-014 → TC-027 and TC-028. The component adapter, locally bundled assets and neutral focus styling are implemented. Scoped desktop/mobile browser checks and automated adapter/build/HTTP coverage are recorded separately; existing broader feature gaps remain unchanged.

## Chat activity revision
- FR-041: Hide all tool calls/results and unknown structured assistant payloads, including tool-only empty bubbles. Preserve explicit conversational text and raw pagination offsets. Never infer progress from arbitrary shell JSON. This supersedes expandable-tool and raw-data fallbacks in FR-022/023 and TC-013.
- FR-042: Show Latest goal & task updates for the selected registered project from the connected database: latest goal/subgoal event and latest task/issue event, validated title/status/time only. Deliver via HTTP SSE, checking the database at most once per second. Clear stale content immediately on selection/disconnection. Hide without a selection; No updates yet for an empty ledger; Updates unavailable on failure. Read only, with no descriptions, actors or cross-project data.
### CUJ-015: Read conversation and project progress
Actor: project owner. Prerequisites: connected chat and registered project. Select project, read conversational text and latest work status, switch project. Success is readable text plus trustworthy progress without tool noise. Failures clear stale status and recover by reselecting or refreshing. This is critical to understanding agent outcomes.
### TC-029: Hidden tools and authoritative live progress
- Journey / requirements: CUJ-015 / FR-041–042.
- Level / automation: unit and HTTP integration; [tests/TC-029.test.js](tests/TC-029.test.js) and revised TC-013; browser procedure separately required.
- Preconditions / fixtures: temporary two-project SQLite database and synthetic mixed text/tool rows; no credentials.
- Given: distinct project events and unrelated shell JSON.
- When: project A is selected, its ledger changes, then B is selected or connection fails.
- Then: only text and latest selected-project validated status appear; no tool UI, empty tool bubbles, stale or cross-project progress.
- Steps and assertions: run TC-013 and TC-029 with `node --test`; assert hidden mixed/tool-only/unknown/malformed/large structured data, literal user JSON, bounded event projection, project isolation, missing DB and SSE updates. Browser: update a synthetic task during chat; observe status before chat completes; switch projects and disconnect; capture desktop and 320px with no overflow.
- Variants / negative cases: unselected hides panel, empty ledger shows No updates yet, invalid/oversized events fail closed, unregistered project unavailable, disconnected stream clears previous status. Pagination uses original rows. History controls occupy a wrapping normal-flow row above activity; at 320px and enlarged text, assert their bounding boxes do not intersect the activity heading/card or transcript. No writes or model calls.
- Cleanup: close owned streams/servers and delete temporary database. Pass evidence: named assertions plus separately audited browser evidence; written procedure alone is not a pass.
Coverage: FR-041–042 → CUJ-015 → TC-029.

Status: draft

Chat and the workspace controls described below are implemented; the complete workbench remains partial. Legacy artifact/task journeys and manual acceptance gaps are listed under Coverage and acceptance and Open questions and coverage gaps.
Related issues: integrated COM login [#142](https://github.com/DataNavAI/no-ego-dev/issues/142), native Hub OAuth [#140](https://github.com/DataNavAI/no-ego-dev/issues/140), Hub registration [#138](https://github.com/DataNavAI/no-ego-dev/issues/138), [#113](https://github.com/DataNavAI/no-ego-dev/issues/113), skeleton #114, CLI #115, projects/previews #116, artifacts #117, tasks #118, Retry focus [#131](https://github.com/DataNavAI/no-ego-dev/issues/131).

## User outcome and scope
### Desktop pane resizing enhancement
- FR-040: At widths of at least 768px, a visible focusable vertical separator resizes the preserved left Chat/Goals/Artifacts pane by pointer drag or Left/Right keys (16px; Shift 64px), Home and End. Left and Preview retain at least 320px each, with an 8px separator. Initial widths remain 360px above 1100px and 320px otherwise. Store the chosen width locally when storage is available; malformed or unavailable storage must not prevent use. Clamp the rendered width when the viewport shrinks without replacing chat nodes or losing drafts. Mobile retains the single-pane switch and has no separator.

### CUJ-013: Adjust conversation space
Actor: desktop chat user. Critical because longer messages need adjustable reading and writing width without losing Preview. Starting state: existing chat draft, desktop workspace. Drag the separator or focus it and use arrows/Home/End; continue typing; reload to restore the chosen width. Resize to mobile and back without losing selected tab/draft. Storage failure falls back to usable in-memory resizing; no network or session mutation occurs.

### TC-021: Desktop pane sizing and controller
- Purpose / journey / requirements: CUJ-013 / FR-040.
- Level / automation: unit and controller integration; [TC-021.test.js](tests/TC-021.test.js).
- Preconditions / fixtures: Node dependencies, synthetic elements/event targets/storage, widths 1280, 800, 768, 390; no gateway or credentials.
- Given: an initialized desktop separator. When: drag, keyboard, viewport and storage events occur. Then: exact bounded widths and ARIA values update; mobile disables/hides the separator, ends dragging and leaves workspace navigation intact.
- Steps and assertions: `node --test docs/features/communicator/tests/TC-021.test.js`; assert bounds/defaults, malformed storage fallback, keyboard increments/boundaries, pointer identity and cancellation, reload preference, unavailable storage, desktop/mobile transition and teardown. Pure sizing covers numeric boundaries; controller tests exercise actual exported wiring.
- Variants / negative cases: non-primary input and unrelated pointer IDs do not resize; storage exceptions do not escape; narrow viewport clamps saved width rather than corrupting it. No authentication/concurrent server writes are involved.
- Cleanup: dispose listeners and synthetic resources. Pass evidence: named automated assertions; geometry/actual pointer capture requires TC-022.

### TC-022: Rendered resizable pane acceptance
- Purpose / journey / requirements: CUJ-013 / FR-040.
- Level / automation: manual; actual COM with synthetic gateway/browser, independent QA and evidence audit.
- Preconditions / fixtures: desktop1280×800 and800×900, mobile390×844/320×844; a multiline synthetic draft, no personal conversation content.
- Given: ready desktop chat. When: drag right/left past bounds, use Tab/Arrow/Shift/Home/End, reload, shrink viewport and switch mobile Chat/Preview. Then: visible separator/focus and accurate ARIA values, no overlap/page overflow, preserved320px Preview, multiline input reflows without draft loss, persisted chosen desktop width, hidden nonfocusable mobile divider and unchanged pane navigation.
- Steps and assertions: capture default and resized desktop; measure both panes and separator; test pointer release/cancel and mobile crossing during drag; focus separator and exercise all keys; reload saved width; verify390/320px Chat and Preview with no horizontal overflow. Clear only test-owned width preference and close owned services.
- Variants / negative cases: disabled storage leaves resizing usable; desktop viewport shrinking clamps current width; mobile does not inherit desktop fixed tracks. No server side effects or message submission expected.
- Pass evidence: timestamped screenshots, dimensions and browser actions tied to frozen source. Written cases are not a pass.

Coverage: FR-040 → CUJ-013 → TC-021 (automated controller/bounds), TC-022 (manual rendered acceptance). Acceptance requires all automated assertions plus independently audited browser evidence; pending until performed.

Local NED users browse a selected project's work through a web app. Delivery is serial. #114 supplies server lifecycle and an honest navigation shell; it does not open databases/project folders or implement CLI/domain routes. Existing onboarding is separate. See [technical design](TECH_SPEC.md), [UI brief](design/ui-brief.md), [tokens](design/design-system.md) and [specimen](design/mockup.html).

Non-goals: provisioning remote hosting, multi-user auth, editing, GitHub sync, credential brokering, arbitrary app startup/build/deploy or duplicate artifact/task stores. The #114 server and navigation shell are implemented; skeleton acceptance is complete; project/preview implementation and domain acceptance are pending. Production must never show synthetic projects as registered data.

## Requirements
- FR-038: The message textarea automatically grows for typed, pasted and wrapped multiline text, and shrinks when text is deleted or a confirmed send clears the draft. It starts at 34px, grows to at most the smaller of 160px or 25% of the dynamic viewport height, then scrolls internally. Width changes and inserted links recalculate height. Existing Enter/Shift+Enter, focus, attachments, draft recovery and visible mobile send controls remain intact. Coverage: CUJ-008 / TC-010 autosize controller case plus focused rendered desktop/mobile acceptance.
- FR-031: The composer accepts up to four attachments, each at most 4 MiB and at most 16 MiB together: PNG, JPEG, WebP, UTF-8 TXT/MD/CSV/JSON, PDF and DOCX. All images together are at most 2 MiB per turn. Validate filename, declared MIME and file signature server-side, fully decode images with a 16-megapixel limit; reject unsupported, corrupt, empty, oversized or textless documents before a chat request. Extract documents as bounded plain text (128 KiB each), splitting text parts below Hermes' normalization cap; image content uses Hermes' supported image_url data parts. Do not claim OCR or native file upload support. Image-heavy history retains fifty stable chronological rows by adaptively splitting upstream requests, at most 64 reads under the existing fifteen-second deadline, with each upstream/browser response at most 4 MiB. Project inline image bytes into readable `Image attachment` text rather than showing opaque JSON or fetching remote media; individually oversized external rows fail safely.
- FR-032: Attachment receipts are opaque, session- and gateway-credential-bound, process-memory only, expire after fifteen minutes, and are capped at 64 MiB of original input / 32 receipts, including capacity reserved for uploads. Only two uploads/parsers may run concurrently; upload reads have a fifteen-second deadline and each parser runs in an isolated child with a 128-MiB V8 heap and ten-second deadline. Native decoding memory is separately bounded by file/16-megapixel limits. No arbitrary filesystem paths, URL fetching, external DOCX relationships or document scripts are permitted. DOCX archives have at most 256 entries, eight MiB total declared/actual uncompressed data, twelve path components, no encryption, duplicate entries, DTDs or external relationships; PDF extraction accepts at most 100 pages. Chat accepts each receipt once; rejection never calls Hermes. Restart/expiry requires removing and attaching the file again. Node20.19.0 or newer is required for supported parser dependencies.
- FR-033: Attach file opens the native multi-file picker. Show filename/status/removal chips and actionable errors; disable sending while uploads or chat are pending. Allow attachment-only sends. Retain text and chips after uncertain delivery and never replay automatically; clear only after confirmed delivery. Preserve Enter/Shift+Enter, focus and reader-position behavior.
- FR-034: Add link exposes URL and optional label fields with Insert link and Cancel. Only explicit credential-free HTTP(S) links can be inserted at the saved caret; reject malformed/unsafe links without changing the draft. Pasted URLs and inserted links are keyboard-accessible safe links in user messages, while other user text remains literal, including ordinary JSON arrays. Mixed native image records retain unknown/scalar data, replacing only image URLs. COM never fetches link targets. Controls reflow at 320px with existing 44px targets. Intrinsic composer sizing and bounded attachment/context scrolling keep Attach file, Add link, URL, Insert link and Send inside the viewport at 1280×844, 390×844 and 320×844 even with four long-named attachments and the link editor open; the whole page does not scroll to reach them.
- FR-023: After a send settles and input is enabled, return focus to the composer without scrolling, unless the user moved focus to another control while waiting. Keep duplicate-send and uncertain-delivery protections. User conversational text stays literal; assistant prose renders sanitized Markdown; tool calls/results and unknown structured assistant content are hidden under FR-041. Existing transport/message bounds remain. Coverage: CUJ-008 / TC-010 focus regression and TC-013 literal-user and sanitized-assistant rendering, plus focused browser verification.
- FR-020: On startup and Reload, ensure and open the single canonical gateway session `nedcom-main`, titled `NED Chat` with source `api_server`, then load its latest history before enabling input. Never select by recency, list sessions, or create a random session. The idempotent fixed-session ensure and GET history reads may retry HTTP 502/503/504 or fetch-level network TypeError at most twice after 250ms/750ms, using the identical canonical request or history offset. Keep input disabled until initial history succeeds; after exhaustion show the existing unavailable state and explicit Reload. Never retry aborts, timeouts, authorization/input failures, malformed successful responses, chat sends, attachment uploads or turn streams automatically. Each attempt retains privacy-safe diagnostics. This compensates for transient transport failures; it does not certify the underlying edge infrastructure as repaired. Failures remain recoverable without automatic message replay. No transcript, session identity, or credential is persisted in browser storage.
- FR-021: Enter in the message input submits through the same guarded form action as Send; Shift+Enter inserts a newline. IME composition, held-key repeats, empty input, busy and uncertain-delivery states never trigger a send. Coverage: CUJ-008 / TC-010 default-session and keyboard controller cases; live keyboard browser procedure in CHAT.md.
Chat extension: FR-011–014, CUJ-008 and TC-007/008 below govern chat; [CHAT.md](CHAT.md) supplies research, responsive design and connection details. These additions permit explicit authenticated chat writes while project/task/file browsing remains read-only; FR-007's read-only restriction applies to project data. The Antigravity-aligned conversation shell supersedes the earlier two- and three-pane compositions for chat-enabled NED COM.

Parent IDs remain stable:
- FR-001: `ned com` starts NEDCOM, reports usable local URL and handles startup/shutdown failures. #114 internal lifecycle; #115 CLI.
- FR-002: List registered projects; retain one explicit selected-project context. #116.
- FR-003: Read selected-project goals/subgoals/tasks/issues with hierarchy, state, ownership, blockers, dependencies, history and derived progress where available. #118.
- FR-004: Browse supported canonical artifacts without duplicate store/tracker. #117.
- FR-005: Open a configured running local Preview or explain unavailability; never build/start/deploy it. #116.
- FR-006: Reuse shared database resolution and task read semantics; explicit configuration > NED_DATABASE_URL > ~/.ned/ned.sqlite. Preserve unrelated data/project isolation. The #116 slice adds an explicitly readonly existing-database opener; no init/migration/chmod/mkdir or application writes. SQLite live WAL may coordinate through sidecars; record actual sidecar behavior separately from preserved database records/project files.
- FR-007: Loopback only and read-only; restrict files to registered selected project; reject traversal, symlink escapes, sensitive runtime/auth files and cross-project leaks. Safely render untrusted content. Skeleton owns HTTP perimeter; domain slices own data enforcement.
- FR-008: Loading, empty, folder/preview unavailable and database-error states recover without task/file changes. A keyboard-activated Retry restores focus to Retry when it remains actionable after settlement, or the content heading when Retry disappears. Never override focus moved to another control during loading; project/section navigation cancels the prior Retry focus intent. Skeleton owns shell states; actual domain recovery is planned.
- FR-009: Skeleton semantic responsive project-first shell follows A1–A6/UI-AC-01–05 in UI brief, with honest capability-unavailable state and no demo inventory.
- FR-010: Fixed assets and GET/HEAD health/capability contracts are stable; invalid local context/method/routes fail safely. Close is idempotent, releases listener, and startup rejection leaks no listener.
- FR-011: Chat uses a server-side authenticated, loopback-only, allowlisted Hermes adapter. Require exact Origin and JSON for writes; bound request/response sizes and duration. Browser never receives the configured key or raw provider errors.
- FR-012: Send and reopen the one persisted gateway-profile session independently of selected NED project. Single-flight UI writes; preserve drafts and require Reload after uncertain delivery. Never automatically replay a send.
- FR-013: Initially fetch latest 50 messages, progressively load older pages automatically on upward scrolling under FR-059, and render at most 200 message articles. Preserve the visible anchor when prepending and retain older reading position during a reply; Jump to latest restores recent messages and reconciles changed history. Respect reduced motion when scrolling.
- FR-013 continuation integrity: accept only bounded pages with unique stable message IDs. Before applying older/newer results, re-read the latest bounded page and compare its newest ID with the retained initial history head. Unexpected overlaps, changed head, missing or repeated IDs must preserve the current transcript/scroll position and require Latest/Reload reconciliation rather than displaying false successful continuation. Deliberate partial-newer-page overlap must match the retained boundary exactly.
- FR-014: NED uses a two-column preview-oriented workspace: a compact project toolbar, left pane with Chat, Goals and Artifacts tabs, and flexible main Preview. Goals replaces the visible name Goal & Tasks; the internal Tasks key remains compatible. There is no right inspector. Selecting a left tab shows its single panel, marks the selected tab, supports Arrow/Home/End tab navigation and preserves the one NED Chat session, draft and transcript DOM. Repeating a selected tab keeps it open. Goals and Artifacts remain selectable before project selection so their panel explains the next step. Preview retains truthful loading, availability and recovery states and opens a validated local app explicitly in a new tab; no embedding or automatic startup. Below 768px Preview is initial, a left-pane/Preview workspace switch shows one interactive workspace; selecting the left pane restores its selected tab. Hidden panels/workspaces are inert. All retry, delivery, isolation and stale-response protections remain.
- FR-024: Same-origin JSON POST `/api/chat/sessions/fixed` accepts only an empty object and resolves one fixed identity. It GETs `/api/sessions/nedcom-main`; only a 404 permits POST `/api/sessions` with exact `{id:"nedcom-main",title:"NED Chat",source:"api_server"}`. A create 409 permits one bounded re-GET for a concurrent winner. Every successful response must match all three identity fields; malformed, mismatched, redirected, oversized, title-conflict, timeout, or other provider responses fail with sanitized unavailability and never scan, rename, adopt, delete, or mutate unrelated sessions. A later explicit ensure may recreate the same ID after external deletion without replaying messages. Resolution has no cache, so endpoint/key changes use their own gateway context.
- FR-015: By default connect to the local Hermes profile selected by HERMES_HOME, otherwise ~/.hermes. Read its API endpoint and credential server-side from config.yaml/.env without exporting unrelated credentials. Explicit NED_HERMES_URL/NED_HERMES_API_KEY override discovery; explicit remote endpoint configuration never receives a discovered profile credential. Default host is literal 127.0.0.1, port 8642. Re-read local settings on each request so Retry observes configuration/credential changes. Missing/malformed/insecure profile settings yield sanitized unavailability; never initialize a profile or silently start/reconfigure a gateway from NED COM.

- FR-016: A stable NED_INSTANCE_NAME (default: the normalized operating-system hostname), the selected Hub origin and an explicit or saved Hub credential configure authenticated automatic registration only after COM listens; optional NED_HUB_NAME defaults to slug. Slugs match authoritative Hub admission: first lowercase letter, then 2–39 lowercase letters/digits/hyphens, excluding api/auth/tunnel/healthz/assets/connect/favicon/robots/login/logout; retained trailing-hyphen identities remain valid. A saved per-origin token automatically connects COM using the default hostname. Fresh installations without credentials or explicit registration configuration remain local-only. Explicit invalid names reject before credential/network access. Hostnames normalize to lowercase ASCII letters/digits/hyphens, prefixed with ned- when needed for a lowercase initial letter, padded to at least three and truncated to forty characters; reserved results receive ned- prefix. Hostname collisions require an explicit distinct NED_INSTANCE_NAME; permanent claims never transfer. Obsolete NED_HUB_ENV/NED_HUB_SLUG reject with migration guidance before credential/network access. Partial/invalid configuration exits 2 with sanitized guidance. Remote origins require HTTPS and tokens stay server-side.
- FR-017: Register via bearer POST /api/instances with {slug,name}; retry transient failures using bounded backoff, including reconnect with unchanged identity. Registration 400/401/403/409 stops remote retries while local COM remains available. Never follow redirects or send credentials to an untrusted returned tunnel endpoint. Default trusted proxy is proxy.<Hub hostname>; explicit NED_HUB_PROXY_URL overrides it (required for differing local proxy ports). For loopback-only local API/proxy origins, NED_HUB_INSTANCE_ORIGINS defaults false (shared origin) and explicit true uses slug.localhost; remote origins require isolation and reject false. Other mode values reject. API and proxy URLs are HTTP(S) origins without credentials, path, query or fragment.
- FR-018: Stream authenticated Hub HTTP traffic to loopback COM without buffering responses. At most 64 concurrent channels; bounded registration body, connection deadlines, heartbeat and idle resources; stop releases timers, sockets and listeners. Validate forwarded instance host, scheme, slug and exact browser Origin before translating Host/Origin to the local COM origin. Preserve unchanged local COM perimeter. The bridge has no public listener; only token-authenticated outbound data channels reach it.

- FR-019: `ned com --login [--no-browser]` uses external-browser authorization code OAuth with S256 PKCE, random state and an ephemeral `http://127.0.0.1:<port>/oauth/callback`; the default issuer is https://staging.hub.datanav.app; NED_ENV=production selects https://hub.datanav.app. NED_HUB_URL overrides either for validated custom/local origins, and unknown NED_ENV values reject. There is no public --hub option or ned hub subcommand. The Hub public client is `ned-cli`. No Google client secret, provider access token or refresh token is handled by NED CLI. After successful login COM starts and registers the configured or default instance name. A cached token is validated by bounded no-redirect GET /api/oauth/token: valid matching account reuses the same token without browser or issuance; only HTTP401 starts fresh OAuth. Other errors preserve credentials and fail closed. With --login an explicit NED_HUB_TOKEN is rejected before browser or server side effects to avoid account ambiguity. Failed login never starts COM. --no-browser is valid only with --login. A five-minute deadline, SIGINT/SIGTERM and exact callback Host/path/state validation bound the attempt. No secrets appear in URLs or output.
- FR-020: Exchange the single callback code by JSON POST to the exact configured origin's /api/oauth/token without redirects, with bounded response and timeout. Require a Bearer ned_ token, token identity and account shape before atomically saving per-canonical-origin credentials under ~/.ned/hub-credentials (directory0700/file0600, owned regular files, no symlinks or unsafe write permissions). Failed/denied/cancelled login preserves existing credentials. Atomic replacement is authoritative: auxiliary lock cleanup failure returns successful login with a fixed recovery warning and must never revoke the saved credential. COM uses explicit NED_HUB_TOKEN first, then the configured origin's saved token; absent credentials and explicit registration configuration remains local-only.
- FR-021: `ned com --logout` sends native bearer DELETE /api/oauth/token, accepts 204 or already-revoked401, then removes only the matching local credential. Network/server failure returns1 and retains it for retry. No saved credential succeeds without a network request. Logout is terminal and does not start COM; conflicting login/logout or server flags reject. No global provider logout or other Hub credential deletion occurs. Local removal is authoritative: a later lock cleanup failure keeps the successful logout result and reports recovery guidance instead of falsely claiming credentials were retained. Failures before mutation still propagate; cleanup never removes a replacement lock.

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
Actor: local project owner; critical first useful project workbench. Prerequisites: existing schema-v1 NED DB with registered canonical directories; app started separately. Start NEDCOM, choose a project by readable folder context, inspect Tasks/Artifacts placeholders or Preview, open reachable app, change projects and retry failures. No automatic selection. Repeat refresh reads current registry/config; CLI registry changes appear on next request. Missing DB/schema/empty registry/folder/removed project produce distinct recoverable states without application writes. Preview failure never breaks valid project selection. Interrupted/stale reads cannot restore another project's link; shutdown closes every DB/probe handle.

### CUJ-010: Authenticate the native CLI with the Hub
Actor: COM operator; priority P1. Starting state: a selected Hub origin and a browser account eligible for that Hub. Run `ned com --login` (optionally select NED_ENV or NED_HUB_URL), approve the named CLI request in the browser, and return to the terminal. Success saves a private per-origin credential and subsequent configured COM startup uses it without copying a token. Denial, timeout, interruption, malformed callback, wrong state or failed exchange leave the previous credential unchanged. `ned com --logout` revokes the saved token and then removes that matching local credential; offline failure keeps it for retry. This is critical because browser identity must never be guessed or copied across Hub origins.

### CUJ-009: Connect running COM through NED Hub
Actor: an invited Hub owner with a CLI token and permanent instance slug. Set the variables described in [Hub setup](HUB.md), run ned com and open that instance from Hub. Local URL prints first; remote registration occurs after readiness. Repeated starts use the same slug. A transient Hub outage reports offline/retrying while local access remains usable; recovery registers the same identity and resumes the tunnel. Invalid/revoked credentials require a new token/restart. SIGINT/SIGTERM closes remote and local resources. This journey is critical because browser registration is intentionally absent.

### CUJ-008: Converse and resume long sessions
Actor: configured Hermes gateway owner; critical because communication must remain usable while inspecting project work. Starting state: local NED COM and private API server/key configured. First and repeat use ensure `nedcom-main` and resume its latest page under the fixed `NED Chat` heading. Scroll upward to load older messages automatically and use Jump to latest to return; no Load older/newer controls are exposed. Gateway outage preserves draft and offers Reload; uncertain sends require reconciliation before another send. A reader scrolling up during a reply retains their transcript and sees Jump to latest when new replies are available; history pagination pauses until reconciled. Success: the same persisted gateway turn survives browser refresh and COM restart without browser transcript storage or adoption of unrelated sessions. Cleanup closes browser/server, retaining gateway sessions. Project choice never relabels or rebinds the chat.

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

### TC-006: Preview validation, probe, stale selection and workspace navigation
- Purpose / journey / requirements: truthful safe WIP access; CUJ-005 / FR-002, FR-005, FR-007–009.
- Level / automation: integration and client-state assertions; [tests/TC-006.test.js](tests/TC-006.test.js).
- Preconditions / fixtures: TC-005 projects; temporary preview HTTP servers with HEAD 204, 302, 500 and >1s delay; fixed `.nedcom.json` configs; injected deferred client responses. No actual project execution.
- Given: selected registered project, no cached authority for preview link.
- When: read detail/preview, vary config/probe, Retry or switch selected ID while old success/error is pending.
- Then: validated configured HEAD 2xx -> available with safe URL; absent config -> unconfigured; invalid config/URL -> invalid; unreadable config -> unavailable; timeout/refused/non2xx/redirect -> stopped. Detail remains selected. Only available current response produces Open app link with target=_blank, rel=noopener noreferrer and accessible new-tab label. Switch/retry immediately removes link; stale successes and errors ignored; chooser remains enabled during detail load; Retry single-flight for current generation.
- Steps and assertions: assert 4096-byte config bound, HEAD/no credentials/no redirects/<bounded completion>, full raw URL validation before normalization, no query/body data or unsafe target traffic, zero app spawn/build/write calls; inspect task/artifact placeholders and refresh config recovery.
- Shipped-client regression: defer project A detail, select and settle B first, then resolve A; chooser, current section and preview link must remain B's. While the same project's detail is held, changing to Tasks must survive settlement. Execute both navigation variants through the actual shipped client, not just the pure state helper; resolve network data before consulting the current controller state.
- Variants / negative cases: missing config, >4096 bytes, non-object/malformed/unknown keys/wrong version/nonstring URL, symlink config, path-root escape; remote hostname/localhost/nonliteral IP/nonloopback/alternate numeral IPv4/userinfo/query/fragment/HTTPS/missing explicit port; HEAD 200/204 success, 302 denied without follow, 500/refused/timeout stopped; delayed A after B success/error and after same-project retry; invalid config never probes. Only exact IPv4 127.0.0.1 accepted this revision, IPv6 deferred.
- Cleanup: close probe fixture servers/client requests and temp files; restore intercepted browser traffic.
- Pass evidence: named validation/probe/stale-response assertions, byte/record preservation, TC-003 desktop/mobile running/unavailable/retry/duplicate-name keyboard/link evidence at candidate SHA. No source-only browser pass.

### TC-016: Native OAuth, credential isolation and COM reuse
- Purpose / journey / requirements: CUJ-010 / FR-019–021; authenticate public native clients without exposing credentials to URLs or terminal logs.
- Level / automation: integration; [tests/TC-016.test.js](tests/TC-016.test.js), local HTTP issuer/browser callback and real private temporary credential files.
- Preconditions / fixtures: Node20+, synthetic issuer using the frozen Hub public client `ned-cli`, fresh temporary home, no live provider credentials. Hub origin is defaulted or explicitly overridden; HTTP is permitted only for loopback fixtures.
- Given: a fresh or previously authenticated native installation with an optional stable configured COM slug.
- When: login starts, the browser fixture returns an authorization code, and the CLI exchanges its original PKCE verifier; repeat with wrong state/Host/path, denial, timeout, cancellation, exchange failure and logout failure.
- Then: callback listener is loopback-only and bounded; only the exact successful code/state exchange writes a private credential. Tokens/verifiers never appear in the browser URL or output. Failures preserve the prior credential; logout revokes then removes only the matching saved token. Different Hub origins cannot reuse it. COM prefers an explicit environment token and otherwise loads only its configured Hub's saved credential after valid configuration. Explicit tokens are rejected with --login; normal startup retains explicit-token precedence.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-016.test.js`; named cases assert renamed environment variables, hostname default and invalid legacy rejection, persistent token reuse and revocation/transient validation, staging/production/custom selection, removed command/flags, login-before-COM and failed/interrupted login cleanup, S256 challenge, exact redirect/token endpoint with redirect rejection, callback validation and single settlement, mode0700 directories/mode0600 files, unsafe/symlink rejection, host separation, logout semantics and COM token selection.
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

### TC-007: Hermes session transport and bounded history window
- Purpose / journey / requirements: CUJ-003/008; FR-007, FR-011–013; preserve credentials and persistent session identity while paging long history.
- Level / automation: integration; [tests/TC-007.test.js](tests/TC-007.test.js).
- Preconditions / fixtures: Node dependencies; isolated synthetic loopback HTTP gateway, synthetic key, no real gateway or DB; zero initial calls. In-memory chronological 10,000-message sequence for window logic.
- Given: NED COM configured with the synthetic gateway.
- When: list, create, read history offset 50, send one turn, then submit forbidden or invalid requests.
- Then: exact gateway source/limit/order/offset and Bearer header; browser responses contain only projected fields. Invalid requests never reach gateway. Missing key/provider error yields sanitized 503; unsafe configured URL rejects startup. History windows preserve order, contain distinct rows and never exceed 200 entries after 99 prepend pages and a newer page.
- Steps and assertions: execute `node --test docs/features/communicator/tests/TC-007.test.js`; named HTTP test checks precise paths, bodies, response projections, 403 missing/foreign Origin/wrong MIME, 400 empty/oversized input/bad pagination, 413 byte bound and 404 unknown route. Named history test checks chronological boundaries and cap at every page.
- Variants / negative cases: provider redirect, malformed JSON and oversized response return sanitized failures automatically (turn-status failure for accepted sends, HTTP503 for reads). Network timeout and interrupted sends also need browser/manual acceptance below; process environment never uses production auth. COM serializes pending sends per gateway/session; independent clients bypassing COM remain gateway-owned. Client double-send is TC-008.
- Cleanup: runner closes all fixture sockets and servers; no DB/project files written.
- Pass evidence: two named automated tests; browser behavior is separate.

### TC-008: Desktop/mobile chat and long-session recovery
- Purpose / journey / requirements: CUJ-008; FR-012–014, working middle pane and default mobile navigation.
- Level / automation: manual; [CHAT.md procedure](CHAT.md#browser-acceptance-procedure-spec-tc-008).
- Preconditions / fixtures: synthetic gateway with canonical session, 10,000 messages, unrelated sessions, deferred response and hostile text; browser at 1280×800, 390×844, 320px, reduced motion and 200% text. No real gateway data.
- Given: latest 50 messages in selected session; When load older/newer, send, refresh, switch mobile View and recover failures; Then DOM <=200 message articles, anchor preserved, recent history reachable, only one send pending, draft retained on uncertain outcome, Reload required before another send, mobile defaults Chat and Project remains reachable.
- Steps and assertions: follow the linked ordered procedure, capture desktop/mobile and error states, inspect network pagination and text safety, test keyboard focus and scrolling during delayed replies. Verify refreshed transcript from gateway, no token or transcript in browser storage, no horizontal overflow. Network disconnection does not claim agent cancellation.
- Variants / negative cases: offline/missing key, deleted session, malformed/large reply, ambiguous delivery, delayed history selection, long content; explicit Retry for reads only. Detailed procedure includes cleanup and pass evidence.
- Cleanup: close browser/server and remove only test-owned fixtures; retain redacted evidence outside runtime state.
- Pass evidence: real rendered screenshots, keyboard/geometry/network assertions and independent review; no live-model pass implied.

### TC-009: Default local Hermes connection discovery
- Purpose / journey / requirements: CUJ-008 / FR-011, FR-015; connect existing local Hermes without copying credentials into NED configuration.
- Level / automation: integration; [tests/TC-009.test.js](tests/TC-009.test.js).
- Preconditions / fixtures: temporary home with private .hermes/.env, synthetic gateway HTTP listener, no real HOME/auth; optional YAML at selected HERMES_HOME. Initial listener observations empty.
- Given: configured local Hermes profile and no NED_HERMES overrides; When NED COM lists sessions; Then the discovered endpoint receives its profile's bearer key, browser receives only projected session fields. Replacing the private key is observed on next request without restarting COM.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-009.test.js`. Assert exact synthetic bearer header/path, default port 8642 when unconfigured, environment > dotenv > YAML precedence, gateway.api_server > top-level platforms > gateway.platforms merging with extra precedence, explicit overrides and isolated HERMES_HOME, and no mutation of provided environment.
- Variants / negative cases: a different explicit endpoint receives no discovered key; malformed YAML, symlink .env, oversized settings and invalid port fail without unsafe traffic. Missing files leave gateway unavailable without creating any profile. Browser error is sanitized; unrelated settings never appear in response. Both .env and credential-bearing YAML require current-user/private POSIX permissions checked from the opened file metadata. Real permission tests and a mocked process UID against real file metadata cover both rejection paths; UID comparison is inapplicable on platforms without process.getuid. Concurrent reads use independent file handles; config rotation may produce safe temporary unavailability, recovered by Reload.
- Cleanup: close listener/COM and remove only temporary profile fixture; real gateway/model testing remains separately evidenced.
- Pass evidence: named discovery/credential-isolation assertions; live browser session creation, minimal test prompt, reload/persisted history readback and deletion of test-owned session recorded in CHAT_ACCEPTANCE.md.

## Coverage and acceptance

### Asynchronous public-tunnel turns (2026-10-26)
- FR-018: A validated chat POST returns HTTP 202 with an opaque turn ID before Hermes completes. Same-origin GET `/api/chat/sessions/:session/turns/:turn` returns pending/completed/failed; each request is short, and browser polling never resends input. Only the accepting session and unchanged gateway credential context can observe a turn. Completed replies must identify the accepting session.
- FR-019: COM owns at most 16 in-memory turns (each upstream response bounded to 4 MiB), with one pending turn per session/gateway context. Concurrent sends return 409 without upstream side effects. Pending work survives browser disconnect, times out after ten minutes, and terminal results expire after fifteen minutes. Capacity exhaustion returns 503; process restart loses transient status, not Hermes history. Unknown/expired status returns 404; browser retains the draft and requires Reload, never automatically replaying.

### TC-012: Short asynchronous turn requests and bounded ownership
- Journey / requirements: CUJ-008/009 / FR-018–019, FR-012.
- Level / automation: focused HTTP integration in [tests/TC-012.test.js](tests/TC-012.test.js); shipped controller unit assertions in TC-010.
- Preconditions / fixtures: isolated COM and deferred synthetic loopback gateway, synthetic key and sessions; no real credentials or persisted state.
- Given: the gateway holds a reply beyond the accepting HTTP response.
- When: send once, poll while pending, attempt competing send, then release reply.
- Then: POST completes202, pending GET completes200, duplicate is409 with exactly one upstream request, completed status contains only the matching assistant reply; cross-session/unknown IDs404. Failed or mismatched replies are sanitized, never replayed. Closing the accepting connection does not cancel the pending upstream turn.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-012.test.js docs/features/communicator/tests/TC-010.test.js`. Exercise capacity, credential context rotation, expiry using injected clock, and shutdown/unknown status. Public browser acceptance must repeat the actual130-second tunnel journey without524 or manual Reload; lower-layer tests do not certify provider policy.
- Variants / negative cases: invalid input and origin keep existing TC-007 perimeter; restart/expired job remains ambiguous and reconciles through existing history Reload. No replay/idempotency claim across process restart; only explicit user send starts a turn.
- Cleanup / pass evidence: close owned servers and deferred replies, remove fixtures; named assertions plus separately audited public-URL report. Mapping FR-018/019 → CUJ-008/009 → TC-012/TC-010.
### TC-010: Chat controller unit regressions
- Purpose / journey / requirements: CUJ-008 / FR-012–014; deterministic asynchronous controller coverage without a browser or live gateway.
- Level / automation: unit/client integration; [tests/TC-010.test.js](tests/TC-010.test.js), isolated DOM and deferred network boundary in [tests/chat-harness.js](tests/chat-harness.js).
- Preconditions / fixtures: load shipped controller in an isolated VM, fake semantic elements, synthetic session IDs and 50-row chronological pages, no persisted state or credentials.
- Given: the canonical session is ensured; When duplicate submit, send/readback failure, recovery, reader scroll and history pagination occur; Then one pending send, unchanged failed draft, Send disabled until successful Reload, stable reading content and a chronological unique 200-row history window.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-010.test.js`; named assertions prove no automatic replay and next action identity, full/partial-page boundaries, reduced-motion instant versus smooth scroll intent, safe text rendering and mobile View state.
- Variants / negative cases: failed post-send read, disabled duplicate send, 225-message partial oldest page with 25-row overlap on returning newer, hostile content, unexpected overlapping pages after an external append, a whole-page external append detected by retained head, and repeated/missing IDs. Rejected continuation preserves the old transcript and scroll, disables further paging and recovers through Latest. Browser geometry, real scroll animation and provider persistence remain TC-008/live acceptance; not asserted by simulated DOM.
- Cleanup: discard isolated VM and deferred requests per case; no files, network sockets or environment changes.
- Pass evidence: named controller tests plus TC-007 unit paging test, TC-009 settings boundary tests and TC-014 fixed-session integration; source loading alone is not a pass.

### TC-014: Single persistent named NED chat
- Purpose / journey / requirements: CUJ-008 / FR-012, FR-014, FR-020, FR-024; prove fixed identity persistence and fail-closed creation at the actual COM-to-gateway HTTP boundary.
- Level / automation: focused integration; [tests/TC-014.test.js](tests/TC-014.test.js).
- Preconditions / fixtures: isolated synthetic loopback gateways with in-memory rows, synthetic keys, canonical/unrelated/conflicting records and no real Hermes DB or credentials. Initial state varies by named subcase.
- Given: a gateway with the canonical row, no canonical row, a concurrent creator, a conflicting identity/title, a different endpoint, or malformed/unavailable responses.
- When: POST the empty object to `/api/chat/sessions/fixed`, repeat concurrently, refresh, or restart COM.
- Then: exact existing identity is reused; absence creates only `{id:"nedcom-main",title:"NED Chat",source:"api_server"}`; a 409 race performs one successful canonical re-read; restart and refresh retain the ID; separate gateway contexts create/reuse independently. Unrelated rows remain byte-for-byte equivalent in the fixture. Mismatch, title conflict, malformed JSON and provider failure return sanitized 503 without adoption or mutation.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-014.test.js`; assert exact upstream methods/paths/body, returned projection, final row sets and no upstream call for foreign-origin, wrong-MIME, array or nonempty-object requests.
- Variants / negative cases: existing wrong source/title, unrelated row owning the title, malformed JSON, provider 503, concurrent ensure, COM restart, endpoint isolation, foreign Origin and invalid bodies. Timeout/ambiguous live transport uses the same GET-before-create retry rule but is not wall-clock tested here; real gateway persistence is manual acceptance.
- Cleanup: close every owned COM/gateway listener; discard in-memory rows. No real session, DB, browser storage or profile is touched.
- Pass evidence: named integration assertions; browser appearance and a real Hermes restart remain TC-008/manual evidence.

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


| FR-011/012 | CUJ-008 | TC-007 transport; TC-010 controller; TC-014 fixed identity; TC-008 browser/live acceptance |
| FR-013/014 | CUJ-008 | TC-007 window; TC-010 controller; TC-014 fixed UI identity; TC-008 browser acceptance |
| FR-015 | CUJ-008 | TC-009 discovery and credential isolation; CHAT_ACCEPTANCE.md live default gateway |
| FR-020/024 | CUJ-008 | TC-010 initialization; TC-014 fixed-session integration; TC-008 browser acceptance |

Skeleton acceptance needs TC-001/002 automated, TC-003 rendered evidence and onboarding regression. Before commit run lint, all Node/spec cases and Python pytest. Parent closure additionally needs all serial domain/CLI cases and integrated two-project/CLI-refresh/preview evidence.

## Attachment and link acceptance
### CUJ-011: Send context as files and links
Actor: local or authenticated remote COM owner. Critical because context must arrive in the existing Hermes conversation without unsupported file payloads or unsafe server-side URL fetching. Start with the canonical session/history loaded and an empty draft. Attach a supported file, inspect its ready chip, optionally remove/reselect it, add an HTTP(S) link at the message caret, then Send or press Enter. Success: exactly one Hermes turn includes verified image bytes or complete bounded document text and the link; confirmation clears files/text and retains normal reader/focus behavior. First use with no text supports attachment-only sends. Interrupted upload is removable and retryable; rejected files retain draft/other files. Uncertain delivery retains context, disables sending until Reload and never replays. Expired/used receipts require explicit removal/reattachment. Stop COM to clear transient receipts without deleting gateway history. No cross-session/profile adoption is allowed.

### TC-017: Bounded attachment transport and link-composer regression
- Purpose / journey / requirements: CUJ-011 / FR-031–034. Prove real parser and HTTP trust boundaries plus shipped-controller state transitions at the smallest reliable layers.
- Level / automation: integration and unit; [TC-017.test.js](tests/TC-017.test.js), named parser/validation/capacity/HTTP/history/link/controller cases; synthetic builders in [media-fixtures.js](tests/media-fixtures.js), existing [chat harness](tests/chat-harness.js).
- Preconditions / fixtures: Node >=20.19, installed pinned dependencies, isolated loopback gateway with synthetic key; initial in-memory receipt/turn stores empty. Minimal genuine PDF/DOCX builders and Sharp-generated PNG/JPEG/WebP contain synthetic content; no real profiles/tokens or files are read.
- Given: ready canonical chat and selected synthetic file. When: upload then submit its receipt. Then: exactly one supported Hermes text/image turn is accepted; receipt ownership, single-use and bounds apply before upstream side effects.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-017.test.js`; every named test exits successfully. Extract exact synthetic PDF/DOCX text, decode all three image formats, reject invalid type/signature/corruption/UTF-8/JSON/empty/oversized/archive-declared bomb/external relationships; preserve 128-KiB text via parts <=60000 characters. Two held uploads reject a third; 32 retained receipts reject another. Aggregate images over two MiB reject before consumption. Real COM enforces Origin, MIME, session/key binding, 201 receipt and 202 turn; replay returns 400 and no second gateway request. Two image-heavy history pages preserve all fifty ordered IDs with no data URLs. Link unit case preserves selected surrounding text and caret; unsafe/credential-bearing/overlength links reject. Actual controller blocks Enter while uploading, sends attachment-only once, retains uncertainty, handles removal before upload completion and keeps draft after rejection; editor restores saved caret/focus.
- Variants / negative cases: expiry uses injected clock; rotation and foreign session cannot consume receipts; malformed and duplicate receipt IDs never call Hermes. Browser disconnect/retry is covered by existing TC-012 turn semantics plus TC-018 browser procedure. Restart removes transient receipts by construction; no persistence files are created. Missing gateway credentials retain existing TC-009 coverage. Concurrent parsing and process deadline/memory stress are bounded implementation controls; no claim of an operating-system RSS hard limit.
- Cleanup: registered teardown closes COM/gateway sockets and worker children; receipt stores close, no filesystem artifacts or remote side effects remain.
- Pass evidence: complete Node TAP/log with zero failures/skips and focused RED/GREEN mutation for unsafe links; parser fixture failures must be assertion failures, not missing-dependency skips.
- Regression: the named image-projection case covers ordinary numeric/string/object/typed-text/malformed JSON strings and actual ordinary arrays unchanged, plus mixed native image/text/unknown objects/scalars retaining every non-image field and no data URL. Capture assertion RED on `[1,2]`, then GREEN after correction; image-heavy chronological paging remains covered independently.

### Composer presentation refinement
- FR-039: The existing composer presents one softly bordered rounded card with a readable growing prompt, compact footer containing visible Attach file and Add link actions, a static Hermes label and a distinct 44px Send action. Supported file limits use a keyboard-operable collapsed disclosure. Attachment chips and the link editor remain in the bounded context scroller; footer actions remain reachable at 320px with four long filenames and a maximum-height draft. Preserve FR-038 sizing, Enter/Shift+Enter, focus, pending/uncertain states and all upload/link/stream contracts. No provider/model selector or unsupported controls are introduced. Governing visual contract: UI-AC-16 in [ui-brief](design/ui-brief.md).
- Coverage: FR-039 → CUJ-008 / CUJ-011 / CUJ-012 → TC-010 existing controller regressions, TC-018 and TC-020 rendered procedures. At 1280×800, 390×844 and 320×844, capture empty, focused draft, wrapped/multiline capped draft, ready/disabled send, four long selected filenames, open Supported files, URL validation and streaming states. Assert no page overflow, 44px non-overlapping actions, visible focus, footer reachability and unchanged left tabs/Preview. Expand/collapse Supported files by keyboard, insert/cancel a link and remove a file. Repeat at 200% text. Use synthetic data; cleanup closes owned fixtures. A screenshot or this written procedure is not a pass; independent rendered evidence remains required.

### TC-018: Rendered attachment and link journey
- Purpose / journey / requirements: CUJ-011 / FR-031–034. Verify the irreducible browser-native picker, focus, layout and actual rendered hyperlinks; do not duplicate parser-format permutations already automated below the UI.
- Level / automation: manual; fresh QA executor uses actual Chrome and a real isolated COM server with a contract-tested synthetic Hermes gateway. Live default Hermes compatibility is separate authorized provider evidence.
- Preconditions / fixtures: test-owned TXT/PDF/DOCX and genuine PNG outside the repository; canonical synthetic `nedcom-main`; empty receipt store. Desktop1280×800, mobile390×844 and320px; public/Hub URL where available uses isolated test sessions, never arbitrary existing user conversations.
- Given: ready chat with draft text. When: Attach file, choose image/document, add a labeled HTTPS link and send. Then: ready/removal chips are keyboard/touch reachable, exactly one supported turn reaches gateway, confirmation clears context, persisted history shows human-readable attachment text and safe clickable links.
- Steps and assertions: choose representative image and document through native picker; inspect pending disabled Send and ready chip; remove and reselect; insert link at an interior caret, cancel another editor and reject `javascript:`, credential URL and malformed URL without draft change. Paste an HTTP(S) URL; confirm actual user anchor href and no COM URL-fetch network requests. Send once (including attachment-only Enter); confirm upstream parts and persisted user/assistant content, focus restoration and no duplicate send. Hold/fail upload and turn separately; preserve draft/files on uncertainty, no replay, Reload recovers and used receipt rejection gives actionable reattach guidance. Reload a long image-heavy page; retain stable fifty-row paging with no base64/remote image request. Capture desktop/mobile/320px, 44px targets, keyboard order and no horizontal overflow.
- Variants / negative cases: unsupported/oversized files produce inline actionable errors and preserve other context; fixture gateway offline, removed uploading chip and navigation must not adopt stale receipts. Browser/server restart loses receipt tracking only; no transcript deletion or cancellation guarantee. Auth failures follow existing Hub/public perimeter cases; no bypass or real credential exposure.
- Cleanup: stop test-owned browser/servers/tunnels, remove only owned synthetic sessions, freeze redacted screenshots/network observations/report manifest outside repository.
- Pass evidence: fresh independent QA report with exact source identity and artifact hashes, subsequently approved by independent evidence audit; written procedure alone is NOT RUN.

| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-031–032 | CUJ-011 | TC-017, TC-018 | Real parser, receipt/HTTP/history named cases; rendered picker/send procedure |
| FR-033–034 | CUJ-011 | TC-017, TC-018 | Actual-controller and link unit cases; browser focus/anchor/geometry procedure |

Attachment/link implementation is present; TC-018 browser acceptance is recorded separately from automated tests.

### Progressive assistant replies (planned until acceptance)
- FR-035: Accepted chat turns consume the local Hermes session SSE endpoint in a background job. After the existing HTTP202 acceptance, the browser opens one GET `/api/chat/sessions/:session/turns/:turn/events` HTTP response with `text/event-stream` and consumes incremental bytes with a UTF-8 response-body reader; it does not poll status. The server flushes headers immediately, emits cursor-validated delta frames of at most16384 UTF-16 characters, batches notifications at50ms, and sends comment heartbeats at most10seconds apart while writable. A successful terminal frame follows all retained prose and contains the authoritative final response. Final-only responses are not simulated as token streams. At most four subscribers per turn and64 overall are admitted; excess receives429 before streaming headers. A backpressured subscriber waits for drain without a per-subscriber prose queue. Disconnect releases only that subscriber, never cancels/replays the accepted job. The existing status GET remains compatible, including its optional bounded legacy wait, but is not used by the browser. Missing/malformed/interrupted streams require explicit Reload without automatic reconnect or resubmission. Incremental prose and authoritative final content are each bounded to4MiB and expire with the turn.
- FR-036: A pending turn renders one incrementally updated, literal assistant bubble before completion; completed history uses the existing sanitized Markdown renderer. A reader following the bottom follows new prose; a reader scrolled away keeps their reading position. At most 200 transcript articles remain mounted, and busy/attachment/draft/Enter/focus safeguards remain intact.
- FR-037: Streaming validates upstream session, run, message and distinct positive sequence identities; it requires successful assistant completion, run completion and done. Browser framing validates contiguous cursors, accepting turn/session identity, bounded frames and a successful terminal response, including UTF-8 and EOF integrity. Raw runtime metadata, reasoning, tool arguments/previews and upstream errors never reach the browser. Stream wire/text/frame/line and retained-turn limits bound memory. Session and gateway-credential context isolate every subscription. Restart/credential rotation and failed streaming retain the explicit Reload/no-replay semantics.

### CUJ-012: Read an assistant reply while it is being produced
Actor: chat user. Critical because long replies must become useful before provider completion over one continuously streamed HTTP response. Prerequisites: ready canonical chat, authenticated local Hermes with session streaming. Starting state: loaded history and draft/optional ready attachments. Submit once; observe early assistant prose while the run is pending; scroll away and back; observe terminal reply rendered as safe Markdown. Success: one delivery, one live bubble and persisted final history. On stream/provider failure keep the draft and require Reload; do not automatically resubmit. Cleanup removes only test-owned synthetic sessions and processes.

### TC-019: Streaming protocol and actual-controller regression
- Purpose / journey / requirements: CUJ-012 / FR-035–037.
- Level / automation: unit and HTTP/client integration; [TC-019.test.js](tests/TC-019.test.js), shared synthetic SSE fixture in [stream-fixtures.js](tests/stream-fixtures.js).
- Preconditions / fixtures: installed Node dependencies; isolated synthetic gateway/key and empty turns; fragmented UTF-8/CRLF SSE fixtures, no real credentials/history.
- Given: an accepted turn. When: incremental chunks, tool metadata and terminal events arrive. Then: pending prose arrives before completion, bounded cursor pages preserve exact prose, and only a complete validated run becomes completed.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-019.test.js`; assert fragmented Unicode and multiline fields, reordered distinct sequence IDs, sanitized metadata, session/run/message mismatch, duplicate sequence, partial/interrupted/error/EOF/missing terminal/oversized input rejection. HTTP assertions prove immediate202, flushed `text/event-stream` headers before prose, delta bytes before upstream completion, exact stream path/body, no fallback/replay, session isolation, completion and cleanup. Reader cases split every UTF-8 byte and reject invalid cursors, identities, terminal/EOF and encoding. Backpressure tests hold writes, resume from the retained cursor on drain, and release subscriber/listeners on disconnect without canceling accepted work. Legacy status/wait regression remains separately covered for compatibility. Shipped-controller tests prove one events request, no status polling, one live bubble, reader preservation, final history/focus and failure draft/no replay.
- Variants / negative cases: unsupported MIME/endpoint fail; invalid/forward cursor returns400; stream shutdown aborts owned work. Existing TC-012 owns capacity/expiry, TC-017 owns attachment validation and TC-010 owns paging integrity; migrate their successful fixture turns to SSE without weakening assertions.
- Cleanup: registered teardown closes test-owned COM/gateway listeners and aborts pending jobs; no persistence files.
- Pass evidence: named assertions and a deliberate protocol/controller RED-to-GREEN probe; written cases alone are NOT RUN.

### TC-020: Rendered progressive reply acceptance
- Purpose / journey / requirements: CUJ-012 / FR-035–037.
- Level / automation: manual; fresh browser QA executor using actual COM and synthetic streaming gateway, then independent evidence audit.
- Preconditions / fixtures: desktop1280×800, mobile390×844/320px; synthetic long history and delayed SSE response with hostile markup. Actual public/Hub URL where available; live Hermes provider proof separately authorized.
- Given: ready chat and a pending stream. When: first and later prose chunks arrive before done. Then: one live literal bubble updates visibly before completion; final persisted reply renders sanitized Markdown, never raw executable markup/tool secrets.
- Steps and assertions: submit text plus representative ready attachment/link; hold upstream completion beyond130seconds while one HTTP SSE response stays open and heartbeats pass through the Hub; capture response headers, incremental network bytes, early visible prose and pending server status, with zero browser status polls. Scroll up during another chunk and assert stable anchor; return bottom and finish; assert one persisted reply, no duplicate POST, focus restoration and no horizontal overflow at320px. Include one short actual-provider reply and one multi-second actual-provider reply in isolated owned sessions: measure first visible prose before completion when provider deltas precede finalization, and distinguish genuine final-only responses from missed deltas. Do not manufacture a typing animation. Disconnect the browser HTTP stream; verify retained draft, incomplete state and explicit Reload without replay, while accepted upstream work survives. Check reduced motion and200-article cap.
- Variants / negative cases: unsupported stream and partial/error terminal remain failed; do not call a synthetic-provider pass live-model compatibility. Server restart loses pending-job tracking, not transcript history; inspect history before resending.
- Cleanup: close only owned browser/server/tunnel and sessions; freeze redacted report/screenshots/network artifacts outside repository.
- Pass evidence: exact-source QA report and checksummed artifacts independently audited. Pending until executed.

| Requirement | Journey | Test cases | Evidence |
| --- | --- | --- | --- |
| FR-035–037 | CUJ-012 | TC-019, TC-020 | Protocol/HTTP/controller assertions and independent rendered acceptance |

## Open questions and coverage gaps

### Readable conversation content
- FR-022: Assistant prose renders sanitized Markdown; user prose remains literal text. Assistant rendering uses pinned, locally served Marked and DOMPurify. Raw HTML, embedded media, forms, scripts and non-HTTP(S) links never execute or load remote resources. FR-041 supersedes the original expandable-tool/raw-data design: tool and unknown structured assistant blocks are hidden, while conversational prose is preserved. There is no per-part 64-KiB Markdown bypass; existing transport/message bounds remain. Existing paging/window and send recovery remain unchanged. Message actions copy conversational prose only after explicit activation and show visible/live Copied or failure feedback. The historical visual reference is [message rendering](design/message-rendering.md), UI-AC-10–13; newer requirements govern superseded behavior.
### TC-013: Readable structured content and safe Markdown
- Journey / requirements: CUJ-008 / FR-022.
- Level / automation: unit and HTTP integration [tests/TC-013.test.js](tests/TC-013.test.js); real-browser sanitizer acceptance separately recorded.
- Preconditions / fixtures: synthetic mixed text/tool blocks, JSON strings/objects, Markdown code/links and hostile HTML; no real conversations or credentials.
- Given: structured Hermes messages; When rendered; Then conversational prose stays visible while tool calls/results and unknown structured assistant content remain hidden, without empty tool bubbles. JSON code examples in conversational prose remain Markdown code.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-013.test.js`; verify text normalization, literal user text, hidden tool/unknown assistant payloads, preserved long conversational prose within existing transport/message limits, explicit clipboard action/success/failure, and library MIME/CSP. In Chrome load actual modules and assert sanitized assistant headings/lists/code, hidden tool content, HTTP(S) links, no executable HTML/unsafe URLs/media/network effects, no overflow at 320px and preserved automatic history navigation. No per-part 64-KiB Markdown fallback or expandable-tool assertion applies.
- Variants / negative cases: null/unknown blocks, malformed JSON, multiple tools, oversized payload and hostile HTML/URL/DOM-clobber payloads. No additional persistence or mutation.
- Cleanup: close temporary listeners/browser and remove only owned fixtures. Pass evidence: named assertions plus independent browser report; VM tests do not certify sanitization.
- Coverage: FR-022 → CUJ-008 → TC-013.
- Boundary acceptance: long conversational prose remains visible while separate tool_calls and tool-role payloads remain hidden under FR-041; there is no 64-KiB Markdown bypass. Wide tables retain unbroken readable headers and scroll inside the transcript at 320/390px, never widening the page. TC-013 proves combined-content normalization and hidden tool payloads; browser acceptance owns sanitizer behavior and table geometry.

### Public tunnel opt-in
- FR-016: `ned com --public` explicitly exposes NED COM without authentication through a temporary cloudflared quick tunnel. Warn before exposure that anyone with its URL can read project/session data and send messages. Normal `ned com` remains loopback-only; Hermes credentials stay server-side. `NED_CLOUDFLARED_BIN` optionally selects the installed binary. Missing binary, startup failure/deadline or tunnel exit closes owned resources and exits nonzero. Ctrl+C/SIGTERM closes the owned tunnel and listeners. No login protection on unrelated tunnels is modified.
- FR-017: The tunnel bridge remains unavailable before the provider URL is discovered; afterwards only the exact generated HTTPS `*.trycloudflare.com` Host and absent or exact matching Origin are accepted. Accepted Origin/Host are translated to the local COM origin; arbitrary foreign-origin mutations remain forbidden. Proxy inactivity timeout is 610 seconds, not a guarantee that the external provider permits equally long requests.
### CUJ-009: Test COM from another machine
Actor: operator explicitly accepting public data/message access; prerequisite: installed cloudflared and running local Hermes. Starting state: no public COM listener. Run `ned com --public`, read warning, open printed public HTTPS URL, read/create/send a test session, stop with Ctrl+C. Success: unauthenticated public access works without exposing bearer keys and owned resources close on exit. On provider failure restart explicitly; no automatic message replay. Non-goals: permanent hosting, authentication removal from existing deployments, bypassing provider request limits.
### TC-011: Opt-in public bridge and CLI lifecycle
- Journey / requirements: CUJ-009 / FR-016–017.
- Level / automation: focused HTTP/process-boundary integration and CLI unit tests; [tests/TC-011.test.js](tests/TC-011.test.js).
- Preconditions / fixtures: synthetic loopback HTTP target and injected child-process streams, no external network/authentication or persisted state.
- Given: a newly started public bridge; When provider URL is pending, then traffic returns 503 and never reaches target. When valid URL is emitted and matching Host/Origin submitted, then target receives exact local Host/Origin and returns 200.
- Steps and assertions: `node --test docs/features/communicator/tests/TC-011.test.js`; assert foreign Host/Origin return 403 with no upstream side effect, child startup errors reject, explicit `--public` warns/prints public URL and invokes tunnel exactly once, ordinary startup never invokes it, and signal cleanup removes listeners/closes tunnel.
- Variants / negative cases: missing dependency fails closed; local no-Origin reads remain supported by existing TC-004. Provider authentication is deliberately absent by operator opt-in. Provider timeout and actual public browser accessibility need live acceptance; synthetic tests do not certify them.
- Cleanup: close all fixture listeners/owned child streams; no production profile touched.
- Pass evidence: named automated assertions plus separately retained public-URL QA report; mapping FR-016/017 → CUJ-009 → TC-011.

Skeleton TC-001/002/003 acceptance landed in PR #120. TC-004 CLI tests pass locally; final candidate gates, printed-URL browser evidence and independent review remain pending. TC-005/006 are implemented and pass focused checks, including live WAL/SHM coordination, independent CLI registration, readonly preservation and bounded preview/config trust boundaries. #116 TC-003 browser evidence and exact-candidate independent review remain pending; automated results do not establish browser acceptance. Artifact formats/limits/enumeration and readonly task adapter remain future gaps; preview contract is frozen in TECH_SPEC. Add future TC headings with executable tests/manual procedure; no phantom automated paths. Planned browser interfaces are not certification.

### Preview workspace verification extension (TC-006 / FR-014)
- Given a selected project, when Goals or Artifacts is selected in the left tablist, then its panel replaces Chat in the left pane while Preview retains its availability state; no right pane appears. Repeating the active tab leaves it selected. Chat draft and transcript nodes survive all tab switches.
- Given no project, Goals and Artifacts remain selectable and explain project selection. Arrow keys wrap through tabs; Home/End select boundary tabs and move focus. Hidden panels are inert.
- Given a viewport below 768px, Preview is initially shown. The left-pane switch restores its last selected tab; Preview hides the left workspace. Desktop crossing shows the left selected panel and Preview together. Focus never remains in a newly hidden workspace.
- Given Preview Retry resolves, focus moves to the result only if the user has not deliberately focused another control.
- Automated evidence: TC-006 controller assertions and existing HEAD/URL checks. Manual evidence: desktop and mobile captures with selected Goals/Artifacts/Chat; tab draft retention and keyboard navigation. Cleanup: harness has no persistent state; integration fixtures close owned servers and remove owned files.

## Persistent diagnostic logs
- FR-047: COM writes timestamped JSON lifecycle records to `~/.ned/logs/com-<pid>.jsonl`, prints its location, and records startup, listening, Hub status, shutdown signals, failures and exit. Fixed-session, history and turn-stream request diagnostics retain only allowlisted phase, HTTP status (zero when absent), bounded elapsed milliseconds, known error type/network code and optional reused-socket flag; the Debug event list shows the same privacy-safe browser request outcome. Failed browser responses are read up to 1024 bytes, cancelling overflow, and classified into a fixed enum for known Hub/HTML gateway failures or other; raw failure text is never retained in diagnostics. No request IDs, URLs, headers, bodies, transcript text or provider credentials are retained in request diagnostics. Logs exclude credentials, request bodies and chat content; lifecycle failures retain error type/code and stack frames without error messages. Private directory/file modes are 0700/0600. Each process retains at most four 1 MiB files; older process logs are retained for investigation. Unsafe log paths fail closed before serving. Logging write failures warn once without changing application failure semantics. SIGKILL, power loss and OS termination cannot produce a final record; the last record remains evidence only.
### CUJ-015: Diagnose a stopped COM
Operator starts COM, notes the printed log path, then inspects it after an exit. Startup and Hub status survive terminal closure; controlled exits identify their signal and failures preserve safe diagnostics. Missing final records do not establish a cause.
### TC-030: Persistent private lifecycle diagnostics
- Journey / requirements: CUJ-015 / FR-047.
- Level / automation: integration; [tests/TC-030.test.js](tests/TC-030.test.js).
- Preconditions / fixtures: isolated temporary home, synthetic errors and credentials, no live Hub.
- Given: an isolated COM launch.
- When: startup succeeds, a signal arrives, or startup throws.
- Then: JSON records identify the lifecycle and failure code without the synthetic secret; modes are private, rotation is bounded and symbolic-link paths are rejected.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-030.test.js`; verify persisted JSON after close, permissions, rotation and path rejection. No chat/provider content is logged.
- Variants / negative cases: unwritable storage fails startup; runtime write failure warns once; fatal monitor preserves default crash semantics. SIGKILL/power loss cannot be trapped.
- Cleanup: remove only temporary test-owned homes and listeners.
- Pass evidence: named automated assertions; live startup log readback recorded separately.
| Requirement | Journey | Test cases | Automated test |
| --- | --- | --- | --- |
| FR-047 | CUJ-015 | TC-030 | tests/TC-030.test.js |

## Project work tracking
- FR-048: Project picker options show project names only, never filesystem paths; values remain stable project IDs. On initial connection select the registered project with the highest persisted task/issue event sequence. On each newer task/issue event automatically select its project and refresh its work. A manual selection remains until a newer event; heartbeats, goal-only updates and reconnects with the same sequence do not reset it. Project inventory updates live; chat session, draft and selected left tab remain unchanged. Failure keeps the current project and offers automatic SSE reconnection.
- FR-049: Goals displays read-only goals/subgoals and tasks/issues from the selected project only, nested by parent ID under the selected project heading. Standalone tasks appear directly under that project. Show title, kind and derived status only; render text literally. Refresh after task or goal events. Unknown projects return404, database failure503; no filesystem root access is needed. Cap each response at5000 items and fail visibly when exceeded; never silently truncate or flatten corrupt parents/cycles. Artifacts continues its explicit unavailable state; artifact filesystem browsing remains outside this enhancement.
### CUJ-016: Follow NED work across projects
Actor: operator. Start with registered projects and persisted work. Open COM, observe latest task project, select Goals, inspect nested hierarchy. Select another project manually; unchanged events retain it. A later task update switches to its project while preserving the selected tab and chat draft. Goal-only updates refresh content without switching. Lost connection retains content until reconnected.
### TC-031: Scoped hierarchy and automatic project following
- Journey / requirements: CUJ-016 / FR-048–049.
- Level / automation: unit and HTTP integration; [tests/TC-031.test.js](tests/TC-031.test.js); rendered desktop/mobile manual readback.
- Preconditions / fixtures: isolated SQLite registry with two projects, nested goals/tasks, synthetic event actors and descriptions.
- Given: project A and B contain distinct work and task events.
- When: read workspace selection and A's work; publish a later B task event; manually select A between events.
- Then: latest event selects B; A's hierarchy contains only A's records; repeated sequence preserves manual A; B's newer sequence switches B; goal updates only refresh. Descriptions/actors remain absent and HTML titles remain literal text.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-031.test.js`; verify latest sequence, parent IDs, status, cross-project isolation, HTTP404/503, and selection policy. In actual COM choose Goals, inspect hierarchy, change project and compare Artifacts unavailable state. Capture desktop/mobile screenshots outside the repository.
- Variants / negative cases: empty registry/work, missing database/project, malformed hierarchy, stale responses and removed project; no filesystem writes or task mutations by browsing.
- Cleanup: close fixture servers/readers and remove temporary database directories; browser navigation changes no saved tasks.
- Pass evidence: automated assertions plus live browser evidence; no artifact browsing claim.
| Requirement | Journey | Test cases | Automated / manual reference |
| --- | --- | --- | --- |
| FR-048–049 | CUJ-016 | TC-031 | tests/TC-031.test.js and rendered readback |

## Optional debug pane
- FR-050: A top-right `Debug` toggle opens a default-closed right diagnostics pane without changing the chat session, draft or selected workspace. At widths >=1100px reserve 300px and maintain the chat/Preview minimum widths; below1100px use a modal right sheet, inert covered content and native focus containment. Close and Escape restore toggle focus; closed content is hidden and inert. Resizing across the breakpoint preserves open state.
- FR-051: Diagnostics display content-free COM health and chat request/SSE lifecycle states with timestamps and at most40 recent events. Only fixed allowlisted labels are rendered; never expose messages, tool calls, arguments, raw errors, URLs, session/turn IDs or credentials. Probe `/api/health` once per opening with a bounded timeout, not background polling. Clear removes recent events only. Opening/closing never replays, cancels or starts a chat turn.
### CUJ-017: Inspect chat delivery without cluttering the conversation
Actor: operator diagnosing streaming. Start in either Chat or Preview, optionally with a draft or running turn. Open Debug, read COM health and current chat state, then close and continue. Failed health is explicitly unavailable. A hidden pane continues retaining bounded content-free lifecycle events; no private transcript or network body appears.
### TC-032: Debug controller and privacy boundary
- Journey / requirements: CUJ-017 / FR-050–051.
- Level / automation: unit/controller; [tests/TC-032.test.js](tests/TC-032.test.js).
- Preconditions / fixtures: synthetic DOM/event targets, deferred health probe, malicious diagnostic payload, no real credentials/network.
- Given: a closed pane and a chat lifecycle emitter.
- When: toggle, clear, close, Escape and breakpoint transitions occur; health resolves after closure; more than40 events arrive.
- Then: correct hidden/inert/expanded/modal states, focus restoration and reserved width; stale health is ignored; only allowlisted labels survive and exactly40 events remain.
- Steps and assertions: `node --test docs/features/communicator/tests/TC-032.test.js`; exercise the mounted controller and recorder, including disposal and rejected/failed health.
- Variants / negative cases: unknown events and secret fields ignored; repeated opening creates no chat requests; unavailable health remains explicit; no persistence of diagnostics. Authentication remains the enclosing COM origin's policy.
- Cleanup: dispose listeners and remove synthetic fixtures.
- Pass evidence: named automated assertions; geometry/modal browser evidence is separate TC-033.
### TC-033: Rendered debug disclosure and responsive focus
- Journey / requirements: CUJ-017 / FR-050–051.
- Level / automation: manual; actual Chrome COM with synthetic gateway.
- Preconditions / fixtures: real COM shell, synthetic chat, desktop1280×800 and mobile390×844/320px; optional long draft, no private content.
- Given: Debug closed, Chat/Preview and resizing work.
- When: open the top-right Debug button, inspect health, send a synthetic streamed reply, clear, close using Close/Escape; repeat below1100px and transition the breakpoint while open.
- Then: desktop300px pane is alongside Preview without horizontal overflow; narrow modal has reachable44px controls, focus containment, inert background and exact focus return. Chat draft/session survives, stream events appear without content, closed pane is absent from tab order. At200% text all controls reflow and remain reachable.
- Steps and assertions: capture closed/open desktop/mobile states, keyboard focus/modal semantics,320px/200% text geometry; verify one health request per opening and no extra chat request on pane actions.
- Variants / negative cases: health503/unavailable, no chat session yet, streaming completion and interrupted failure; hide/reopen retains <=40 safe events. No external-provider credentials needed.
- Cleanup: stop fixture server/browser; preserve redacted evidence outside repository.
- Pass evidence: screenshots, geometry/network assertions and audited QA report; written case alone is not a pass.
| Requirement | Journey | Test cases | Automated / manual reference |
| --- | --- | --- | --- |
| FR-050–051 | CUJ-017 | TC-032–033 | tests/TC-032.test.js; TC-033 procedure |

## Compact execution plan and contextual chat
- FR-052: Goals hides done tasks and empty done branches by default; a Show completed checkbox reveals them without modifying saved work. Show active/remaining/completed counts, compact status rows and project hierarchy. Order unfinished work using prerequisite-before-dependent edges, then in-progress first, numeric priority ascending, creation order and ID ties. Preserve parent nesting; reopen a goal branch when needed to keep tasks in true prerequisite order across goals; repeat goal headers rather than move a dependent ahead of its prerequisite. There is no stored manual execution order. Invalid dependency cycles fail visibly. Keep required ancestors of unfinished tasks even when the ancestor is done.
- FR-053: Clicking a task/goal stages a removable reference pill in the fixed chat composer and opens Chat without sending or changing draft. Scope identity by projectId+itemId; deduplicate, at most8; preserve pills across project switches and send failures, clear after confirmed success. Busy/uncertain sends lock changes. User sends text with optional references (reference-only messages allowed). Server resolves IDs from the same readonly NED registry, rejects missing/unknown/extra fields or oversized references before forwarding, and includes authoritative project path, work title/type/status and IDs in a bounded clearly labeled context block. Do not trust client titles or execute reference content as instructions. Stale references return400 invalid_reference, retain draft/pills and allow correction. Normal attachment-only/text sends remain compatible.
### CUJ-018: Discuss the next task
Operator opens Goals, sees compact unfinished plan, optionally shows completed work, clicks a task, reviews/removes its pill and sends a related message in the existing chat. Project navigation retains staged reference identity. Accepted replies clear pills; failed sends preserve them without automatic replay.
### TC-034: Compact ordered plan and task-reference composer
- Journey / requirements: CUJ-018 / FR-052–053.
- Level / automation: unit/client and HTTP integration; [tests/TC-034.test.js](tests/TC-034.test.js). Real browser desktop/mobile acceptance separately captured.
- Preconditions / fixtures: isolated two-project database; goal with done/working/ready/dependent children, duplicate task IDs across projects; synthetic gateway.
- Given: saved work with priorities and prerequisite links.
- When: render default/completed plan, click work, remove a pill, switch project, send or fail a referenced message.
- Then: done tasks hidden unless opted in; ancestors/nesting remain; dependencies precede dependent work; compact readable rows stage deduplicated scope-correct pills without sending. Server uses authoritative titles/path, rejects missing/forged references without upstream side effects, and keeps normal send contracts.
- Steps and assertions: `node --test docs/features/communicator/tests/TC-034.test.js`; assert ordering/filtering/pills, server resolution and rejection; run COM/chat regression. In Chrome select Goals, toggle Show completed, click task and verify Chat/pill/draft; remove pill; verify320px reflow.
- Variants / negative cases: empty/all done work, corrupt dependency cycle, duplicate/more than8/unknown references, cross-project same ID, pending/uncertain sends and stale response. No task state is mutated by browsing/reference selection.
- Cleanup: close fixtures and remove temporary DBs; clear staged browser draft/pills without sending to live model.
- Pass evidence: named automated assertions plus screenshots and independent review; public Muse screenshot is the benchmark source.
| Requirement | Journey | Test cases | Automated / manual reference |
| --- | --- | --- | --- |
| FR-052–053 | CUJ-018 | TC-034 | tests/TC-034.test.js + rendered acceptance |

## Persistent bottom composer
- FR-054: The Chat composer remains at the bottom of its visible workspace while users scroll earlier messages. Only the transcript scrolls for history; neither the document nor the chat pane scrolls the draft or Send control away. Preserve the same draft/session DOM on mobile switches, pane resizing and streaming updates. Bound optional references and media/link context within scrollable regions so long drafts, eight references and four files do not push the input or Send outside the viewport. Multiline drafts retain their existing growth cap and internal scrolling. This supersedes earlier empty-state floating-composer geometry.

### CUJ-019: Reply while reading earlier messages
Actor: chat user. This repeat-use journey is critical because reading history must not require returning to the latest message to compose a reply. Start with the Chat tab visible and a long conversation. Scroll earlier messages, enter a multiline draft, optionally stage references/files, then continue reading. Success: the input and Send remain reachable at the workspace bottom while history scrolls independently. Recovery: hide/show Chat or resize the pane without losing the draft or references; a streaming reply must not force a reader back to the bottom.

### TC-035: Rendered bottom-composer containment
- Journey / requirements: CUJ-019 / FR-054.
- Level / automation: manual; real-browser rendered procedure. CSS geometry cannot be established by the simulated DOM controller tests.
- Preconditions / fixtures: local COM with an isolated synthetic gateway serving 120 alternating user/assistant messages, each with twelve repeated paragraphs; no real conversation or provider credentials. Start with no draft, references or files. Use Chrome at 1280×800, 390×844 and 320×640.
- Given: Chat displays overflowing history.
- When: scroll the transcript to earlier messages using a wheel, then enter a draft and resize the workspace.
- Then: transcript scrollTop changes, document and outer workspace scrollTop stay zero, and input/Send remain within the viewport at the same bottom position (within 2px before/after history scrolling).
- Steps and assertions: (1) At each named viewport select Chat if mobile, record input/Send and transcript rectangles, wheel over history and compare. Assert zero horizontal/document overflow. (2) At 320×480 stage eight long synthetic task references, four TXT files containing `Synthetic upload only.`, and a 60-line draft. Expand Supported files, open Add link, access its fields/cancel and remove a file/reference; input and Send stay within the viewport and optional content scrolls rather than overflowing the form. (3) Repeat at 320×640 with CSS text size doubled; identify this as text enlargement, not native browser zoom. (4) While viewing earlier history receive two controlled SSE deltas and final completion; preserve the reader's transcript position and composer position. (5) With references/files/editor cleared, at desktop and 390×640 grow the draft past its cap, then clear it; verify visible growth/shrinkage and internal scrolling with no outer scrolling. At 390×480 repeat the long draft and clearing with Latest/status visible: available-height compression to the existing 34px minimum is allowed, but internal scrolling, viewport containment and the dock's bottom position must hold. Textarea baseline may change during its own layout growth; history scrolling and streaming must not move it.
- Variants / negative cases: empty history also uses the bottom dock; hidden Chat restoration and horizontal pane resizing preserve draft nodes and reflow. No new send/authentication behavior is introduced; existing transport tests own failures and isolation. Network interruption remains existing chat recovery coverage.
- Cleanup: close only the synthetic gateway/COM/browser and remove owned temporary uploads; do not send to the user's gateway or edit real tasks.
- Pass evidence: source-bound browser geometry, interaction observations and desktop/mobile screenshots; independent QA audit. Written cases alone are not a pass.

| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-054 | CUJ-019 | TC-035 | Rendered procedure above; existing TC-010/017/034 retain controller/media/reference regression coverage |

## Mobile conversation clarity
- FR-055 current-location clarification: mobile marks exactly the visible view with `aria-current=page`; remembered hidden left tabs are not presented as selected while Preview is visible. Desktop retains its selected left tab because both panes are present.
- FR-056 enlarged-text clarification: the draft minimum is the larger of34px and one computed text line plus vertical padding, not a fixed34px floor at all text sizes. Optional activity space may shrink/scroll before the complete typing line is clipped; Send remains reachable.
- FR-055: Mobile opens Chat by default. A single-row header contains Menu, the current view title and Debug. Menu opens a modal left navigation drawer containing the same project picker and Chat, Goals, Artifacts and Preview controls used on desktop. Escape/Close restores Menu focus; selecting a view closes the drawer and focuses its heading. Desktop layout and selected project/draft remain unchanged across breakpoints.
- FR-056: Messages use 16px body text with 1.65 line spacing, distinct author hierarchy and comfortable paragraph spacing. Code and tables scroll within their message rather than widening the page. Preserve literal user text, sanitized assistant Markdown, streaming and bottom-pinned composer.
- FR-057: Latest selected-project goal/task updates appear as a compact, bounded, dismissible notice with status and title. Repeated identical SSE snapshots do not reannounce or reopen dismissed notices; a changed snapshot reappears. Switching projects immediately clears prior content and dismissal. Blocked notices never auto-expire; no notice auto-expires. Empty snapshots hide the notice; failures show a dismissible truthful unavailable state.
### CUJ-020: Read and navigate a mobile conversation
Actor: mobile user; critical because chat remains the primary usable surface. Start at mobile Chat, open Menu, choose a project/view, return to Chat, read long messages and dismiss a work notice. Failure recovery: close/Escape preserves draft; unavailable updates never obscure chat.
### TC-036: Mobile navigation and notice lifecycle
- Journey / requirements: CUJ-020 / FR-055–057.
- Level / automation: controller tests in [tests/TC-036.test.js](tests/TC-036.test.js); browser geometry and focus acceptance below.
- Preconditions / fixtures: synthetic projects Alpha/Beta, goal/task snapshots with working/blocked/done statuses; no credentials.
- Given: mobile Chat with an existing draft and selected Alpha.
- When: Menu is opened/closed, views selected and activity snapshots arrive.
- Then: modal disclosure/focus restore are correct, draft survives, same snapshots stay dismissed, new snapshots reappear and Beta never shows Alpha content.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-036.test.js`; browser at 320×568, 390×844 and desktop1280×900 verifies single-row header, drawer project picker, keyboard/Escape, all views, bottom composer, long Markdown and notice dismissal. Repeat at 200% text and reduced motion; no page horizontal overflow or overlapping targets.
- Variants / negative cases: stale project events ignored; malformed/unavailable payload has no raw error exposure; empty hides; repeated identical events do not mutate live content. Resize with drawer open closes it safely. No new provider calls; existing SSE and session ownership unchanged.
- Cleanup: close owned fixture browser/server only.
- Pass evidence: named controller assertions and frozen browser captures; written procedures alone are not a pass.
| Requirement | Journey | Test cases | Evidence |
| --- | --- | --- | --- |
| FR-055–057 | CUJ-020 | TC-036 | Controller tests and rendered acceptance |

## Assembled browser chat regression

### TC-037: First-use browser chat from an absent canonical session
- Journey / requirements: CUJ-008, CUJ-012 / FR-012, FR-020, FR-021, FR-024, FR-035.
- Level / automation: end-to-end; [tests/TC-037.test.js](tests/TC-037.test.js), real Chromium and the actual served application plus COM HTTP adapter; only the unrelated Hermes provider is a deterministic loopback HTTP fixture.
- Purpose: catch browser module/import/startup failures and assembled create → send → HTTP SSE → history reconciliation failures that isolated controller/adapter tests cannot detect.
- Preconditions / fixtures: fresh temporary NED database/home, no Hub or real credentials, no canonical gateway session or history; synthetic `synthetic-browser-key`; viewport 1280×900. Install with `npm ci` and `npx playwright install --with-deps chromium`.
- Given: the fixture returns 404 for the canonical session.
- When: open COM with one synthetic HTTP502 edge response for the fixed-session request, automatically recover without Reload, type `First message from a new chat`, press Enter, observe a held-open partial SSE reply, finish it and reload the browser.
- Then: the input becomes enabled; exactly one canonical session is created and one chat is posted; visible partial text appears before upstream completion; final Markdown renders; the two persisted messages reopen once each; no turn-status polling or browser exceptions occur.
- Steps and assertions: run `npm run test:chat:e2e`; the named test asserts exactly two initial browser fixed-session requests (first edge502, second actualCOM success), empty initial transcript, one create, partial while the upstream response remains open, final strong text, one SSE subscription/no status polling, and unchanged create/send counts after reload.
- Variants / negative cases: absent session is the first-use boundary; retry/draft safety and existing history are TC-038. Real-provider authentication and Hub proxy behavior remain separate live acceptance, not claimed by this credential-free fixture. Missing Chromium fails with installation instructions, never skips.
- Cleanup: teardown closes the owned browser, COM and fake gateway, closes the SQLite connection and removes only the owned temporary home.
- Pass evidence: successful named browser assertions and runtime from the command, separately from live-provider evidence.

### TC-038: Existing browser chat, progressive history and safe uncertain-send recovery
- Journey / requirements: CUJ-008, CUJ-012 / FR-012, FR-013, FR-020, FR-035, FR-041.
- Level / automation: end-to-end; [tests/TC-038.test.js](tests/TC-038.test.js), the same real browser/application/HTTP fixture boundary as TC-037.
- Purpose: catch assembled existing-session startup, real Markdown rendering, paging, tool hiding and failed post-send reconciliation without automatic replay.
- Preconditions / fixtures: isolated existing canonical session, 60 stable rows (alternating prose, one tool-only private marker, one long Markdown heading/paragraph), mobile 390×844, no private host state. The fixture retains gateway history across browser reloads.
- Given: a canonical session already exists with more than one history page.
- When: open COM with exactly three initial history503 responses, verify terminal unavailability after three reads, restore history and choose Reload; load older history, return to the bottom, send `Interrupted request`, observe partial SSE then a nonterminal EOF; choose Reload without replay; send `Continue the existing chat`, observe a partial SSE reply, complete it while history reads fail, restore history, choose Reload and reload the page.
- Then: latest 50 raw rows render as 49 conversational articles, older history becomes available, tool text stays hidden, partial text is visible before completion, failed reconciliation keeps the draft and disables Send, explicit Reload recovers without another chat POST, and the persisted user/reply each appear once without session recreation.
- Steps and assertions: run `npm run test:chat:e2e`; assert initial failure disables input, explicit recovery; page counts, oldest message, rendered heading, omitted tool marker, held-open partial response; stream EOF preserves draft/disables Send and Enter never replays; explicit recovery then a second user-initiated send; post-send history failure preserves draft; exactly two user-initiated sends, zero creates, and one persisted final reply after page reload.
- Variants / negative cases: HTTP503 post-send history failure is intentional; it must not be mistaken for a runtime exception or successful delivery reconciliation. Missing provider auth, malformed stream variants and concurrent writes remain the focused integration cases rather than duplicated browser permutations. No real model is called.
- Cleanup: same owned-resource teardown as TC-037; no host session mutation or browser storage reused.
- Pass evidence: successful named browser assertions; browser errors are captured and must be empty. Neither a written scenario nor a skipped browser is a pass.

Coverage: FR-012/020/021/024 → CUJ-008 → TC-037/038; FR-013/041 → CUJ-008 → TC-038; FR-035 → CUJ-012 → TC-037/038. These two irreducible browser journeys run in the automated spec gate. Broader device/provider matrices remain separately scoped acceptance.

## Compact conversation and immediate send revision
- FR-058: Conversation rows use compact spacing and a small copy glyph without sacrificing a 44px touch target. This supersedes FR-056's paragraph spacing, not its readable 16px text or Markdown safety. The selected-project notice has a colored surface and no visible heading; retain its accessible name, dismissal and update lifecycle.
- FR-059: Scrolling within 80px of the transcript top loads older history automatically, single-flight and without automatic failure loops. Fill a non-scrollable latest or older window automatically, including tool-only pages, for at most 20 older pages per batch; a further upward wheel or PageUp/Home/ArrowUp intent continues bounded loading even if no scroll range exists. Preserve the visible message anchor after final control/layout state, raw page offsets including hidden tool rows, and the 200-row retention cap. Remove Load/Load older/Load newer controls. Show Jump to latest only when viewing an older retained window, new replies are available or history recovery requires it. A failed older request leaves existing messages intact with a compact Retry notice.
- FR-060: Submit immediately clears the input and appends one pending user message before awaiting acknowledgement. Capture draft, attachments and references once; never replay automatically. Rejected input restores the draft and existing selections; uncertain delivery retains recoverable text and blocks another send until reload. During an active turn Send becomes Stop, which cancels only the accepted turn's owned Hermes run, including a Stop requested before acknowledgement. A completed-turn race must not cancel another run. Preserve HTTP SSE response streaming and distinguish a stopped response from failed delivery.

### CUJ-021: Read and control a compact conversation
Actor: returning chat user. Critical because older messages and ongoing replies must remain accessible without losing a draft. Starting state: canonical chat loaded, at least 60 raw rows. Scroll upward; earlier history appears without a load control or viewport jump. Submit a draft; its user row appears immediately, input clears, Stop replaces Send, and a streamed reply appears. Stop ends that owned response; another send is possible after confirmed terminal state. Failure retains readable history and recoverable draft without duplicate sends.

### TC-039: Compact history, optimistic send and owned Stop
- Journey / requirements: CUJ-021 / FR-058–060.
- Level / automation: unit/controller and HTTP integration; tests/TC-039.test.js. Existing TC-037/038 own irreducible browser first/repeat-use flows.
- Preconditions / fixtures: deterministic loopback Hermes fixture and deferred controller responses; canonical nedcom-main session; 50-row pages including hidden tool rows; no real credentials.
- Given: loaded history and a valid draft.
- When: scroll near top, submit, and Stop before or after acknowledgement.
- Then: one older request preserves anchor and raw offset; draft clears and exactly one pending user row appears immediately; Stop targets only the accepted turn, terminal stop permits new input; stale/mismatched turn or rotated gateway identity cannot cancel a run.
- Steps and assertions: run node --test docs/features/communicator/tests/TC-039.test.js and npm run test:chat:e2e; inspect compact desktop/mobile at 320px and 200% text, readable copy glyph, colored headerless notice and bottom composer.
- Variants / negative cases: repeated scroll is single-flight; all-hidden and short visible pages fill automatically, stop at exhaustion or 20-page batch bound, then resume on upward wheel/keyboard intent without a Load control; history failure retains rows with explicit retry and no timer loop; invalid attachments restore text; uncertain delivery requires reload without replay; completed cancellation is idempotent; HTTP200 Stop reporting existing completed run does not mark its delayed normal SSE result stopped; failed or mismatched Stop leaves live response processing and preserves newer draft; no active run or wrong context returns a bounded error without upstream cancellation.
- Cleanup: close owned fixture listeners and browser; do not mutate host chat sessions.
- Pass evidence: deterministic assertions, rendered screenshots and separately audited browser report; written procedures alone are not a pass.

Coverage: FR-058–060 → CUJ-021 → TC-039; FR-059/060 browser wiring → TC-037/038. Live Hermes/Hub acceptance is separate from credential-free test coverage.

## Live agent activity
- FR-061: While a submitted turn is pending, show one compact polite activity line above the composer. Start with `Working…`; derive `Thinking…`, `Searching the web…`, `Reading files…`, `Running a command…` from known upstream event kinds and allowlisted tool names, and `Writing response…` from assistant prose. Unknown tools use `Working…`. Tool completion/failure returns to `Working…`, never implies the entire response completed. Stop takes precedence until settled; terminal responses clear activity and existing failures retain honest recovery text. Do not simulate activity using timers or reveal tool names, arguments, URLs, reasoning or output text.
- FR-062: Activity travels over the existing browser HTTP SSE response, bound to the accepted turn/session, as a closed enum with a monotonically increasing version independent of the prose cursor. Retain only the latest status, coalesce duplicates and obey backpressure without accumulating an event queue or losing prose. Browser validation rejects unknown enums, excess fields, foreign identity and non-increasing versions. No activity polling or history persistence.

### CUJ-022: Understand a working agent before prose arrives
Actor: chat user. Critical because tool work may delay the first visible reply. Starting from a loaded chat, submit once, observe truthful bounded activity, optionally Stop, and receive final prose or existing recovery. Activity cannot overwrite stopping or survive settlement.

### TC-040: Private, bounded live activity over the chat SSE
- Journey / requirements: CUJ-022 / FR-061–062.
- Level / automation: unit, integration and end-to-end; [tests/TC-040.test.js](tests/TC-040.test.js).
- Preconditions / fixtures: synthetic loopback gateway, isolated COM, browser fixture; no credentials or existing persisted chat required.
- Given: a loaded chat and an upstream turn held before assistant prose.
- When: submit, emit known/unknown tool and thinking events, then prose and completion.
- Then: one activity line changes before prose, raw metadata never reaches the client, prose streams once, and completion clears the line.
- Steps and assertions: run `node --test docs/features/communicator/tests/TC-040.test.js`; mapper tests cover allowlisted categories, unknown/hostile metadata and identity rejection; SSE tests cover duplicate coalescing, slow subscribers, independent prose cursors and strict browser validation; real browser covers pre-prose activity then streamed response.
- Variants / negative cases: failed tool is not overall completion; Stop dominates later progress; foreign session/run or malformed activity fails closed; terminal/failure does not retain activity. Provider auth and public Hub acceptance remain separately scoped manual checks.
- Cleanup: close owned browsers/COM/gateway and delete synthetic temporary state. No host sessions changed.
- Pass evidence: executed assertions and separate desktop/mobile rendered evidence. Written cases alone are not passes.

Coverage: FR-061–062 → CUJ-022 → TC-040.
