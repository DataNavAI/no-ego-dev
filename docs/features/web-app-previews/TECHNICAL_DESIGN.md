# Web app previews — technical design

Status: draft, preview-design-r2; [behavioral authority](SPEC.md); [visual decision](design/DESIGN_REVIEW.md). Implementation is not authorized by this document. Scope is design only. Recommended transport/security direction remains subject to independent review and platform spikes.

## Current code and reuse decision

Inspected no-ego-dev `bd0cb7cf2c3fd9008580f671c44263d15406b448`:

- `src/communicator/projects.js`: project registry read, one `.nedcom.json` URL, IPv4 loopback validation, one-second HEAD2xx probe.
- `src/communicator/public/app.js`, `index.html`, `server.js`: selected-project flow, responsive Chat/Preview switch, Open app link; COM CSP currently has no frame-src allowance.
- `src/communicator/hub.js`: authenticated outbound control/data channels; no inbound listening bridge. Data always enters the COM HTTP bridge; its fixed Host/Origin rewriting must not be applied to arbitrary app traffic. Its bridge has no upgrade handler for app WebSockets.
- `src/runtime-home.js`, `database.js`, `tasks.js`: shared selected-home resolution and project metadata. No duplicate task graph/project inventory needed.
- `src/communicator/public/settings.js`, `secret-request.js`: COM hosts privileged secret UI. Running an app under COM's origin would expose a much larger trusted surface.

The design branch was then fast-forwarded to latest main `b0a603cdaee0d7a77343f6376c079a4f41fdf400` (compact-composer change); no preview/relay source behavior changed.

Inspected Hub checkout `1d12bf817be81d9f57ddc9210ecd8dcb05b6008b`, specifically `apps/server/src/tunnel.ts` and `config.ts`. Hub already authenticates instance control streams, has one-use browser grants, isolates instance origins and proxies HTTP/upgrades with credential stripping. It currently routes browsers to COM, not a selected registered app. Inspection is read-only; this is not proof of current deployed Hub behavior or provider/DNS readiness.

**Decision: extend existing registry/Hub transport and theme existing COM controls.** No new tunnel vendor, public quick tunnel, app hosting provider, frontend library or analytics SDK. General path-prefixed reverse proxy was rejected: root-relative assets, redirects, cookies and HMR frequently assume an origin root. Same-origin iframe was rejected because app scripts would share COM privileges. Direct localhost links were rejected for remote browsers. A separate public tunnel per app was rejected because it duplicates auth/lifecycle and creates anonymous exposure.

## Proposed agent interfaces (not current commands)

Hermes runs the process separately, with its normal durable process tool. Example dev-server launch is framework-specific and must not rely on a short-lived foreground command that ends with the agent turn:

```text
# Process tool: in /workspace/store, run its dev server bound to127.0.0.1:3000.
# Wait for a valid HTTP response; do not assume the shell launch means readiness.
ned preview register web --port 3000 --name Storefront --project /workspace/store --json
{"id":"pv_example","project_id":"project_example","slot":"web","generation":1,"status":"available","port":3000,"name":"Storefront"}

ned preview list --project /workspace/store --json
ned preview get pv_example --json
# After a process restart or port change, list/get first and bind the update:
ned preview register web --port 3001 --name Storefront --project /workspace/store --expected-generation 1 --json
ned preview unregister pv_example --expected-generation 2 --json
```

Illustrative IDs are opaque, not formats to reconstruct. Missing/unsafe target exits2 with a bounded error code; DB/identity-adapter failure exits1. Same-input retry is idempotent; conflicting update exits3 (`generation_conflict`, HTTP409 equivalent). `list/get` metadata never creates a route grant. Unregister exact completed removal returns success; stale removal of a newer generation conflicts. Browser GET of a bare route never creates a registration.

Native tool actions use closed schemas and delegate to the same trusted service/argv-only adapter:

```json
{"action":"register_preview","project":"/workspace/store","slot":"web","port":3000,"name":"Storefront"}
{"action":"list_previews","project":"/workspace/store"}
{"action":"unregister_preview","id":"pv_example","expected_generation":2}
```

