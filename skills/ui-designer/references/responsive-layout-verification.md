# Responsive layout and semantic-order verification

Use this when changing responsive hierarchy, columns, full-width sections, fixed/sticky controls, or visual order.

## Before editing

1. Record the current semantic HTML/JSX order and accessible landmarks/headings.
2. Name the requested desktop and mobile compositions and exact viewports.
3. Identify whether CSS placement can satisfy both without changing logical order. If not, choose the single order that preserves comprehension and task sequence across screen reader, keyboard, and mobile use.

## Implementation rules

- Keep one source for each content section. Do not duplicate content or hide an alternate accessible copy at a breakpoint.
- For a full-width section above equal desktop columns, place the full-width block outside the two-column grid and use equal flexible tracks such as `repeat(2, minmax(0, 1fr))` where appropriate.
- Preserve or add the mobile collapse to one column.
- Avoid positive `tabindex` and CSS ordering that makes visual and keyboard/screen-reader sequences disagree.
- Include safe-area and content padding for fixed or sticky mobile controls.

## Required verification

1. Assert semantic section order and unique content instances in a focused test.
2. Verify heading hierarchy, landmark labels, keyboard sequence, focus movement/restoration, and screen-reader reading order.
3. At each named viewport, record element/container rectangles, expected grid tracks, gaps, and `scrollWidth <= clientWidth` unless horizontal scrolling is an intentional documented control.
4. Exercise large text and zoom/reflow where material. Record whether the mechanism is browser zoom, text scaling, CSS zoom, or a narrower viewport.
5. Capture and inspect real desktop and mobile output. Screenshots prove appearance; DOM/runtime assertions prove semantics and geometry.
6. Run focused UI tests and the production build.

If a moved component appears twice, remove the duplicate rather than hiding it with CSS. If the pixels look correct but logical order is wrong, the change is not ready.
