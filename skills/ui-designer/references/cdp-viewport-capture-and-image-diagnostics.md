# CDP Viewport Capture and Image Diagnostics

Use this recipe when visual-review evidence must prove exact narrow viewport behavior rather than merely produce a correctly sized PNG.

## Exact viewport capture

1. Serve the current prototype from a clean local origin.
2. Start a disposable Chromium profile with remote debugging enabled.
3. Connect to its page target through CDP.
4. Before every capture, call `Emulation.setDeviceMetricsOverride` with the required CSS-pixel width, height, and `deviceScaleFactor: 1`.
5. Navigate only after applying metrics, wait for the route to render, and read back:
   - `window.innerWidth`
   - `window.innerHeight`
   - `document.documentElement.scrollWidth`
6. Require `innerWidth === requestedWidth === scrollWidth`; a PNG with the requested pixel width is insufficient because headless Chromium may retain a wider layout viewport and crop it.
7. Capture with `Page.captureScreenshot({fromSurface: true, captureBeyondViewport: false})` and parse the PNG IHDR to verify exact output dimensions.

## Prevent stale evidence

- Disable browser cache through `Network.setCacheDisabled`.
- Version the HTML stylesheet/module URLs after accepted source changes; changing only the document query string may leave relative module assets cached in a long-lived page.
- Add a capture-revision query value and assert one candidate-specific DOM or asset marker before accepting screenshots.
- Regenerate clean and annotated captures together after every visual or copy change.

## Broken-image diagnostics without lazy-load false positives

Do not classify every `naturalWidth === 0` or `!complete` image as broken: below-fold lazy images may be legitimately pending.

For viewport evidence, classify an image as visibly broken only when:

```js
const rect = image.getBoundingClientRect();
const intersectsViewport = rect.bottom > 0 && rect.top < innerHeight;
const definitelyBroken = image.complete && image.naturalWidth === 0;
return intersectsViewport && definitelyBroken;
```

Retain the resulting per-screen diagnostics beside screenshots. Visually inspect any partially visible cards even when the mechanical count is zero.

## Overflow localization

When `scrollWidth > innerWidth`, enumerate all elements whose bounding rectangles cross either viewport edge. Record tag, class, text, inline style, parent class, and rectangle. Review annotations are common offenders when negatively offset or positioned against the wrong ancestor. Fix the positioning contract; do not hide the defect with `overflow-x: hidden`.

## Theme-scope contrast trap

Redefining `--text` on a theme container does not retroactively change a `color` value already computed on `:root`; descendants may continue inheriting the old light-theme color. Set `color: var(--text)` on the theme scope itself, and keep invariant surfaces such as review banners and white logo cards on explicit semantic colors. Calculate contrast for every foreground/background pair: bright magenta may need dark text even when white text appears visually plausible.

## Accessibility evidence from the same target

For each required route/state, record:

- one `h1`;
- no missing accessible names or image alt attributes;
- no duplicate IDs;
- no scoped mobile control below `44×44` CSS pixels;
- exact-width/no-overflow results.

Also retain one keyboard sequence beginning with `Skip to content`, and emulate `prefers-reduced-motion: reduce` to confirm animation and transition durations resolve to zero.
