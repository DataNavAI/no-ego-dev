# Static profile renderer gate checklist

Use this when a trusted page model is rendered into one root page plus multiple static detail pages. Repeated identity markup turns small validation gaps into generation-time amplification and multiplies visual/copy defects.

## Semantic gate before CSS

1. Render one shared identity component on the root and every detail route.
2. Preserve canonical identity, alternate names, entity type, disambiguation, checked date, relationship summary, Follow contract, and back link where appropriate.
3. Render approved imagery only from the already validated page model. Require the complete local-asset and rights receipt. If any required field is missing or unsafe, fail closed to an explicit branded non-likeness treatment—never reread raw registry image data.
4. Keep social/OG image policy independent from body imagery. A licensed body portrait does not authorize likeness-based OG output.
5. Render claim-scoped facts only with their own sources and checked timestamp. Do not combine evidence across claims.
6. Preserve visible source-provider labels while giving each fact source link a claim-specific accessible name, e.g. visible `Wikidata` with `aria-label="View Wikidata source for Born"`.
7. Put the neutral human-readable checked date in the shared identity, not only in a late root-only Sources section, so every detail route carries freshness context.
8. Keep third-party databases distinct from official artist/agency links in both visible copy and analytics action taxonomy.
9. Preserve the existing runtime selector/attribute contract when changing semantic markup; do not create a second Follow implementation.
10. Treat accepted empty-state wording and articles as exact copy contracts. Fix broad claims without weakening the frozen source-scope language.

## Amplification and fail-closed bounds

Any source-controlled string repeated across root and detail pages needs an explicit maximum at the renderer boundary, even if an upstream model currently accepts it. Audit every scalar and every array member separately: a bounded `alternate[]` loop does **not** bound a sibling scalar such as `nativeName`/`hangul`. Also include values that enter JSON-LD or metadata on the root while entering shared identity markup on every detail page. Check at least:

- display names, each scalar native/alternate name field, and every alternate-name array entry;
- disambiguation;
- biographies and current-item titles;
- free-text fact values such as occupation;
- image credit and license labels;
- relationship display labels;
- URLs and local asset paths.

Prefer omission over truncation for sourced facts. For image credit/license overflows, reject the entire approved-image presentation and show the non-likeness fallback; a partial rights receipt is not acceptable.

Add an adversarial test that injects an over-limit value, renders the root plus every detail page, proves the string is absent, and asserts aggregate output remains bounded. Test boundary values (limit and limit+1) when practical. As a separate probe, use a very large scalar and record both the number of artifacts containing it and their aggregate byte size; this catches fields that a narrow `limit+1` assertion forgot to enumerate.

## Responsive approved-image gate

Responsive markup creates a second validation boundary beyond the basic `<img>` attributes:

1. Emit `srcset` only from the same already-approved local asset used by `src`; never re-read a raw registry path or synthesize an unreviewed candidate.
2. Keep width descriptors truthful to known intrinsic dimensions. `Number.isInteger(value)` alone is insufficient: very large integers stringify as scientific notation (for example `1e+21w`), which is not a valid `w` descriptor. Require positive integers with a practical upper bound for **both** width and height before rendering any approved image.
3. Fail the whole approved-image presentation closed when dimensions are invalid; use the same branded non-likeness fallback and emit no `<img>` or `srcset`. Do not silently omit only the responsive attributes while retaining a questionable rights/asset presentation.
4. Make `sizes` match the actual CSS breakpoint, mobile gutter calculation, desktop column fraction, and desktop cap. A syntactically valid but layout-inaccurate `sizes` value can still select wasteful assets.
5. When only one reviewed raster exists, a one-candidate local `srcset` with a truthful width descriptor is acceptable; do not invent derivative filenames.
6. Preserve intrinsic `width`/`height`, body-image rights/takedown text, non-likeness behavior, and the independent OG image policy.

TDD probes should cover the valid production dimensions plus: exact maximum, maximum+1, `1e21`, `Number.MAX_VALUE`, `Infinity`, and `NaN` for each dimension. Across root and every detail page, invalid dimensions must produce the fallback with no `<img>`, `srcset`, or scientific-notation leakage. Then run the real multi-browser responsive-image gate—not only regex tests—and verify current source, natural dimensions, rendered slot dimensions, same-origin loading, overflow, controls, and transfer budgets. If the browser suite fails on clean HEAD too, that distinguishes a baseline defect from a slice regression, but it does **not** waive a frozen candidate acceptance criterion; close the baseline in its own reviewed micro-slice.

## Runtime hydration, mobile priority, and provenance continuity

Static HTML acceptance is not enough when a shared client runtime hydrates the page. Exercise and screenshot the hydrated page, because runtime state reconciliation can silently replace entity-specific SSR copy with generic labels.

