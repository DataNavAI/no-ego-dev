# Fail-closed foundation boundary hardening

Use this recipe when a generator or registry/model foundation accepts filesystem targets, JSON fixtures, URLs, or local asset paths. It complements canonical schema migration work by hardening the boundaries around the schema.

## Strict TDD sequence

Work in vertical slices and retain the focused RED/GREEN output for each:

1. Unsafe output target rejection.
2. Complete in-memory preflight before destructive output mutation.
3. Plain-object and own-property enforcement.
4. Descriptor-safe, structurally isolated JSON-like projection.
5. HTTPS URL hardening.
6. Canonical local asset-path hardening.
7. Frozen JSON source/root/row validation and duplicate detection.

Use only disposable `mkdtemp` paths in destructive-path RED tests. Never point a pre-fix generator at the repository, HOME, filesystem root, or a valuable directory just to prove rejection is missing.

## Destructive generator output directories

Resolve the production default from `import.meta.url`, not the caller's current directory, so it always names the repository's exact generated-output directory.

Before any `rmSync(..., { recursive: true })`, an override should satisfy all of these:

- It is absolute and already lexically resolved (`resolve(value) === value`).
- Its basename is exactly the expected disposable basename, such as `generated-output`.
- Its parent already exists.
- `realpathSync(parent)` is strictly beneath `realpathSync(os.tmpdir())`; the temp root itself is not allowed.
- Parent containment is checked with `path.relative`, rejecting `''`, `..`, `../...`, and absolute results. This prevents prefix-confusion and symlink-parent escapes.

After implementation, run non-destructive probes confirming rejection of relative paths, the repository/current directory, HOME, the temp root, arbitrary basenames, and a correctly named target whose parent is outside temp. Keep the existing safe isolated-output success test.

For durable destructive-boundary regression tests, never pass HOME, the repository root, or filesystem root to the pre-fix generator. Instead, create a disposable parent under the worktree (therefore outside `os.tmpdir()`), create its expected output child with a sentinel file inside it, invoke the generator with that child, and assert a nonzero exit, the stable unsafe-target error, and sentinel survival. Sentinel placement inside the candidate deletion target proves rejection occurred before recursive deletion. Clean the disposable parent in `finally`.

Also cover realpath escapes safely: create a parent under system temp, symlink that parent to a disposable worktree-local directory containing the expected output child and sentinel, then pass `<temp>/<symlink>/<expected-basename>`. Require the same rejection and sentinel-survival assertions. Skip only when symlink creation itself fails with an explicit platform permission error such as `EPERM` or `EACCES`; do not turn assertion failures or unexpected filesystem errors into skips.

## Plain records and inherited-property attacks

For general JSON-like record-shaped input, support only:

- `Object.getPrototypeOf(value) === Object.prototype`, or
- `Object.getPrototypeOf(value) === null`.

Reject arrays, class instances, dates, maps, and objects with custom prototypes. Check required fields with `Object.prototype.hasOwnProperty.call(value, key)` rather than property access alone. Apply the chosen boundary contract consistently to registry roots, entities, claims, nested source records, and image records.

Do **not** universalize null-prototype acceptance. A security-sensitive canonical identity registry may intentionally require actual `JSON.parse` provenance: `Object.prototype` for its outer registry and each entity record, plus `Array.prototype` for the entity list. Enforce that stricter provenance before recursive cloning, because a structural clone into `{}` can normalize a hostile null prototype and make later validators accept it. Keep null-prototype support at unrelated content/publication boundaries unless their own contract explicitly requires canonical JSON-object provenance.

Useful adversarial fixtures:

- `Object.create(requiredIdentityFields)` to prove inherited required fields do not satisfy the contract.
- `Object.assign(Object.create({ custom: true }), validRecord)` to prove own canonical fields on a custom prototype are still rejected.
- Missing, array, scalar, custom-prototype, and inherited variants of nested identity containers such as `names`; validate the container before reading `display`, require `display` to be own, and preserve the existing stable domain error.

### Renderer options bags

Treat renderer/configuration options as an input boundary, not as harmless JavaScript convenience. Avoid destructuring directly in the public function signature when unsupported values must fail closed: destructuring can throw on `null`, and ordinary property lookup consumes inherited values.

Normalize the whole options value first:

1. Accept only supported plain objects (`Object.prototype` or `null` prototype); arrays, scalars, and custom-prototype objects use defaults.
2. Read each supported option only when `Object.hasOwn(options, key)` is true.
3. Preserve the option's existing downstream normalization after extraction—for example, a malformed own inventory can still normalize to empty, while an own nonempty inventory retains its established pending/unimplemented behavior.
4. Apply the same own-property extraction separately to security-sensitive origins/base URLs and content inventories; do not let one safe extraction obscure another inherited-property bug.

