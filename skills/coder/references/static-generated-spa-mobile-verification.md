# Static Generated SPA Mobile Verification

Use this when a static/generated product is enhanced with client-side SPA navigation or mobile app-shell CSS.

## What to preserve

- Keep generated HTML routes crawlable and directly loadable; SPA interception is progressive enhancement, not the only navigation path.
- Intercept only same-origin app HTML links. Do not intercept `/api/*`, assets (`.css`, `.js`, images, JSON/XML/TXT), downloads, modifier-clicks, or target-window links.
- After HTML swapping, update `document.title`, relevant meta/canonical tags, body class/dataset, route-specific content, and reinitialize route-local handlers.
- Avoid duplicate event handlers after swaps by using delegated document-level handlers or per-form initialization guards.
- Track a new page view after SPA swaps if analytics expects route-level page views.

## Layered direct-load gate

Do not use one phrase such as “direct load passes” for three different layers:

1. **Application resolver:** unit-test that a fresh location resolves the correct route without prior in-memory state.
2. **Built static artifact:** request the deep URL from the actual local server. A plain file server returns `404` when the build emits only `index.html`; client-router tests do not change that result.
3. **Hosted edge/runtime:** verify the configured allowlisted rewrite or fallback against the deployed candidate, including exclusions for APIs, assets, data, version files, extensions, and unsupported prefixes.

If the current milestone intentionally implements only layer 1 and assigns rewrites to a later deployment milestone, state that boundary explicitly in the PR and keep deployment/publication blocked. Do not report layer 1 as end-to-end deep-link evidence. If the current slice is itself releaseable, layers 2 and 3 are blocking.

## Verification pattern

1. Run the generated-site test/build command so source and generated output stay synchronized.
2. Syntax-check both generator source and generated JS when the app emits inline/generated assets.
3. Use CDP `Emulation.setDeviceMetricsOverride` (for example 390×844, mobile=true, deviceScaleFactor=1) rather than relying on a desktop `--window-size` flag, then measure:
   - `innerWidth`
   - `document.documentElement.scrollWidth`
   - `document.body.scrollWidth`
   - main/app-shell bounding rect
   - fixed bottom-nav bounding rect
4. Assert `scrollWidth <= innerWidth` and that fixed navigation is fully inside the viewport.
5. Click a bottom-nav/internal link in the browser and verify:
   - `location.pathname` changes to the target route.
   - `document.title` changes.
   - the route-specific main class/content changes.
   - only one fixed nav exists after navigation.
   - `scrollWidth` remains within the viewport.
6. Capture a mobile screenshot and visually inspect for clipping, unreadable cards, and bottom-nav overlap.

## Pitfalls

- Chromium desktop/headless windows can enforce a minimum CSS viewport width near 500px. `--window-size=390,844` may therefore produce a 390-pixel screenshot that is merely a cropped wider desktop viewport, falsely suggesting horizontal overflow or clipped navigation. Use CDP device metrics, then require `innerWidth === requestedWidth` and inspect `scrollWidth` plus element rects before interpreting pixels. `--force-device-scale-factor=1` alone does not prove a 390 CSS-pixel viewport.
- A screenshot can look clipped even when `scrollWidth` is correct if the shell is centered narrower or wider than the real device/browser viewport. For production mobile web pages that are meant to feel like an app, prefer `width:100%; max-width:none; margin:0` for the live mobile shell, then re-center only on desktop breakpoints.
- Browser screenshots that include real mobile browser chrome can reveal a right-side strip even when a 390px emulated viewport passes; verify the width that matches the screenshot/device (for example 430px) and measure `main.getBoundingClientRect().right === innerWidth`, not only `scrollWidth <= innerWidth`.
- Feed/card labels should be semantic content labels, not generic route labels. For mixed static feeds, derive home-card labels from the item kind/type (`Schedule`, `Voting`, `Fan event`, `Member update`, `Buzz`, etc.) and add route-level assertions that generic labels such as all-`News` cannot regress.
- Fixed bottom nav rules often need global mobile-safe overrides, not only media-query overrides, because headless screenshot tools may use desktop CSS unless mobile emulation is explicit.
- Replacing `.app.innerHTML` removes route-local listeners; delegated handlers are safer for generated SPAs.
- Do not add temporary scratch screenshots or CDP probe scripts to the repository; keep them under profile-local `tmp/` unless they become durable test assets.
