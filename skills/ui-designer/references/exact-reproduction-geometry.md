# Exact-Reproduction Geometry and Chart QA

Use this reference when reproducing an existing mobile UI from Figma/screenshots and visual fidelity depends on measured geometry rather than approximate styling.

## 1. Build a per-screen geometry ledger

For each canonical frame, record the reference viewport and absolute bounds for:

- status/app bar or tabs
- selector/toolbars
- section titles
- cards and internal fixed-size assets
- chart group and plot bounds
- fixed bottom navigation and floating controls

Do not assume all selected frames share one generation of app chrome. Figma files often contain adjacent screens from different component revisions. If selected evidence genuinely differs, scope shell geometry by stable screen/state ID instead of forcing one global CSS rule.

## 2. Encode visible and accessible geometry separately

Preserve exact visible dimensions while meeting accessibility requirements with transparent hit areas, positioned wrappers, or pseudo-elements. A 36px visible segmented control can still expose 44px button bounds without enlarging its rendered background **when adjacent hit regions have enough independent space**.

For repeated rows or tightly packed controls, target size alone is not sufficient:

- verify every target is contained by its own logical row/cell;
- verify consecutive targets do not overlap;
- exercise boundary taps/clicks, not only center taps;
- if the source pitch is smaller than the required independent target size, document a small visual variance instead of creating ambiguous invisible overlap.

A `getBoundingClientRect().height >= 44` assertion can still hide a serious mis-tap defect when 44px buttons are shifted into 40px rows.

## 3. Treat charts as coordinate systems

- Match the Figma chart-group `viewBox`, plot bounds, grid extents, threshold positions, bucket centers, point radii, strokes, and line width.
- Represent time buckets explicitly. Every record in one bucket must share the exact bucket `x`; value changes affect only `y`. Never add horizontal jitter unless the design explicitly shows it.
- Put the Average point on the same bucket center as its records. If the source provides an explicit Average series, model it independently instead of recomputing it from illustrative scatter dots.
- Keep SVG overflow visible when tick labels intentionally extend outside the SVG element; otherwise leading digits can be clipped even when DOM bounds appear correct.
- Verify rendered SVG dimensions at the smallest, canonical, and largest widths. A responsive `height: auto` SVG can grow taller than its fixed-height chart container and overlap the next section even though the canonical viewport is exact.
- When width should stretch but vertical geometry must remain canonical, set an explicit rendered height and make the `preserveAspectRatio` decision explicit; then assert both inter-section separation and horizontal plot scaling.
- Verify all supported range cardinalities, not only the first range.

## 4. Use vertical TDD slices

For each geometry defect:

1. Add a focused assertion and watch it fail.
2. Make the minimum renderer/CSS change.
3. Re-run the focused assertion.
4. Run the full responsive and accessibility suite.

Useful tests include exact canonical bounding boxes at the reference viewport, record/average x-coordinate equality, canonical point radii/strokes, chart `viewBox`, plot/threshold coordinates, computed SVG overflow, adjacent-target containment/non-overlap, and child-bottom versus next-section-top separation at the maximum supported width.

Canonical-width tests and a screenshot matrix are complementary gates: the first proves exact source geometry, while the second catches responsive growth and interaction defects that exist only away from the source viewport.

## 5. Inspect pixels, not just screenshot existence

Generate a matrix covering every material state and supported width, then create a contact sheet or overlay against the canonical exports. Inspect it for:

- spacing drift
- clipped tick labels or legends
- chart marks hidden by fixed navigation
- inconsistent screen-specific chrome
- populated/empty parity
- responsive overflow and bottom clearance

A capture command succeeding is evidence generation, not visual approval. Give a fresh reviewer both the rendered state matrix/comparisons and the relevant text diff. Binary screenshots should stay out of the text-review payload; review them as images instead.

Any functional or layout change made after approval invalidates the affected approval. Regenerate screenshots, rerun focused and full checks, and request a focused re-review of the corrected areas before commit or deployment.

## 6. Keep evidence durable and reviewable

Store polished canonical/current comparisons and the geometry ledger in the feature design folder and link them from `DESIGN_REVIEW.md`. Keep raw captures, Playwright traces, and exploratory montages in profile-local scratch space unless deliberately selected as durable review evidence.
