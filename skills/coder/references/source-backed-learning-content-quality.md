# Source-backed learning-content quality gates

Use this pattern when a static or generated learning experience contains artist, person, entity, cultural, historical, or trivia facts that can quietly become dull, duplicated, unsupported, or stale.

## Content contract

Keep learning copy in a dedicated data module rather than scattering literals through rendering code. Validate each entity/member record for:

- a stable identity and group/entity association;
- at least two compact basic facts (for example birth date and group), visually distinct from the memory hook;
- one short, specific memory hook and one tellable fact that is not merely a birthday, age-order statement, role label, or directory listing;
- explicit source tuples with source kind, provider label, and HTTPS URL;
- a content-review date and bounded quality status.

Keep source claims honest. An official profile may support profile facts; Wikipedia is a public bio source, not an official source; an interview can support a first-person memory hook. Render these labels visibly instead of collapsing them into a generic “verified” badge.

## Deterministic verifier

Add a dependency-light verifier that loads the same data consumed by the browser and fails closed on:

1. missing expected cohorts or incorrect member counts;
2. missing/duplicate facts or hooks;
3. birthday-only, directory-listing, or generic-member facts;
4. fewer than two basic facts;
5. missing or malformed HTTPS source tuples;
6. facts supported only by a directory profile when a richer bio/interview source is required;
7. stale `checkedAt` dates beyond the chosen review window;
8. online source responses outside the accepted success/redirect range when `--online` is requested.

Print a compact machine-readable receipt containing artist/entity count, record count, unique source count, and whether online checks ran.

## Continuous monitoring

Run the static validator on relevant pull requests and pushes. Run the online source check on a low-frequency schedule (weekly is usually enough for evergreen learning facts) and allow manual dispatch. Pin current maintained GitHub Action major versions so CI does not accumulate runtime deprecation warnings.

A scheduled failure is a content-review signal, not permission to weaken the freshness/source rules. Update or replace the affected fact and refresh the review date with evidence.

## UI and journey verification

For each learning cohort, browser-test:

- first and final lesson states;
- Previous/Next boundaries and focus movement;
- visible basic facts, memory hook, source labels, and content-check date;
- a clear final CTA appropriate to the available next journey;
- fixed bottom-navigation clearance at every required mobile viewport.

For scored challenges, test at least one perfect and one imperfect path. Assert visible and accessible score/persona labels derive from answers actually completed. If sharing is image-oriented, generate the file from the result state (for example inline SVG → canvas → PNG), use Web Share only when file sharing is supported, provide a download fallback, and keep the fallback object URL alive long enough for the browser to begin the download.

## Randomized multi-challenge contract

When answer order must vary, keep randomness behind a pure injected seam such as `buildAnswerOrders(questions, random)`. Test invariants rather than sampling until a random run happens to look diverse:

1. Every rendered question preserves the exact original answer set with no duplicates or omissions.
2. The correct answer appears exactly once.
3. Correct-answer positions cover all available slots across a bounded pack when that is a product requirement. A random starting offset plus deterministic per-question rotation can guarantee coverage while still varying each new run; purely independent shuffles make this assertion flaky.
4. Production uses `crypto.getRandomValues` (with a bounded fallback only when necessary), while unit tests inject fixed values.
5. Browser tests select answers by stable answer value/text, not index, and record the observed position sequence as evidence.

For multiple challenge packs, make pack identity explicit in data and URL/state, reset score/index/order atomically when switching, preserve direct-load routes, and provide a result CTA that starts the next pack without routing through unrelated content. Test direct entry for every pack, an end-to-end transition to the next pack, and perfect/imperfect score bands after switching.

## Browser-test pitfalls

- Use fail-fast compound verification (`set -e` or `&&`); a later successful command must not mask an earlier failed browser suite.
- Hidden lazy images may legitimately have `naturalWidth === 0`. Broken-image assertions should target visible images or deliberately force-load every hidden state first.
- A full-page screenshot can misrepresent fixed navigation. Measure CTA rectangles against the real viewport and bottom-nav rectangle after the actual transition/focus state.
- Re-fetch authoritative review comments before implementation and again before replies/resolution; do not resolve from local or staging evidence when production is the contract.
