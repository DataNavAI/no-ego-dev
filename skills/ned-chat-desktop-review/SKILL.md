---
name: ned-chat-desktop-review
description: Review the NED Communicator chat on desktop using browser device emulation, a recorded conversation and timestamped comparison with Meta Muse.
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
2. “Turn that into a detailed checklist with headings and bullets.”
3. “Add a small Markdown table showing who brings what. Use fictional names.”
4. “Summarize it in one sentence.”

While a long reply is visible, scroll back to an earlier turn and return to the latest one. Enter a multiline draft and check composer behavior. Exercise additional chat actions only when needed to confirm a UI defect, keeping the same send ceiling.

Check keyboard focus, Enter/Shift+Enter behavior, sidebar or pane collision, comfortable message width, and composer access after resizing.

## Review the footage and compare

Replay the recording. If video playback is unavailable to you, extract and inspect frames with a local video tool at key transitions and around suspected problems. Log the recording offsets for compose, send, waiting, completion and scroll or layout changes. Inspect adjacent frames before describing motion, flicker or layout shifts. Supplement with viewport measurements when available.

Use a separately recorded authorized session at [Meta Muse](https://muse.ai/) with a similar device and journey, or inspect the [official Muse walkthrough](https://www.youtube.com/watch?v=wHn0hTjvFoo&t=9s), starting at the chat chapter at 0:09. If that player is unavailable, Meta’s [launch video](https://about.fb.com/wp-content/uploads/2026/09/Introducing-Muse_Sizzle-Video.mp4#t=16) shows an edited close-up of the filled composer around 0:16. Use it only for the visible composer affordances. Judge only visible, comparable states. Cite source URL or private recording, platform when identifiable, and exact video offsets. Edited footage can support comparisons of visible hierarchy, composer placement and feedback patterns. Reserve timing, touch and keyboard comparisons for matched footage showing those interactions. Record any unmatched dimension and continue the NED review if Muse footage is unavailable.

## Deliver the review

Provide the NED video path, build or URL without sensitive parameters, browser and actual viewport, sent and completed counts, and outcome (complete, partial or blocked). Use complete when the planned NED journey has playable footage and you inspected comparable Muse footage. Use partial when you have usable NED evidence with capture, journey or comparison gaps. Use blocked when you could not exercise a usable NED journey. State which login, response, viewport and keyboard states were exercised. Give a concise assessment of readability, visual consistency, interaction feedback, composer access and layout stability. Order findings by impact on sending or reading chat. For each finding include the NED timestamp, reproduction steps, expected and observed behavior, user impact, a proposed improvement and an observable retest criterion. Add Muse timestamps where footage supports a comparison. Mark unsupported comparisons and uncertain findings explicitly. Keep artifacts private and remove temporary authentication state.
