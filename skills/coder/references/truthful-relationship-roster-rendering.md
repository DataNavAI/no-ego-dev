# Truthful Relationship Roster Modeling and Rendering

Use this pattern when an entity page derives visible current/former membership from reviewed relationship records.

## Contract

1. Define one exact, closed relationship shape using `Reflect.ownKeys`; reject symbols, non-enumerable extras, accessors, custom prototypes, sparse arrays, and unknown own keys.
2. Require direct evidence fields rather than inference:
   - relationship kind is exactly the supported kind (for example, `has_member`);
   - related identity has a canonical QID and slug;
   - `checkedAt` is a valid canonical instant;
   - at least one bounded, exact source receipt has a safe HTTPS URL and an allowed source type;
   - `current` is accepted only when status is explicitly `current` and `endAt` is null;
   - `former` is accepted only when status is explicitly `former` and `endAt` is either a valid exact instant or null when reviewed source processing proved former status from an imprecise end qualifier that cannot truthfully become an instant;
   - a malformed non-null `endAt` is rejected, and accessor-backed values are rejected without invocation;
   - `unknown` is omitted rather than relabeled.
3. Bound both the relationship inventory and source arrays. A malformed top-level inventory should fail closed; malformed entries should be omitted without invoking getters.
4. Keep current and former members in separate arrays. Preserve reviewed input order unless the specification requires another deterministic order.
5. Apply chronology as an as-of-evidence rule after exact-shape validation and before identity reconciliation:
   - any non-null `startAt` must be no later than `checkedAt`;
   - any exact non-null `endAt` must be no later than `checkedAt`;
   - when both are exact, `startAt` must be no later than `endAt`;
   - a former relationship with `endAt: null` remains valid when its optional exact `startAt` is no later than `checkedAt`.
   Omit an impossible row individually; do not discard valid siblings.
6. Reconcile counterpart identity only after exact evidence and chronology filtering. Enforce one-to-one `relatedQid` ↔ `relatedSlug` correspondence across publishable candidates: if either identifier occurs more than once, omit every candidate involving that repeated identifier, including exact same-status duplicates and current/former conflicts. Preserve unrelated siblings and source order. This guarantees no identity can appear in both buckets.

## Critical Boundary Order

Select and prove relationships from the original input **before** any permissive or lossy clone. Optional cloning utilities often skip accessors or symbol keys; selecting after such a clone can launder an invalid record into an apparently exact record.

When the page-model contract requires the roster to correspond to the model's isolated entity, use a two-stage boundary rather than selecting from a permissive whole-entity clone:

1. read the original outer inventory with the exact array reader;
2. exact-validate each original record (including sources and chronology) without invoking accessors;
3. descriptor-safely clone only accepted candidates into the isolated entity's relationship inventory, retaining duplicates so identity reconciliation can still detect them;
4. derive the final reconciled roster from that isolated inventory;
5. deeply freeze the isolated entity as well as the roster, while leaving caller input mutable.

After selection:

1. descriptor-safely clone only accepted records;
2. deeply freeze the roster graph and isolated entity evidence graph, but never caller input;
3. store private provenance for the model identity, isolated entity reference, relationship-array reference, selected evidence references, roster object, member arrays, member references, and order;
4. include the roster in the page model's exact own-key contract;
5. reject entity replacement, relationship removal/change/reorder, shallow copies, structured clones, replaced arrays, reordered references, added symbol keys, and nested mutation.

A validator does not need to re-read a lossy public entity clone to re-prove the roster. Validate the frozen selected records and private provenance captured at construction time. This preserves the exact original boundary decision.

## Reviewed counterpart display names

Visible counterpart names are evidence, not presentation derived from routing identifiers.

1. Add the reviewed display name and its receipt to every publishable relationship row. A minimal exact receipt contains a fixed review source type, the exact target-QID URL, and language.
2. Validate the display name as an own enumerable data property: trimmed, nonempty, bounded, and control-free.
3. Validate the receipt as an exact closed own-data record. Its URL must equal the counterpart QID—not merely be a safe Wikidata URL—and accessors, symbols, non-enumerable fields, or extra keys must omit the relationship without invocation.
4. Preserve capitalization, punctuation, acronyms, and diacritics byte-for-byte from the reviewed value.
5. Do not add display-name fields to `unknown` relationships merely to make them renderable; unknown rows remain unpublished.
6. If the approved production migration is intentionally limited to `current`/`former` rows, assert the exact migrated and untouched counts in a production-data test.

## Minimal Renderer

The renderer receives only the proven page model. It must not infer current/former status from dates or general entity metadata.

