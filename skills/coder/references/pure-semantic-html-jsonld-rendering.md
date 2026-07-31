# Pure semantic HTML and JSON-LD rendering

Use this pattern when adding a deterministic server/static renderer from reviewed entity fixtures without integrating the generator, server, styling, analytics, or browser behavior in the same slice.

## Vertical TDD slice

1. Read the canonical schema/renderer contract, reviewed fixture, and available UI/copy artifacts. If a requested artifact path is missing, search once, use the remaining authoritative artifacts, and report the missing input rather than inventing its contents.
2. Add a focused test that imports the wished-for pure renderer and renders the reviewed fixture. Run it before creating the module; an expected missing-module failure is valid RED for a new file.
3. Assert semantic behavior rather than cosmetic classes:
   - first semantic `h1` and canonical identity attributes;
   - canonical URL and truthful initial control state;
   - source/correction access and full machine-readable checked time;
   - parsed JSON-LD object equality;
   - absence of placeholders, fake counts, persistence claims, and unrelated entity data.
4. Add a hostile clone of the fixture before implementation or as the next RED→GREEN cycle. Mutate text, attributes, biography, alternate names, URLs, base URL, and script-sensitive Unicode.
5. Implement the smallest side-effect-free module. Keep CSS, generator/server integration, browser JS, analytics, and unrelated empty states out of this slice.

## Security boundary

- Escape every source-derived HTML text and attribute value (`&`, `<`, `>`, quotes, apostrophes).
- Accept external links and configurable canonical bases only when they are bounded HTTPS URLs with a hostname and no credentials/control characters.
- Resolve canonical paths only against a validated HTTPS origin. Reject protocol-relative paths, backslashes, query/fragment injection, and controls.
- Build JSON-LD as an object, then `JSON.stringify`; before embedding in `<script type="application/ld+json">`, encode `<`, U+2028, and U+2029 so source data cannot terminate or corrupt the script.
- Parse JSON-LD from rendered HTML in tests and compare the object exactly. Also inspect the serialized script payload to prove no literal `<`, U+2028, or U+2029 remains.
- Filter `sameAs` to reviewed, provenance-complete HTTPS links present in the fixture; do not infer group identity or append unrelated URLs. Require each candidate to be a plain object with a canonical kind, the exact kind-to-source-property mapping, and a full UTC ISO checked instant before URL normalization and order-preserving deduplication.
- Represent fixed kind/property mappings with `Map` or a null-prototype record plus an own-key check. A normal object lookup can accidentally admit inherited names such as `__proto__` when hostile input supplies a matching non-string value. Drive this boundary with an explicit RED test.
- Render a verified biography only when its bounded nonempty text, **its own** full UTC ISO checked instant, and at least one surviving provenance source are all valid. A valid entity/page-level `checkedAt` must never substitute for missing or stale biography provenance. Canonical biography source types must be plain objects with hardened HTTPS URLs; filter invalid sources first, and omit the entire About section when none survive.
- Treat syntactically safe HTTPS as necessary but insufficient for both biography sources and JSON-LD `sameAs`: tests must include a well-formed URL paired with an unknown source type, stale/missing timestamp, unknown link kind, blank property, or mismatched kind/property and prove it is omitted.
- Use the same sanitized biography-source collection for both the publishability gate and rendered source links. This prevents the About decision and visible provenance list from disagreeing.
- A top-level `isPlainObject()` check is not enough. Validate nested identity containers (for example `names`) as supported plain objects and require every field used for identity or publication decisions to be an **own data property**. Otherwise inherited `display`, `kind`, `sourceProperty`, `checkedAt`, `type`, or `url` values can satisfy otherwise-correct predicates.
- Add two distinct inherited-field test classes: (1) custom-prototype records such as `Object.create({ display: 'INHERITED' })`; and (2) ordinary `{}` records while relevant keys are temporarily installed on `Object.prototype`. The latter reproduces prototype-pollution bypasses that still pass a plain-object predicate. Install pollution inside `try` and always remove it in `finally` so the test cannot contaminate later cases.
- For kind/property maps, first prove the kind has an explicit mapping (`map.has(kind)` or a non-null expected value), then compare the exact property. `map.get(unknown) === missingProperty` can become `undefined === undefined` and silently admit an unreviewed URL.
- Treat option bags as untrusted input. Avoid parameter destructuring when inherited `baseUrl`, inventory, locale, clock, or feature flags would change output. Accept options only from a supported plain object, consume only own data properties, and use fail-closed defaults for null, scalars, arrays, and custom-prototype objects. Test both `Object.prototype` pollution and a custom options prototype.
- Treat arrays as publication boundaries. `Array.isArray()` alone does not prevent sparse indices from resolving through `Object.prototype`, and custom-prototype arrays may lack standard iterators/methods. Require a supported array prototype, bound work, iterate numeric indices without inherited methods/iterators, and consume only own **data descriptors** from `Object.getOwnPropertyDescriptor(array, index)`. Never read `array[index]` after only an ownership check: an own accessor can execute or throw. Test sparse arrays under temporary numeric prototype pollution, replaced array prototypes, and throwing/non-throwing own index accessors; restore descriptors in `finally`.
- Harden internal result arrays under the same threat model. `array.push(value)` can throw when `Object.prototype['0']` is non-writable. Build accumulator entries with `Object.defineProperty(array, array.length, { value, writable: true, enumerable: true, configurable: true })` or another CreateDataProperty-style primitive, and verify a valid result while that prototype descriptor is installed.
- When composing a legacy/shared publication predicate that performs ordinary property reads, do not pass the original untrusted record. Build a bounded null-prototype projection from an exact allowlist of own data descriptors, narrowly project only nested action/source fields the gate consumes, run the real gate against the projection, and return the original record only after approval. This preserves identity without granting inherited/accessor-backed data publication authority.
- For entity-scoped selectors, test three concerns independently: exact route relationship, publication-policy projection, and deterministic ordering. Require explicit identity (`primaryArtistSlug` or `idol`, not broad membership arrays), reject malformed sortable timestamps before ordering, preserve original record identity without mutating inventory, and use stable tie-breakers after schedule/update/check-time ordering.
- Make acceptance assertions at the boundary named by the plan. If the contract says an exported empty-state/helper contains source and correction actions, test the helper output directly; page-level links elsewhere do not satisfy that helper contract. Preserve exact specified copy and action targets rather than inferring equivalence from the assembled page.