Updating register adds `expected_generation`. No command, host, URL, shell code, bearer, secret, arbitrary header or file content input. Agents keep the opaque ID/generation and re-read persisted state after uncertain mutations. Tool success means registered/verified availability, not process supervision, production deployment or browser rendering.

## System of record and ownership

Use existing selected-home NED database with a new `preview_apps` table. Reuse `ned_projects`; no goals/tasks are created by preview registration. Explicit DB configuration remains supported. Preview rows also require a durable private selected-home runtime ID, generated once at `<agent-home>/.ned/instance-id`; sharing an explicit DB must not make another home publish local ports. This file is nonsecret identity metadata with private ownership/no-symlink checks, retained on reinstall and included in consistent runtime backup. Never regenerate it silently for an existing populated preview store.

Proposed columns: `runtime_id`, opaque `id`, `project_id`, `slot`, `name`, `port`, `generation`, verified listener identity, created/updated timestamps. Unique `(runtime_id,project_id,slot)`. Runtime status/observed time is separately cached by the relay and not durable evidence of a running process. Foreign keys and CAS updates are transactional. Row mutation + new generation are one transaction; admission re-reads active generation. Project IDs come from existing metadata, with canonical-path and directory identity validation; no guessed project ID or unregistered path from a browser.

COM is the local registry/relay observer and remains running after agent turns. It polls process identity every2seconds, publishes bounded metadata changes through existing workspace event infrastructure, and revalidates before and after connecting, before forwarding any app bytes. OS adapters must bracket connection establishment and verify expected process identity; they must not equate 'port answers' with 'same app'. Same-OS-user hostile process compromise is outside NED's existing trust boundary; the guards prevent accidental process/PID/port reuse, not an OS sandbox. If the adapter cannot reliably establish ownership, deny admission.

When COM starts, all retained rows start unverified. A listener still matching UID/PID/start/canonical project can become available; otherwise offline until explicit agent re-registration. Any changed listener creates a new generation and origin. Old route identities are tombstoned/revoked, never rebound. A process changing cwd/project identity loses admission. macOS/Linux namespace adapters are release gates; unsupported Windows/cross-container targets fail clearly. Do not add a supervisor/watchdog merely to keep registrations alive.

Backups: before schema migration, quiesce registry writes and snapshot NED DB plus runtime ID consistently with existing profile backup procedures. No secrets/task migration is authorized. Rollback disables new route admission and closes streams before running compatible old code, preserves table/identity metadata and never edits legacy `.nedcom.json`. Removing a preview deletes only that runtime's record and ephemeral grants, not project/tasks/process/files. Feature retirement removes the tool actions, APIs, UI selector, new ingress/origin routes and ephemeral grants; preserve project/task data and runtime ID until verified no consumer remains.

## Access and data flow

```mermaid
sequenceDiagram
  participant H as Hermes
  participant R as Local registry / relay
  participant C as NED COM browser
  participant B as Authenticated Hub
  participant A as App on127.0.0.1:port
  H->>A: Start process and check HTTP readiness
  H->>R: Register project / slot / port
  R->>A: Verify listener ownership and identity
  R-->>H: Opaque app ID / generation / status
  R-->>B: Advertise app identity and generation on authenticated control
  C->>R: List previews (local, or through authenticated COM relay)
  C->>B: Request selected app access
  B-->>C: One-use bootstrap POST grant
  C->>B: POST grant to isolated app-origin bootstrap
  B-->>C: Host-only access cookie;303 to clean app root
  C->>B: App HTTP / WebSocket at isolated app origin
  B->>R: Open typed preview data channel for ID / generation
  R->>A: Verify current generation and listener; stream HTTP / WS
  A-->>C: App bytes through relay, no COM credentials
```

For local use, COM/agent's local relay plays the grant/admission role; no Hub account or internet is required. Browser connection contains opaque preview identity, never an arbitrary target URL/port supplied by the browser. The browser selects identity; the agent resolves it to a verified local port. Hub cannot ask an instance to connect to an arbitrary host/port.

### Origins, cookies and embedding