Use two vertical RED→GREEN slices rather than implementing both options after the first failure:

- Temporarily pollute `Object.prototype.currentItems` and also pass a custom-prototype options object; assert the public empty state still renders.
- Separately pollute `Object.prototype.baseUrl` and pass a custom-prototype options object; assert both the canonical link and structured-data URL retain the production origin.

Also prove that even **own** option fields on a custom-prototype object are ignored, while own fields on a supported plain/null-prototype object retain existing behavior. Cover `undefined`/omitted, `null`, scalar, and array option values. Save and restore exact global property descriptors in `finally` as described below.

Do not accidentally erase the second RED by generalizing the first GREEN too early. If both options share extraction machinery, make the first minimal GREEN handle only the first tested option, obtain the second genuine failure, then consolidate after both are green.

### Polluted global prototypes and provenance publication

A plain-object check is necessary but not sufficient: an ordinary `{}` still inherits from `Object.prototype`. For allowlisted publication records, require every security-relevant provenance field to be own **before** validating its value. Examples include `kind`, `sourceProperty`, `checkedAt`, and `url` for official links, and `type` plus `url` for biography sources. Use `Object.hasOwn(record, key)` or `Object.prototype.hasOwnProperty.call(record, key)`; never call a potentially poisoned instance method.

Add a dedicated RED→GREEN regression test that temporarily defines realistic allowed provenance values on `Object.prototype`, then supplies ordinary nested records missing one own field at a time. Replace valid source inventories rather than appending to them so the assertion is isolated. Prove both outcomes through public output: inherited URLs are absent from structured data/HTML, and content whose only source provenance is inherited is not published.

Prototype-pollution tests must not leak state:

1. Save each prior property descriptor with `Object.getOwnPropertyDescriptor`.
2. Install configurable test properties inside `try`.
3. Render and assert while pollution is active.
4. In `finally`, delete properties that were previously absent and restore every pre-existing descriptor exactly.

Keep the first failing output: a useful RED should expose the inherited URLs/content, not fail from test setup. Then run the isolated GREEN test, the complete feature file, related boundary suites, and the canonical package test. If the canonical command regenerates tracked output, confirm the generated tree was clean beforehand and restore only that known tree afterward.

### Exact publication shapes and optional containers

When renderer output publishes identity or provenance, distinguish three contracts explicitly:

- **Required core fields:** require each field to be own before applying its existing validator, and preserve the field's stable error code when it is missing or inherited.
- **Optional containers:** consume them only when the parent owns the container. An inherited array/object must behave exactly like absence, even when its inherited value is otherwise valid.
- **Publication records:** when the schema is closed, require a plain object with exactly the allowlisted own keys. A reusable predicate should compare `Reflect.ownKeys(value).length` with the allowlist length and require every allowlisted key via `Object.hasOwn`; this also rejects symbol-key extras rather than checking only enumerable string keys.

Apply closed shapes at every publication layer, not just leaves: for example, an exact biography container plus exact source records, and an own official-links array plus exact link records. Reject unknown extras rather than silently accepting schema drift. For optional name fields, check ownership on the validated names container before reading them; continue filtering arrays to bounded, nonempty strings according to the existing contract.

Keep strict TDD vertical: prove inherited required core fields fail first; then inherited optional fields stay absent; then inherited/missing/extra biography provenance cannot publish; then inherited containers and extra-key official links cannot enter structured output. If a bounded optional-value rule needs implementation too, obtain a genuine focused RED before making the minimal GREEN change.

### Array prototype and sparse-index boundaries

`Array.isArray(value)` alone is not a sufficient publication boundary. Two hostile shapes remain:

- A sparse array can consume numeric properties inherited from `Object.prototype` through iteration or `filter`, publishing an inherited alias, biography source, or official link.
- An actual array whose prototype was replaced with a custom object still passes `Array.isArray`, but inherited methods/iterators can be absent or hostile; ordinary `.filter(...)` and `for...of` may throw instead of failing closed.

Use one shared bounded extractor for optional publication arrays:

1. Require `Array.isArray(value)`.
2. Require `Object.getPrototypeOf(value) === Array.prototype`; support a null prototype only when the contract intentionally says so.
3. Cap the inspected length to a sensible constant to bound work on attacker-sized arrays.
4. Walk numeric indexes explicitly and append an entry only when `Object.hasOwn(value, index)` is true.
5. Feed the returned ordinary array into the existing value/record validators. Do not mutate the caller's array.

