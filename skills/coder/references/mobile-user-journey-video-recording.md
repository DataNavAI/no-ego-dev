# Mobile user-journey video recording for generated web apps

Use when the user asks for a recorded user journey video of a web/mobile product rather than only screenshots or a QA report.

## Pattern

1. Define the scenario as a first-time-user CUJ in plain language: entry page, goal, search terms, destination profile/content, and the information the user wants to confirm.
2. Verify the live product data first so the journey has real anchors (profile route, social links, media/news cards, schedules, chart/song sections). If the app is static-generated with a live CMS API, verify both direct profile routes and API-backed search/content routes.
3. Record a realistic mobile viewport. A reliable no-extra-dependency path on macOS is headless Chrome via CDP screenshots plus `ffmpeg`:
   - launch Chrome with `--headless=new --remote-debugging-port=<port>` and a clean temporary user data dir;
   - set mobile metrics (for example 390×844 CSS px, device scale 2) and a mobile user agent;
   - drive navigation, typing, form submit, and smooth scroll via CDP `Page`, `Runtime`, `Input`, and `Emulation`;
   - capture `Page.captureScreenshot` frames at a fixed cadence;
   - encode with `ffmpeg -framerate 8 -i frames/frame_%05d.png -vf "scale=780:1688:flags=lanczos,format=yuv420p" -c:v libx264 -pix_fmt yuv420p -movflags +faststart output.mp4`.
4. Include the journey beats in a manifest or notes: first-time home, search input, resolved profile, social/YouTube/official links, chart/song section, schedules/events, media/news/live-CMS results.
5. When the user wants user-intent evidence, burn in both tap/click markers and short thought captions. A robust path is to record clean CDP frames, save tap coordinates/captions in the manifest, then post-process frames with Pillow/ImageMagick before ffmpeg so markers/captions are visible even if page CSS or browser timing misses them.
6. Spot-check representative annotated frames with vision before delivery. Verify the video actually shows the requested evidence, not only generic navigation.
7. If the user asks to review the journey and fix issues, spawn an objective product-review subagent, write a durable 30-item issue/fix list in the project docs when appropriate, then implement fixes in source/data/tests, regenerate static output, run tests/build/static verification, deploy, and verify production DOM/browser evidence.
8. If an async subagent review completes after you already shipped a first pass, read the full saved subagent output, reconcile it against the implemented fix list, and apply any still-valid deltas before closing the task. Do not ignore late review evidence just because a previous deployment passed.
9. For live-CMS/generated search journeys, verify both static route rendering and runtime API search relevance after deploy. Search fixes may require all three layers: generator/UI copy, server-side ranking fields (aliases/group/member/profile facts), and reseeding the live database so production counts and attribution match the regenerated static pages.
10. If the recording exposes a small labeling/UI issue and the fix is clearly in scope, fix/deploy it before re-recording, then regenerate the video from production.

## Pitfalls

- Do not claim the video demonstrates a data point unless it is visible in the frames or verified from the live API/DOM.
- Avoid writing temporary recording scripts into the git repo; keep them under a local work/tmp directory and deliver only the final media unless the recording harness is intended as product QA tooling.
- If search fallback labels a live API response as a fallback because the query route returns a lower-level source flag, normalize the display logic to treat database/API query results as live before recording product evidence.
