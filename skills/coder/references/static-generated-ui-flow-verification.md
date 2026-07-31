# Static Generated UI Flow Verification

Use this reference when a feature is implemented by a generator that emits static HTML/CSS/JS, especially when the deployed app is served at a different base path than local development.

## Lessons captured

- Verify both generator source and generated output. Static-site tests can pass against stale expectations if they only inspect source files; add assertions against generated HTML markers, sitemap entries, and JS behavior hooks.
- For SEO pages, check the generated artifact for title/meta/canonical/schema-adjacent markers, route existence, sitemap inclusion, and the visible above-the-fold content Google users expect.
- For personalized flows that use client state, run browser QA with a clean state and with a seeded state. Clear or inspect `localStorage` before testing follow/signup paths so an old session does not mask the sign-in gate.
- Exercise the full path, not just static markers: landing/profile page -> follow CTA -> sign-in/profile intent page -> email signup/sign-in -> intended follow saved -> related follow cards -> next/home feed.
- If local development serves under a subpath but production serves at host root, explicitly verify hrefs and redirects in both contexts. A link like `/` may be correct on the production host but wrong under `/product` locally; call out this distinction in QA notes or make links base-aware when both contexts matter.
- For generated visual UI, use browser/vision QA after build regeneration, because CSS or generated-card ordering bugs often appear only in rendered output.
- Do not trust a headless browser's `--window-size` flag as proof of the CSS viewport. Some desktop builds clamp the inner viewport (for example, a requested 390px window can remain 500 CSS px), producing misleading cropped screenshots. Apply CDP `Emulation.setDeviceMetricsOverride`, then record `innerWidth`, `document.documentElement.scrollWidth`, and relevant fixed-nav/content rectangles before capturing the screenshot. Treat the screenshot as valid mobile evidence only when the measured viewport equals the requested width and `scrollWidth <= innerWidth`.
- Production smoke should check: health endpoint, representative SEO page, auth/follow intent page, home feed, sitemap, and browser visual QA with clickable-element annotations when interaction clarity matters.

## Minimal checklist

1. Run generator.
2. Run tests/build/static verifier.
3. Inspect generated route HTML for required markers.
4. Start local server and browser-test clean + seeded client state.
5. Commit regenerated artifacts when this repo tracks them.
6. Deploy and watch CI/CD to completion.
7. Production smoke with curl/content checks plus one browser visual pass.