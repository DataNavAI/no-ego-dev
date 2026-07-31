# Implemented UI: Responsive and Accessibility Probes

Use these checks when reviewing activation/card UIs from a runnable implementation.

## Responsive evidence

- Capture the required desktop and mobile viewports; do not infer mobile quality from CSS alone.
- For responsive browser checks, verify geometry as well as screenshots:
  - `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
  - inspect elements whose `getBoundingClientRect().right` exceeds the viewport or whose `left` is negative.
- Emulate the exact viewport through device-metrics/CDP when headless browsers impose a minimum layout width. A screenshot cropped to 390px from a 500px layout is not valid 390px evidence.
- Repeat at the product's large-text setting. Check header wrapping, sticky-header height, CTA wrapping, card density, and navigation crowding—not only horizontal overflow.
- Distinguish three separate claims: narrow-width reflow, genuine browser zoom/dynamic text, and CSS visual scaling. A doubled-width capture with `body { zoom: 2 }` can reveal overlap but does **not** prove browser 200% zoom because breakpoints may still evaluate at the wider CSS viewport. Record the mechanism used and withhold the real-zoom verdict if it cannot be established.
- When responsive CSS should hide or compact a nested label, inspect `getComputedStyle()` for that exact node. A generic class selector can lose to a component descendant selector (for example, `.label` loses to `.control span`); use sufficient specificity and then verify the target's rectangle remains within the viewport.
- Treat temporary screenshots as evidence artifacts; avoid writing generated review files into the project when the user requested a read-only review.

## Acceptance-criterion geometry and earned-result probes

When approval depends on several items appearing together in one exact viewport, do not rely on a screenshot alone:

1. Set the requested CSS viewport with device-metrics emulation and record `innerWidth`, `innerHeight`, and document `scrollWidth`.
2. Query each required element by a stable selector and record its `getBoundingClientRect()`.
3. Count an item as jointly visible only when its full rectangle is inside the viewport; include fixed navigation or safe-area obstruction in the check.
4. Pair the geometry receipt with a screenshot from the same page generation. Report the exact visible labels/text so the receipt proves the semantic criterion, not merely five unnamed boxes.

For quizzes, assessments, configurators, or any UI claiming an earned result, never approve from a polished result screenshot or a hard-coded score alone. Exercise the entire stateful path:

1. Inventory the declared step count and capture each step label/prompt.
2. Submit a controlled answer sequence containing both correct and incorrect answers.
3. Advance through every step using the real controls.
4. Verify the final score, rank/message, visual token, and accessible label all match the controlled sequence.
5. Prefer a mixed-score run (for example, one deliberate miss) because it disproves a preset perfect result more strongly than a 5/5 happy path.
6. Treat source inspection as corroboration for score mutation and reset behavior, not as a substitute for the end-to-end interaction.

## SPA focus management

Visual focus styles alone are insufficient. For client-rendered detail navigation:

1. Open a card using keyboard activation.
2. Confirm focus moves to a meaningful destination such as the detail heading or back control.
3. Confirm the view change is announced through semantic structure or an appropriate live announcement.
4. Close the detail and confirm focus returns to the originating card/link.
5. Trigger an unrelated parent rerender while detail is open (for example, open a feedback modal or update local state) and confirm focus is not stolen back to the detail heading.
6. Confirm every transition updates both visual active state and `aria-current`; test contextual CTA transitions as well as direct nav clicks, because helper functions may clear nav state when no nav element is passed.
7. Count visible `h1` elements after each transition. A persistent home hero outside swapped route panels can create two visible `h1`s on detail, lesson, or result views even when the initial home screen is valid.
8. For follow/save/move/remove actions that replace a list or section with `innerHTML`/rerendered markup, focus the activating control before triggering the action and inspect `document.activeElement` afterward. A live-region toast does not compensate for focus falling to `BODY`; restore focus to the moved item’s corresponding control or an appropriate section heading so keyboard users do not restart traversal.

Implementation pitfall: avoid an inline callback ref such as `ref={(node) => node?.focus()}` for route-entry focus. Its identity changes on parent rerenders, so React may detach/reattach it and repeatedly steal focus. Prefer a stable `useRef` plus a `useEffect` keyed only to the route/story identity, then test both entry focus and unrelated rerenders.

Flag missing open/close focus restoration—or repeated focus theft after entry—as an accessibility finding even when pointer interaction works.

## Disposable local-browser corroboration

When a frozen local UI is reachable but the primary browser tool cannot navigate the loopback URL, corroborate with a system Chromium-family browser without weakening the immutable boundary:

1. Hash the served entry HTML and critical runtime assets, then compare them byte-for-byte with the frozen candidate before treating the live page as candidate-bound.
2. Put any temporary browser package/tool installation outside both the repository and candidate. Prefer a browser-core package plus an explicit system-browser executable so the review does not download or mutate a browser inside the project.
3. Emit probe results to stdout or OS temporary storage only. Cover exact viewport geometry, non-rail out-of-bounds descendants, enabled target sizes, heading count, console errors, and representative transition focus—not just screenshots.
4. Treat the harness as disposable review tooling. Before finalizing, create an OS-safe focused verifier with the platform temp API and a `hermes-verify-` filename prefix, run syntax plus one representative behavior assertion against the live candidate, remove the verifier and scratch tool directory, and report this honestly as **ad-hoc verification**, not canonical suite green.
5. Re-verify the candidate manifest after cleanup. A temporary harness appearing in changed-path tracking is verification debt until it is removed; do not leave scratch scripts merely because they live outside the project checkout.

Capture the portable fallback pattern, not a permanent claim that a browser tool or localhost access is unavailable; tool routing and environment state can change.

## Cross-platform evidence boundaries

- Passing typecheck/export proves buildability, not native visual quality.
- If an APK/device/emulator was not visually exercised, clearly label Android/iOS findings as code-level and require real-device QA before release approval.
- Separate direction fidelity from implementation health: an implementation can match the selected card concept while still needing iteration for focus behavior, dynamic type, sticky headers, or navigation crowding.
