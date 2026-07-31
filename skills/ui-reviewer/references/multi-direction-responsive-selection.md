# Multi-Direction Responsive UI Selection

Use this procedure when selecting one of several visual directions for an existing product.

## Evidence order

1. Read the product contract and extract non-negotiables, protected journeys, target users, and required states.
2. Inspect every supplied desktop and mobile artifact, plus the prototype source/README when available.
3. Inspect the current production baseline. Identify what must be preserved and the concrete failure the redesign must correct.
4. Verify responsive geometry at the exact required viewports rather than trusting screenshots:
   - `document.documentElement.scrollWidth === document.documentElement.clientWidth`
   - actionable target dimensions, especially fixed navigation and inline source links
   - fixed/sticky element bounds and bottom offsets
   - safe-area handling and content clearance
   - treat `body { zoom: 2 }` at a doubled capture width as visual scaling evidence only, not proof of genuine browser 200% zoom or dynamic text; browser zoom changes the effective CSS viewport/media-query behavior, while CSS `zoom` can leave breakpoint logic at the wider width
5. Check SPA direction semantics as well as visible styling:
   - every route transition preserves the correct active-nav state and updates `aria-current`
   - focus moves from a control hidden by the transition to the destination heading/back control, then restores on return
   - the active route has one meaningful `h1`; persistent home heroes must not create a second visible `h1` on lesson/detail/result routes
6. Check structural completeness across entity/content fixtures: individual, group, empty, stale, partial, error, and rights-safe media fallback when relevant.

## Selection scorecard

Score the criteria derived from the product contract, not generic taste. Typical dimensions include:

- first-seconds comprehension / identity continuity
- provenance and trust legibility
- emotional or brand resonance
- primary utility prominence
- responsive and accessibility robustness
- fit with the existing product language
- scalability across entity types and data density
- state completeness

Publish per-direction scores and concrete evidence. Treat scores as decision support, not as a substitute for blocker judgment.

## Decision semantics

Separate two decisions explicitly:

- **Direction selection:** one concept may clearly be the strongest basis.
- **Implementation readiness:** that winner may still be `NEEDS ITERATION` because required states, accessibility, rights, or responsive evidence are missing.

Do not call an incomplete winner a product-level pass. State, for example: `Direction selection: PASS; implementation readiness: NEEDS ITERATION.`

A hybrid is allowed only when each borrowed element solves an evidenced weakness. Name the base direction, the exact borrowed element, its source direction, and the reason. Avoid vague “combine the best parts” recommendations.

## Local prototype geometry fallback

If the interactive browser cannot load a local prototype, use a local headless Chromium-family browser with the Chrome DevTools Protocol. Navigate to the local `file://` artifact, set exact viewport metrics with `Emulation.setDeviceMetricsOverride`, reload, then evaluate `innerWidth`, `documentElement.clientWidth`, and `documentElement.scrollWidth` in-page before capturing.

Do **not** trust `chrome --headless --window-size=390,844 --screenshot` as proof of a 390px CSS viewport: desktop Chrome can enforce a 500px minimum layout width and crop that wider page into a 390px bitmap. If the measured `innerWidth` is not the requested width, discard the screenshot. This is a reusable fallback pattern; do not infer from local-browser access failures that browser tools are generally unavailable.

Useful probes:

```js
({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  shortTargets: [...document.querySelectorAll('button,a')]
    .map(el => {
      const r = el.getBoundingClientRect();
      return { label: el.textContent.trim(), width: r.width, height: r.height };
    })
    .filter(x => x.width && x.height && (x.width < 44 || x.height < 44)),
  fixed: [...document.querySelectorAll('*')]
    .filter(el => getComputedStyle(el).position === 'fixed')
    .map(el => ({ className: el.className, rect: el.getBoundingClientRect().toJSON() }))
})
```

## Final output

Keep the decision easy to route:

1. Winner and any narrowly justified hybrid elements.
2. Comparative scorecard.
3. Why the winner wins.
4. Why each alternative loses.
5. `PASS`, `NEEDS ITERATION`, or `BLOCKED` for implementation readiness; omit safely reversible minor polish rather than reporting it.
6. Exact changes required before implementation.
7. Evidence inspected and verification performed.

The strongest review is decisive while preserving gate integrity: select a direction when evidence permits, but do not erase missing-state or accessibility blockers.