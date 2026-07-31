# Comparable Visual-Pattern Research

Use this when the deliverable is design inspiration or a pattern/anti-pattern synthesis from live comparable products rather than a review of one candidate UI.

## Evidence contract

For every inspected destination, record:

- Product and exact URL.
- Access date.
- Fan/user job represented (profile, database, media, discovery, schedule, community, etc.).
- Exact viewport and responsive mode.
- Final URL and page title after redirects.
- `innerWidth`, `scrollWidth`, `innerHeight`, and document height when browser instrumentation is available.
- Screenshot path.
- Access limitation, overlay, redirect, maintenance state, or lazy-load failure without substituting remembered product behavior.

A source that is currently unavailable may count as an attributed access-failure observation, but not as evidence of its normal UI patterns. Inspect another working source so category coverage remains adequate.

## Capture sequence

1. Create the durable evidence directory before browsing.
2. Capture the public entry/home surface and one representative entity/detail surface when both are relevant.
3. Capture the unmodified first viewport, including obstructive ads, modal promotions, blank reserved ad space, cookie UI, and maintenance states. These are product evidence, not noise.
4. If an overlay blocks the underlying design, capture a second clearly labeled view after dismissal/removal. Never replace the blocked-state screenshot with only the cleaned view.
5. Inspect enough below the fold to understand repeated card rhythm, member/entity treatment, progressive disclosure, and long-page fatigue. A first-viewport screenshot alone cannot support claims about a 20,000px profile page.
6. Verify mobile width rather than trusting screenshot appearance: `scrollWidth` should not exceed `innerWidth` unless horizontal scrolling is an intentional, visibly signaled component.
7. Write the synthesis and evidence index before producing a chat summary. Do not stop with screenshots alone.

## Visual-analysis lens

Separate these dimensions instead of reducing the review to “more photos”:

- **Image-to-text balance:** pixels devoted to identity/content imagery versus prose, metadata, ads, and empty reserved space.
- **Identity recognition:** whether a fan can distinguish group/member/entity at a glance; cropping consistency; name proximity; fallback behavior.
- **Card rhythm:** aspect ratios, repetition, hierarchy, scan speed, and whether every module has the same weight.
- **Progressive disclosure:** concise first view with optional quick facts, drawers, tabs, or drill-down instead of a continuous biography stream.
- **Discovery energy:** freshness, time context, recommendations, visual variety, and useful “what next?” cues.
- **Trust:** source class, official-account links, update timestamp, metric definition, correction path, and separation of observed data from editorial inference.
- **Mobile behavior:** target size, fixed chrome, overlays, safe-area clearance, overflow, language fit, and interruption cost.
- **Transfer risk:** rights/licensing dependency, popularity theater, fabricated engagement, ad/feed clutter, voting/commerce scope, and brand-specific mechanics.

Do not mistake large blank ad slots or lazy-load placeholders for intentional breathing room. Do not describe a photo-heavy page as visually effective if portraits are repetitive, inconsistently cropped, detached from labels, or interrupted by monetization.

## Synthesis shape

Produce:

1. Scope and methodology.
2. Evidence index with URLs, dates, viewports, and limitations.
3. Per-source observed strengths and anti-patterns.
4. Cross-source transferable patterns.
5. Explicit non-transfer list.
6. Product-specific rules that preserve accessibility, provenance, rights safety, and one primary job per route.
7. Two or three materially distinct visual directions, each mapped to concrete modules rather than mood words alone.

For visual-first directions, reduce explanatory prose through portraits, compact labels, chips, timelines, progressive disclosure, and interaction. Keep necessary source, freshness, error, recovery, and accessibility text.