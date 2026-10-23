# NEDCOM technical design

Chat extension: [CHAT.md](CHAT.md) supersedes the GET/HEAD-only and two-pane contracts below for the explicitly allowlisted `/api/chat/` routes and chat-enabled shell. Project data remains read-only. New gateway adapter is `src/communicator/chat.js`; browser entry/controller are `public/chat-entry.js` and `public/chat-ui.js`. SPEC TC-007/008 govern verification.

Status: proposed handoff for #114, 2026-10-12. [SPEC](SPEC.md) is behavioral authority. Task foundation `v0-task-management` at 355e2dd, open PR119; reconcile before aggregate release. [UI brief](design/ui-brief.md), [tokens](design/design-system.md), [specimen](design/mockup.html), [guidelines](../../../.projects/no-ego-dev/design/ui-guidelines.md).

## Current architecture and components
Node ES modules/native HTTP/better-sqlite3. Existing src/web onboarding stays separate. Current openNedDatabase creates directories/schema, enables WAL and chmods; never use it for browser reads. src/tasks.js mixes project-scoped reads and mutations.

#114 adds src/communicator/server.js and public/{index.html,styles.css,app.js}, plus pure state helper if useful. Explicit static asset allowlist, no bundler/framework/dependency needed. Extend syntax/lint coverage. Tests under docs/features/communicator/tests/. Skeleton originally added no domain routes. #115 adds CLI dispatch; #116 extends server with read-only registry/detail/config reads below. No new persistence/schema.

## Lifecycle
Export createCommunicatorServer({host = '127.0.0.1', port = 0} = {}) returning {server, listen(), close(), url}. URL null before listen, actual http://127.0.0.1:<port> after success. Accept exact IPv4 loopback only and integer ports 0–65535; zero ephemeral. Startup reject leaks no listener; sanitized lifecycle errors. Close idempotent, stops accepting, closes idle/active connections and releases listener. #115 owns signal/browser-open policy; library installs none.

## Current HTTP contract
GET/HEAD only; HEAD same status/type/headers without body. All responses no-store/nosniff, no CORS grants.
- / -> HTML; /styles.css and /app.js (+ explicit helper asset if needed) -> correct MIME.
- /api/health -> 200 {status:'ok', service:'nedcom'}.
- /api/capabilities -> 200 {service:'nedcom', readOnly:true, capabilities:{projects:true,tasks:false,artifacts:false,preview:true}}.

The shell/CLI are implemented. #116 activates registered-project routes below; no fake inventory. Capability request -> flags -> registry -> selected detail -> preview. Tasks/artifacts retain placeholders.

Errors {error:{code,message}} with constant safe messages, no paths/stack/echo. Invalid Host/Origin -> forbidden 403 before dispatch; unsupported method -> method_not_allowed 405, Allow: GET, HEAD; unknown/malformed/traversal paths -> not_found 404; internal_error 500. Exact Host 127.0.0.1:<actual-port>; absent Origin allowed, supplied Origin exactly reported origin; null/foreign rejected. Method precedes route lookup. Query may be ignored, never used as file input. Allowlist avoids generic filesystem lookup.

CSP: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'. No inline scripts/styles, embedding or remote assets.

## Client
Implement A1–A6/UI-AC-01–05 and tokens. Load capabilities then registry with Loading projects…; initially no automatic selection. Empty/error/unselected states follow UI brief. Keep chooser enabled during selected-detail requests. Error/Retry follows brief. Selection state {projectId, section, requestGeneration}; ID separate from label. New selection clears content/resets Tasks/increments generation; ignore stale responses. Render untrusted names/content with textContent. Retry single-flight; restore keyboard Retry focus after settlement when still actionable, otherwise focus heading when removed; never override another focused control and cancel Retry focus intent on navigation; polite loading and error announced once per transition. Test selected sections use exact unavailable copy.

## #116 project and preview implementation
`src/communicator/projects.js` is the adapter, using shared `openNedDatabaseReadOnly` boundary in `src/database.js`. Server receives resolved databasePath; each read opens an existing regular readable readonly/fileMustExist DB, validates schema-v1 using SELECT, performs bounded prepared read, closes in finally. No retained snapshot: next request observes CLI commit. No init/schema migration/mkdir/chmod/journal-mode pragma. Database logical records/main contents and project files remain untouched by application; live WAL SQLite can create/update SHM coordination sidecars. Test/report actual coordination, do not advertise impossible sidecar immutability. Missing/corrupt/unreadable/unsupported DB -> sanitized 503 database_unavailable; server boot/health still work.

- GET/HEAD `/api/projects` -> 200 `{projects:[{id,name,displayPath}]}`. Query only ned_projects registry, stable ordering (displayPath then id); no scan/new registry. Name = basename registered canonical path; displayPath = home-relative `~/...` when inside configured home, otherwise exact registered path. This metadata deliberately visible to local owner; errors never echo raw exceptions/paths. Empty -> projects:[].
- GET/HEAD `/api/projects/:id` -> 200 `{project:{id,name,displayPath},preview:{status,url?}}`. ID opaque with registry-safe bounded characters, path segments decoded once, malformed/unknown ID -> 404 project_unavailable. Revalidate registry on every request, realpath directory must exactly match canonical registered path. Symlink-replaced/missing/nondirectory root -> 404 project_folder_unavailable; cannot adopt another root. No task/artifact records in response. Metadata validity independent of preview failure.

