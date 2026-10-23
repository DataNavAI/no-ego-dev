# Hermes chat implementation contract

Research date: 2026-10-22. Extends [SPEC](SPEC.md); proposed until verified.

## Research and decision

[Antigravity agent panel](https://www.antigravity.google/docs/agent-side-panel) documents conversations, model/mode controls and an activity toolbar next to input. [Features](https://www.antigravity.google/docs/features) documents project context. Benchmark is documentation-based, English/US; no claim of signed-in testing or measured competitor performance. Adopt persistent composer, separated project context, readable transcript and explicit activity state. Model selection, attachments and approval UI are deferred.

Library comparison before development:
- [TanStack Virtual](https://tanstack.com/virtual/latest/docs/installation): MIT framework-independent core; suitable for arbitrary list virtualization but requires bundling plus dynamic row measurement and anchor management. Best future option if continuous unlimited history replaces page navigation.
- [React Virtuoso](https://github.com/petyosi/react-virtuoso): MIT core, variable-height lists; adds React to the current native ES-module application. Its separate [Message List](https://virtuoso.dev/message-list/tutorial/message-list/) requires a commercial license and is not an open-source substitute.
- [assistant-ui](https://github.com/assistant-ui/assistant-ui): MIT React chat primitives, useful for a React app; introducing React and a build pipeline is disproportionate here.
- Decision: reuse native fetch, semantic controls and CSS; bounded 50-message network pages, at most 200 rendered messages, older/newer navigation. No new UI dependency, external CDN, telemetry, licensing expense or framework migration. Pagination bounds network and DOM work rather than merely hiding already downloaded history.

Provider authority: [Hermes API documentation](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) and [session route implementation](https://github.com/NousResearch/hermes-agent/blob/main/gateway/platforms/api_server.py). History supports `order=latest&limit=50&offset=N`, returns chronological rows within each page. Sessions return `data`, creation returns `session`, synchronous chat returns `message` and `session_id`. Never use stateless completions with the full transcript.

## UI brief / implementation acceptance

Extend existing [tokens](design/design-system.md). One source order: project navigation, Chat, project detail. Desktop >=1024: 220px navigation, flexible chat (minimum zero), 320px details. Mobile: native View selector defaults Chat, selecting Project displays existing detail; chooser stays reachable. Existing project sections remain available. Chat is gateway-owner scoped, independent of selected NED project; do not label it project-scoped or inject project paths. List the configured gateway profile's sessions so existing Hermes conversations can be resumed; create new sessions with `source=nedcom`.

Chat heading, Session chooser, New chat, Load more sessions, Load older, Load newer, Latest, transcript, status, Message textarea, Send. Initial empty: “Start a new chat.” Loading: “Loading chat…” Working: “Hermes is responding…” Failure before send: “Chat is unavailable. Check the Hermes gateway, then retry.” Failed/uncertain send: “Delivery could not be confirmed. Reload the session before sending again.” Never automatically retry a mutation. Reload permits reconciliation. Preserve draft on failure. Busy disables session changes and sending. Render content as text, wrapping long lines; no HTML/Markdown execution. Incoming data preserves a scrolled-up reader. Latest and successful local send scroll down smoothly except reduced motion. Prepending preserves the first visible content offset. Loading older at the 200-row cap removes newest rows; Load newer or Latest restores them. No transcript in localStorage.

## Connection / operations
`/api/capabilities` now reports `readOnly:false` and `capabilities.chat:true` because explicit chat writes are supported. Projects/tasks/files remain unchanged by chat.
When a reader scrolls up during a pending reply, retain the exact existing transcript and show “New reply available. Select Latest.” Pause older/newer pagination until Latest or Reload reconciles the changed offset window. A completed gateway response confirms delivery; read recovery failures retain the draft and never replay it automatically.

History pages require unique stable IDs. Each older/newer navigation also re-reads the latest 50-row page to check its newest ID against the retained history head before changing the displayed window. If another client changes the session, unexpected overlap/head drift displays “History changed. Select Latest to reload.” Preserve the current transcript and reading position; pause paging until Latest or Reload succeeds. Missing/repeated upstream IDs fail safely. This costs one additional bounded read per continuation, without loading the whole session.

Run `ned com` to connect to the host's default Hermes gateway. No NED-specific connection settings are needed when Hermes' API server is already configured. NED COM reads `config.yaml` and `.env` in `HERMES_HOME`, otherwise `~/.hermes`, and uses the configured loopback API port (default 8642) and key server-side. It reads fresh settings on each request, so Reload recovers after gateway setup or key rotation. Profile `.env` must be a private regular nonsymlink file owned by the current user; settings reads are bounded to 1 MiB. No credential is exposed to browser storage, HTTP responses or telemetry.

When YAML contains the API key, its opened-file owner/permission metadata must also be private/current-user. Endpoint-only YAML may retain ordinary read permissions. Neither format's credential is accepted from a symlink.

For an unconfigured Hermes installation, enable its API server with `API_SERVER_ENABLED=true`, private `API_SERVER_KEY`, `API_SERVER_HOST=127.0.0.1`, and optional `API_SERVER_PORT` in the profile `.env`, then start/restart the gateway through Hermes. COM does not change profile settings or launch/restart gateways itself. This host's default gateway was configured separately for the requested live test, keeping the generated key in its existing private `.env`.

Optional overrides remain `NED_HERMES_URL` and `NED_HERMES_API_KEY`; process `API_SERVER_KEY` is also supported. An explicit different endpoint requires an explicit credential and never receives a discovered local-profile key. Use only literal loopback HTTP origins, no credentials/path/query/redirects. Missing/malformed configuration gives recoverable sanitized 503. YAML loading uses pinned ISC-licensed [yaml](https://eemeli.org/yaml/), and dotenv parsing uses pinned BSD-2-Clause [dotenv](https://github.com/motdotla/dotenv); neither exports profile values to process.env.

Same-origin JSON POST required; origin-less writes forbidden. Exact allowlist: session list/create, history, chat. No deletes/admin/arbitrary proxy. Gateway owns persistence and execution permissions. No automatic send retry; 10-minute bounded synchronous turn; container forwarding shares that timeout. Read requests 15 seconds, max response 4 MiB; input 32 KiB; browser draft max 8000 characters. Browser disconnect aborts upstream request, which does not prove Hermes execution stopped. No stop/cancellation claim. Inside a container, loopback refers to that container: use the co-located Hermes gateway and selected profile home, rather than probing unrelated host profiles.

## Browser acceptance procedure (SPEC TC-008)

The [SPEC](SPEC.md) owns requirements FR-011–014, CUJ-008 and cases TC-007/008. This procedure supplies reproducible manual steps; it does not duplicate the authoritative contract.

- Journey / requirements: CUJ-008; FR-012–014.
- Level / automation: manual; procedure here, plus window logic unit assertions in TC-007.
- Preconditions: synthetic gateway with 10,000 distinct chronological messages, 55 sessions, hostile text, a deferred chat reply. Browser at 1280x800, 390x844, 320px and reduced motion enabled; no real token visible in browser.
- Given latest page; When Load older repeatedly; Then each request fetches 50 rows, DOM never exceeds 200 messages; visible anchor does not jump. Load newer/Latest returns recent messages. Session list loads progressively and preserves IDs.
- Steps: send once while reply held; attempt double send/session change; assert disabled and one turn. Scroll up while waiting; completion does not force bottom. Refresh/reopen proves persisted turn. Fail send after acceptance; draft retained and Reload required before any resend. Change project during chat and verify no project/session relabeling. Inspect keyboard/focus, safe hostile text, no horizontal overflow, mobile View defaults Chat and Project remains reachable. Reduced motion makes Latest immediate.
- Negative cases: missing key, gateway offline, malformed/oversized replies, session deleted, very long messages, changing sessions during history read, failed older page retries. No auth values or message content in telemetry/storage.
- Cleanup: stop fixtures/browser and remove test-owned external evidence. Pass requires actual screenshots, geometry/network observations and keyboard results; written cases are NOT RUN.

Coverage: FR-011 → CUJ-008 → TC-007; FR-012 → CUJ-008 → TC-007/008; FR-013/014 → CUJ-008 → TC-008. Live model acceptance remains separate from synthetic transport tests. Rollback removes chat routes/assets and env settings without deleting sessions. Existing telemetry stays unchanged; no transcript analytics. Feedback through repository issues; owner reviews after rollout.
