# Chat video evaluation

Use TC-044 for browser functionality and TC-045 for video polish. A release exceeds 90% only if each required layout exceeds 90% on both measures, every scored row has usable evidence, and no critical interaction fails. Keep desktop and mobile results separate. The same 12 binary browser checks still run under TC-044.

## Procedure

1. Record desktop and phone separately using the same synthetic picnic conversation. Keep the full chat and composer visible through an empty state, first send, waiting and streaming, a long checklist, scroll up and return, a multiline table request, and a follow-up through completion. Include desktop resize or mobile draft focus and constrained viewport. Record any reachability, interruption, provider, capture, and emulation limits. Keep footage private.
2. Compare like states from a Muse walkthrough. Select clips by event, since real and fixture-backed waiting times differ. Use the desktop reference for shared visual hierarchy on mobile and mark phone-specific Muse comparisons unobserved. Capture adjacent frames whenever reporting movement or whether content remains visible. A draft, reply, or transition outside the frame cannot earn credit.
3. Score each row independently on the recorded NED run. A **2** meets every criterion, a **1** means there is visible partial success with a specific defect, and a **0** means the interaction or visual outcome fails. **Unobserved** earns no credit and makes the evaluation incomplete. Multiply each weight by the rating divided by two. Do not average devices or normalize away missing evidence. Attach two offsets and a concrete retest condition to each scored finding when a comparable reference is available.
4. Treat an unreachable composer or recovery, lost draft, hidden final reply without a discoverable return-to-latest path, unreadable required content, or inaccessible critical action as a fail regardless of the numeric total. Capture an actual return with the final reply visible. A send count alone cannot establish that the reply is visible.

| Dimension | Weight | Full-credit observation |
| --- | ---: | --- |
| Color and role clarity | 15 | User and assistant are distinguishable without relying on color alone. Chat canvas, live actions, and focus form a coherent palette. Rendered text meets 4.5:1 for normal text and required controls have 3:1 contrast against adjacent colors. |
| Conversation hierarchy | 10 | A viewer can identify the active speaker, current exchange, and reading origin at a glance. Pane chrome and repeated labels do not dominate the message. Short replies stay grouped with their content, with comfortable long-reply width. |
| Secondary-action restraint | 15 | Multiple messages do not leave a series of visually competing controls. Copy and context actions remain predictably available on keyboard focus and touch. Focus indicators appear for deliberate keyboard navigation and clear when focus moves. |
| Composer stability | 15 | The text baseline and actionable row stay anchored from empty through draft, send, working and settled. Multiline grows upward, and all controls remain reachable under the narrow and short viewport. Compare stable-state rectangles. A shift greater than 4 CSS px in a one-line lifecycle is a deduction. |
| Agent feedback | 15 | Acceptance, working, partial reply, Stop and terminal state are distinguishable at a glance. Feedback stays near the active turn with intelligible text and does not interrupt composing or leave stale state. Record a reload during generation and verify that the active cue or partial reply returns and the original turn concludes once. |
| Transcript continuity | 20 | The viewer can read earlier content without being dragged away during an update. Returning to latest is clear. After resize or a follow-up, finish with its reply visible or show and use the return control. |
| Structured content | 10 | Tables, headings and lists read as part of the reply. Rules and padding aid scanning without a heavy grid, and wide content scrolls locally without clipping controls. |

## Recorded baseline findings

Reference: authorized Muse desktop side chat, four complete turns, assembled from two segments (69 seconds). NED: merged chat-first polish build `983c3b0`, desktop Chromium and iPhone 13 WebKit emulation, synthetic replies in four turns. Times below are approximate playback offsets in seconds. Recordings remain outside the repository.

| State | NED | Muse desktop | What looked less polished and how to retest |
| --- | --- | --- | --- |
| First reply | Desktop 0:02–0:03, mobile 0:02 | 0:16–0:18 | NED's light gray user bubble and bare assistant reply blend into the canvas. A strong ring after submission competes with the reply. Retest both speaker surfaces and control emphasis, with visible focus when navigating by keyboard. |
| Waiting and streaming | Desktop 0:01–0:02, mobile 0:01 and 0:06–0:07 | 0:08–0:11 and 0:24–0:32 | NED puts status above the composer, away from its partial reply, and the status line appears and clears. The desktop composer outline stayed at y820–887 from 0:01.00 through 0:02.60, so those frames do not establish a row shift. Muse shows a cue next to the active exchange and more detail in its activity panel. Measure one-line lifecycle movement separately from wrapping and resize. |
| Checklist and scroll | Desktop 0:03–0:06, mobile 0:04–0:06 | 0:35–0:50 | NED's copy buttons stay visible and the assistant copy control sits at the far edge of the pane. Muse draws attention to the content. Verify all copy controls are reachable by touch/keyboard while reading focus stays on the message. |
| Table reply | Desktop 0:07–0:08, mobile 0:08–0:09 | 0:57–0:59 | NED shows a box around each cell and visually separates the copy glyph from the table. Muse uses horizontal dividers within the reply bubble. Check row scanning and local overflow for both a small and a wide table. |
| Final follow-up | Desktop 0:09–0:10.5, mobile 0:09–0:11 | 1:04–1:09 | Desktop resize leaves the table near the bottom of the recording and the final reply outside the visible region. A Jump to latest control appears but the walkthrough does not use it. Mobile shows the final reply. Retest with the full recovery action and reply in frame. |

### Baseline disposition

| Dimension | Desktop | Mobile |
| --- | --- | --- |
| Color and role clarity | Partial. Gray role surfaces have weak separation. | Partial. Role labels work, while the surfaces remain close to the canvas. |
| Conversation hierarchy | Partial. Bare replies and distant copy affordances weaken grouping. | Partial. Labels establish roles, and repeated labels and icons crowd the narrower transcript. |
| Secondary-action restraint | Partial. Most copy controls are visible at rest. | Partial. Copy controls remain visible at rest. Activation and deliberate keyboard focus require separate evidence. |
| Composer stability | Partial evidence. The desktop first-turn row is steady; short-height multiline reach is unobserved in this clip. | Partial evidence. Line wrapping and one-line lifecycle movement are not isolated. |
| Agent feedback | Partial. Status and prose are visible in separate areas. | Partial. Status and prose are visible, but Stop activation is unobserved. |
| Transcript continuity | Incomplete. The return control is visible, and the clip ends before recovery. | Partial. The final reply is visible; hold-position during active updates is unobserved. |
| Structured content | Partial. The small table is readable, but grid lines are prominent and wide-table scrolling is unobserved. | Partial. The grid remains dense and a wide table was not exercised. |

The earlier 100% result applies to the functional browser checklist. The recorded baseline does not establish a visual pass under this rubric. It also contains no Muse mobile reference, so only shared visual treatments can be compared across devices.

The palette acceptance recordings show the full fourth reply and composer at about 0:10 on desktop and 0:11 in iPhone emulation. On desktop, the recording uses Jump to latest after resizing. Keep continuity during a live update, wide-table scrolling, and intentional touch and keyboard interactions as separate evidence requirements. The palette acceptance does not establish a complete weighted score.