Selected detail performs preview config/probe below; preview URL only present when available. No dedicated preview endpoint is necessary. HEAD has same response status/headers without body. Response -> retain raw ID + request generation -> request detail/retry that ID; stale registry/detail success/error cannot restore links or obsolete selection. Registry reload invalidates old actionable preview immediately. Keep chooser enabled while detail loads, clear prior content/link and reset Tasks on project change; Retry single-flight, superseded by selection. Removed project remains recoverable, permits different selection. Section selection does not execute app or write state.

### Preview configuration/probe
Fixed selected-root `.nedcom.json`, never created/edited by NEDCOM. Read regular nonsymlink file at root with nofollow/path checks, fail closed on replacement/root identity change; max 4096 bytes. Exact object keys `version` and `previewUrl`, version integer 1, previewUrl string. No unknown keys. Missing -> unconfigured; malformed/oversized/symlink/unsafe schema or URL -> invalid; access/read race failure -> unavailable. Config metadata is not artifact index.

Accept only literal raw `http://127.0.0.1:<decimal-port>/<optional-path>` (path optional), explicit integer port 1–65535, no userinfo/query/fragment/backslashes/control characters or alternate numeric host notation. Validate raw authority before URL parser normalization; no localhost/remote/DNS/HTTPS/IPv6 this revision. Preserve valid path, no credentials. HEAD using native HTTP to validated literal, timeout 1000ms total including response, destroy on finish/timeout/client close; no redirect follow, no body collection, no auth/cookies forwarded. Only 2xx -> available with validated URL; other HTTP statuses/timeout/refused -> stopped. Invalid config never initiates probe. Probe does not build/start/deploy app. Safe statuses unconfigured/invalid/unavailable/stopped have no URL. Running link A7 target=_blank rel=noopener noreferrer, exact accessible label from brief; no iframe/proxy.

### Future domain owners
#117 enumerate canonical root STATUS/docs/features and documented .projects/<project>/ categories, not whole filesystem. Repository artifacts remain authority. Revalidate project membership/root each read, accept opaque artifact ID, never caller absolute path. Exclude .git, node_modules, caches, DB/WAL, logs/sessions/runtime, credentials/auth/secrets/env. Deny symlinks/traversal/decoded separators; realpath within selected root and race fail-closed checks. Freeze bounded formats/size/errors in SPEC before implementation. No raw HTML/script Markdown rendering or duplicate store.

#118 task list/detail/history via scoped read APIs/prepared queries; refresh authoritative DB; corrupt/unsupported data safe error, no repair. Two-project fixtures with shared work-item IDs prove history isolation. Each future API freezes response -> retained ID -> next action/error/retry/stale selection contract before implementation.

## Operations, metrics, rollback and handoff
Local process hosting is product scope; no cloud provider or extra account/cost. Existing opt-in src/telemetry.js is sole telemetry boundary; #114 adds no events/outbound request/persistent logs. Immediate metrics are deterministic boot/recovery/keyboard outcome and aggregate timing in redacted QA evidence; coordinator reviews after each slice. Engagement analytics deferred until domain workflows exist; reuse consent gate, aggregate counts only, no names/paths/IDs/content. No third-party collector justified for this local foundation.

#116 implements these contracts and TC-005/006 alongside existing TC-001/002 regressions. Parent records TC-003 browser evidence and exact-candidate independent review. Existing onboarding plus lint/all Node/spec/Python gates before commit. Temporary fixtures outside distribution. Evidence SHA/time/browser identity. Rollback/retirement removes communicator assets/routes and later CLI wiring, retains NED DB/project files; prove retired routes unreachable and other CLI/onboarding unchanged. Coordinator schedules scoped refactoring after aggregate milestone for proven duplication only.

Update SPEC status/coverage from actual implementation; future gaps remain explicit. Subsequent issues extend this feature. No writable DB opener and no successful stub domain routes.

## #115 CLI dispatch
Dispatch com before provider/telemetry construction into src/communicator/cli.js. Strict --port/--database/--help flags follow SPEC CUJ-004. Pass resolved databasePath into server options; command does not initialize DB, #116 server opens existing readonly DB per request. Install signal handlers before listen; serialize shutdown, remove handlers, release all connections. Print actual URL only after successful listen. No browser launch; #116 domain API is independent of dispatch.

## #116 acceptance and privacy
Add UI-AC-06–08 evidence to existing TC-003: duplicate-name readable folder context, selection/loading/stale links, running/unconfigured/stopped/invalid/folder/database/empty states at desktop/mobile; keyboard Open app and safe new tab. Registry metadata is necessary local-owner display, never telemetry/log payload. No new analytics/deployment service. Retire project/preview routes/config reading without deleting user config or registry records; artifact/task routes remain future scope. Exact candidate independent review and all commit gates remain required.
