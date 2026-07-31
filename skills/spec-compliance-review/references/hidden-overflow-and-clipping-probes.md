# Hidden-overflow and clipping probes

Use this when a UI change adds user/content-derived labels, links, badges, IDs, or result lists inside cards or panels, especially when the acceptance contract requires mobile containment or zero clipping.

## Why page-level overflow is insufficient

A container can use `overflow: hidden` while a long unbroken child extends far beyond its right edge. In that case:

- `document.documentElement.scrollWidth === innerWidth` can still pass;
- no horizontal scrollbar appears;
- the child is visibly clipped;
- ordinary page-overflow checks produce a false success.

## Probe recipe

1. Derive the longest **contract-valid** unbroken value from the authoritative schema and the runtime's own stricter bounds. Do not use an invalid arbitrary attack string as the sole fixture.
2. Render the exact final markup and exact shipped stylesheet at every required narrow viewport, starting with the smallest width.
3. Measure the changed element and every clipping ancestor:

```js
const child = document.querySelector('[data-probe]');
const container = child.closest('.card');
const childRect = child.getBoundingClientRect();
const containerRect = container.getBoundingClientRect();
({
  viewport: innerWidth,
  documentScrollWidth: document.documentElement.scrollWidth,
  childLeft: childRect.left,
  childRight: childRect.right,
  childWidth: childRect.width,
  containerLeft: containerRect.left,
  containerRight: containerRect.right,
  containerWidth: containerRect.width,
  containerScrollWidth: container.scrollWidth,
  overflow: getComputedStyle(container).overflow,
  overflowWrap: getComputedStyle(child).overflowWrap,
  wordBreak: getComputedStyle(child).wordBreak,
});
```

4. Fail containment when either:
   - `childRect.left < containerRect.left` or `childRect.right > containerRect.right`; or
   - `container.scrollWidth > container.clientWidth` while overflow clips rather than intentionally scrolls.
5. Keep document-level overflow as a separate assertion; it does not replace descendant geometry checks.
6. Verify empty, typical, and maximum-valid values. For grouped result lists, probe both groups and both empty/non-empty branches.
7. Prefer a fix that permits wrapping (`overflow-wrap: anywhere`, an appropriate word-break policy, and `min-width: 0` through the full flex/grid ancestry) over relying on clipping.

## Exact built-asset browser closure

When the route needs controlled contract-valid data that the immutable build does not ship, test the actual built application rather than a hand-authored approximation:

1. Build in a reviewer-owned exact-SHA worktree or snapshot.
2. Generate the longest valid release/fixture outside that worktree through the production schema/normalization path.
3. Run a disposable loopback server that serves built files byte-for-byte and maps only the required data endpoint to the external fixture. Do not copy or edit files inside the candidate.
4. Drive the complete user journey through the built JavaScript in a real browser over CDP. Record the loaded stylesheet and controller asset URLs, and hash their HTTP response bytes against the exact built files before interpreting geometry.
5. Reproduce the prior candidate in a separate exact-SHA worktree and server when claiming a blocker is fixed; page-level `scrollWidth` may pass in both versions while descendant geometry distinguishes them.
6. Clear origin storage or use a fresh browser profile before each run. Otherwise a persisted completed journey can skip the question path and make a rerun silently inspect stale state.

For focus evidence, call `focus()` and then `scrollIntoView({block: 'center'})` before the final rectangle read. Check the expanded outline box (`outline-width + outline-offset`) against both the clipping ancestor and viewport. Beware that `scrollIntoView()` can programmatically change a hidden-overflow ancestor's `scrollLeft`; retain a pre-scroll containment measurement for the clipping reproducer and use the centered measurement for focus visibility.

Compare ordinary values as a control: exact text, href, visibility, containment, and expected interaction must remain correct. Do not require identical inline/block dimensions when the specified fix intentionally changes display mode to establish a wrapping width.

## Evidence to report

Record viewport, exact candidate SHA/tree, schema/runtime bound that makes the fixture valid, child/container rectangles, container `scrollWidth` versus `clientWidth`, computed overflow/wrapping properties, and whether page-level overflow remained deceptively clean.