Remote: configure one dedicated preview base; a single opaque label such as `<random-route>.preview.example.test` is one app generation, mapping to a server-side `{user,instance,app,generation}` authority record. This is illustrative, not an existing public URL. Flat labels permit a single wildcard TLS certificate; do not assume `*.preview...` covers a two-label `app.instance.preview...` host. Neither control nor COM paths exist on the app origin. Wildcard DNS/TLS, ingress origin allowlist and cookie migration require separate Hub rollout authorization/evidence.

For same-site sibling preview origins, **all security-sensitive Hub/control/COM auth cookies must use host-only `__Host-` names over HTTPS and no legacy broad-Domain/fallback auth acceptance** before enabling executable previews. Upstream Set-Cookie filtering alone cannot stop app JavaScript writing a parent-Domain cookie. Existing generic proxy-cookie handling is not sufficient evidence for this new boundary. This migration must explicitly handle re-login/old sessions and be reviewed in Hub. A dedicated registrable preview domain is an alternative only after real browser third-party-cookie/access testing; it is not a silent fallback.

### Parent CSP lifecycle

A response-header CSP cannot be widened by a later selection API result. The selected-origin-only promise is therefore removed. COM loads with a bounded configured preview namespace, e.g. `frame-src https://*.preview.example.test; form-action https://*.preview.example.test`, while preserving its existing other directives and prohibiting global wildcards or app-origin CORS on COM. That namespace hosts only this preview ingress; unknown labels/multilevel hosts have no app route. The ingress still authorizes exact user/instance/app/generation and the UI validates that every returned origin is within configured namespace and current selected membership. CSP is defense in depth, not the authorization database.

A→newB→new generation within the namespace works in the existing parent document without losing chat/draft. A changed configured namespace is a document-policy change: deny the new origin in the old document and show an explicit refresh-required state; no silent parent reload/draft discard. Local CSP can only be finalized with the compatible local site/host arrangement below, using its explicit namespace and relay port.

### Local site/cookie decision gate

The current COM origin is `http://127.0.0.1:<com-port>`. Pairing that IP-literal site with `http://p-<opaque>.localhost:<relay-port>` and SameSite=Strict is **not a valid chosen local embed contract**. Loopback routing does not make different sites same-site. This exact tuple is withdrawn; do not implement it or silently relax to insecure cross-site cookies.

The origin/auth spike must choose and prove a compatible tuple in every claimed browser, including bootstrapping, embedded requests, new tab and renewals. One candidate is canonical COM `http://com.ned.localhost:<com-port>` with app hosts `http://p-<opaque>.ned.localhost:<relay-port>`, but schemeful-site calculation, name resolution, cookie behavior and current COM Host/Origin admission changes require proof. It is a candidate, not a working configuration. No `__Host-`/Secure-over-HTTP assumption is made. Another option is approved local HTTPS; installing/trusting certificates requires separate authorization. Cookie-authenticated apps need the supported prefixed-cookie guarantee and therefore cannot be silently included in an unproven HTTP developer mode.

If aliases are selected, CLI's canonical COM URL and strict Host/Origin checks must use the new allowlisted host; preserve old IP entry for existing COM behavior, with an explicit user-gesture link to a preview-compatible origin rather than embedding under a broken tuple or losing an unsent draft. Local registration/listing can remain available, but old IP top-level-only Open app is an interim limitation and does not pass the intended complete local embedding release. No local/remote preview release until this gate resolves and TC-003 proves it; no Hub/internet requirement is added to the intended local outcome.

### Bootstrap request classes and referrer/opener handling

Keep four distinct classes; do not apply a JSON/custom-header contract to HTML form navigation:

1. **Protected COM mint API:** same-origin JSON POST, exact COM Origin, custom CSRF header and existing authenticated Host/user checks. Bounded body only `{generation,mode}`. Return an exact authorized origin and a one-use30second grant bound to user/instance/app/generation/COM Origin.
2. **Ingress bootstrap navigation:** POST only at reserved `/_ned_preview/connect`, exact issued Host, `application/x-www-form-urlencoded` UTF-8 body at most4KiB containing exactly `grant`. A form cannot send the custom CSRF header; no such header is required here. Require the configured exact trusted COM Origin; reject null/missing/foreign Origin, bad form schema, expired/replayed/wrong-user/generation grants. Consume grant atomically before app handling; no body/grant to app server/logs. Set scoped access cookie then303 to `/` with a clean URL.
3. **App HTTP:** cookie-authorized network request at current route/generation; browser GET/assets/navigation need not have an Origin header. Mutations validate appropriate app-origin CSRF context without replacing the app's own protections. NED bootstrap headers are never forwarded as app auth.
4. **WS:** current cookie/authority plus exact app Origin on upgrade, bound generation and revocation, then raw streaming. A form grant is never a WS credential.

