---
name: ned-chat-desktop-review
description: Review the NED Communicator chat on desktop using browser device emulation, a recorded conversation and timestamped comparison with Meta Muse. Verify live reply following.
---

# NED chat review on desktop

## Set up the session

Use the requested authorized NED Communicator URL or the running authorized local test instance. Identify the build when available. Start a fresh conversation with a test account or test session. Confirm you can open chat before recording (look for the NED Chat pane and its message composer); use approved private sign-in and keep credential entry, session exports and unrelated history out of the footage. If no authorized session or recorder is available, report the affected coverage.

Use a Chromium context with viewport and screen both set to 1440 × 900 CSS px, device scale factor 1, mouse and desktop keyboard. While recording, open a chat-adjacent pane if available and narrow the same page to 1024 × 768. Log the resize offset and restore the primary viewport.

## Record the chat

Use a video-capable browser tool or Playwright with a recording context. For Playwright on the NED checkout, install the browser from the checkout's existing dependency using `npx playwright install chromium` if absent. Use a persistent automation process so browser context and page remain open across actions. Create the context with your device options and `recordVideo: { dir: privateRunDirectory, size: { width: 1440, height: 900 } }` before opening the chat page. Keep a unique private output directory outside the repo. Close the context in cleanup, including on timeout, to flush the video. Get the chat page recording from `page.video()` and verify actual playback. When credentials would be visible in the recording, establish approved authentication separately and reuse it in memory where supported.

Record from the empty chat through composing, first send, any visible waiting or streaming phase, response completion, follow-up, and scrolling. Use the actual UI and wait for each response to finish or clearly fail before sending the next. Count each submitted message, including retries and accidental duplicates. Stop after the necessary checks, at the tenth send, or when the journey is blocked. Preserve playable partial evidence. Use a bounded wait per response and record the observed timeout and visible state.

Use fictional prompts that require no tools or external actions:

1. “Suggest three items for a small picnic.”
2. “Turn that into a checklist with three headings and 18 short bullets. Use only this chat.”
3. Enter these as two lines of the same draft: “Add a small Markdown table showing who brings what.” and “Use fictional names.”
4. “Summarize it in one sentence.”

During a long streamed reply, capture two live updates at latest and confirm the tail stays visible. Before completion, scroll up and capture another update without movement of the earlier text. Use Jump to latest while generation is active, then capture another visible increment and the final reply. If the reply finishes too soon, use a controlled streaming fixture or mark the missing phase unobserved. Enter a multiline draft and check composer behavior. Exercise additional chat actions only when needed to confirm a UI defect, keeping the same send ceiling.

Check keyboard focus, Enter/Shift+Enter behavior, sidebar or pane collision, comfortable message width, and composer access after resizing.

## Review the footage and compare

Replay the recording. If video playback is unavailable to you, extract and inspect frames with a local video tool at key transitions and around suspected problems. Log the recording offsets for compose, send, waiting, completion and scroll or layout changes. Inspect adjacent frames before describing motion, flicker or layout shifts. Supplement with viewport measurements when available.

Prefer an unedited or clearly segmented capture of the matching four-turn chat. Use a separately recorded authorized session at [Meta Muse](https://muse.ai/) with a similar device and journey, or inspect the [official Muse walkthrough](https://www.youtube.com/watch?v=wHn0hTjvFoo&t=9s), starting at the chat chapter at 0:09. If that player is unavailable, Meta’s [launch video](https://about.fb.com/wp-content/uploads/2026/09/Introducing-Muse_Sizzle-Video.mp4#t=16) shows an edited close-up of the filled composer around 0:16. Use it only for the visible composer affordances. Judge only visible, comparable states. Cite source URL or private recording, platform when identifiable, and exact video offsets. Edited footage can support comparisons of visible hierarchy, composer placement and feedback patterns. Reserve timing, touch and keyboard comparisons for matched footage showing those interactions. Record any unmatched dimension and continue the NED review if Muse footage is unavailable.

## Score video polish

Score this layout independently. Inspect the idle and working composer, two speakers, a long checklist, scroll away and return, rich table, and the final reply. Inspect adjacent frames for motion and note the actual offsets. Compare matching states rather than waiting times.

| Dimension | Weight | Full credit |
| --- | ---: | --- |
| Color and role clarity | 15 | Distinguishable labels and surfaces, coherent action colors, normal text at 4.5:1 and necessary controls at 3:1. |
| Conversation hierarchy | 10 | Active speaker and exchange are clear, short replies group their controls, and pane chrome stays secondary. |
| Secondary-action restraint | 15 | Copy and tools remain keyboard/touch reachable without dominating rest states. Focus follows intent. |
| Composer stability | 15 | The one-line row shifts no more than 4 CSS px between waiting and settled. Multiline expansion keeps actions reachable. |
| Agent feedback | 15 | Accepted, working, streaming and settled states are clear with actionable Stop and no stale or conflicting signal. |
| Transcript continuity | 20 | The live tail stays visible while following, including across a layout change. Earlier text holds as the reply grows. Jump to latest resumes following before completion, and the final reply is visible. |
| Structured content | 10 | List and table hierarchy supports scanning. Wide content scrolls locally without clipping chat controls. |

Assign **2** when the full criterion is observed, **1** for partial success with a specific defect, and **0** for failure. Multiply each weight by the rating divided by two. A missing observation earns no points and makes the evaluation incomplete. Require over 90% per device, with a separate functional browser result. Unreachable critical controls, lost drafts, offscreen reply tail while following, unreadable content, or a hidden final reply without a discoverable recovery path fail the evaluation regardless of points. During capture, use any return-to-latest control and show the final reply. A desktop Muse reference can establish shared visual hierarchy on mobile; state the limits on device-specific comparisons.

## Deliver the review

Provide the NED video path, build or URL without sensitive parameters, browser and actual viewport, sent and completed counts, and outcome (complete, partial or blocked). Use complete when the planned NED journey has playable footage and you inspected comparable Muse footage. Use partial when you have usable NED evidence with capture, journey or comparison gaps. Use blocked when you could not exercise a usable NED journey. State which login, response, viewport and keyboard states were exercised. Give the seven ratings, weighted total, critical failures, and evidence coverage. Keep functional checklist results separate. Order findings by impact on sending or reading chat. For each finding include the NED timestamp, reproduction steps, expected and observed behavior, user impact, a proposed improvement and an observable retest criterion. Add Muse timestamps where footage supports a comparison. Mark unsupported comparisons and uncertain findings explicitly. Keep artifacts private and remove temporary authentication state.
