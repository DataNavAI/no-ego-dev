# Chat verification record

Date: 2026-10-22, America/Los_Angeles. Candidate: uncommitted working tree; default host gateway live chat verified, no release claimed.

This document records implementation-stage observations. Exact final code-candidate verification for merging is recorded separately in `.github/manual-test-result.json` and its retained QA/review evidence; earlier limited source reviews below are not merge approval. Later regression coverage includes TC-010 controller recovery and the stable-ID/history-head and private-YAML corrections.

Expanded browser acceptance also exposed a pre-existing shared-shell defect: a detail success captured the controller state before awaiting its response and could restore an older project/section. TC-006 now executes the shipped client with out-of-order successes and section navigation; the handler awaits data before reading the current state. This is part of the selected-project isolation gate, not a claim that all earlier screenshots approved the final candidate.

## Verified

- Synthetic HTTP integration: session listing, creation, chronological history request, send response, server-only bearer header, exact Origin/JSON enforcement, invalid input and byte bounds, unavailable configuration, sanitized upstream errors, rejected redirects, malformed JSON and 4 MiB response limit. Executable evidence: SPEC TC-007.
- History logic: 99 older pages with a 200-row cap and chronological/distinct rows; newer paging across a partial oldest page returns exactly the expected 200 distinct entries.
- Actual headless Google Chrome against production NED COM and a synthetic loopback gateway: 1280×800 desktop; 390×844 and 320×844 mobile. Three-pane desktop, mobile default Chat, Project navigation reachable, no horizontal overflow or browser exceptions. Screenshots inspected at desktop and 390px.
- Browser fixture advertised 10,000 chronological messages; seven actual older-page fetches stayed <=200 DOM message articles. Existing first-row position remained within 2 CSS pixels after every prepend. Latest restored the 50-row recent page.
- Deferred send: controls disabled while pending; scrolling to older content during the reply retained first article and exact scrollTop after completion, showed new-reply status and paused stale pagination. Latest reconciled history.
- Successful gateway turn followed by failed history read: draft remained intact; Send stayed disabled until Reload succeeded. No automatic mutation replay.
- Repository lint and full Node/spec suite passed during implementation. Python: 208 passed, nine existing skips. Focused changed-scope checks rerun after corrections. Manual cases in the spec runner remain separately reported NOT RUN.
- Default-profile discovery (TC-009): real synthetic HTTP transport with no NED overrides; private profile dotenv/config settings, YAML precedence, selected-home isolation, credential rotation, endpoint override isolation, malformed/symlink/oversized settings rejection. No profile values injected into process.env.
- Live default host gateway: control socket confirmed the existing default service was running and idle (`active_agents:0`); its HTTP API was initially disabled. Enabled loopback-only API in its existing private `.env`, generated a local random key without exposing it, and restarted using `hermes gateway restart`. Authenticated `/v1/capabilities` returned 200 and session_chat/session_resources true.
- Live Chrome through production NED COM with no gateway options or NED-specific environment overrides: New chat, send a minimal tool-free test prompt, receive the expected “NED COM connection verified” reply, reload browser, reselect session and observe persisted history. At 390px mobile, Chat remained the default visible view. Test-owned session deleted directly through Hermes with HTTP 200; NED COM and browser closed. No existing conversations were modified.
- After default-profile integration: repository `npm run lint` and `npm run test:all` passed, including TC-009 and Python 208 passed / nine existing skips. Additional private-file permission rejection passed in the focused TC-009 rerun. Default gateway readback: running, zero active agents, Discord/Telegram/API server connected.

## Limits / outstanding acceptance

Default host API at `127.0.0.1:8642` now passes live send/persistence verification. Other installations require an already configured local Hermes API as described in [CHAT.md](CHAT.md#connection--operations); NED COM itself does not create keys or restart gateway services. Execution permissions and tool-running approval behavior were not exercised by the deliberately tool-free live prompt.

TC-008 is partially verified, not a complete manual pass: full keyboard/screen-reader, physical mobile keyboard, 200% text/reduced-motion, session-list pagination with 55 records, externally deleted session recovery and all outage/interruption variants remain outstanding. This historical run used completed synchronous turns, not token streaming or gateway run cancellation. The 2026-10-26 public-tunnel remediation changes browser transport to short acceptance/status requests (FR-018/019); its independent acceptance evidence is separate from this historical run.

Independent reviewer inspected supplied controller/server semantics and corrections, finding no remaining material issue in that scope. Reviewer tools could not access files; full-source independent review and dedicated visual/copy acceptance remain outstanding. No merge or deployment approval implied.

Transient test script and screenshots were stored outside the distribution in `/tmp/ned-chat-browser.mjs`, `/tmp/ned-chat-desktop.png`, `/tmp/ned-chat-mobile-390.png`, `/tmp/ned-chat-mobile-320.png`. They contain only synthetic content and are not required runtime assets. This report records observations rather than committing logs, sessions or credentials.
