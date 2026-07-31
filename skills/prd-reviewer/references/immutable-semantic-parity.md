# Immutable-candidate semantic parity probes

Use these checks when a candidate claims that prose schemas, executable validators, and sample/pilot data form one closed contract.

## Enum parity

For each normative enum:

1. Extract the values stated in prose or schema.
2. Locate the validator allowlist.
3. Collect values actually present in pilot/example records.
4. Compute all three set differences.
5. Mutate one representative record in reviewer-owned memory or scratch to an undocumented validator-accepted value.

A normal validator pass is insufficient. If pilot data uses a value absent from the normative schema, or the validator accepts a value the schema omits, implementation is blocked until the authorities are reconciled.

## Single executable analytics authority

Build exact event-name sets from:

- executable schema branches;
- PRD taxonomy;
- privacy matrix;
- CUJ acceptance and decision metrics;
- any active delivery/implementation plan section presented as an event taxonomy.

Compare both directions, then compare required properties per event. Do not infer that a grouped prose row gives sibling events identical properties. Check envelope closure, event-property closure, enums, numeric bounds, identifier patterns, and hostile privacy values. When an executable schema has explicit sole-authority precedence, an omission in a non-authoritative current plan may be wording drift rather than implementation ambiguity, but it must still be reported and the plan must not claim its partial list is exhaustive.

### Cross-contract field semantics

Closed event sets and allowlists are not sufficient. For every version or identifier property shared with another domain contract:

1. Find the canonical field, type, and lifecycle meaning in the domain schema.
2. Read real fixture values, including their runtime types.
3. Submit those exact values to every consuming executable schema.
4. Submit the consumer's accepted value back to the canonical validator where practical.
5. Treat an undocumented conversion, renaming, or overloaded meaning as unresolved product semantics.

A common failure is a field named `packVersion` whose domain authority defines a positive integer while analytics accepts only a release-ID string. Hostile unknown values may correctly fail and prose event sets may match perfectly, yet implementation is still not ready because the real canonical value cannot be emitted. The smallest correction is usually to preserve a separate release identifier and make the shared version field use the canonical type, or rename the field and explicitly carry both concepts.

## Evidence-manifest authorization

Verify separately:

- manifest and payload paths are relative and candidate-contained;
- symlinks and traversal cannot escape containment;
- bytes and sizes are read and recomputed, not trusted from manifest strings;
- HTTP/status requirements are enforced;
- source ID, canonical requested/final URL, retrieval time, and content hash bind to the source record;
- requested and final URLs are credential-free and match the approved host/path/query form;
- invented hashes, changed bytes, absolute paths, external manifests, redirects, and wrong bindings fail closed.

A structural evidence test is not equivalent to proving source binding at publication time; exercise the publication path or the binding function directly.

### Recomputed-hash semantic substitution

Do not stop after proving stale or invented hashes fail. In reviewer-owned scratch, coordinate changes to the authoritative mapping, source provider ID/name/URL, evidence payload ID/name, evidence-row hash/size/URLs, and every enclosing checksum. Leave the old review receipts unchanged and recompute the outer manifest honestly. If validation passes, checksums authenticate attacker-selected bytes rather than reviewer-approved semantics; require a separately pinned semantic authority for the reviewed tuple.

### Cross-record review chronology

Validate the complete dependency graph, not only each review object: `evidence retrieval ≤ every dependent first review ≤ second review ≤ frozen release creation`. Apply this to mappings, entities, profiles, relations, claims, questions, and packs. A live-wall-clock future check does not prevent a mapping review from postdating its release or a claim review from predating its evidence.

## State-authority and explicit-empty closure

When a revision distinguishes an unavailable/unconnected state from an explicit empty result, audit the distinction as an authorization boundary—not merely as UI copy:

1. Compare the exact condition across the canonical PRD, route/API contract, source/rights matrix, coverage contract, active UI guidance, migration plan, release criteria, and tests. Search semantic synonyms such as “no published records,” “no items,” and “not available”; one stale active definition can make the states overlap.
2. Identify the exact per-record field or signed receipt that authorizes connection/enablement. Do not infer that a document summary count, generic lifecycle status, or prose phrase is authoritative.
3. Inspect the reviewed-record digest projection. If the intended enablement field is excluded as top-level lifecycle metadata, prove with a fully prerequisite-satisfied probe that an attacker cannot toggle it after two valid reviews. An earlier “second review required” failure is not evidence that the later toggle is cryptographically bound.
4. Require a closed immutable result record for explicit emptiness. It should bind the provider/adapter and version, subject ID, approved mapping identity or digest, bounded run identity and constraints, result count, validation outcome, release identity, and chronology. A release object containing only version/time/status cannot prove a valid zero result.
5. Treat a digest-shaped `manifest_sha256` as a claim, not proof. Locate the exact immutable run/import manifest, recompute its digest from contained bytes, require equality, and verify that its adapter, subject, release, result, and count agree with the signed result. A validator that merely accepts any 64-hex string authenticates reviewer-entered text rather than manifest bytes; probe a fully signed all-zero or random digest.
6. Enforce the complete temporal dependency: `import/run completion ≤ first review ≤ second review ≤ frozen release creation`. A `completed_at ≤ release` check is insufficient because it permits a reviewer to approve a result before it exists. Use valid signatures and otherwise satisfied prerequisites so the inversion reaches the intended chronology rule.
7. Mutate document-level summary counters independently. Acceptance may be harmless only when they are explicitly advisory and no runtime/publication decision consumes them; otherwise require recomputation and validation from signed rows.
8. Exercise one state reducer over mutually exclusive fixtures: no approved mapping; approved mapping but no valid run; approved mapping plus valid zero-result run; stale; partial; and ready. Assert the exact selected state and precedence.
9. Audit user-facing copy tables as executable semantic authorities when they phrase state treatment as a condition (for example, “Not connected — no published records”). A stale copy row can overlap a corrected canonical state predicate even when route, source, coverage, and release contracts agree.

Treat overlapping active definitions, unsigned enablement, unverified manifest-digest claims, review-before-import chronology, or architecture-invented zero-result evidence as blocking product semantics.

## Negative publication gates

An expected failure counts only if:

- exit status is nonzero;
- the failure reason is the intended missing release evidence;
- no earlier accidental configuration omission makes the gate permanently impossible;
- the documented positive command supplies all inputs needed once publication evidence exists.

## Fixture-to-consumer identifier parity

A release-specific allowlist can be closed and still reject every real record. For each identifier carried from domain content into analytics, routes, progress, or feedback (for example `conceptId`, `artistId`, or `packVersion`):

1. Collect exact runtime values from the immutable fixtures, not only planning categories or prose examples.
2. Submit every distinct fixture value to each consuming executable schema.
3. Compare accepted consumer values back to the domain authority.
4. Reject undocumented mappings between generic planning categories and stable record identifiers.

A particularly dangerous false success is an analytics schema that accepts a neat generic concept taxonomy while rejecting all actual claim `concept_id` values. Normal schema tests often miss this because they construct only schema-native examples.

## Release-generic review-binding closure

A frozen pilot can appear immutable while the reusable publication path silently stops enforcing reviewed semantics for later records. Whenever semantic digests, approval receipts, or reviewer-bound registries are keyed by record ID:

1. Identify every condition that activates registry equality or digest checking, especially revision names, pilot flags, optional lookups, and `if expected_digest` branches.
2. Mutate a reviewed record to a **novel but structurally valid ID**, update all references, and switch to the next plausible release/revision value in reviewer-owned scratch.
3. Change one content-bearing field while preserving lifecycle/reviewer metadata. The reusable validator must reject because the new ID lacks a reviewed binding—not accept because a lookup returned no digest.
4. Repeat on the real publication path, not only the pilot-validation path. Require exact registry closure for every release and every review-bound record class.
5. Bind each review receipt to the exact semantic digest it approved. Candidate-level immutability alone does not prove that retained record-review metadata approved the current record bytes.
6. Combine the novel-ID probe with a scalar-type mutation. Code such as `len(str(value))` can accept integers for a normative string field after the digest guard is bypassed.

Treat a pilot-only static registry as insufficient for implementation approval when the product requires later generated records or a full-corpus publication gate. The smallest correction is a release-generic, candidate-contained reviewed-binding registry with exact equality and fail-closed missing-entry behavior.

## Per-record enum and scalar semantics

Do not treat exact keys as a fully closed shape. For each record class:

- compare its normative enum independently with the validator; a shared lifecycle validator must not expose a superset such as `archived` to record types whose contract excludes it;
- mutate every enum to a value allowed only by a sibling record class;
- probe scalar semantics named by the contract, including BCP-47 language tags, ISO calendar dates, nullable fields, integer/string distinctions, and date ordering;
- do not treat a loose regex such as a primary language plus arbitrary 2–8-character subtags as proof of BCP-47 validity; test structurally invalid but regex-matching tags (for example a two-digit region subtag), and validate every field declared as a language/locale—not only the most visible alias field;
- explicitly probe booleans wherever Python code uses `isinstance(value, int)`: `bool` is a subclass of `int`, while JSON Schema/YAML product semantics normally do not treat `true` as a positive integer version;
- parse calendar dates rather than accepting only a digit-shaped regex when the contract promises a dated identity;
- test cross-field temporal bounds, not only calendar parsing and start/end pairs. When the product says future-dated records fail closed, mutate release-version dates, entity effective dates, lineage dates, alias validity dates, and relation dates beyond the release creation time and assert the intended rejection reason.

### Prove the intended rejection reason

