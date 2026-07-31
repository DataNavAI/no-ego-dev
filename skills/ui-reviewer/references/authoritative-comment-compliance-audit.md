# Authoritative Comment Compliance Audit

Use when reviewing a frozen UI candidate against a finite set of authoritative review comments and the requester wants only blocking/high findings.

## Receipt method

1. Freeze scope to the named worktree/commit and inspect only that generation. Do not modify candidate files.
   - Record `HEAD` and status before and after runtime probes. If the shared checkout changes during review, discard mixed-generation runtime conclusions. Source-only blockers may still be reported when independently reproducible from the named commit’s Git blobs; otherwise rerun pixels/runtime from an isolated exact-commit snapshot before verdict.
   - Before using a local server, choose a reviewer-owned unused port and hash the served HTML, CSS, and JavaScript against the named commit blobs. An already-occupied default port can silently serve a different checkout; discard every runtime observation from a hash-mismatched generation and rerun from an isolated exact-commit snapshot.
2. Convert each authoritative comment into one binary acceptance statement before inspecting implementation. For a narrowly scoped regression PR, derive these statements from the authoritative issue acceptance criteria and explicitly include every preserved breakpoint/state—not only the changed viewport.
3. For each statement, collect all three evidence classes when applicable:
   - **Code receipt:** exact file/line implementing the change.
   - **Pixel receipt:** supplied screenshot(s) at the required mobile/desktop viewports. Verify each file’s actual pixel dimensions before treating its filename or report label as viewport evidence.
   - **Runtime receipt:** exercise the actual route and interaction; do not infer behavior from screenshots or self-authored evidence JSON.
   - **Artifact-binding receipt:** when testing an existing generated bundle to avoid rebuilding an immutable candidate, require the served HTML/assets to match that bundle and bind the relevant generated CSS/JS back to the exact reviewed source blob. Direct byte parity is sufficient when the build intentionally copies the source unchanged; otherwise use the project’s manifest/revision contract. Do not claim exact-head runtime evidence from an unbound `dist` directory.
4. Verify cross-route state continuity for context-sensitive CTAs. Example: discovery selection → selected profile → selected-artist lesson → next → previous. A correct label is insufficient if the destination silently resets context.
5. Compare stable semantic review IDs against the parent candidate. Check both literal IDs and dynamically generated ID families; ensure rendered IDs are unique per route.
   - Treat a review target’s identity as the tuple **(stored route, semantic component ID, required UI state/context)**, not the ID string alone. Reusing the same literal ID after moving it to another route or a later carousel/lesson state can orphan existing comments.
   - Inspect the review-host/router adapter independently from the product router. Every newly added reviewable route must be accepted by its route allowlist and must round-trip through `getRoute`/parse/navigate without falling back to a default route.
   - For moved targets, require an explicit route/component/state migration or a compatibility target at the old route. Reproduce an existing parent comment’s **Show** journey from its stored route and ID; proving that the ID exists somewhere else is insufficient.
   - For stateful targets, verify navigation restores the exact artist/item/step needed to render the component before lookup and focus. A route-only redirect that lands on the first item does not preserve stable review identity.
6. Probe every required route at every required viewport for:
   - exactly one visible primary heading;
   - document-level horizontal overflow **and visible descendants whose bounding boxes escape the viewport**; `overflow-x: hidden` can force `scrollWidth === clientWidth` while silently clipping headings, tabs, cards, or labels;
   - broken required images;
   - duplicate stable review IDs;
   - primary-control reachability around fixed/sticky navigation.
7. Treat candidate-authored verification JSON as an index/claim, not independent proof. Re-run focused probes yourself.
8. Reconcile pixels, code, and runtime. If they disagree, the runtime/frozen-generation evidence controls and the verdict is withheld or changes are requested.

## Severity/output discipline

- Report only blocker/high findings when requested. Do not turn optional polish into a failing verdict.
- Use the requester’s verdict vocabulary exactly. If none is supplied, use `APPROVED` or `CHANGES_REQUESTED`.
- If approved, return the positive verdict plus compact acceptance receipts; do not invent findings to make the review look substantive.
- If changes are required, return the negative verdict; each finding must include severity, user impact, and exact file/line fix guidance.
- Mention that no files were modified when the review was read-only.

## Useful independent probes

When a runnable UI has no project test harness, use any available browser automation path to inspect DOM geometry and exercise interactions. A minimal probe should record viewport, route, heading count, scroll width versus client width, broken image count, and duplicate review IDs. For fixed navigation overlap, measure the live rect at the initial position and after scrolling to the document bottom; distinguish temporary viewport overlap from content that can never be reached.