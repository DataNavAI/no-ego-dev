# Repeatable Mobile Comparable Capture

Use this when researching current public product/comparable pages and you need attributable visual evidence rather than memory or search snippets.

## Capture contract

Record for every source:

- Exact URL and final URL
- Observation date/time and locale
- CSS viewport and DPR
- Authentication/consent state
- Access limitations or overlays
- First viewport screenshot
- One later viewport or state that reveals card/feed rhythm
- Measured `innerWidth`, document `scrollWidth`, and scroll height

Treat screenshots as dated observations. Do not infer interaction, autoplay, popularity, editorial quality, or hidden states from static pixels.

## Lightweight Playwright workflow

For repeatable non-interactive public-page evidence, use Playwright with an installed browser channel when available:

```bash
npx playwright screenshot \
  --channel chrome \
  --viewport-size '390,844' \
  --lang en-US \
  --wait-for-timeout 8000 \
  --timeout 45000 \
  'https://example.com/' \
  'evidence/YYYY-MM-DD-example-mobile-390x844.png'
```

For several sources, write a small scratch audit utility that launches one browser, creates a fresh context per source, and records:

- response status, title, and final URL
- viewport/document geometry
- visible headings and controls
- image/video rectangles and alternative text
- fixed/sticky overlays
- a second screenshot after a known scroll offset

Use the structured audit as supporting evidence, not as a substitute for looking at the screenshots. DOM media-area sums may double-count nested `<picture>/<img>` or duplicate carousel slides; use screenshot geometry for qualitative image-to-text conclusions.

## Visual analysis prompts

Ask the image reviewer to stay pixel-bound:

- imagery versus text area
- hierarchy and first actionable content
- card/feed rhythm
- identity cues
- navigation and density
- color/motion cues visible in the frame
- community, trust, commerce, and ad cues
- overlays, clipping, or blank/loading states

For the later viewport, focus on repeated card anatomy, density, ad interruptions, and sticky obstruction.

## Transfer-risk discipline

Separate each source into:

1. Direct observation
2. Useful pattern to transfer
3. Transfer risk / anti-pattern

Extract principles only. Do not copy brand assets, exact layouts, promotional imagery, proprietary mechanics, engagement metrics, or editorial tone. Distinguish community/popularity cues from provenance; comments, views, votes, ranks, and memberships are not evidence quality.

## Verification

- Confirm every screenshot's actual pixel dimensions.
- Confirm report URLs and evidence filenames exist.
- Validate scratch capture scripts before calling the evidence complete (`node --check <script>` or a real project test command).
- If using an npm scratch package, replace the default failing placeholder `test` script with a meaningful syntax or smoke check before running `npm run test`.
- State when the workspace is not a Git repository instead of claiming Git diff verification.