Apply the extractor consistently to alternate names, biography sources, official links, and similar optional arrays. Preserve normal-array output and existing input-immutability guarantees.

### Non-writable inherited numeric properties and local accumulators

Prototype pollution can also break otherwise ordinary **fresh output arrays**. If `Object.prototype[0]` is a non-writable data property, strict-mode `array.push(firstValue)` throws `TypeError: Cannot assign to read only property '0'` because assignment cannot shadow that inherited property. This affects both intermediate extractors and final selector/result accumulators; hardening only the first visible `push` can turn the throw into a silently empty result when a surrounding fail-closed `catch` masks the second failure.

For security-boundary accumulators that must tolerate this shape, append with an own-property definition rather than assignment:

```js
function appendOwnData(array, value) {
  Object.defineProperty(array, array.length, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
```

Use the helper narrowly for every local accumulator on the tested selection path, preserving normal array length, ordering, sorting, identity, and caller immutability. Do not broadly replace unrelated `push` calls without a failing behavioral test.

Drive the fix with one focused regression:

1. Build a genuinely publishable record that passes the complete downstream gate; include subtype-dependent required fields such as an end time for fan events.
2. Save the exact prior `Object.prototype['0']` descriptor.
3. Install a configurable, non-writable numeric data property inside `try`.
4. Run the public selector and capture any exception while pollution is active. Avoid complex assertions during pollution because assertion/test-runner internals may allocate arrays too.
5. Restore or delete the descriptor exactly in `finally`.
6. After cleanup, assert no exception, the expected result, strict identity with the original selected object, stable ordering, and no input mutation.

The required RED is the inherited-property `TypeError` from the first accumulator. After GREEN, run all selector-ordering tests to prove the explicit own-property append did not alter semantics. If GREEN no longer throws but returns an empty result, first verify the fixture is valid through the full publication gate, then inspect later accumulators for remaining assignment-based appends.

For sparse-array RED evidence, temporarily install a configurable writable `Object.prototype[0]`, use length-one sparse arrays, and render three times with a valid hostile alias, source, and link. Aggregate the public observations so one failure shows inherited `alternateName`, about markup, and `sameAs` together; restore the exact prior descriptor in `finally`. Separately exercise custom-prototype arrays at each consumer and confirm the baseline failures (`filter is not a function` or `is not iterable`) before introducing the shared extractor. Because one shared helper fixes both classes, collect all sparse/custom-prototype REDs before that shared GREEN rather than implementing the generalized helper after the first test and accidentally making later tests pass on first run.

When a required action label contains a substring previously forbidden by a broad negative regex (for example, `feedback` contains `feed`), narrow the negative assertion to the actual unwanted semantic hooks such as `data-feed` or `data-card`. Do not weaken or rename the specified action copy merely to satisfy a substring test.

## HTTPS URL predicate

A fail-closed URL helper should reject before parsing when the input is not a string, is empty, exceeds the chosen bound (commonly 2048 characters), or contains raw C0/C1 controls or whitespace. After `new URL(value)`, require:

- protocol exactly `https:`;
- non-empty hostname;
- empty username and password.

Exercise valid HTTPS plus HTTP, credentialed URLs, raw tab/newline inputs, syntactically plausible missing-host forms (for example `https://?x` and `https://`), leading/trailing whitespace around an otherwise valid URL, malformed values, and oversized values. URL parsers may silently trim surrounding whitespace, so test rejection through the public claim/image/source predicates rather than only a private helper. Reuse the helper for every source/image URL boundary.

## Canonical local asset paths

For generated asset references, require a bounded canonical path under the exact public prefix, such as `/generated/`. A robust predicate combines:

- a maximum length;
- a constrained ASCII asset-character allowlist;
- `path.posix.normalize(value) === value`;
- explicit rejection of `.` and `..` path segments.

The allowlist should naturally exclude spaces, controls, `%`, `?`, `#`, backslashes, HTML-significant characters, and Unicode normalization ambiguity. Test dot segments, repeated slashes, raw/encoded traversal, query/fragment suffixes, controls, spaces, HTML characters, and oversized paths.

## Frozen JSON inputs

Do not access `.rows`, identity fields, or URLs until validation has completed.

