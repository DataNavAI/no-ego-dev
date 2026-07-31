# Trustworthy current-content ingestion and publication gates

Use this reference for news/event/schedule feeds where stale, unsourced, synthetic, or moderation-only records must never reach public surfaces.

## Source and storage policy

1. Prefer a public metadata feed (for example RSS) when no API key is available and the product only needs discovery metadata.
2. Query both a generic topic and a curated entity list. Quote entity names where ambiguity is likely.
3. Parse only feed-owned metadata: title, inferred entity, outlet, source link, published timestamp, verification timestamp, source/type status, and a factual summary that tells users to open the source.
4. Never ingest article descriptions or bodies merely because the feed embeds them.
5. Keep parsing, relevance, entity inference, deduplication, and publishability as exported pure functions with injected `now` values.

## Relevance and deduplication

- Targeted query results must mention the targeted entity; a matching query string alone is not evidence of relevance.
- Generic results must infer a supported entity before entering a generator that expects entity routes. Reject entityless records rather than allowing downstream `undefined.slug` failures.
- Maintain explicit noise exclusions for recurring non-domain collisions while retaining a positive domain/entity requirement.
- Deduplicate on both normalized title and canonicalized source link (remove query/hash noise). Apply deduplication before caps and minimum-count checks.
- Treat outlet names as stored visible metadata: enforce the same language policy on titles and outlets when the product promises an English feed.

## Fail-closed publication gate

A record is public only when every required condition passes:

- HTTPS source URL; reject placeholder, submission, search, and generic fallback destinations.
- Explicit published + verified state, with only narrowly defined trusted exceptions (for example `source-backed` + `media-coverage`). Unknown status defaults to moderation, never publication.
- Valid verification timestamp.
- News/media records have a real publication timestamp and remain inside the freshness window (commonly 72 hours).
- Schedules have a real ISO `startAt`; voting/fan events and collection types that need a close time also require valid `endAt`; reject malformed, contradictory, and expired windows.
- The final gate independently rechecks the reviewed publisher allowlist and curated-entity/title relevance for source-backed media. Parser-only enforcement is bypassable by hand-built, migrated, or previously stored records.
- Reject publication timestamps materially in the future; a future timestamp is not fresh evidence.

Apply the gate while normalizing canonical records. Preserve failed records in moderation inventory with `needs_review`/`unverified`; do not silently delete them and do not let generators consume raw unfiltered arrays for public pages. Apply the same gated collection to detail-page generation, sitemap entries, feeds, public JSON, API responses, and counters—changing metadata to `needs_review` is insufficient if a serializer still emits the record.

## Exact entity current-item selection

When an individual or group profile/detail route needs current items, compose selection with the canonical publication gate instead of duplicating freshness, verification, and source rules.

- For individuals, match only explicit direct identity fields defined by the content contract, such as `primaryArtistSlug === entity.slug` or `idol === entity.slug`.
- For groups, treat an own explicit `primaryArtistSlug` as authoritative—not as one side of a permissive OR. If it is present and non-null, first require the same bounded canonical slug contract used for entity routes, then match only when it equals `entity.slug`; a valid nonmatching primary must not fall through to `group`, even when `idol` is missing or `null`. Empty, noncanonical, oversized, or wrong-typed explicit primaries fail closed rather than becoming “missing.” Only an absent or explicit `null` primary may use the fallback `group === entity.slug && no different idol is declared`. A matching canonical primary remains eligible even when secondary `group`/`idol` routing fields contradict it, provided descriptor-safety checks pass.
- Do not infer direct ownership from relationship/discovery arrays such as `artistSlugs`, group membership, tags, mentions, or related-entity metadata. Those fields may support discovery cards, but they are insufficient for an individual or group current-item feed.
- Read routing fields only through own data descriptors. If a routing field that could affect a fallback is accessor-backed, malformed, or inherited, omit the record without invoking it rather than laundering the field into “missing.” Keep the established individual branch behavior unchanged when adding group support.
- Null-prototype records are supported plain records, so inherited-field detection must not call `Object.getOwnPropertyDescriptor(Object.getPrototypeOf(record), field)` unconditionally: `Object.getPrototypeOf(record)` can be `null`, which makes the descriptor call throw. Capture the prototype once and inspect it only when non-null. Add a focused RED using a fully publishable `Object.create(null)` group-owned record plus null-prototype wrong-group and member-specific siblings; require both direct selection and page-model construction not to throw, preserve selected-record identity at the selector boundary, and omit the siblings.
- Run the identity predicate before the publication gate when practical so unrelated malformed records cannot reach a gate that assumes record shape.
- Fail closed for malformed entity, options, inventory, and record values: supported plain objects, own canonical identity fields, safe own inventory entries, and an injected clock where reproducibility matters. Custom-prototype or inherited values should return an empty selection rather than throw or publish.
- Build a new result collection without mutating the authoritative inventory and retain selected object identity.
- Never treat input order as deterministic product ordering. Sort a copied eligible set by the contract: upcoming schedules by start time ascending; official/social/release updates by publication time descending; then checked time descending and a stable canonical-ID fallback.