- Render separate semantic sections for current and former evidence, using copy scoped to reviewed records rather than exhaustive roster claims.
- Link canonical slugs to canonical detail routes, but render visible relationship text only from the validated reviewed display name.
- Never humanize, title-case, or otherwise derive a visible counterpart name from a slug, route, broad catalog, URL component, or unrelated entity lookup. A missing or invalid reviewed name omits the row.
- Escape both link labels and attribute values.
- Use exact visible status labels required by the product contract.
- Render only the specified reviewed-empty copy when an empty section is part of the product contract; otherwise omit empty sections. Emit no roster for entity types that do not support one.

## Exact Evidence-Array Reader

Do not treat `Array.isArray`, a length comparison, or a helper that merely collects own numeric values as an exact evidence boundary. A reusable roster-local reader should return either an ordered value list or a failure sentinel and enforce all of the following before any evidence is selected:

- the value is an array with exactly `Array.prototype`;
- its bounded `length` is checked before iteration;
- `Reflect.ownKeys(array)` contains exactly `length` plus canonical indices `0..length-1`;
- every index is an own, enumerable data property;
- holes, custom prototypes, extra string keys, symbols, accessor extra keys, accessor numeric indices, and non-enumerable indices are rejected without invoking getters.

Use the same reader for both the outer relationship inventory and each nested source array. The failure scope differs:

- malformed outer inventory → publish an empty roster;
- malformed nested source array or source record → omit only that relationship and retain valid siblings in order.

Source receipts still require an exact closed record validator covering custom prototypes, extra string/symbol/accessor keys, missing required fields, and non-enumerable/accessor-backed required fields.

## TDD Tracer Bullets

1. RED: a valid current record, valid former record, and unknown record; assert exact grouped arrays and separate semantic sections.
2. GREEN: implement the smallest selector, page-model field, provenance, and renderer.
3. RED: add a symbol-key relationship or accessor-backed status. Verify direct selection omits it and page-model construction cannot launder it through cloning.
4. GREEN: move selection before cloning and seal provenance.
5. RED: table-drive the full malformed-array matrix against both outer relationships and nested sources: sparse, custom prototype, extra string key, symbol, accessor extra key, accessor numeric index, and non-enumerable numeric index. Count getter calls and require zero.
6. GREEN: introduce one exact bounded descriptor-safe array reader and use it at both boundaries. Assert malformed outer arrays empty the roster while malformed nested evidence omits only the affected relationship and preserves valid siblings.
7. Add a source-record matrix for custom prototype, extra string/symbol/accessor key, missing required field, and non-enumerable/accessor required field.
8. Add a complete post-build tamper matrix: direct nested member mutation, reorder, member-reference replacement, current/former array replacement, and cross-bucket move attempts must throw and leave the model valid and unchanged; structured clones and reconstructed or altered rosters must fail both validation and rendering.
9. Add focused assertions for source-less records, exact-date and imprecise-qualifier former records, malformed non-null and accessor-backed `endAt`, frozen nested receipts, reconstructed models, exact model keys, individual-page non-rendering, escaped labels, and canonical hrefs.
10. RED→GREEN identity reconciliation with: an exact same-status duplicate, repeated QID with a different slug/status, repeated slug with a different QID/status, and one unrelated valid sibling. Assert every conflicted row is absent and the sibling retains source order.
11. RED→GREEN chronology with individually impossible rows (`startAt > endAt`, `startAt > checkedAt`, `endAt > checkedAt`) interleaved with valid exact and imprecise former siblings.
12. RED→GREEN entity/roster correspondence: replace the model entity with relationship evidence removed, changed, and reordered; require validation and rendering rejection. Also prove nested isolated-evidence mutation throws while caller input remains unfrozen and mutable.
13. RED→GREEN reviewed-name rendering with acronym, punctuation, and diacritic examples; assert canonical hrefs, exact byte-preserved visible labels, matching accessible labels, and total absence of slug-humanized fallback text.
14. Run and preserve evidence in this order: exact RED, exact GREEN, whole feature file, related reference-fixture file, canonical full suite, restore only the known-clean generated output tree, rerun the exact test slice, and confirm final scope/worktree state.

## Pitfalls

- Treating missing end qualifiers as `current`.
- Counting duplicate identities before malformed or chronologically impossible rows are removed, allowing rejected evidence to poison a valid sibling.
- Deduplicating by keeping the first/last row instead of omitting every row involving a repeated QID or slug.
- Checking conflicts only across current/former buckets and missing same-status duplicates.
- Comparing `startAt` and `endAt` while forgetting both must also be no later than the relationship's own `checkedAt`.
- Dropping a reviewed `former` relationship solely because its year/month-precision end qualifier was preserved as `endAt: null`.
- Broadening timestamp parsing to accept imprecise strings instead of preserving them as null at the materialization boundary.
- Rendering `unknown` members in either list.
- Validating with `Object.keys`, which misses symbols and non-enumerable keys.
- Selecting after a clone that silently removes hostile descriptors.
- Reconstructing roster truth in the renderer.
- Freezing arrays but leaving nested source receipts mutable.
- Claiming full-suite success while generated artifacts remain as unrelated worktree changes.
