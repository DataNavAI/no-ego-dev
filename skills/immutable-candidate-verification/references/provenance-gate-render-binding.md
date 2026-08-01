# Gate/render provenance binding and duplicate-source identity

Use this review recipe for immutable candidates that publish names, source receipts, provider labels, or external actions from reviewed data.

## 1. Bind the publication gate to the rendered receipt

The gate must validate the exact value later rendered. Search for alternate or legacy fields with different precedence.

A dangerous shape is:

- the generic publication gate prefers `sourceUrl`;
- the renderer publishes `sourceUrls[0].url`;
- both are accepted independently;
- a safe gate-only URL can hide a prohibited rendered URL.

Required regressions:

1. Give the gate-preferred field and rendered field different safe HTTPS URLs; publication must fail closed.
2. Put a prohibited path in the rendered receipt and a safe URL in the alternate field; publication must fail closed.
3. Probe accessor-backed, inherited, and extra-key variants without invoking getters. For arrays, test inherited **numeric and named** receipt properties on `Array.prototype` while preserving `Object.getPrototypeOf(array) === Array.prototype`; a custom-prototype-only probe can be rejected by an outer shape check and miss the real bypass. `Reflect.ownKeys(array)` proves only exact own shape and does not establish absence of inherited provenance. Require validation/selection to reject these polluted standard arrays with zero getter calls, then inspect the resulting server/page model—not only rendered HTML—to prove no inherited attacker URL remains reachable after cloning.
4. Prefer one canonical receipt. If compatibility requires an alternate field, require exact equality with the canonical receipt URL before calling the generic gate.
5. Prove gate/render byte equality, not merely semantic URL equivalence. Parsers can turn `https://official.example` into `https://official.example/`; either require `new URL(raw).href === raw` at the gate or project the exact canonical value that passed the gate into rendering. Add a host-only regression and assert the rendered `href` is exactly the gated value.

A valid action URL is not a substitute for a valid source receipt. Event/publication time and source-check time remain distinct.

### Bind internal navigation to the canonical route

Same-origin resolution is necessary but not sufficient for a CMS-controlled `href`. If the record has a canonical identity such as `slug`, bind navigation to the exact route family and identity the renderer is allowed to expose—for example, `/content/${slug}` plus only explicitly supported query state.

A bounded adversarial replay should test all of these independently:

- exact valid canonical route and valid canonical route with supported query state;
- arbitrary same-origin substitution such as `/admin`;
- dot-segment input such as `/../admin`, which may be preserved byte-for-byte by the projection while the browser resolves it to `/admin`;
- backslash-normalized authority syntax and protocol-relative forms;
- control characters and encoded separator variants;
- an `href` whose route slug disagrees with the record's canonical slug.

For every accepted control, assert the original `href`, projected `href`, and browser-resolved destination. For every malformed case, require omission/rejection rather than fallback to another route. An origin-only assertion can remain green while attacker-controlled content redirects users to an unrelated privileged or misleading path on the same site.

### Typed receipt contract

If the product requirement says each card exposes a source URL **and source type**, treat the type as publication evidence—not optional decoration:

- require one exact receipt shape such as `{url, label, type, verifiedAt}`; do not accept both typed and untyped variants;
- validate `type` against a finite policy allowlist rather than merely accepting bounded free text;
- carry the validated type through every projection/copy boundary so the renderer cannot lose it;
- map it through a finite user-facing label table and render the source type explicitly alongside content type and checked time;
- keep content type and source type separate (`media_coverage` describes the item; `media-coverage` or `official` describes its provenance);
- add fail-closed regressions for missing, unknown, accessor-backed, inherited, and extra-key type values.

When tightening a receipt schema, update only fixtures intended to represent publishable records. Preserve deliberately malformed/untyped fixtures so they continue proving rejection, then rerun the complete feature and canonical suites because shared fixture helpers can affect many ordering, identity, and renderer tests.

## 2. Derive provider identifiers only from canonical hosts

A declared provider kind is untrusted metadata. Before deriving an `@handle`, channel ID, account name, or provider-specific identifier:

- require a safe HTTPS URL;
- require the canonical provider hostname (including only intentionally supported aliases such as `www` or mobile hosts);
- validate the provider-specific path shape;
- bound the extracted identifier;
- otherwise use a neutral visible and accessible label that makes no provider identity claim.

For canonical provider URLs, identifier eligibility must be evaluated from the **original lexical URL**, not a previously normalized navigation URL. Keep both values through internal projections:

- `href`: the safe canonical URL used for navigation and deduplication;
- `identifierUrl`: the untouched reviewed string used only to decide whether a provider-specific identity claim is justified.