A grant may briefly reside in trusted COM memory and an ephemeral hidden form input; that DOM is trusted COM, never app DOM or persistent browser storage. Dispose the form/input immediately after submission and clear on cancellation/navigation. This intentionally narrows the prior absolute no-DOM wording. Never use query tokens or a public URL.

The bootstrap-producing COM document must use an explicitly tested `Referrer-Policy: origin` policy for this navigation path, replacing inherited `no-referrer` at the correct COM response layer; only the COM origin, not its path/query, can be sent. Do not set `noreferrer` on the bootstrap form/new-tab action: it can suppress the Origin needed for validation. Use a targeted hidden form for the frame and a user-gesture `_blank` form with `rel=noopener` for a tab. After the303, app-origin responses use a restrictive referrer policy and the ordinary app/new-tab journey has no COM opener. Retain noreferrer on unrelated ordinary outbound COM links. Actual browser Origin/referrer/opener/cookie behavior, including failure under an inherited no-referrer policy, is a TC-003 release gate; never accept arbitrary null Origin to work around it.

COM response frame-src/form-action admits its fixed preview namespace, while the API/form ingress enforce exact per-app authority. Reserve `/_ned_preview/`; applications using that path must be adapted or declared incompatible. There is no generic HTML rewriting or second identity service.

Remote session expires15minutes. COM can request renewal while authenticated and the same generation remains active; reload/bootstrap failure retains selection with a retry state. WS admissions validate the same cookie and exact app Origin. Hub auth/instance state is revalidated at most5seconds apart, with immediate invalidation on known revocation; loss of authority closes channels. Restarts drop in-memory access grants/leases; page rebootstrap is required. Runtime records are durable; access is not. Revocation prevents subsequent network access; it cannot erase already downloaded app content or app-owned storage in an open tab.

Iframe sandbox: `allow-scripts allow-same-origin allow-forms allow-popups`, with no top-navigation or automatic downloads. The app is cross-origin from its parent, so its scripts cannot remove the parent-owned sandbox. Do not read/modify app DOM, permit COM-origin app hosting, or inject a 'bridge' with COM privileges. Existing app X-Frame-Options/CSP must remain intact. Framing incompatibility falls back to Open in new tab; OAuth/storage/top-navigation-sensitive apps may require that top-level view. No universal iframe compatibility promise.

### Worker and application-cookie compatibility boundaries

First-release preview origins **prohibit service workers and all other workers**. The relay/ingress adds an independent restrictive `Content-Security-Policy: worker-src 'none'` to every app document/response, without removing the app's own CSP, and rejects worker script requests (`Service-Worker: script` / service-worker destinations) before app forwarding. Apply in iframe and protected top-level views, redirects, errors and alternative document MIME types. Worker/PWA-dependent apps are explicitly unsupported; Open in new tab does not bypass this restriction.

New generation origins must be cryptographically fresh, never previously served or reused by any app. Unknown hosts serve no app and no worker-capable document. This prevents pre-existing app-controlled workers on an admitted new origin; a retirement never reissues a grant to a previously worker-capable or controlled origin. If an existing controlled origin is detected or cannot be excluded, retire it and deny admission, rather than trying to reserve a server path against a client-side worker. TC-003 must attempt root-scoped worker registration/interception on initial visit and renewal, with a positive non-preview worker-control fixture, and prove no Request body grant reaches a worker. CSP source inspection alone is not proof. Local/browser arrangements must meet the same browser boundary before release.