1. Parse each source and convert malformed JSON/root shape failures into a stable domain error.
2. Require the root to be a supported plain object with its own array-valued `rows` property.
3. Validate every row's own required fields and primitive types, returning a stable row error with `{ index }`.
4. Detect duplicate cohort identities, duplicate audit identities, and duplicate immutable IDs before constructing a `Map`; otherwise map construction silently overwrites evidence.
5. Only then join sources and preserve existing stable unmatched-row errors.

Use temporary JSON fixtures for null roots, missing/non-array `rows`, null/malformed rows, duplicate identities, duplicate immutable IDs, and unmatched rows. Avoid mutating canonical source data.

## Full preflight before destructive output mutation

Validating a registry root is insufficient when later projection or compatibility code has stricter requirements. Before the first `rmSync`, `mkdirSync`, copy, or write:

1. Resolve and parse every source needed to build the in-memory output model.
2. Validate the registry against its immutable cohort.
3. Construct legacy catalog records and run the actual production projection/page-model boundary.
4. Only after all in-memory work succeeds, delete/recreate the output and begin filesystem writes.

Drive this with a disposable output directory containing a sentinel plus a malformed-but-root-valid registry whose nested field fails projection. The failing generator must leave the sentinel intact. If a fixture path is intentionally restricted to a repository fixture directory, create a uniquely named transient fixture only inside the test, remove it in `finally`, and verify final git status is clean.

## Descriptor-safe structural projection

A projection advertised as pure must not merely avoid mutating inputs during the call; its returned nested structures must be independent as well. Object spread invokes enumerable getters and shallowly aliases nested arrays/objects.

For untrusted JSON-like projection inputs, use a bounded recursive clone that:

- accepts only primitives/null, supported plain objects, and standard arrays;
- reads own property descriptors and accepts only data descriptors;
- rejects accessors, symbols, custom prototypes, sparse/nonstandard arrays, cycles, excessive depth, and excessive total nodes with stable domain errors;
- defines destination properties directly and uses safe own-data appends for arrays;
- validates a record is plain before reading any field;
- clones registry entities placed in output rather than retaining source references.

Distinguish optional publication arrays from required registry/catalog arrays. Optional arrays may safely skip malformed entries according to their contract; required projection collections must be **dense and bounded**. For each required array, require the standard array prototype, enforce a maximum above legitimate production size, require every index from `0` through `length - 1` to be an own data descriptor, and reject holes, accessors, custom numeric properties, symbol extras, or oversized lengths with that collection's stable domain error. Do not reuse a permissive sparse-array extractor for required registries.

Tests should prove getters are never invoked, malformed/null records produce stable model errors instead of raw `TypeError`, cycles/depth limits fail closed, required top-level accessor/sparse/oversized arrays reject, and mutating projected nested group/idol/passport data cannot mutate either input.

## Test-only data-path seams without production drift

When a server needs request-time fixture data for integration tests, keep the seam explicit and fail closed:

- activate only when `NODE_ENV === 'test'` **and** the override key is present;
- resolve it on every request rather than caching environment or file contents;
- require a lexically resolved absolute filename, real containment below the system temp root, regular-file status, and no symlink in the file or descendant ancestry;
- if an override was requested but is unsafe, missing, malformed, or unreadable, return the existing route failure and never fall back to tracked production data;
- restore environment values and remove all temp roots in `finally`.

Most importantly, any extra fixture schema validation must be conditional on the test override. The normal production read path must retain its prior parsing/fallback semantics; a test-support seam must not silently make unrelated production routes stricter. Add a focused regression that proves the validation branch is override-scoped, plus a behavioral malformed-override/no-fallback test.

## Exact optional evidence arrays

`Array.isArray()` plus `Array.prototype` is not enough at a publication boundary. An array can still contain holes, accessor indices, non-enumerable indices, symbol/string extras, or inherited/custom behavior that a permissive collector silently ignores.

For optional evidence collections such as relationship lists and nested source receipts:

- bound `length` before iteration;
- require the standard Array prototype;
- require own keys to be exactly `length` plus every numeric index from `0..length-1`;
- require each index to be an enumerable own data property;
- reject holes, accessors, non-enumerable entries, extra string/symbol keys, and custom prototypes without invoking getters;
- fail closed for the whole outer collection when its structure is malformed; for a structurally valid outer collection, omit only the malformed evidence record so unrelated valid siblings survive;
- validate nested source records as exact own-enumerable-data objects with an allowed source type and safe URL.

Test the full adversarial matrix at each nesting level: sparse, oversized, custom prototype, extra data key, symbol key, extra accessor, accessor index/required field, non-enumerable index/field, malformed source record, and getter-call count remaining zero. Also prove returned publication models resist direct mutation, reorder, member-reference replacement, bucket replacement, cross-bucket movement, cloning, and reconstruction.