## Progressive time enhancement

- Render the authoritative time server-side first: a valid machine-readable UTC/offset `datetime` plus explicit source-zone text such as `KST`. Client JavaScript may fill only a nested local-time placeholder; it must never replace or delete the server-rendered time.
- Keep the browser enhancer idempotent with an explicit success marker on the local placeholder, and skip already-enhanced nodes.
- Guard the **entire conversion setup**, not only per-node formatting. `new Intl.DateTimeFormat(...)` can throw before a loop begins; construct the formatter inside `try/catch` and return without DOM mutation if setup fails. Per-node invalid dates/format failures should likewise leave both the placeholder fallback and server-rendered zone text intact.
- Add a behavioral regression that evaluates the enhancer with `Intl.DateTimeFormat` mocked to throw at construction. Assert no exception escapes, no enhanced marker is set, and existing KST/placeholder content remains unchanged. Source-string assertions alone are insufficient for this failure mode.

## URL-test nuance

The WHATWG `URL` serializer percent-encodes characters such as quotes and `<` in URLs before HTML escaping. Assert the normalized safe URL (for example `%22`, `%3C`, then `&amp;`) rather than expecting text-node escape forms such as `&quot;` or `&lt;` inside the serialized URL.

## Verification and cleanup

Run, in order:

1. focused renderer suite;
2. all passport/domain suites that consume the fixture/model;
3. canonical repository test command.

If the canonical command regenerates output, snapshot the clean/dirty baseline first. Restore **only** tracked files in the known generated output directory afterward; separately remove only untracked artifacts proven to have been created by that command. Never delete or restore a pre-existing dirty/untracked path. Confirm final status—including untracked files—contains only the intended source/test files, run `git diff --check`, stage exact paths, commit, then verify both the commit path list and a clean worktree. A `git diff --name-only` scope check is insufficient by itself because it excludes untracked files.

Report each RED reason/count before its GREEN result, then focused/domain/full-suite counts, security assertions, exact changed paths, commit SHA, and any missing requested design artifact.