# NEDCOM technical design

Status: proposed handoff for #114, 2026-10-12. [SPEC](SPEC.md) is behavioral authority. Task foundation `v0-task-management` at 355e2dd, open PR119; reconcile before aggregate release. [UI brief](design/ui-brief.md), [tokens](design/design-system.md), [specimen](design/mockup.html), [guidelines](../../../.projects/no-ego-dev/design/ui-guidelines.md).

## Current architecture and components
Node ES modules/native HTTP/better-sqlite3. Existing src/web onboarding stays separate. Current openNedDatabase creates directories/schema, enables WAL and chmods; never use it for browser reads. src/tasks.js mixes project-scoped reads and mutations.

#114 adds src/communicator/server.js and public/{index.html,styles.css,app.js}, plus pure state helper if useful. Explicit static asset allowlist, no bundler/framework/dependency needed. Extend syntax/lint coverage. Tests under docs/features/communicator/tests/. No CLI/domain route/database/schema/config persistence now.

## Lifecycle
Export createCommunicatorServer({host = '127.0.0.1', port = 0} = {}) returning {server, listen(), close(), url}. URL null before listen, actual http://127.0.0.1:<port> after success. Accept exact IPv4 loopback only and integer ports 0–65535; zero ephemeral. Startup reject leaks no listener; sanitized lifecycle errors. Close idempotent, stops accepting, closes idle/active connections and releases listener. #115 owns signal/browser-open policy; library installs none.

## Current HTTP contract
GET/HEAD only; HEAD same status/type/headers without body. All responses no-store/nosniff, no CORS grants.
- / -> HTML; /styles.css and /app.js (+ explicit helper asset if needed) -> correct MIME.
- /api/health -> 200 {status:'ok', service:'nedcom'}.
- /api/capabilities -> 200 {service:'nedcom', readOnly:true, capabilities:{projects:false,tasks:false,artifacts:false,preview:false}}.

No /api/projects or domain adapter. Capability request -> retained flags -> unavailable disabled chooser/sections. Production never populates fake project rows; pure renderer supports test-only intercepted fixtures without production test toggle.

Errors {error:{code,message}} with constant safe messages, no paths/stack/echo. Invalid Host/Origin -> forbidden 403 before dispatch; unsupported method -> method_not_allowed 405, Allow: GET, HEAD; unknown/malformed/traversal paths -> not_found 404; internal_error 500. Exact Host 127.0.0.1:<actual-port>; absent Origin allowed, supplied Origin exactly reported origin; null/foreign rejected. Method precedes route lookup. Query may be ignored, never used as file input. Allowlist avoids generic filesystem lookup.

CSP: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'. No inline scripts/styles, embedding or remote assets.

## Client
Implement A1–A6/UI-AC-01–05 and tokens. Production Loading projects… while capabilities load; then Projects with explicit project-browsing-unavailable explanation and disabled controls. Error/Retry follows brief. Selection state {projectId, section, requestGeneration}; ID separate from label. New selection clears content/resets Tasks/increments generation; ignore stale responses. Render untrusted names/content with textContent. Retry single-flight; when removed move focus to heading; polite loading and error announced once per transition. Test selected sections use exact unavailable copy.

## Future domain ownership (not current APIs)
#116 GET /api/projects -> {projects:[{id,name}],capabilities}; GET /api/projects/:id -> membership/status. ID opaque from registry; never derive from presentation/path. Preserve ID then revalidate registry on every read; deleted selected ID -> project_unavailable 404, missing/unsupported DB -> database_unavailable 503. No pagination initially. Clear selection content before next request; stale cache grants no access.

#116/#118 add explicitly readonly existing-file opener to src/database.js, reuse configuration precedence/schema v1 checks. better-sqlite3 readonly/fileMustExist; no initialization, migration, chmod, mkdir or WAL-mode alteration. Missing DB fails safely. Close handles and test files/directory contents/permissions before/after including writer/WAL coexistence. CLI owns system of record, communicator adds no store/backup/delete path. Reuse task read methods with injected readonly handle or factor shared pure reads; never expose mutators.

#117 enumerate canonical root STATUS/docs/features and documented .projects/<project>/ categories, not whole filesystem. Repository artifacts remain authority. Revalidate project membership/root each read, accept opaque artifact ID, never caller absolute path. Exclude .git, node_modules, caches, DB/WAL, logs/sessions/runtime, credentials/auth/secrets/env. Deny symlinks/traversal/decoded separators; realpath within selected root and race fail-closed checks. Freeze bounded formats/size/errors in SPEC before implementation. No raw HTML/script Markdown rendering or duplicate store.

#116 previews use explicit per-project local URL metadata; no command execution/discovery. Validate HTTP loopback literal/port, no userinfo/fragment/remote host. Bounded reachability probe with timeout, redirects denied. Available/unavailable response; noopener/noreferrer open link, no iframe/proxy. Freeze namespace/schema/probe contract in slice. Never launch apps.

#118 task list/detail/history via scoped read APIs/prepared queries; refresh authoritative DB; corrupt/unsupported data safe error, no repair. Two-project fixtures with shared work-item IDs prove history isolation. Each future API freezes response -> retained ID -> next action/error/retry/stale selection contract before implementation.

## Operations, metrics, rollback and handoff
Local process hosting is product scope; no cloud provider or extra account/cost. Existing opt-in src/telemetry.js is sole telemetry boundary; #114 adds no events/outbound request/persistent logs. Immediate metrics are deterministic boot/recovery/keyboard outcome and aggregate timing in redacted QA evidence; coordinator reviews after each slice. Engagement analytics deferred until domain workflows exist; reuse consent gate, aggregate counts only, no names/paths/IDs/content. No third-party collector justified for this local foundation.

Implement only current contracts and TC-001/002. Parent records TC-003 browser evidence and exact-candidate independent review. Existing onboarding plus lint/all Node/spec/Python gates before commit. Temporary fixtures outside distribution. Evidence SHA/time/browser identity. Rollback/retirement removes communicator assets/routes and later CLI wiring, retains NED DB/project files; prove retired routes unreachable and other CLI/onboarding unchanged. Coordinator schedules scoped refactoring after aggregate milestone for proven duplication only.

Update SPEC status/coverage from actual implementation; future gaps remain explicit. Subsequent issues extend this feature. No writable DB opener and no successful stub domain routes.

## #115 CLI dispatch
Dispatch com before provider/telemetry construction into src/communicator/cli.js. Strict --port/--database/--help flags follow SPEC CUJ-004. Pass resolved databasePath into server options without opening DB. Install signal handlers before listen; serialize shutdown, remove handlers, release all connections. Print actual URL only after successful listen. No browser launch or domain/API changes.
