# Dynamic rerender media-continuity review

Use this for exact-commit reviews where a static shell is immediately replaced by an async controller, hydration step, route loader, or state-machine render.

## Core risk

A screenshot or unit assertion against the initial shell can pass while the settled product state silently drops required media, controls, provenance, or accessibility semantics. Canonical suites often miss this when they test the static renderer and the ready-state controller separately without asserting continuity across the transition.

## Review recipe

1. Freeze the exact head/base/tree and work in a disposable detached clone or worktree. If the supplied workspace is only a container of repositories or the exact commit object is absent, discover the matching remote, fetch the exact SHA into a new reviewer-owned checkout, and leave contributor checkouts untouched.
2. Read the route's complete render lifecycle:
   - initial/static shell;
   - loading state;
   - successful settled state;
   - unavailable/error state;
   - cancellation or route-close state.
3. Inventory requirements that must survive every applicable state: approved media identity, visible rights/credit access, heading/context, primary action, progress, noindex policy, focus behavior, and fallback treatment.
4. Probe the actual settled controller output, not only helper markup. For a DOM-light controller, inject a minimal root, provide a valid canonical fixture, await `open()` or hydration, then inspect the final `innerHTML` and state. Require an eligible route to retain the expected local media URL and an ineligible route to use the explicit non-likeness fallback.
5. Exercise media failure independently. Dispatch or simulate `error`/decode failure for an eligible image and require replacement with the designed fallback; a healthy URL check or zero broken images in one screenshot run does not prove the error path exists.
6. Test non-vacuity explicitly: ready-state assertions should fail if the media component is removed, and error-state assertions should fail if the fallback wiring is removed.
7. When the production build intentionally omits the canonical release and therefore only renders truthful unavailable states in a browser, do not treat unavailable-route screenshots as evidence for the ready state. Exercise the real production controller with a schema-valid canonical fixture, await its actual `open()`/settle boundary, and inspect the final markup for media URL, alt text, content controls, fallback absence, and noindex state. Keep this as a controller-bound readiness receipt rather than mislabeling it as deployed-browser evidence.
8. Reconcile media cardinality per surface before reporting omissions. A ten-asset rights cohort does not imply ten discovery cards: read the exact visual/design authority and placement inventory together, map each asset to its authorized surface, and compare the rendered surface against that map. For example, member portraits may be authorized for one home mosaic while discovery is explicitly limited to a smaller named identity set. Do not infer a blocker from global cohort size alone, but do fail when a surface omits an asset that its own authoritative contract requires.
9. Run focused tests and the canonical suite, but treat green automation as supporting evidence rather than a waiver when a direct settled-state probe reproduces an acceptance failure.
10. Revalidate live PR head/base and local clean exact-tree identity immediately before verdict, then delete the disposable reviewer checkout.

## Common review trap

Do not infer that a photo-rich initial or unavailable screen makes the successful journey photo-rich. Controllers that assign `root.innerHTML` commonly erase the shell's media as soon as valid content loads. Compare before-load and after-load DOM explicitly.

## Reporting

Report the production path and line range where the settled renderer omits continuity, include the exact probe outcome (for example `state=ready, hasImage=false`), and identify the missing regression. Keep ordinary code-quality findings separate from broader visual taste.