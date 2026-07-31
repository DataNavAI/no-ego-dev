# Cross-group substitution closure

Use during editorial/provenance review when records can carry both a primary identity and a parent/group identity.

## Required matrix

Evaluate the exported final publication predicate and the real entity selector at one trusted current UTC clock.

1. Load the complete authoritative reviewed group cohort used by the product—not a smaller headline-recognition, ingestion, alias, or refresh list.
2. For every reviewed group slug `A`, first run a same-group positive control (`primaryArtistSlug: A`, `group: A`) through the exported final predicate and real selector. Require publication and exactly one selection for `A`. This proves the fixture is otherwise valid and prevents title recognition, freshness, receipt, or schedule failures from making the negative matrix pass vacuously.
3. For that same `A`, change only `group` to at least one distinct reviewed group slug `B`, with no explicit individual identity. Require rejection by the final publication predicate and zero selection for both entities.
4. Include records whose primary group is absent from any narrower editorial alias list; these expose incomplete-cohort authorization checks.
5. Probe the self-idol bypass explicitly: for a reviewed group slug `A`, set `primaryArtistSlug: A`, `idol: A`, and `group: B`. This must still reject. Equality between `idol` and `primaryArtistSlug` proves an individual only when the primary slug is **not** in the authoritative reviewed group cohort; otherwise a group can masquerade as its own member and bypass group consistency.
6. Test individual-parent ownership in both directions, not only as a positive exemption:
   - positive: `primaryArtistSlug === idol` with an authoritative parent `group` must publish and select for the individual;
   - negative: change only `group` to an unrelated reviewed group and require final-gate rejection plus zero individual selection;
   - self/group disguise: a reviewed group slug used as both `primaryArtistSlug` and `idol` must never acquire individual semantics.
   Exercise the real individual selector branch, not a group selector with an “individual exemption.” A group-only cross-product matrix cannot expose `individual A → unrelated group B` substitutions.
7. Build individual→parent relationships from authoritative reviewed relationship data. If the product has a broad member catalog plus a narrower release cohort, union the relevant reviewed relationship sources, validate known anchor relationships at initialization, and fail closed when an explicitly supplied parent cannot be proven. Do not infer parentage from title mentions or assume `primaryArtistSlug === idol` makes any supplied group legitimate. For solo artists with no reviewed parent relationship, an absent group is valid but an unrelated explicit group is not.
   - Normalize every relationship key through the same canonical-slug function used by production records and selectors. Mixed catalogs often represent some members as `{ slug, name }` objects and others as display-name strings; indexing raw strings creates unreachable keys such as `"Minji"` while publication records use `"minji"`.
   - Validate more than two convenient object-form anchors. Assert coverage/counts by input representation, include at least one string-form member, and verify each selected control key is canonical and reachable.
   - Detect canonical collisions before combining sources. Display names shared by different people can collapse to one slug; ambiguous fallback relationships must be dropped unless a higher-authority source resolves that exact canonical identity with stable reviewed IDs/slugs.
   - Make source precedence explicit per canonical individual. When an authoritative passport/release source contains an individual, its relationship declaration must shadow the broad catalog even when the authoritative parent set is empty. Do not populate the override map only when a `member_of` edge exists: that silently resurrects a fallback catalog parent for reviewed solo/parentless individuals. Seed an entry for every authoritative individual, then replace the fallback set with the authoritative set (including an empty set). Positive controls must cover (a) a non-empty authoritative relationship overriding an ambiguous fallback collision and (b) an authoritative empty relationship rejecting a fallback-only parent.
   - Distinguish fail-closed security from false-negative correctness: rejecting an unknown individual with an explicit group is required, but rejecting a known string-form individual with its legitimate parent is still a release blocker.
8. Include absent, empty, explicit-null, and equality identity controls where the schema supports fallback. A present authoritative `null` may intentionally select fallback behavior, but a non-empty contradictory value may not. Pair these with explicit controls for:
   - unknown individual plus a known supplied group → reject;
   - unknown individual with `primaryArtistSlug === idol === group` → reject rather than treating equality as proof of a relationship;
   - reviewed individual with `group === primaryArtistSlug` → reject self-parentage unless the schema explicitly models it;
   - reviewed solo individual with no group → accept;
   - reviewed individuals from every catalog representation plus their proven parent → accept.
   A condition shaped like `primaryArtistSlug !== group && !parents.has(group)` is vulnerable: equality skips the membership check, admitting both reviewed self-parent and unknown self-parent records. Decide whether the record is explicitly individual-owned first; for an individual, every non-empty group claim must be present in its authoritative parent set. Reserve the `primaryArtistSlug === group` group-owned path for records that do not assert individual identity.
9. Use current-valid verification and schedule/publication timestamps so freshness or expiry cannot create a false rejection. Prefer official upcoming-schedule fixtures when media-title relevance rules vary across the cohort; paired same-group controls are still mandatory. When tests cover only an authoritative parent and one unrelated parent, run direct read-only probes for self-parent and unknown-self-parent equality; these are distinct branches, not redundant variants.
10. Report the first reproducible accepted substitution as the concrete blocker. A selector rejection does not cure a final-publication acceptance because direct database, CMS, API, or renderer callers may invoke the exported gate. For a caller requesting a fast blocker-only immutable review, begin with exactly `APPROVED` or `REQUEST_CHANGES`, omit non-blocking commentary, and include the smallest deterministic reproduction plus file/line reference.

## Common defect

A check such as `EDITORIAL_ALIASES.includes(primaryArtistSlug)` before enforcing group agreement closes only the acquisition taxonomy. If the authoritative cohort contains additional groups, those groups remain able to carry an unrelated `group` value through the final publication gate. Derive group classification from the authoritative reviewed catalog or a digest-bound projection of it, validate the expected cohort cardinality/shape at initialization, and fail closed if that catalog is unavailable or malformed.

Do not implement a generic `idol === primaryArtistSlug` exemption before deciding whether the primary slug is a group. For group selectors, there is no individual exemption: explicit `group`, when present, must agree with the selected group identity. For individual selectors, preserve the legitimate `primaryArtistSlug === idol` plus parent-group relationship as a separate branch and positive control.