A negative probe is valid only when it reaches the rule it is meant to test. Lifecycle mutations often trigger an earlier review prerequisite (for example, changing a first-reviewed record to `archived` may require a second review) and can create a false impression that the record-specific enum is closed.

For each hostile mutation:

1. Supply every unrelated prerequisite needed to make the mutated record otherwise valid, such as distinct passing reviews with valid timestamps.
2. Assert the specific rejection reason, not merely that some exception occurred.
3. If the validator accepts the fully prerequisite-satisfied mutation, record the semantic closure failure even when a simpler mutation happened to reject earlier.
4. Keep a positive sibling control (for example, `archived` on the one record class that normatively permits it) to distinguish an overbroad allowlist from a blanket rejection.

## Scope-removal closure

When a revision deliberately removes a route, event, public directory, receipt, source path, or other product surface, verify subtraction across every active/current/blocking artifact—not only the canonical route table:

1. Search active PRDs, domain contracts, delivery plans, UI guidance, editorial/operating contracts, migrations, release criteria, schemas, and tests for the removed surface and its identifiers.
2. Search semantic synonyms and parent concepts, not only the exact removed identifier. For example, after removing a `member-detail route`, also inspect phrases such as `member route`, `group-member route`, `person page`, `profile URL`, and “may resolve.” Exact-string subtraction can miss an operative allowance expressed under an older name.
3. Distinguish historical review prose and negative tests from operative requirements. Give special weight to sections titled product-approved interfaces, launch workflow, must-ship scope, or blocking operating contract.
4. Require negative route/schema tests where practical. For prose-heavy packets, add a subtraction test over the explicit active-artifact allowlist, with forbidden semantic phrases reviewed rather than blindly regexed.
5. Treat one active contract that still permits the removed surface as a contradictory source of truth, even if a newer index claims removal.

Common failure: a route contract excludes member-detail pages while a current delivery plan still calls a `group-member route` a product-approved implementation interface. Searching only `/member/` or `member-detail` produces a false closure result.

## Held-source authorization closure

A source can be held in the canonical source matrix yet remain accidentally authorized by an editorial workflow or implementation plan. For every held/blocked source:

1. Search adapter IDs, provider names, generic source-family names, and combined phrases such as `MusicBrainz/Wikidata` across active product, editorial, migration, and operating artifacts.
2. Compare enabled launch sources with every seed/import/retrieve/poll/store/display instruction—not just runtime adapter configuration.
3. Treat “retrieve allowlisted fields” as authorization when it appears in a blocking launch workflow, even if another artifact says the source is held.
4. Require the workflow to name only enabled sources and state that held sources need a separately reviewed exact request/field/cache/rights contract.

An internally contradictory source or rights instruction is blocking at architecture readiness because implementation would otherwise choose which authority to obey.

## Cryptographic review-receipt closure

A valid signature over a record digest does not by itself prove approval, chronology, or disposition. Inspect the exact signed message and the exact digest projection.

For every reviewer-owned receipt:

1. Confirm the signature covers a closed, domain-separated envelope containing at least receipt schema/version, reviewer identity, outcome, reviewed timestamp, record class/ID, exact reviewed-record digest, and any release/evidence identity used by chronology or publication gates.
2. Mutate `outcome` and `reviewed_at` independently while preserving the original signature. Both mutations must invalidate signature verification, even when the altered timestamp remains inside the validator's otherwise acceptable chronology window.
3. Inspect recursive digest filters. A generic rule that removes every key named `status` can silently omit nested editorial decisions such as duplicate-review disposition while intending to exclude only top-level lifecycle state.
4. Mutate every nested review disposition (`clear`, `flagged-pass`, `flagged-reject`, rights/risk decisions, and equivalents) while preserving the original digest/signature. Any reviewer-semantic change must fail cryptographically, not merely because a later lifecycle check happens to reject one value.
5. Distinguish structural validation from authenticity: `retrieval ≤ reviewed_at ≤ release` proves only that candidate-supplied timestamps are plausible unless the reviewer signed the timestamp. Likewise, requiring `outcome: pass` does not prove the reviewer chose pass unless the signature binds outcome.
6. When a candidate contains only passing receipts, reason from the signed-message construction as well as executable probes: if pass/reject is omitted from the signed envelope, the same signature is cryptographically valid for either value even if no rejected fixture is packaged.

Treat unsigned approval outcome, review chronology, or publication-affecting disposition as a blocker for any product whose trust model depends on independent review. The smallest correction is normally a closed signed receipt envelope plus explicit top-level lifecycle exclusions rather than recursive key-name deletion.

## Integrity discipline

Run generators and tests only in a writable reviewer-owned scratch copy. Before and after review, verify manifest digest, listed hashes, listed/payload counts, duplicates, missing/unlisted files, writable entries, symlinks, and bytecode/cache artifacts. Remove scratch after collecting exact outputs.