### Isolating a legacy publication gate from hostile JavaScript records

A canonical gate may be correct for trusted JSON yet unsafe when called with live JavaScript objects: ordinary property reads and optional chaining can consume inherited values or invoke accessors. Do not rewrite the shared gate just for one selector. At the selector boundary, inspect the gate implementation and build a bounded null-prototype projection containing only the exact fields that gate reads.

- Copy a top-level field only when `Object.getOwnPropertyDescriptor(record, field)` is a data descriptor. Never spread, destructure, `Object.assign`, or read `record[field]`; each can invoke getters or consume inherited state.
- Project nested alternatives independently. For a source action, accept only a supported plain/null-prototype object and copy only its own data `url`. For a source list, require a standard array, consume only an own data index `0`, require a supported nested source record, and copy only its own data `url`, `verifiedAt`, and `label` into a fresh null-prototype record. Do not pass the caller's nested object through to the gate.
- Omit sparse, accessor-backed, inherited, or custom-prototype nested values. A projected ordinary array is safe only when the required index is populated as an own data entry; never create a sparse projected array that could fall through to `Array.prototype[0]`.
- Keep entity matching, sorting, and return values on the original records. Pass only the projection to the publication gate, then append the original object when it passes. This preserves caller identity and immutability while isolating gate reads.
- At the selector boundary, require every non-schedule update to own a semantically valid full UTC ISO publication instant before gate evaluation and sorting. A comparator that maps malformed times to `-Infinity` is not rejection: it merely sorts bad records last. Validate calendar reality by parsing a normalized instant and round-tripping with `toISOString`; reject missing, date-only, offset-form, impossible-date, and unparseable values. Keep schedule eligibility governed by its existing `startAt`/`endAt` gate rules.

Use a dedicated hostile RED with realistic allowed values temporarily installed on `Object.prototype`, records missing each own publication field, own accessors for top-level publication fields, accessor-backed nested URLs/timestamps, an accessor at source-array index `0`, a sparse source array, and custom-prototype nested records. Assert the result is empty and a getter-call counter remains zero, restoring every prototype descriptor in `finally`. Add a positive nested-source case to prove safe own-data projection still publishes and returns the exact original object.

Drive this with narrow vertical TDD slices. Use a fixed `now` and canonical content shapes accepted by the real gate. For an individual selector, a high-value identity fixture set contains one exact individual item, one group-only item, one different member under the same group, one expired exact item, and one unverified exact item. For a group selector, use one exact group-owned item, one member-specific item under that group, one other-group item, one expired group item, and one `artistSlugs`-only item; assert exactly the group-owned record is selected with stable order and original object identity. For explicit-primary precedence, add one focused matrix that proves both the selector and the page-model builder: valid nonmatching primaries cannot leak through a matching group with missing/null idol; a matching primary survives contradictory secondary fields; absent/null primaries retain valid group fallback; and empty, noncanonical, oversized, or wrong-typed explicit primaries are omitted. Run that exact named test to capture the intended RED before editing production code, rerun it GREEN, then run the whole feature file, ingestion suite, reference/model suite, and bare canonical test command. If generation dirties the known-clean generated tree, restore only that tree and rerun the exact regression after restoration so final evidence matches the intended source diff. Add separate compact hostile coverage for own/inherited/accessor routing descriptors, with getter counters and descriptor-safe `finally` cleanup. Also cover source-less and malformed entries. If a relationship-array regression passes immediately after the minimal direct-field implementation, record it honestly as green regression coverage rather than inventing a second RED.

