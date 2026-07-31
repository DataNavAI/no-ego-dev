# Responsive rerender and blocker-only UI gate

Use for an exact-commit UI gate that requires responsive clipping checks, focus preservation across rerenders, evidence reconciliation, and a severity-filtered verdict.

## Candidate binding

1. Confirm `HEAD` equals the requested full SHA and record `git status --porcelain=v2` before testing.
2. Run checks against that immutable tree without editing it.
3. Reconfirm the SHA, clean status, and `git diff --check` before returning the verdict.

## Element-bounds clipping probe

Do not use `document.scrollWidth > innerWidth` as the sole responsive-fit test. It can miss clipping masked by `overflow-x:hidden`, and it can falsely flag intentional horizontal scrollers.

At every required width:

1. Load each required route and wait for its real rendered root.
2. Walk visible elements and inspect `getBoundingClientRect()`.
3. Flag an in-flow element when `rect.left < -tolerance` or `rect.right > innerWidth + tolerance`.
4. Exclude hidden/zero-size nodes and out-of-flow overlays (`position: fixed` or `absolute`) from the in-flow result.
5. Treat descendants of a deliberate `overflow-x:auto|scroll` container as intentional overflow, but still require the scroller container itself to remain inside the viewport.
6. Report the exact route, width, selector/identity, and left/right bounds for every offender.
7. For a named regression such as DS-00, print its viewport, body bounds, route-root bounds, and offender list separately at every requested width.

A full-page screenshot may be taller than the viewport; do not label its pixel dimensions as a viewport capture unless they match. Reconcile screenshot dimensions, labels, JSON counters, and executable results.

## Focus after follow/unfollow rerenders

The requirement is focus continuity across DOM replacement, not merely that the mouse action works.

For each required viewport:

1. Locate the follow control by stable entity identity, not DOM position.
2. Focus that control.
3. Activate the state change through the reliable browser interaction path.
4. Re-query the replacement control after rerender; never retain the detached element handle.
5. Assert `document.activeElement === replacement`, the entity identity is unchanged, and the new label/`aria-pressed` state is correct.
6. Repeat for the inverse unfollow rerender.

Synthetic CDP key events can fail to invoke a control's browser default action when the target is not truly foregrounded. Do not interpret that harness artifact as a product failure. If keyboard activation itself is in scope, use a browser automation keyboard API or otherwise prove a trusted native activation path. If only post-rerender focus is in scope, focus the control, activate it through a reliable click path, then assert focus on the replacement.

## Recheck all outcomes

For every decision surface or route, execute one route-specific behavioral assertion rather than accepting a copied aggregate counter. Include state transitions for interactive routes (tabs, navigation, lesson progression, follow movement, challenge completion/share control, filtering, dialog recovery, and stable review anchors as applicable).

Re-run:

- authoritative route and migration checks;
- source/content workflow checks, including current online checks when required;
- accessibility scanning on every required route;
- tracked-tree secret scanning with obvious lexical false positives removed;
- evidence-to-runtime consistency checks.

Classify discrepancies by actual impact. A minor ARIA-role violation or mislabeled screenshot dimension is an evidence/accessibility finding but does not become High merely because a committed summary claimed zero violations.

## Blocker-only output contract

When the user requests an exact machine-consumable verdict:

- Return exactly `APPROVED` when there are no Blocking/High findings.
- Otherwise return `CHANGES_REQUESTED` followed only by reproducible Blocking/High findings.
- Do not include lower-severity findings, execution notes, praise, or a summary in that final response.
- Complete all investigation before emitting the token; an exact-output contract is not permission to skip verification.
