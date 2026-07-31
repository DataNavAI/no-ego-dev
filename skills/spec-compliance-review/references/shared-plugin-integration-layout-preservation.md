# Shared-plugin integration: preserve host layout while deleting bespoke UI

Use this when a product replaces a local panel/widget with a shared plugin and deletes product-local JavaScript/CSS/markup.

## Review method

1. Diff every deleted stylesheet rule and classify each declaration as:
   - **plugin-owned UI**: panel, backdrop, pin, status, filters, modal behavior;
   - **host-owned structure**: wrapper flex/grid sizing, positioning, width/height, overflow, card stretching, media placement;
   - **ambiguous**: verify through rendered geometry before accepting deletion.
2. Confirm every still-required host-owned declaration moved into the surviving product stylesheet. Do not assume a shared plugin recreates product-specific wrapper rules.
3. Trace generated wrappers around interactive descendants. Wrappers introduced to hold comment pins can also be flex/grid items; deleting their `flex-basis`, `min-width`, `height`, or child sizing silently changes the product even if pin positioning is supplied by the plugin.
4. Run a computed-geometry A/B probe at required viewports:
   - measure wrapper and interactive-child rectangles plus container `clientWidth`/`scrollWidth` at the candidate;
   - temporarily inject only the deleted host-layout declarations in the browser (never modify the immutable checkout);
   - compare widths, heights, overflow, alignment, and card stretch.
5. Treat a large geometry change in a primary journey as Important even when axe, no-overflow, and integration checks pass. Those gates do not prove preserved visual hierarchy.

## Reproducible evidence shape

Report the current file/line that omits the declarations, the rendered route and viewport, before/after computed dimensions, and the user-visible consequence. Example: a horizontal identity rail whose cards shrink from the intended fixed `8.25rem` (132px) to roughly 76px after its wrapper rule is deleted materially degrades recognition even if the rail remains scrollable.

## Additional integration checks

- Verify the external script order and the exact host globals/callback signatures.
- Preserve semantic target IDs and dynamic re-decoration calls.
- Confirm the local panel markup/assets are gone without clearing legacy storage.
- Keep migration keys in deployment-owned configuration rather than browser-overridable production markup.
- Verify host Comments navigation remains a native accessible control and that shared-plugin mutation does not erase required accessible naming.
