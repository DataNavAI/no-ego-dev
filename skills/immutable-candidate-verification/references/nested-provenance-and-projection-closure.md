# Nested provenance and projection closure

Use this checklist when a publication model accepts rich records and later projects them through selectors, CMS helpers, home ranking, or API responses.

## Closed graph, not just closed top level

A top-level allowlist is insufficient when permitted fields contain objects or arrays. For every nested field that can cross a publication boundary:

1. Declare its supported own-key schema.
2. Require own data descriptors; never invoke getters.
3. Reject symbols, named array properties, sparse slots, inherited additions, accessors, custom prototypes, and unexpected nested objects.
4. Validate every redundant URL representation byte-for-byte against the reviewed receipt.
5. If no reviewed nested schema exists, fail closed. An exact empty array is safer than accepting arbitrary media metadata.

Pay special attention to `media`, legacy/raw snapshots, trust metadata, artist/entity arrays, typed receipt arrays, and actions. A raw `legacy` snapshot may need a broader known schema than the normalized record, but an allowlisted key is not enough: type-check every permitted value. Require scalar-only values where no nested schema exists; validate arrays as dense bounded own-data arrays of the expected primitive type; and keep nested receipts/actions on exact shapes with URL agreement. For example, reject an object hidden in `trust.confidence` or an object element hidden in `legacy.artistSlugs`, even when those parent keys are allowed. Reject recursive `legacy`/`trust` envelopes unless explicitly modeled.

Do not stop at nested URL equality. If a retained legacy/raw snapshot carries title or source evidence, bind its title-safety result, publisher/outlet/label, receipt type, and verification timestamp to the canonical record as well. Bind every retained legacy identity, content/source type, status, schedule field, route discriminator, and provenance timestamp to the canonical representation or to one explicitly recomputed normalization rule. Classify every allowed legacy key as exactly one of: canonical-bound, deterministically recomputed, explicitly renamed historical metadata, or unsupported. Never leave a shadow field merely “typed.” If normalization intentionally changes a value (for example, a reviewed raw media classification becomes a social-update content type), recompute the expected canonical value from the validated raw snapshot and permit only that documented direction; a broad mismatch exception launders contradictory metadata. Reject a legacy field when its canonical counterpart is absent unless the schema explicitly defines it as noncanonical historical metadata. For raw identifiers that are intentionally superseded, remove or rename them while constructing the descriptor-only legacy snapshot and then disallow the old ambiguous key at publication; otherwise a hostile caller can alter it after normalization and create contradictory shadow identity. A canonical safe title plus a hostile legacy title, a canonical trusted publisher plus a conflicting nested receipt label/type/time, or a canonical artist plus a conflicting legacy identity is provenance laundering even when every value has the right primitive type and every nested URL agrees. Include one bounded mutation matrix that changes each nested title/source/identity/type/status/schedule/timestamp field independently and requires rejection.

Never read array `.length` or indices ordinarily at an untrusted boundary. Read the own `length` data descriptor, apply a practical maximum before looping, require exactly `length + 1` own keys (`length` plus every dense numeric index), and read each element descriptor. This prevents getter invocation, sparse-slot laundering, named-property smuggling, and safe-integer denial-of-service loops.

## Projection contract

Validate the original record before projection and validate the projected record afterward. Require **every allowed top-level key** to have an own data descriptor, not only authorizing or URL fields; otherwise a projection-only accessor such as `rank` can execute after the main provenance gate passes.

Projection must not silently:

- drop supported ranking metadata such as `rank` or `rankReason`;
- rewrite an already validated root-relative `href` and lose query/context state;
- replace a reviewed receipt URL with a derived route;
- retain unsupported nested provenance;
- add own `undefined` authorizing fields.

Treat projection metadata as a typed contract. For example, require `rank` and `rankReason` to appear together, constrain rank to a positive safe integer with a practical upper bound, constrain the reason to a bounded machine-token grammar, and reject accessors, objects, negative values, and one-sided pairs. When compacting, read the already-validated descriptor values and omit absent fields instead of performing ordinary property reads or emitting own `undefined` keys.

A leading slash alone does not make `href` browser-internal: `/\\attacker.example/path` resolves externally in browser URL semantics. Reject backslashes and control characters, resolve the candidate against the production origin, and require the resolved origin to match exactly. Same-origin is still too broad when the field represents a canonical content action: bind the resolved pathname to the record's reviewed route identity (for example, exactly `/content/<canonical-slug>`), rejecting `/admin`, `/../admin`, sibling routes, encoded aliases, and slug mismatches while preserving valid query/hash context byte-for-byte.