For deterministic ordering and malformed call boundaries, preserve this sequence:

1. **Ordering RED first:** supply two valid exact future schedules in late-then-early input order and require early-then-late output. Keep malformed records out of this RED so gate rejection cannot masquerade as comparator evidence.
2. **Ordering GREEN:** sort only a newly selected array. Put schedules first by `startAt` ascending, non-schedule updates by `publishedAt` descending, then checked time (`lastVerifiedAt` or the first canonical source's `verifiedAt`) descending, with a stable canonical ID/slug fallback. Assert repeated calls, source-array order, record identity, and object contents remain unchanged.
3. **Boundary RED second:** malformed options, entity wrappers, inventory wrappers, and records must return `[]` without throwing. Undefined options remain the supported default; otherwise accept only a supported plain options object and consume only an own data `now` property.
4. **Boundary GREEN:** require a supported plain entity with own `entityType` (`individual` or `group`) and an own bounded canonical slug. Preserve the established individual direct-identity predicate exactly. For groups, descriptor-check all routing fields first. Branch on primary presence: an own non-null `primaryArtistSlug` must itself be canonical and is the sole ownership decision; only absent/null primary may use exact own-data `group` plus no declared different `idol`. Never let invalid or nonmatching explicit primary values reach group fallback, and never consult relationship arrays. Require a standard inventory array, enumerate only own numeric data entries (skip holes, inherited indices, and accessors), accept only supported plain records, and call the real publication gate behind a fail-closed record boundary rather than replacing or duplicating gate policy.
5. Use descriptor-safe `try/finally` cleanup for temporary `Object.prototype`/`Array.prototype` pollution tests. Include null/array/custom-prototype options, array/custom-prototype/missing-type entities, non-array/custom-prototype inventories, Date/custom-prototype records, inherited `now`, inherited numeric entries, accessor entries, and inherited identity fields.

Run the focused selector test, whole feature file, ingestion policy suite, related model/passport suites, and the repository's bare canonical test command. If canonical generation dirties a previously clean generated tree, restore only that known generated tree and verify the final diff remains limited to intended model and test paths.

## Atomic refresh pattern

1. Read the existing database without mutating it.
2. Fetch feeds concurrently with bounded timeouts; collect per-query failures.
3. Parse, filter, deduplicate, freshness-check, sort, and cap entirely in memory.
4. Require a healthy minimum (for example 10 unique current records).
5. If the minimum is not met, throw before any write so the last known-good database stays intact.
6. On success, replace only the current-content collection, preserve moderation collections, stamp refresh telemetry, then perform one atomic file/database write.

### Database seed reconciliation

An upsert-only seed is not a replacement: formerly published records absent from the new canonical set remain public. Export and test a pure reconciliation planner that compares desired current IDs with existing published/verified IDs. For every superseded record, demote publication and verification state while preserving moderation/audit history, update timestamps/status indexes, and remove obsolete public secondary-index projections. Reconciliation must be idempotent and safe for empty desired, empty existing, and already-demoted sets. Do not resume production seeding until this path is green.

## TDD and verification

Use fixtures to prove:

- XML/entity decoding and no article-description copying.
- Targeted relevance and recurring noise rejection.
- Non-English title/outlet and entityless-result rejection.
- Normalized title/link deduplication.
- Placeholder source rejection and 72-hour expiry boundaries.
- Future schedule acceptance, required end-time rejection, and expired schedule rejection.
- Source-backed media coverage publication.
- Minimum-count failure leaves existing inventory unchanged.
- Content taxonomy remains coherent: social-account reports may expose a social-update canonical type while retaining media-coverage source provenance and freshness policy.

Then run the real refresh and verify concrete counts, field allowlists, timestamps, source URLs, and moderation/publication totals. Finally run the full generator/test suite: generated consumers often encode hidden assumptions such as every item having an entity or every canonical type having at least one representative record. Repair truthful model/consumer integration; do not reintroduce synthetic content just to satisfy an obsolete assertion.

## Shared-worktree discipline

Generation can rewrite thousands of files. Baseline dirty state, stage only explicitly owned model/refresh/data/test paths, and never broadly restore or clean generated output that may belong to concurrent agents. Report unrelated suite blockers precisely, but keep iterating when an owned-path semantic fix can make the full suite truthful and green.