Separate guarantees: NED routing authority, COM privilege isolation and DOM/web-storage origin isolation are required. **Arbitrary app-cookie noninterference is not guaranteed by sibling subdomains.** Set-Cookie filtering cannot prevent app JavaScript writing a parent-Domain cookie. HTTPS NED route/control cookies require exact host-only Secure HttpOnly `__Host-` names and reject ambiguous/invalid auth cookie inputs. Apps using cookie authentication are supported only when their auth contract uses tested host-only Secure `__Host-` cookie names with no Domain and no unprefixed fallback; fixture appB must remain authenticated as itself under appA parent-Domain cookie-tossing attempts. Apps depending on unprefixed/Domain auth cookies are unsupported until a separately reviewed architecture solves that boundary. App-owned non-auth preferences may coexist, but no claim is made that arbitrary same-name preference cookies cannot collide. Local HTTP does not inherit HTTPS prefix guarantees by assertion. This limitation is distinct from unauthenticated development pages or app bearer auth held in origin-isolated storage.

### Hub protocol extension and compatibility

Negotiate capabilities before publishing any preview: existing `com.http.v1`, new `preview.http.v1` and `preview.ws.v1`. Registration still works locally when Hub lacks them, but UI explicitly reports remote preview unavailable and preserves COM. Existing COM control/data target and auth policies remain unchanged.

Agent advertises only route ID, app ID, project display metadata and generation; never local path, process args, token or arbitrary destination. Hub's authenticated `open` message carries `{kind:"preview",route_id,app_id,generation}`; agent checks it against current runtime/active row before opening an app socket. Agent never trusts a remote port/URL. Reject unknown kind/version/fields. Each WS data channel binds once to its authenticated control/instance/generation; no channel switching after admission. Quota and revocation track HTTP and upgraded WS sockets separately.

A dedicated app bridge forwards HTTP/upgrade streams; do not run app traffic through COM's current Host/Origin rewriting. Resolve target as127.0.0.1 only, preserve app path/query/body and backpressure, strip hop-by-hop and reserved NED headers, replace Host with the verified loopback listener. Preserve external app Origin for the application's own CSRF handling; emit sanitized trusted forwarded host/proto only if explicitly part of the app contract, never accept them from the browser. Keep app-origin auth headers/cookies separated from NED bootstrap/auth credentials. No HTML/JS body rewriting or decompression/recompression requirement.

First-release HMR supports dev servers that infer the client endpoint from the current app origin and can traverse the reverse proxy without a startup-bound fixed preview hostname. Do not prescribe 'configure assigned originA, restart, then re-register' when restart creates originB: that recipe does not converge. Exact-host startup-only HMR configurations remain unsupported pending a separately proven origin-allocation/configuration lifecycle. The compatibility spike must test this negative sequence and show a truthful HMR-unavailable result rather than repeated restarts or a localhost fallback. Open in new tab is an embedding fallback, not a fix for incompatible HMR. Never use `allowedHosts:true`, wildcard CORS, disabled CSRF, a generic source rewriter or a new supervisor to hide the mismatch.

Preserve external redirects only as normal browser navigation subject to app/parent security; do not follow them server-side. Reject redirects to another private/loopback target; rewrite only the exact registered loopback target to its assigned origin.

## Components and proposed HTTP contracts

No route below exists today. The four browser request classes above have distinct method/body/Origin rules. COM control APIs inherit existing exact Origin/custom-header/Host protection; form bootstrap, ordinary app HTTP and WS must not be mislabeled as protected JSON API calls. Hub user/instance/generation authorization remains mandatory for all remote data admissions.

| Owner | Interface / retained state | Next action and failure |
| --- | --- | --- |
| NED CLI/native plugin | Register/list/get/unregister service; retain returned opaque ID + generation | Inspect readback on timeout; CAS on changed registration |
| COM | `GET /api/previews` → instance-scoped metadata; `GET /api/previews/:id` → latest generation/observed state | Validate selected ID membership; subscribe to bounded workspace changes |
| COM / Hub | `POST /api/previews/:id/access` with `{generation,mode:"embed"|"tab"}` → exact origin + one-use POST bootstrap descriptor | Revalidate ownership/current generation immediately before minting;409 stale,401/403 auth,503 offline/unsupported; no blind grant replay |
| App-origin ingress | `POST /_ned_preview/connect` with one-use bootstrap form body | Bounded URL-encoded form, no custom header; exact trusted COM Origin with tested origin referrer policy; consume, set scoped cookie,303; reject null/expired/replayed/wrong generation before app/worker exposure |
| App-origin ingress | HTTP at `/...` and WS upgrade | Resolve authorized generation; stream only after local peer verification; revoke on identity/authority loss |
| COM UI | Selection `{project_id,preview_id}` plus in-memory generation/navigation epoch | Ignore stale responses, tear down old frame/streams before navigation, clear removed IDs, no grant persistence |