## Sequential contract versus materialization ownership

In a gated implementation plan, distinguish a data contract from later physical materialization. If an early registry task explicitly owns unique future asset paths/contracts while a later task owns generating files and all-route existence tests, do not preempt the later RED/GREEN by generating assets early or weaken the registry by deleting required paths. Record physical materialization as a mandatory pre-deployment dependency, verify that the current task does not yet publish broken URLs, and evaluate quality against the task's explicit boundary.

## Catalog projection preflight

When a reviewed identity registry is projected into a broad legacy catalog:

- preflight every cloned legacy slug before merging; duplicate slugs within or across entity-type arrays must fail closed because broad-record retention and unique identity cannot both be preserved by silently dropping or renaming;
- require exact canonical paths from type plus slug (`/artists/<slug>` for groups, `/idols/<slug>` for individuals), not merely nonempty paths;
- reject opposite-type slug collisions before appending;
- update only canonical legacy identity metadata (type/name/immutable ID/path), retain nonidentity metadata, and never flatten sourced claims or biographies into unsourced legacy facts;
- keep caller inputs structurally isolated.

## Static canonical-route migrations

When a fixed cohort moves from duplicate full pages to one canonical plus static aliases:

- precompute and validate canonical/alias maps before deleting output; a complete cohort must enforce the exact expected alias count per entity, while explicit subset fixtures may retain narrower behavior;
- reject canonical↔alias and alias↔alias collisions before writes;
- emit aliases as minimal `noindex` pages with one absolute canonical, immediate same-origin meta refresh, and a visible link—never duplicate primary content;
- remove cohort aliases from the sitemap, include each canonical once, and retain non-cohort legacy entries deterministically;
- update broad site/static verifiers when their old expectations intentionally conflict with the new canonical contract, preferably in a separate bounded integration-test commit;
- after generation tests, restore tracked output and remove only baseline-clean generated untracked routes before claiming a clean worktree.

## Semantic metadata and generated share assets

For generated entity pages and OG assets:

- treat title, description, canonical URL, entity schema, breadcrumb schema, heading, slug marker, OG tags, and Twitter tags as one identity contract and verify them across the complete cohort;
- preserve an established primary JSON-LD object shape when consumers already depend on it; add breadcrumbs as a separate JSON-LD script rather than silently changing the primary object into an `@graph`;
- derive `sameAs` only from verified, canonical, safe official links—never biography sources or merely related URLs;
- make rights declarations describe the bytes actually generated: a deterministic title card is `non-likeness` even when a separately approved portrait exists;
- validate OG paths, MIME/extension agreement, dimensions, rights mode, collisions, and cohort completeness, and precompute every encoded buffer before destructive output mutation;
- when external raster dependencies are inappropriate, a bounded stdlib PNG encoder can generate deterministic branded cards; verify PNG signature, IHDR dimensions, valid chunks/decompression, entity-visible labeling, unique hashes, and byte-for-byte repeatability;
- test invalid OG declarations with a sentinel output directory to prove failure occurs before deletion, then restore tracked output and clean only baseline-generated untracked files.

## Deterministic generated social images

For source-controlled static generators that need per-entity OG images without external raster dependencies:

- validate exact same-origin asset paths, dimensions, rights mode, display identity, uniqueness, and complete-cohort counts before output deletion;
- encode every image buffer before mutation, then write only prevalidated paths;
- never label a generated title card as an approved-photo composite; keep portrait rights receipts separate from non-likeness share contracts;
- preserve exact display identity (including supported diacritics) and fail closed rather than silently transliterating unsupported names;
- for PNGs, test signature, bounded chunk order, every CRC, contiguous IDAT inflation, dimensions/filter bytes, final IEND/no trailing bytes, exact identity metadata, uniqueness, and byte equality across two isolated runs;
- use entity-correct share semantics (`profile` for people; a neutral `website` for groups unless a fully supported music namespace is intentionally implemented).

## Entity-preserving static detail routes

When canonical profile pages fan out into generated detail routes:

- derive an allowlisted section inventory from the provenance-valid canonical entity path; precompute every page and reject count/path collisions before output deletion;
- keep identity, Follow key, canonical/back links, section navigation, selected current inventory, source evidence, and named empty states tied to the same page model;
- prevent legacy generators from overwriting cohort-owned detail routes, while preserving non-cohort legacy pages;
- label intentional cross-entity relationship links visibly (for example, `Current member: …`) rather than letting them look like same-entity navigation;
- mark thin utility detail pages `noindex,follow`, expose exactly one active `aria-current`, and retain a self-canonical plus unique description;
- do not stop at encoding context in a CTA URL: prove the destination consumes, validates, and visibly prefills the same identity. Correction targets should require one exact same-origin canonical profile URL and reject credentials, ports, query/fragment ambiguity, duplicate parameters, encoded controls/slashes, and malformed paths;
- run static-verifier/build gates as well as feature tests, because recursive artifact verifiers may apply primary identity and Follow contracts to newly generated subpages.

## Fixed-cohort release gate reports

For deterministic release reports built from generated static artifacts:

- derive the report from already validated structured models and a generator-owned planned-artifact manifest; never infer readiness by reparsing generated HTML;
- require the complete frozen cohort before a report can claim readiness. Partial/test cohorts should omit the production gate report or be explicitly non-production, never return `ready` for a subset;
- validate exact own-data shapes at manifest and entity boundaries: dense standard arrays, exact keys, no symbols/accessors/custom prototypes, stable immutable IDs/ranks, and no raw-entity shortcut around registry validation;
- model each readiness dimension explicitly (route, entity, source, schema, OG, current inventory, rights) with stable status and blocker contracts. Empty current inventory is a truthful warning/empty state, not a blocker;
- distinguish **blocked row count** from **total blocker-code count** in aggregates;
- validate OG readiness separately from portrait rights. An approved portrait must not let a missing or mismatched generated OG path pass; require exact equality with the reviewed `ogImage.localPath` and use stable missing-versus-mismatch blockers;
- precompute manifest and report before destructive output replacement, write the report only after its referenced artifacts, use a supplied fixed UTC timestamp, stable row ordering, deterministic JSON with a trailing newline, and deeply isolate/freeze returned values;
- regression-test false readiness: wrong OG path on an approved-photo entity, missing OG buffer, incomplete alias/detail/canonical outputs, source/rights failures, entity/schema readiness false, duplicate/unknown IDs, partial cohorts, hostile descriptors/prototypes, deterministic two-run bytes, and report-to-artifact agreement.

## Deterministic release-gate reports

For generated artifacts that decide release readiness:

- construct the report from authoritative validated registry data plus a strict generator-owned manifest; never reparse rendered HTML when structured route/schema/asset/current facts already exist;
- accept the authoritative registry and revalidate it internally against the frozen cohort. Do not trust caller-shaped `{ ok, errors, entities }` envelopes or raw entity arrays as proof of validation;
- require the complete frozen cohort and omit the report for subset fixtures so partial runs cannot imply production readiness;
- keep entity/schema readiness separate from identity/schema value validation, and keep OG asset-path readiness separate from portrait rights; an approved portrait must not hide a mismatched generated OG path;
- report stable ordered blocker codes per row, distinguish blocked-row counts from blocker-occurrence counts, and treat honest empty current inventory as a warning rather than a blocker;
- precompute the manifest/report before destructive output mutation, write the success report last, recursively freeze model output, and test fixed-clock byte determinism;
- regression-test missing canonical/alias/details/source/schema/entity/OG/rights facts, duplicate/unknown/missing QIDs, wrong asset paths, hostile arrays/descriptors/prototypes/symbols, and accessors without invoking them.

## Separating liveness from generated-data readiness

For services that deploy generated release artifacts:

- keep process liveness (`/healthz`) independent from product-data readiness so orchestration can distinguish a running process from an unpromotable artifact;
- validate the generated gate report before expensive downstream reads and return stable detail-free 503 codes for missing, malformed, blocked, or build-inconsistent artifacts;
- compare report and generated-data build timestamps for artifact consistency rather than imposing arbitrary wall-clock expiry on immutable static data;
- constrain test-only path overrides to canonical regular non-symlink files inside the real OS temp directory, with file-size bounds; production uses one fixed artifact path;
- recompute row-level identity/status/aggregate counts instead of trusting summary fields. Validate semantic equivalences such as `currentCount === 0` iff `currentStatus === empty`, and bound counts to the rendering contract;
- test aggregate lies, duplicate identities/ranks/paths, row/status contradictions, symlinks, outside-temp paths, directories, oversized files, and stale timestamp pairs while proving liveness remains healthy.

## Canonical entity identity indexes

When one reviewed cohort identity must drive generation, search, routing, metadata, reports, and runtime compatibility:

- build one bounded index from an exact registry that is safely cloned and revalidated against the frozen cohort; do not accept caller-asserted validation envelopes or raw entity arrays;
- when the index contract requires canonical `JSON.parse` provenance, preflight **before cloning**: require the outer registry prototype to be exactly `Object.prototype`; inspect its own `entities` data descriptor without ordinary property access; require a standard exact dense array; and require every own entity entry to have exactly `Object.prototype`. Reject null/custom prototypes, sparse entries, accessors, symbols, and extra array keys without invoking getters. Do not recursively tighten unrelated nested containers unless the index contract specifically makes them identity-bearing;
- remember that a descriptor-safe clone can still erase provenance by converting null-prototype objects into ordinary `{}` records. Structural isolation and source-shape acceptance are separate checks, so provenance rejection must precede normalization;
- materialize one frozen identity object per entity containing only immutable identity fields such as QID, slug, entity type, canonical path, legacy Follow key, and schema type;
- keep mutable `Map` instances private behind a branded/frozen public index. Lookups by QID, canonical path, and Follow key must return the same object reference and return `null` for malformed or unknown keys;
- serialize runtime identity separately as deterministic JSON-safe identities plus integer index maps. Build keyed objects with explicit own data properties, reject collisions, and never serialize private mutable maps or callable lookup closures;
- build the index once per generator run and use it to replace copied type/path/follow/schema decisions in canonical routes, aliases, page-model coherence checks, gate manifests, search links, and sitemap candidates where practical. Preserve a narrow fallback only for intentionally partial test fixtures, and never let it imply full-cohort readiness;
- never authorize a canonical route from a QID match alone. Require the indexed QID, slug, and entity type to agree; otherwise construct a bounded same-entity legacy fallback rather than trusting a caller-provided URL;
- preflight cohort QID ownership across the cloned legacy catalog before projection mutation. Reject duplicate claims, wrong-slug claims, and cross-collection/type claims with a stable conflict, while preserving unrelated non-cohort QIDs;
- runtime services should consume the generated index rather than importing build-time registry state. Preserve non-cohort legacy behavior, but fail closed when a malformed generated index claims a fixed-cohort identity;
- test same-reference lookup for representative people/groups and standalone artists, exact all-cohort serialization, clone/forged-index rejection, symbols/accessors/custom prototypes without getter invocation, canonical search/sitemap output, subset compatibility, and no broad-catalog drift.

## Shared identity policy indexes

When one reviewed cohort identity drives routes, schemas, search, persistence keys, and release reports:

- build one privately branded immutable index from an exact canonical registry that is safely cl...[truncated]

For optional relationship/evidence inventories that can drive published UI:

- require standard, dense arrays whose own keys are exactly `length` plus enumerable data indices `0..length-1`; reject holes, custom prototypes, symbols, extra keys, accessors, and non-enumerable indices without invoking getters;
- apply the same exact-array rule recursively to nested source arrays, and exact-own-enumerable-data-key rules to each source record;
- reject a malformed outer collection wholesale; within a valid outer collection, omit only the malformed optional relationship so valid siblings survive;
- preserve uncertainty explicitly: `current` must be directly asserted, while `former` may have a null exact end instant when lower-precision evidence still proves departure;
- treat frozen output as necessary but insufficient: test mutation, reorder, reference replacement, bucket replacement, cross-bucket movement, cloning, and reconstruction against private provenance.

## Derived page models must preserve publication invariants

A page-model boundary is not safe merely because construction used the correct selector. Returned JavaScript objects remain mutable, compatibility options such as `selectedItems` can silently bypass entity/publication rules, and selector revalidation over a caller-replaced array does **not** prove construction-time selection. A newly injected item can be individually valid and still lack provenance.

For models containing current content:

- the exported builder must always run the canonical exact-entity publication selector; do not expose a preselected-items bypass;
- materialize one validated UTC selection clock and record it in the exact model metadata;
- issue each model a module-private, non-forgeable brand using a `WeakMap` keyed by model identity; snapshot the exact model, `currentItems` array reference, ordered item references, length, and selection clock;
- deeply freeze the builder-owned `currentItems` array and every reachable JSON-like object/array using descriptor-safe own-data traversal, without invoking getters or freezing caller input;
- reject unbranded values before trusting fields, then require the exact branded array reference, length, ordered item identities, and selection clock;
- retain canonical selector revalidation at the recorded clock as defense in depth: branding proves provenance, while revalidation proves the original selection remains publishable;
- reject shallow copies, structured clones, and caller-constructed coherent-looking models when the boundary is intentionally same-process/internal;
- validate metadata coherence against the isolated entity rather than trusting follow keys, schema type, or canonical paths supplied by callers;
- keep compatibility fixture enrichment private to tests instead of exporting a weaker production mode.