Preserve that pair through **every ingestion path** that can reach the shared source renderer—not only the main official-links projection. Audit biography/claim receipts, imported references, compatibility adapters, and fallback source arrays. A single path that drops `identifierUrl` silently promotes a normalized default-port URL back into an authoritative provider label.

Require the provider URL to survive parsing unchanged (`new URL(identifierUrl).href === identifierUrl`) before deriving an identifier. This rejects explicit default ports such as `:443` and `:0443`, which parsers normalize away, as well as host-case or other lexical rewrites that violate an exact canonical contract. Also reject credentials, every explicit/non-default port, query strings, fragments, and unsupported path forms. Apply the same rule to **all** identifier extractors, including generic website-host identifiers—not only MusicBrainz, Instagram, and YouTube. If a website label claims only an origin identity, require the exact supported origin shape (normally `/` with no query or fragment); path-bearing URLs should use a neutral fallback unless that path form has an explicit reviewed contract. For YouTube, prefer deliberately supported forms such as `/channel/<ID>` and `/@handle` rather than a broad arbitrary-path fallback.

Add at least one cross-ingestion regression: pass an explicit default-port provider URL through a secondary source family (for example biography sources), require the URL to remain present when neutral fallback is intended, and prove no authoritative identifier is derived after normalization.

Regression design must prevent false GREENs. Assert all three properties together:

1. the offending URL is still present as the intended neutral source link when neutral fallback is the requirement;
2. no provider-specific identifier appears;
3. the exact expected link count and per-link label association hold.

A loose assertion such as “`Source link 4` exists” can accidentally match an unrelated fallback or pass because the offending link was omitted before the extractor ran. If a shared safety boundary already rejects the URL and omission is the intended behavior, state that explicitly and test the omission rather than claiming the identifier extractor rejected it.

Duplicate-group renderers often choose identifier labels only when **every** candidate has a distinct valid identifier. That all-or-none rule can hide a defect: mixing one known-invalid URL with two malformed-host URLs forces the whole group to neutral labels even if the malformed hosts would be trusted by themselves. For each extractor boundary, add a homogeneous pair containing only the defect class under test and assert both remain neutral. Keep mixed matrices as separate defense-in-depth coverage.

### Website hostname validation

A character allowlist such as `/^[a-z0-9.-]+$/` is not DNS validation. Before deriving a hostname label, require:

- total hostname length `1..253`;
- at least two labels when the product expects a public DNS name;
- every label nonempty and at most 63 characters;
- every label starts and ends with an alphanumeric character;
- only alphanumerics or interior hyphens inside each label.

Test empty labels (`example..com`), leading/trailing hyphens, overlong labels, and exact valid boundaries. Do not accidentally narrow this DNS contract with an unrelated display-name constant: if the contract permits hostnames through 253 characters, test valid values above a common 200-character UI-name bound. If UI truncation is needed, keep the full validated identifier in the accessible contract and define truncation separately rather than relabeling a valid host as untrusted.

## 3. Inventory every duplicated provider in production data

Hand-picked fixture coverage is insufficient. Independently scan the complete staged production registry and group links by provider kind. For every kind with duplicates:

- render a real production entity;
- assert distinct visible labels;
- assert matching distinct accessible labels;
- assert each identifier is derived from its own URL;
- verify no ordinal is presented as if it were a provider/account identity.

This catches provider kinds omitted from common fixtures, such as multiple MusicBrainz identities on one entity.

## 4. Recompute production cardinalities

When acceptance criteria quantify reviewed data, independently recompute from the staged registry:

- publishable versus hidden rows;
- named versus unlabeled rows;
- current/former versus unknown states;
- duplicate providers by kind;
- unresolved identities outside the publishable set.

A focused renderer fixture does not prove complete production-data compliance.

## 5. Preserve immutable review discipline after a finding

Each blocking finding gets its own vertical TDD cycle:

1. add the smallest behavioral regression;
2. run it and preserve the expected RED;
3. make the minimal production correction;
4. obtain focused GREEN;
5. run the complete feature, canonical, browser, and build gates affected by the change;
6. restore generated output;
7. stage the complete exact scope and require no unstaged source remainder;
8. run `git diff --cached --check`;
9. re-dispatch one composite independent review against the new staged diff, plus only predeclared non-overlapping specialists.

After dispatch, treat the shared checkout as read-only until every reviewer returns. Do not add and revert “one more” regression, restage, run generators, or clean output in that checkout while reviews are active: a reviewer can observe the transient dirty state even when the final state is restored, making its snapshot and cleanliness verdict inconsistent. If parallel experimentation is necessary, use a separate worktree or immutable copied snapshot and re-dispatch against the final exact tree.

Any source, fixture, or test correction invalidates prior PASS/APPROVED verdicts. Never carry a verdict forward across a changed staged diff.