Agent-local registry mutations are via CLI/native service only in first release. No browser 'enter any port' or 'run command' admin endpoint. Local process capture is not remote proof of service correctness. Every app status includes bounded code and observed time; no raw process command/working path in UI responses.

## Observability and operations

Reuse existing NED opt-in telemetry, allowlist and sanitized local diagnostic pipeline. New bounded event definitions are in SPEC FR-014; any implementation must update the central catalog/version and tests rather than invent unsupported events. Local metrics are aggregate counts/duration buckets, not request-level IDs. Retain local aggregate diagnostics7days, owner-readable; no external delivery when opt-out. Proposed reports on project1 summarize registration/connection failures and latency with at least10 observations per aggregate, otherwise omit rates. No current baseline exists. Product owner reviews feedback daily during active rollout/first week; this document creates no scheduled job.

Cost/provider choice: existing local process + Hub relay; no separate app-hosting subscription or third-party tunnel/analytics. Remote bandwidth/resource cost stays with existing Hub and depends on actual volume; no invented free-tier or provider price claim. Admission quotas reserve COM capacity. Use existing account/session ownership and instance revocation rather than a second identity service.

## Implementation sequencing and release gates

1. **Ownership/registry spike (no-ego-dev):** prove listener and established-connection identity on macOS/Linux, instance-home partition with shared DB, explicit generation/CAS and backup/migration. Exit: TC-001/005 automated boundaries, no accidental port reuse and proof that the launched app remains running after the actual launching Hermes reply/tool session finishes. Unsupported platforms remain unavailable.
2. **Origin/auth spike (ned-hub + local relay):** select/prove a compatible local COM/app site and cookie tuple, current Host/Origin migration, remote host-only prefixed control/app-cookie policy, fixed namespace parent CSP lifecycle, class-specific form Origin/referrer/opener rules, browser-enforced worker prohibition and fresh-origin lifecycle, grant replay/logout/generation revocation. Exit: TC-003 real-browser proof before any public app exposure. No provider/DNS mutations from this design.
3. **Transport (both repos):** capability negotiation and typed target selection, HTTP/body/redirect handling, streaming WS/HMR, quotas/COM reservation. Exit: TC-002/003/005 negative and failure fixtures. Roll out Hub capability dark first, then agent relay; no preview until both support it.
4. **UI + agent workflow (no-ego-dev):** selected direction, selector membership/stale epochs, iframe/recovery/new tab, CLI/native packaging/skill behavior scenarios. Reconcile supported-device registry and old COM spec links. Exit: TC-004, desktop/mobile and actual native model acceptance; no code-based tests of skill prose.
5. **Acceptance/local rollout and refactoring:** full canonical gates, independent exact-candidate review, immutable main merge and default local deployment. Then separately authorized Hub staged rollout/public TLS/auth/HMR smoke. Refactor shared admission/header policy only after tested convergence; retirement/rollback evidence completes the capability. Local mocks or local success cannot certify hosted ingress/cloud authority.

Implementation ownership is tracked as [no-ego-dev #157](https://github.com/DataNavAI/no-ego-dev/issues/157) and [ned-hub #81](https://github.com/DataNavAI/ned-hub/issues/81), both planned/unclaimed pending this design. These are linked on project1. #155 is the design outcome, not permission to mark runtime work complete. No runtime acceptance is passed by writing this plan.

## Technical references

- [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy): different origins restrict DOM/storage interaction; cookies need separate scoping analysis.
- [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe): sandbox and app embedding policies constrain compatibility.
- [Vite server options](https://vite.dev/config/server-options): reverse proxies must support WS for HMR; blanket allowedHosts disables an important dev-server boundary. Exact options depend on the installed project version; do not copy a current option into an older project without checking its version.