Do not put the brand in exported symbols, enumerable properties, hashes supplied by the model, or caller-copyable metadata. Freezing alone is insufficient because a shallow copy can replace `currentItems`; branding alone is insufficient if nested selected objects can be mutated in place.

Drive the fix with a **valid** post-build injection, not only an obvious wrong-entity draft:

1. Build a model from an empty inventory at an injected clock.
2. Create a fully publishable exact-entity item whose title contains a unique marker.
3. Capture RED by shallow-reconstructing the model with that item and showing the old validator accepts it; where safe, prove the renderer emits the marker.
4. After GREEN, assert direct append and nested mutation throw/no-op, direct property replacement invalidates the branded model, shallow reconstruction fails, `structuredClone` is unbranded and fails, renderer rejection keeps the stable invalid-model code, and no marker appears.
5. Preserve tests for ignored preselection options, metadata spoof/accessors, selector revalidation, caller-input immutability, and intentionally mutable unrelated fields.

For marker-absence evidence on an exception path, initialize captured output to an empty string and assign only if rendering returns. This verifies no disclosure while retaining the required exception assertion.

## Canonical metadata during compatibility projection

When a reviewed registry is projected into a broad legacy search/follow catalog:

- merge only within the matching entity type and canonical slug;
- preserve unrelated legacy fields and all non-cohort records;
- overwrite identity-bearing compatibility fields (`type`, display `name`, immutable ID, canonical path) from the reviewed registry, rather than leaving stale legacy identity text;
- add standalone individuals only to the individual collection; never fabricate a group to fit an older nested schema;
- expose structurally independent full passport records separately;
- never flatten sourced biography text or claims into legacy unsourced `facts`;
- test the actual production-size catalog transformation, uniqueness, nonmutation, non-cohort retention, and a known standalone entity—not only synthetic arrays.

A useful RED is an existing legacy record whose display name differs only in reviewed canonical styling (for example title case versus the registry's approved capitalization): the projection must replace the stale compatibility name while retaining non-identity metadata.

## Relationship reconciliation and chronology

Before publishing relationship-derived roster sections:

- enforce a one-to-one immutable-ID ↔ route-slug mapping; if any otherwise valid rows repeat a QID or slug, omit every row involved in that conflict rather than choosing evidence arbitrarily or rendering one person twice/across statuses;
- retain unrelated valid siblings in original source order;
- enforce as-of chronology against the receipt's `checkedAt`: starts and exact ends cannot be in the future, and an exact start cannot exceed an exact end;
- preserve lower-precision former evidence as `status: former, endAt: null` rather than inventing an instant;
- derive the roster from the isolated entity and bind the entity reference, relationship inventory, ordered roster references, and selection result in private provenance so evidence replacement/removal/reorder cannot diverge from rendered output;
- deep-freeze only builder-owned isolated data, never caller input.

## Exact route-entity selection precedence

For profile current-content selectors with both explicit primary identity and compatibility group/member fields:

- on group routes, an own valid non-null `primaryArtistSlug` is authoritative: include only when it equals the group slug, and never fall back through `group` when it names a different entity;
- use group fallback only when primary identity is absent or null, `group` equals the route slug, and no different idol is declared;
- reject malformed explicit primary slugs instead of laundering them into fallback; `artistSlugs` membership alone is insufficient;
- inspect routing fields through own descriptors, reject inherited/accessor-backed identity without invoking getters, and guard `Object.getPrototypeOf(record) === null` before inherited-descriptor checks;
- keep individual-route rules separate when their contract intentionally allows either matching primary identity or matching idol identity.

Test both precedence directions, null/missing/malformed primary values, member leakage, inherited/accessor fields, and valid null-prototype records through both the selector and page-model builder.

## Verification and cleanup

- Run the focused test file after every RED/GREEN slice, then the canonical full suite.
- If the suite regenerates tracked output, restore only the known generated directory and verify it is clean.
- When canonical tests pass only after generation, run the affected standalone consumer/site test once after restoration. If it reproduces a pre-existing checked-in-artifact count mismatch unrelated to the source change, report the exact expected/actual values and leave it out of the focused commit; do not regenerate or edit unrelated artifacts to hide the mismatch.
- Stage only the permitted source/test paths; run `git diff --cached --check` and a static added-lines security scan.
- Report each vertical slice's RED and GREEN counts separately, plus feature/file/full-suite counts, safety-probe results, generated-output restoration, any post-restoration mismatch, exact changed files, and commit SHA.
