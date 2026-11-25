# Single active preview: implementation and delivery boundary

The [SPEC](SPEC.md) is authoritative. The user's one-app decision supersedes the earlier slot registry/menu-versus-tabs proposal. Registration/status and isolated private delivery are implemented in the candidate. No native registration action is shipped: the agent uses the API-backed CLI and web-app-preview skill.

## Current architecture

- Core owns `apps/core/src/preview.js`. `createNedApiHandler` authenticates/validates Host and Origin before dispatch; `/api/v1/preview` is its own resource family and also works with browser-disabled backend-only listeners. COM and Hub transport reuse that existing NED API boundary.
- `ned preview` calls the same resource via the CLI's shared API/context client. It selects explicit --api, NED_API_URL, legacy NED_CORE_URL, or a short-lived backend-only listener; compares runtime/database fingerprints before preview requests; closes owned listeners. No browser request can choose an agent home, DB or gateway. CLI uses private bearer internally and sets exact Origin on mutations.
- Existing SQLite `ned_feature_data` namespace is `preview:v1:<private-instance-id>`, key active. Durable instance ID comes from selected agent home. Shared DB across different homes still has distinct keys. Internal record retains canonical project root and opaque project ID; public projection omits root and credentials.
- Record `{revision,preview}` plus clear tombstone is changed in an immediate SQLite transaction. Nonempty replacement requires replace:true. Expected revision protects concurrent writes; exact target/name/project retry returns the current ID/revision without a write. Tombstones avoid delete/recreate ABA. Publication may create project metadata atomically, never work items/config files.
- Readiness uses HEAD `/` on fixed IPv4 loopback,1second deadline, no redirect following, credentials or response body; headers bounded32KiB. Registration refuses no-response and control ports. HTTP errors remain observations, not proof of rendering. Status rechecks revision after asynchronous probe; auth is rechecked before publication according to the listener's configured authority (COM credentials can be reloaded; explicitly supplied backend credentials remain listener-lifetime authority).
- Project path is canonicalized; final-component symlink/non-directory/missing path denied. OS aliases in ancestor paths (e.g. macOS /var) normalize to the same project. Project existence is rechecked after readiness; GET never recreates a missing folder.
- Active pending probes are cancelled on caller disconnect/service close. No app content/logs/bodies are persisted. The registry never acts as a process supervisor; the separate delivery listener relays only a currently verified registration.

## API and command examples

GET `/api/v1/preview` returns revision0/preview:null initially. PUT JSON accepts project, integer port, optional name, expectedRevision and optional replace. DELETE accepts expectedRevision. All use current NED API authentication; PUT/DELETE require exact Origin/application/json and at most4KiB. Unknown fields, query/suffix/method misuse fail closed. `delivery:{mode:"local-link",remoteAvailable:false}` disclaims private delivery. A live COM/Core delivery controller publishes a five-second renewable heartbeat and reports private-relay only for an ownership-verified listener; remoteAvailable requires the Hub capability.

```sh
ned preview status --json
ned preview register --project /workspace/shop --port 3000 --name Shop --expected-revision 0 --json
ned preview register --project /workspace/admin --port 3001 --name Admin --replace --expected-revision 1 --json
ned preview clear --expected-revision 2 --json
```

Ports are examples;1024–65535 permitted except current API/configured gateway and reserved8642/18789–18791 control defaults. Label1–80 printable characters. CLI defaults to cwd/basename and reads current revision if omitted. No slot/list/get-by-ID and no app selector. After uncertain mutation read status before retry; changed stale intent gets409. An agent request to show a different app authorizes preview replacement, not killing unrelated processes.

## Isolated delivery

COM mounts one managed Preview panel while retaining legacy project links when
no registration exists. It does not change the chat draft or project selection.
The authenticated `POST /api/v1/preview/access` accepts only a frame/tab mode,
requires exact COM Origin and returns a thirty-second one-use body grant.
COM submits it through a transient POST form to a fresh app origin; no bearer URL
or local storage is used. A protected cookie-verification page acknowledges the
bound generation to the exact COM parent before navigating to the app root.
Missing verification leaves a truthful unavailable state and a new-tab fallback.

Local origins use `pv-<id>.localhost` on a separate loopback listener. Secure,
HttpOnly host-only frame cookies use SameSite=None and Partitioned (Chromium
loopback exception); top-level cookies are distinct. Other browser/privacy
combinations may require the explicit top-level fallback. This is not a claim
of universal local third-party-cookie support.

Hub capability negotiation sends only ID/revision on the authenticated control
channel. Hub selects a random `preview--<32hex>` alias in its configured proxy
namespace, binds access to the current user's COM lease and owns bootstrap and
cookie verification. The 41-character alias cannot collide with an instance slug
(max40). Typed preview data channels contain no caller-controlled port. Native
Core resolves that ID/revision to the registered listener and revalidates it.
Hub forwards no NED API authorization to app channels.

Listener verification requires unique IPv4 loopback ownership, same UID, process
start identity and canonical cwd within the project. Linux also binds the socket
inode; macOS uses lsof PID/FD and ps start time. macOS does not expose a portable
kernel socket generation through this adapter; same-PID, same-second in-process
listener replacement is a residual limitation. Unsupported/unverifiable listeners
retain metadata-only compatibility and cannot receive app bytes.

HTTP bodies, headers, connection counts, connect/idle deadlines and grant/lease
maps are bounded. Core checks binding before and after connecting and sweeps
active streams every two seconds. Replacement, clear, listener changes and
control/access revocation close old routes. Worker creation is denied; reserved
cookies, domain cookies and trusted headers are stripped. App CSP/X-Frame-Options
remain effective. Same-app loopback redirects are rewritten, other private
redirects rejected. Referrer-Policy origin preserves form Origin validation
without sending paths; no bearer occurs in those paths.

The cross-repository browser procedure in TC-004 proves actual app rendering,
POST forms, Vite HMR, new-tab opener isolation and revocation. Local fixtures do
not prove deployed DNS/TLS/OAuth or managed rollout. Hub publication and the
infrastructure deployment owner remain responsible for that separate evidence.
