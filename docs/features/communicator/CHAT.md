# Hermes chat implementation notes

The [SPEC](SPEC.md) is the authoritative behavioral contract. These notes summarize the current UI and operations; [CHAT_ACCEPTANCE.md](CHAT_ACCEPTANCE.md) retains dated historical observations, not blanket acceptance of this candidate. Manual cases remain NOT RUN until separately evidenced.

## Research and decisions

Initial research: 2026-10-22. The [Antigravity agent panel](https://www.antigravity.google/docs/agent-side-panel) informed the persistent composer, separated project context, readable transcript and compact activity toolbar. This was documentation-based benchmarking, not signed-in competitor testing or measured performance. Model selection and approval UI remain outside scope; attachments were subsequently implemented.

Libraries considered before development:
- [TanStack Virtual](https://tanstack.com/virtual/latest/docs/installation): MIT framework-independent virtualization; requires dynamic-row measurements and anchor management.
- [React Virtuoso](https://github.com/petyosi/react-virtuoso): MIT core but introduces React; its separate Message List is commercially licensed.
- [assistant-ui](https://github.com/assistant-ui/assistant-ui): MIT React chat primitives; a framework migration was unnecessary for this native ES-module application.

The implementation uses native fetch and bounded history: fifty-row network pages and at most 200 transcript articles. Later enhancements add pinned local Markdown/sanitizer and project-picker assets; no external CDN or framework migration is required.

Provider authority: [Hermes API documentation](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/api-server.md) and [session route implementation](https://github.com/NousResearch/hermes-agent/blob/main/gateway/platforms/api_server.py). History uses `order=latest&limit=50&offset=N` and returns chronological rows within each page. Accepted turns use Hermes session HTTP SSE, not stateless completions with a resubmitted transcript.

## Current interface

The governing layout is the [UI brief](design/ui-brief.md) and [design tokens](design/design-system.md): desktop has a horizontally resizable Chat/Goals/Artifacts pane beside Preview; mobile has a compact header and collapsible navigation drawer. The composer stays at the bottom while the transcript scrolls independently. The optional right Debug pane starts hidden. The selected project's latest validated goal/task change appears in a compact dismissible notice, separate from conversational text.

Chat is gateway-owner scoped, independent of the selected project. Startup and Reload ensure the exact `nedcom-main` session titled `NED Chat`; there is no session picker or New Conversation control. Only an upstream 404 permits creation; a concurrent 409 permits one bounded reread. COM never adopts an unrelated recent session, scans titles, or replays messages to recreate history.

Older messages load automatically when the reader scrolls upward. There are no visible Load/Load older/Load newer buttons. Prepending preserves the visible anchor; the 200-article cap bounds DOM work. Jump to latest restores the recent window. Continuations validate stable IDs and the latest history head; drift or failed reads preserve existing content and offer explicit recovery. Raw row offsets include hidden tool rows so pagination remains correct.

Submitting clears the entered draft immediately and appends its user bubble. Send becomes Stop while the accepted turn runs; newly typed text is not submitted automatically. Assistant prose appears incrementally, then the completed reply renders sanitized Markdown. Scrolling away preserves the reading position rather than forcing the newest reply into view. A one-line activity indicator reflects allowlisted Hermes events without exposing tool arguments, results or reasoning. Stop requests cancellation of that scoped gateway run; a failed stop remains retryable and is not reported as success. An uncertain send preserves or restores the submitted text when it does not overwrite a newer draft, and requires reconciliation rather than automatic resend.

Message input grows up to 160px or a quarter of the viewport, then scrolls internally. Enter submits, Shift+Enter inserts a newline, and IME composition/held Enter never submits. After settlement focus returns without scrolling unless the user intentionally moved it elsewhere. Jump to latest respects reduced motion. Transcript content and session identity are not persisted in browser storage; the optional pane-width preference is local.

## Streaming and connection operations

After a single 202 acceptance, the browser consumes one persistent GET `/api/chat/sessions/:session/turns/:turn/events` response with `text/event-stream` and a UTF-8 body reader. It does not poll turn status. The server flushes headers, streams validated deltas and heartbeats, and emits an authoritative terminal frame. Browser disconnect releases that subscriber, not the server-owned accepted job, and never automatically reconnects or resubmits. An interrupted stream requires Reload. The legacy status endpoint remains for compatibility, not browser transport. Protocol, subscriber, backpressure and response limits are specified in FR-035–036 and tested in TC-019.

Run `ned com` against the configured host Hermes gateway. COM reads `config.yaml` and `.env` from `HERMES_HOME`, otherwise `~/.hermes`; the default endpoint is loopback port 8642. Credentials remain server-side. Fresh requests reread configuration, so Reload can recover after key rotation. Profile files must satisfy ownership, private credential permissions, regular-file/nonsymlink and 1-MiB read bounds. COM neither creates keys nor reconfigures/restarts Hermes.

For an unconfigured Hermes profile, enable its API server with `API_SERVER_ENABLED=true`, private `API_SERVER_KEY`, `API_SERVER_HOST=127.0.0.1` and optional `API_SERVER_PORT`, then start/restart through Hermes. Optional explicit overrides are `NED_HERMES_URL` and `NED_HERMES_API_KEY`; process `API_SERVER_KEY` is supported. A different explicit endpoint requires an explicit key and never receives discovered profile credentials. Only literal loopback HTTP origins are accepted. In a container, loopback means that container, not another host profile.

Writes require same-origin JSON requests; origin-less writes are forbidden. Fixed ensure/history reads retain their 15-second/4-MiB bounds, while accepted streamed turns have their separate lifetime and 4-MiB prose/final bounds. Drafts are at most 8000 characters. No credential enters browser responses/storage or telemetry. Gateway persistence and execution permissions remain Hermes-owned. The opt-in public tunnel and authenticated Hub transport are separate deployment choices; synthetic tests do not certify live-provider or hosted acceptance.

## Attachments and links

FR-031–034 own exact validation and lifetime limits. Attach file accepts up to four supported images/documents, 4 MiB per file and 16 MiB total; images together are at most 2 MiB. Supported files are PNG/JPEG/WebP, UTF-8 TXT/MD/CSV/JSON, PDF and DOCX. The collapsed Supported files disclosure exposes limits. Add link inserts validated HTTP(S) links without fetching their destination. Upload errors do not discard other files or text; expired/used receipts require reattachment.

Pinned Sharp 0.35.5 decodes images under a 16-megapixel bound; Mammoth 1.13.0 and yauzl 3.4.0 handle validated DOCX raw text; pdfjs-dist5.5.207 extracts PDF text without OCR. Parsers run in isolated bounded children; no document scripts, external relationships or remote resources are allowed. Extracted documents are bounded to 128 KiB each, with text parts split below Hermes' normalization cap. Node 20.19.0 or newer is required. Selection rationale and parser boundary coverage are in the SPEC and TC-017; [Mammoth](https://github.com/mwilliamson/mammoth.js#security), [yauzl](https://github.com/thejoshwolfe/yauzl#security), [PDF.js](https://github.com/mozilla/pdf.js/blob/master/src/display/api.js) and [Sharp](https://sharp.pixelplumbing.com/api-constructor/) are primary library references.

Image-bearing history projects image URLs to `Image attachment` instead of opaque bytes or remote image requests. Ordinary user JSON remains literal; mixed image-bearing records preserve other fields. Oversized upstream pages are adaptively split into bounded requests while retaining fifty chronological raw rows, with at most 64 reads under the existing deadline. An individually oversized external row fails safely.

## Readable output

User prose remains literal; assistant prose uses locally served pinned [Marked](https://marked.js.org/) 18.1.2 plus [DOMPurify](https://github.com/cure53/DOMPurify) 3.4.17 with a narrow semantic allowlist. HTTP(S) links are permitted; embedded images/media, forms, scripts, SVG and unsafe links are omitted. There is no per-part 64-KiB Markdown bypass; existing transport/message bounds still apply. Explicit copy actions copy conversational prose and report success/failure.

FR-041 supersedes the original expandable-tool/raw-data design: all tool calls/results and unknown structured assistant blocks are hidden, including empty tool bubbles. They are not expandable disclosures or lossless raw-data fallbacks. TC-013/029 cover text preservation and hidden structured content; actual sanitizer behavior and responsive table geometry require browser evidence. Initial renderer research was recorded 2026-10-26; dependency audit observations are dated evidence, not a guarantee of security. Upgrade pins deliberately and rerun hostile-content/browser checks.

## Browser acceptance procedure (TC-008)

This procedure is manual and does not itself establish a pass. Later focused cases in the SPEC own streaming, Stop, media, notices, mobile navigation and new/existing-chat E2E.

- Preconditions: a synthetic gateway with canonical `nedcom-main`, unrelated sessions, 10,000 distinct chronological messages, hostile text and deferred streamed replies; browsers at 1280×800, 390×844 and 320px, plus reduced motion. No real credentials or private transcripts.
- Load the latest window, repeatedly scroll upward and assert automatic fifty-row continuations, at most 200 transcript articles and preserved visible anchor. Jump to latest restores recent messages. Fail a continuation; preserve visible content and require explicit recovery. No removed Load controls are part of the procedure.
- Submit once while holding the reply. Assert immediate draft clearing/user bubble, one accepted turn, Send→Stop, partial assistant text before completion and no automatic duplicate submission. Scroll away; completion must not force the reader to the bottom. Test Stop success/failure separately. Interrupt the stream; reconcile through Reload without replay, preserving newer draft text.
- Refresh/restart COM to prove gateway history persistence under the same fixed ID. Change selected project and unrelated gateway recency without changing chat identity. Verify tools remain hidden, hostile content is safe, copy/focus/keyboard work, the drawer exposes navigation and the pinned composer remains reachable without page overflow.
- Negative/boundary cases: missing key/offline gateway, malformed/oversized data, deleted canonical session, long prose, stale history and interrupted reads. No credentials/transcripts in telemetry or browser storage.
- Cleanup: stop owned fixtures/browser, delete only test-owned sessions and retain redacted screenshots/network/geometry/keyboard evidence outside the distribution. Written procedures and unexecuted variants remain NOT RUN.

Synthetic automated coverage is linked from the SPEC, including TC-037/038 for new/existing chat. Live model and authenticated public-Hub acceptance remain separate. Rollback does not delete Hermes sessions or change telemetry policy.
