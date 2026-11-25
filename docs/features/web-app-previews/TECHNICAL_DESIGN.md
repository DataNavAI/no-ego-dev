# Single active preview: implementation and delivery boundary

The [SPEC](SPEC.md) is authoritative. The user's one-app decision supersedes the earlier slot registry/menu-versus-tabs proposal. Registration/status is implemented; app-origin tunneling remains planned. No native registration action is shipped: the agent uses the API-backed CLI and web-app-preview skill.

## Current architecture

- Core owns `apps/core/src/preview.js`. `createNedApiHandler` authenticates/validates Host and Origin before dispatch; `/api/v1/preview` is its own resource family and also works with browser-disabled backend-only listeners. COM and Hub transport reuse that existing NED API boundary.
- `ned preview` calls the same resource via the CLI's shared API/context client. It selects explicit --api, NED_API_URL, legacy NED_CORE_URL, or a short-lived backend-only listener; compares runtime/database fingerprints before preview requests; closes owned listeners. No browser request can choose an agent home, DB or gateway. CLI uses private bearer internally and sets exact Origin on mutations.
- Existing SQLite `ned_feature_data` namespace is `preview:v1:<private-instance-id>`, key active. Durable instance ID comes from selected agent home. Shared DB across different homes still has distinct keys. Internal record retains canonical project root and opaque project ID; public projection omits root and credentials.
- Record `{revision,preview}` plus clear tombstone is changed in an immediate SQLite transaction. Nonempty replacement requires replace:true. Expected revision protects concurrent writes; exact target/name/project retry returns the current ID/revision without a write. Tombstones avoid delete/recreate ABA. Publication may create project metadata atomically, never work items/config files.
- Readiness uses HEAD `/` on fixed IPv4 loopback,1second deadline, no redirect following, credentials or response body; headers bounded32KiB. Registration refuses no-response and control ports. HTTP errors remain observations, not proof of rendering. Status rechecks revision after asynchronous probe; auth is rechecked before publication according to the listener's configured authority (COM credentials can be reloaded; explicitly supplied backend credentials remain listener-lifetime authority).
- Project path is canonicalized; final-component symlink/non-directory/missing path denied. OS aliases in ancestor paths (e.g. macOS /var) normalize to the same project. Project existence is rechecked after readiness; GET never recreates a missing folder.
- Active pending probes are cancelled on caller disconnect/service close. No app content/logs/bodies are persisted. The API never acts as a reverse proxy or process supervisor.

## API and command examples

GET `/api/v1/preview` returns revision0/preview:null initially. PUT JSON accepts project, integer port, optional name, expectedRevision and optional replace. DELETE accepts expectedRevision. All use current NED API authentication; PUT/DELETE require exact Origin/application/json and at most4KiB. Unknown fields, query/suffix/method misuse fail closed. `delivery:{mode:"local-link",remoteAvailable:false}` explicitly disclaims a private route.

```sh
ned preview status --json
ned preview register --project /workspace/shop --port 3000 --name Shop --expected-revision 0 --json
ned preview register --project /workspace/admin --port 3001 --name Admin --replace --expected-revision 1 --json
ned preview clear --expected-revision 2 --json
```

Ports are examples;1024–65535 permitted except current API/configured gateway and reserved8642/18789–18791 control defaults. Label1–80 printable characters. CLI defaults to cwd/basename and reads current revision if omitted. No slot/list/get-by-ID and no app selector. After uncertain mutation read status before retry; changed stale intent gets409. An agent request to show a different app authorizes preview replacement, not killing unrelated processes.

## Compatibility and remaining delivery work

Existing `.nedcom.json` project reader/Open app remains unchanged; registered metadata does not rewrite config or embed a frame. A localUrl is the instance's loopback, not a remotely usable URL. This control-plane slice deliberately does not weaken COM response CSP or add a same-origin app proxy. No browser UI change is required for registration management.

#157 and ned-hub#81 still own actual private presentation. Before implementing that delivery, use one generation-specific app origin, exact authenticated target binding and separate control/app authority. Retain these unresolved gates from the historical design:

- Prove listener UID/PID/start/cwd ownership and port-reuse revocation before routing app bytes. Current HTTP status is not that proof.
- Prove compatible local/remote schemeful-site, HTTPS, cookie, Host/Origin and control-cookie isolation. Never assume127.0.0.1 COM plus sibling localhost Strict cookies works.
- Protect body-based one-use bootstrap from service-worker interception; never reuse unsafe origins or leak grants in URLs, app DOM, storage or logs. A reserved path alone is insufficient.
- Fixed configured namespace CSP must admit origins before document load; exact authorization remains at ingress. Preserve app CSP/X-Frame-Options; test iframe/top-level recovery.
- Stream HTTP/assets/forms plus WS/HMR under bounded backpressure/quotas without forwarding NED/Hub credentials. Prove inferred-host HMR lifecycle; do not restart forever to chase a newly allocated host.
- Revoke old routes/streams on replace, clear, disconnect or auth revocation. Test real browser cross-origin DOM/storage, cookie tossing and workers; do not promise arbitrary app-cookie isolation merely because origins differ.

These are future implementation acceptance gates, not new user choices. Historical mock HTML/images remain archived exploration only. The single-preview skill explains current limits rather than constructing a public URL or telling remote users to open localhost.
