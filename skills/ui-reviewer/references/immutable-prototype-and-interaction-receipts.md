# Immutable prototype and interaction receipts

## Local prototype fallback

1. Record shared checkout HEAD/status without changing it.
2. Export the exact candidate with `git archive` to a uniquely owned temporary directory.
3. Hash served HTML/CSS/JS and byte-compare each response with `git show <candidate>:<path>` or the exported manifest.
4. Start a temporary server on an unused reviewer-owned port and a disposable Chromium/CDP profile.
5. Capture viewport, browser/channel, route, DOM/geometry, transitions, screenshots, console/page errors, and candidate/archive digest.
6. Stop Chromium and server, remove only reviewer-owned temporary files, and reconfirm shared HEAD/status and process/port cleanup.

An occupied port, mutable shared checkout, or byte mismatch invalidates runtime evidence.

## Multi-state copy + visual gate

Inventory every declared state ID against clean screenshot, annotation, runtime DOM, source/runtime copy, actions, disabled/ARIA state, and transitions. For async settings, preserve last-confirmed truth during pending work, disable duplicate input, announce progress, keep consent withdrawal available, and reject stale revision completions. Compute contrast and geometry from actual styles and rectangles.

## Carousel receipt

At every supported viewport record scroller and first/second card rectangles, initial `scrollLeft`, count, shortcut count, and visible-next intersection width. Exercise shortcut selection, scroll settlement, counter/selected/card alignment, keyboard forward, reverse/reset, accessible external link, and console status. Use scroller-relative offsets or rectangles rather than raw page-relative `offsetLeft`.

## Later-round reconciliation

Verify canonical pre-review bytes/digest, every linked context packet/report digest, ordered candidate/base identities, stable dispositions, and remediation paths equal to actual parent-to-candidate scope. Materialize the named exact commit; do not silently use current HEAD.

## Parent-transplant negative control

Run the candidate regression assertion on the candidate and require PASS. Archive the parent, transplant only that regression test, and require its specific assertion to fail for the old behavior. An import, dependency, timeout, or harness failure is inconclusive. Remove the archive and reconfirm no shared mutation.
