# Landing-page headline rollout

Use this checklist when changing an implemented website hero headline rather than merely proposing copy.

## 1. Establish the promise

- Read the current H1, eyebrow, supporting copy, CTA labels, proof points, title, description, and social metadata.
- State the visitor's five-second question: “What does this product do for me?”
- Prefer a concrete subject + action + outcome over an abstract role, metaphor, or category label.
- Keep the H1 to one promise. Put process and qualifications in the supporting sentence.

## 2. Compare candidates in the real layout

Evaluate at least one concise candidate in the implemented page. Reject copy that is clear in isolation but damages the hero hierarchy. Check desktop/mobile headline line count, hero height and CTA visibility, overflow/clipping/overlap/orphans, CTA wrapping/spacing, and redundancy with supporting copy.

For oversized display type, brevity is a functional requirement. If a longer candidate wraps to four or five lines, shorten the promise rather than silently shrinking the brand typography unless design is also in scope.

## 3. Update every copy surface

Search for the old phrase and synchronize:

- visible H1 and initial fallback text;
- localization attributes or translation catalogs;
- static document title and JavaScript/runtime language-switch title;
- meta description and Open Graph title/description;
- structured data when present;
- exact-copy tests, snapshots, and static verification tokens.

A static `<title>` update is incomplete when client-side language initialization overwrites it with old wording.

## 4. Test and visually verify

- Add or update a regression assertion for the new H1 before implementation when practical.
- Run the focused test, full suite, and production build/static verification.
- Review representative desktop and mobile viewports in a real browser.
- For mobile, use actual device emulation such as CDP `Emulation.setDeviceMetricsOverride`; outer-window sizing alone may not represent the intended CSS viewport.
- Pair screenshots with layout probes: confirm `innerWidth`, `document.documentElement.scrollWidth`, headline line count, and primary CTA bounds. Treat `scrollWidth > innerWidth` or CTA bounds outside the viewport as real overflow.
- Preserve unrelated CTAs, language behavior, routes, and metadata.

## 5. Release verification

After deployment, verify directly against the public origin with cache-busting or no-cache headers:

- home returns `200`;
- new H1 and intended title/metadata are present;
- old headline is absent where removal is intended;
- health endpoint reports the deployed revision when available;
- existing critical routes and deliberate `404` behavior remain unchanged;
- production desktop/mobile rendering matches the reviewed candidate.