Inventory legitimate projection-only fields before closing the top-level schema. Add positive tests proving each supported field survives unchanged, alongside negative tests for unknown provenance aliases, hostile accessors, malformed values, browser-resolution edge cases, and same-origin route substitution.

## Hostile collection boundaries

At CMS/server boundaries:

- require the outer collection itself to be a plain exact dense array with a practical maximum before iteration;
- reject sparse slots, named own properties, symbols, accessors, custom prototypes, and oversized declared lengths rather than skipping or ignoring them;
- call the protected publication validator before ordinary property reads;
- read status fields through own data descriptors;
- catch row-level revoked-proxy, getter, and descriptor-trap failures;
- return no partial output after a stateful object fails during projection;
- run the compact result through the publication gate again.

Validation does not freeze a Proxy. After an original row passes, recursively capture a plain descriptor-only snapshot without ordinary property access: require data descriptors, supported plain/null/array prototypes, string keys, valid array length, and no cycles, symbols, accessors, or unsupported objects. Revalidate that exact snapshot, verify publish/verification statuses from its descriptors, and compact only the snapshot. Iterate the outer CMS array through index descriptors too, so an accessor-backed slot cannot run before row validation. When the outer-array contract is exact, an accessor-backed slot invalidates the whole collection; skipping that slot while publishing valid siblings is still a false success. Probe with a two-row array containing a throwing accessor at index 0 and a valid row at index 1, and require both zero getter calls and an empty result. A valid Proxy whose `get` trap counts calls should still produce the expected row with **zero** calls; a stateful descriptor Proxy must either yield one coherent revalidated snapshot or fail closed.

When implementing recursive capture, do not assume `WeakSet` is iterable (`new WeakSet(existingWeakSet)` is invalid). Either mutate/add/delete along a `try/finally` traversal or carry an immutable ancestor array/set representation with an explicit cycle check.

### Verify descriptor safety through every downstream path

A descriptor-safe top-level gate does not prove that selectors, page-model builders, snapshotters, or compactors remain descriptor-safe. Push the same known-valid record through every accepted path with `Proxy` wrappers on both the outer collection and nested receipt arrays. Count ordinary `get` calls and require zero at each boundary. Helpers such as `array.length`, `value[0]`, optional chaining, and array methods can reintroduce ordinary reads after an earlier gate passes.

Treat bounds and scalar typing as graph-wide properties:

- Enforce a practical maximum from each array's own `length` data descriptor before iterating, cloning, or assigning that length—even for projection-only metadata that a later compactor drops.
- Type every permitted nested scalar by field. Reject symbols, functions, bigint values, wrong primitive types, and explicitly present own `undefined` values; “not a non-null object” is not scalar validation. Probe functions separately because `typeof functionValue === 'function'` can slip through an object-only rejection, and probe own `undefined` separately because `value !== undefined` guards can silently reinterpret malformed presence as absence.
- Exercise malformed nested metadata through the exported CMS/final publication function, not only the inner validator. If a lossy projection accepts the original and then drops malformed `legacy` or `trust` data, that is laundering rather than normalization.
- Pair the valid baseline with regressions for a proxied receipt and outer array with zero `get` calls, a huge sparse nested array, and wrong primitive types in each legacy/trust scalar family.

A compact executable probe should print the direct-gate result, downstream acceptance count, and proxy `get` count for each one-field mutation. This distinguishes fixture/setup failures from descriptor-read, bound, and projection defects.

## Refresh and moderation candidate construction

Treat every input to a refresh/candidate builder as untrusted—not only newly fetched rows. Existing databases, moderation inventories, option objects, and nested retained collections can invoke accessors or preserve mutable proxy references even after fetched items were validated.

Before filtering, sorting, spreading, or merging:

1. Recursively snapshot `existingDb`, fetched rows, and caller options from own data descriptors only.
2. Require plain/null objects and exact dense arrays, reject symbols/accessors/cycles/custom prototypes, and cap keys and array lengths before traversal. Define bounds precisely: “at most 1,000 object fields” means at most 1,000 own object keys, while a dense array of length 1,000 normally has 1,001 own keys including `length`; avoid one shared off-by-one key check for both shapes.
3. Validate option types and bounds from the snapshot; avoid parameter destructuring on an untrusted options object because it performs ordinary reads before the function body.
4. Build the result only from snapshots. Never retain nested references from caller-owned moderation data.
5. Fail the complete construction when an existing-database or options accessor is present; do not salvage a partial candidate.
6. Match snapshot descriptor policy to reconstruction semantics. If the builder later uses object spread, either reject non-enumerable/nonstandard writable/configurable descriptors up front or rebuild with descriptor-preserving APIs. Accepting a non-enumerable moderation field and then silently dropping it during spread is lossy authorization, not isolation.