1. **Preserve contextual action copy through every runtime state.** If the accepted label is `Follow <artist>`, prove the initial hydrated, signed-out, pending, success, failure/rollback, and already-following states retain the artist context. Keep the canonical persistence key separate from display text; never infer API identity from mutable DOM copy.
2. **Make mobile priority semantic before making it visual.** For utility-led profile pages, use source/DOM order for the accepted sequence whenever possible: shared identity/freshness and primary action → current item or named empty state → essential facts → roster/deeper navigation/sources. This keeps screen-reader and visual order aligned. Use CSS `order` only as an explicit exception; then separately prove focus/reading order remains acceptable, content is not duplicated or hidden, selectors do not leak outside the root profile, desktop hierarchy is unchanged, and detail routes are excluded.
3. **Current-item cards carry one internally consistent receipt.** A headline, timestamp, and generic `View source` action are insufficient. Extract provenance from the selected item's reviewed source row—not from an optional primary action. Require a safe source URL, bounded non-empty outlet label, finite allowlisted source/content type, canonical item-level checked timestamp, event/publication time, and accepted timezone treatment. When both source-row `verifiedAt` and item `lastVerifiedAt` exist, require exact equality; mismatches omit the card. Never borrow profile-level freshness.
4. **Make repeated providers distinguishable without inventing account purpose.** Count valid links by provider after URL deduplication. Preserve reviewed order. Keep the normal label when a provider is unique; when repeated and no reviewed account/channel name exists, use deterministic scoped labels such as `Instagram link 1`, `Instagram link 2`, `Artist website link 1`, and `Artist website link 2`, including equivalent accessible names. Do not infer region, ownership, or channel purpose from URL shape merely to improve prose.
5. **Never manufacture publishable relationship names from slugs or unbound catalogs.** Slug title-casing produces wrong brands and stage names (`Blackpink`, split initials, altered hyphenation), while a broad catalog keyed only by slug does not prove identity. Store a bounded reviewed display label on the relationship together with an exact receipt bound to the counterpart stable ID (for Wikidata: English label, requested QID, and exact QID URL). Validate exact own-data keys, language, QID/URL agreement, controls, length, and source shape at the page-model boundary. Routes may continue using the reviewed slug; visible text must come only from the reviewed label. Missing or invalid label receipts omit the relationship with no fallback.
6. **Migrate and scope relationship sets by publication status.** Inventory all rows, but require display-label receipts only for statuses the renderer can publish (`current`/`former` or the product's equivalent). Keep `unknown` rows hidden rather than laundering them into visible history or failing a release solely because unpublished rows lack labels. A time-filtered or source-limited visible subset must not appear under an exhaustive heading such as `Current members`; use `Reviewed current member records` / `Reviewed former member history`, qualify the subset, or withhold it. Preserve group roster authority independently from individual membership projections.
7. **Carry claim receipts onto detail routes.** Repeating a biography or fact on `/about` without its claim-specific sources and checked timestamp breaks provenance continuity even if a broad profile-level checked date remains visible. Root and detail renderers should reuse the same claim-with-receipt component.
8. **Use isolated populated-state fixtures without falsifying production.** If production inventory truthfully yields an empty state, build a clearly labeled fixed-clock screenshot fixture through the real model/renderer/runtime using an actual reviewed moderation record. Record the source row identity and fixed clock outside the repository; do not inject fabricated production content.

Screenshot acceptance should cover at least: approved image plus rights receipt, full non-likeness fallback, individual membership, complete/partial group roster semantics, ambiguous history, honest empty current state, source-backed populated current state, and one deeper route. Pair screenshots with machine checks for HTTP status, overflow, minimum control size, focus visibility, and cross-origin requests.

## First-view identity disambiguation and partial-data utility

Automated route, schema, source, and accessibility checks do not prove that a fan can identify the intended entity quickly. Add a representative signed-out product-review gate for ambiguous acronyms, reused stage names, photo-less profiles, and sparse individual profiles.

1. **Disambiguate with reviewed identity facts, not invented activity claims.** For an acronym-only group, publish reviewed expanded/alternate names plus an existing sourced type or geographic descriptor in the hero. Do not add “active,” “disbanded,” agency, debut, or lineup claims merely to make the page feel complete unless those claims have their own receipts.
2. **Promote only the exact reviewed relationship.** If a sparse individual profile needs current-group context, correct that one relationship from `unknown` to `current` only when an authoritative source names the individual and the counterpart display label has a receipt bound to its stable ID. Never globally reinterpret `unknown` relationships, infer current status from a route/catalog join, or update sibling entities just for visual consistency.
3. **Require rendered first-view assertions and screenshots.** Test the production registry row, page-model projection, and exact hero markup, then inspect representative mobile and desktop screenshots. A technical matrix can remain green while the product journey is still ambiguous; record technical results separately and hold the candidate when audience review fails.
4. **Keep review-clock ancestry truthful.** A newly reviewed alias or relationship must advance the affected entity parent and registry parent clocks. Enforce `generatedAt ≥ registry checkedAt ≥ entity checkedAt ≥ nested checkedAt` recursively over the trusted parsed registry; a hard-coded child timestamp assertion alone does not catch an artifact generated before its newest evidence.
5. **Treat remediation as a new candidate.** Mark the tested interface/result as failed for the old digest, preserve its evidence, create a new digest after the content/data fix, and repeat the product and evidence-integrity reviews against a freshly frozen tree.

Useful representative states include: an acronym-only group without an approved photo; an individual with one authoritative current relationship and otherwise sparse data; a normal photo-led individual; partial group history; honest empty current content; and signed-out Follow/source/correction actions.

## Review sequence

- TDD RED → focused GREEN → related feature/metadata tests → bare canonical test.
- Restore generated tracked output before staging.
- Run one composite independent review covering semantic/copy compliance plus escaping, provenance, claim isolation, runtime compatibility, and amplification. If it finds an issue, correct with TDD and rerun the complete gate on the new candidate.
- After the first finding in a bounded failure class, inventory every sibling publication field and ask the next reviewer for one explicit convergence pass over that complete inventory. Do not patch and review one scalar at a time when the same defect can exist in adjacent fields.
- Make boundary coverage tabular or data-driven where practical: each field should prove `limit` publishes and `limit + 1` fails closed across every route where it is repeated. Include scalar siblings outside otherwise bounded arrays.
- Any source or test correction invalidates the earlier verdict; rerun one composite independent review before committing.