Regression probes should wrap both the outer existing database and a nested moderation array in counting proxies, require zero ordinary `get` calls, and assert deep equality **plus reference inequality** in the result. Add an accessor-backed `refresh` field that throws and require rejection with zero getter calls. Also test sparse, named, oversized, and accessor-backed fetched collections; safe deduplication of fetched rows does not make later `sort`, spread, or `map` operations safe unless those rows were first converted into plain snapshots.

A refresh builder must preserve the final publication invariant after changing verification metadata. If it advances `lastVerifiedAt`, advance every canonically bound receipt timestamp in the same descriptor-cloned graph, including supported retained legacy receipts, then run the emitted row through the exported final publication gate again. Validate and count the **emitted** rows after this rewrite; validating only the fetched input can produce a candidate whose own receipt and verification time disagree.

## Identity ownership across publication and selection

Treat every retained identity representation as one canonical ownership graph:

- A present non-empty `idol` cannot disagree with `primaryArtistSlug`; a matching group primary must not override a different explicit member identity.
- A supported `artistSlugs` array must be exact, dense, bounded, contain the effective owner, and contain only the canonical primary/group/idol identities. If legacy/raw `artistSlugs` is retained, require element-for-element equality with the canonical array.
- Apply the same agreement rule in the final publication gate, CMS projection, and entity selector. A selector must not re-authorize a row rejected by publication.
- Revalidate group-owned non-schedule titles for reviewed member aliases regardless of receipt type. Restricting title/entity relevance to `media_coverage` leaves official/social rows able to publish member-specific stories on a group route. Keep schedules separate when their reviewed title grammar does not repeat the owner.
- Normalize punctuation-split aliases with exact adjacent-token windows rather than arbitrary whitespace-stripped substring search. For example, detect a reviewed one-word alias split across `Eun-chae`, but keep a paired group control such as `with anniversary` from accidentally matching `Hanni` across unrelated word fragments.

Probe both an explicit group-plus-different-idol row and the same member-specific title with the idol field omitted. Pair each rejection with a valid group-owned headline so ownership hardening does not silently empty the feed.

A group mention is not sufficient ownership when the title explicitly names a **subunit**. If the product has no reviewed subunit identity/relationship model, fail closed on group-owned `subunit`/`sub unit` headlines and keep a paired plain-group control. Do not silently assign a named unit to the parent group's passport merely because the parent name also appears.

## Exact trust envelopes

Treat optional trust metadata as absent-or-complete, never partially authoritative. When `trust` is present:

1. Require its exact reviewed own-data key set—not an allowed subset.
2. Reject `{}`, one-field objects, own `undefined`, extra keys, accessors, and inherited fields.
3. Recompute the complete trust result from canonical status/source inputs and require every retained trust field (status, publication/verification state, source confidence, numeric confidence, and review flag) to agree exactly.
4. Recheck this contract after normalization, refresh timestamp rewrites, and CMS projection.

A loop that compares only supplied keys lets partial envelopes such as `{status: ...}` or `{confidence: ...}` pass while omitting contradictory context. Include one regression per single-field partial envelope plus one complete valid control.

## Prototype pollution

Capture intrinsic prototype keys at module initialization. Validate the captured `Object.prototype` and `Array.prototype` baselines at the **publication entry point**, in addition to checking the prototype of each object/array actually traversed. Checking only a supplied receipt array leaves direct-URL records vulnerable when a polluted intrinsic is otherwise untouched.

Post-baseline additions must reject without invoking accessors, including arbitrary keys—not only names matching `url|source|receipt|action`. Do not retain historical convenience exceptions for keys that once appeared harmless: a tolerated key weakens global baseline consistency and lets direct-URL records bypass nested checks. Update positive tests to the strict fail-closed contract, and probe both provenance-bearing (`publisher`) and arbitrary additions on `Object.prototype` and `Array.prototype`. Include valid direct-URL records so nested receipt checks cannot accidentally mask a top-level bypass.

## Verification order with generated fixtures

If tests read checked-in generated output that can age or be replaced by a build, distinguish source-code failures from stale fixture state:

1. Run the canonical generator/build from the candidate source.
2. Run focused and canonical tests against that generated state.
3. Run browser/static verification.
4. Restore tracked generated output and remove only command-created artifacts.
5. Stage exact durable source/test paths and run `git diff --check`.

Never weaken freshness or provenance merely to make an old checked-in generated fixture publishable.