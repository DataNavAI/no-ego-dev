# Source-rights editorial record audit

Use this recipe for immutable content candidates that combine a fixed catalog, source mappings, raw provider responses, reviewed claims/questions, and feed-style records.

## 1. Bind the candidate before inspecting content

Record the candidate SHA-256, byte size, and modification identity before review. Recompute the SHA-256 after all probes. A content PASS is invalid if the bytes changed, even when the resulting records still look equivalent.

## 2. Close the raw-response manifest

For every manifest row, verify all of the following against the named raw file:

- file exists;
- byte count and SHA-256 match;
- provider entity ID matches the manifest MBID/stable ID;
- manifest summary counts (aliases, relations, release groups) match the decoded JSON;
- other declared summary facts such as country and life-span presence match.

Report exact checked-row and check counts. Hash closure alone is insufficient when the manifest points to the wrong entity or carries false summary metadata.

Treat an internally self-consistent substitution as the primary hostile case: generate real temporary bytes, recompute their hash/size, load them through the production evidence-manifest reader, and change the source URL plus payload ID together. The validator must still reject when that MBID/name/type is not the authoritative reviewed mapping for the source/profile. A check that merely proves `URL MBID == payload MBID` lets a wrong entity authorize itself. Run the same full-load probe with the expected MBID but a semantically unrelated name/record; field presence alone must not support an identity claim.

Validate lexical relative paths from the original unparsed string before converting them to a path object. Common path libraries normalize an internal `./` away, making a later `parts` check unable to enforce a contract that explicitly forbids `.` segments. Then resolve and enforce package containment as a separate check.

Scan URLs in two explicit classes: (1) structured operative source/evidence/mapping fields, which must satisfy the product's exact credential-free HTTPS and hostname/path rules, and (2) recursively embedded URLs inside retained raw HTML/JSON evidence. Do not claim “zero credential URLs” from an operative-field scan when raw snapshots contain userinfo-shaped telemetry/DSN URLs. Classify embedded values separately, determine whether they are secrets or publisher-public client identifiers, and verify raw snapshots remain excluded from deployable/public artifacts when the contract makes them governance-only.

## 3. Prove exact cohort and mapping identity

Compare ordered IDs across the authoritative catalog, mapping file, response manifest, and candidate. For every row, compare catalog ID/name/type/aliases, mapped provider ID/name/type, candidate provider ID, source hash, retrieval time, and rights-decision ID. Audit every risk-flagged row explicitly rather than sampling it.

For alias identities, prove entity closure separately. Example: if one canonical solo profile owns an alternate stage name, verify that only the canonical ID exists and no second artist row implies a duplicate person.

## 4. Resolve every evidence locator

Implement a read-only JSON locator resolver for the candidate's supported locator grammar, such as:

- `$.type`
- `$.life-span.begin`
- `$.aliases[N].name`
- `$.relations[N]`
- `$.release-groups[N]`

For each claim, resolve the locator in the corresponding hash-verified raw response and compare the complete candidate projection to the exact source fields. Do not assume all projections use provider key names: define the expected projection per locator class and verify every projected value.

Resolve record-level relationship locators independently of claim locators. Require exact relation type plus authoritative target stable ID; a relation of the right type to an unrelated target is not evidence. If a locator includes a display name, compare exact Unicode source bytes as well as the stable ID—ASCII hyphens, Unicode hyphens, transliterations, localized names, and case variants can make a visually plausible locator unresolved. Report `total / exact matches / mismatches` across the complete relation inventory. A validator that checks only `locator != empty`, or only that some relation of the requested type exists, is a false-success path.

Probe the production publication path with a syntactically valid nonsense relationship locator. It must reject after all unrelated prerequisites are satisfied; rejection earlier for missing reviews or incomplete cardinality does not exercise locator enforcement.

Also verify source URL binding, text length/shape, review state, and rights scope. The permitted MusicBrainz-style core set includes identifiers, names, aliases, type, life-span fields, artist relations, and release-group identifiers/types/first-release dates only when the governing rights decision says so.

## 5. Verify question determinism

For every question:

- referenced claim exists and has the same concept;
- source reference/URL is identical to the claim's source;
- teaching feedback does not exceed the claim and preferably matches it exactly;
- exactly four options exist;
- options are unique both byte-for-byte and after Unicode normalization/case/punctuation folding;
- `correctOption` is an in-range integer;
- selected answer is derived from the located evidence, not merely copied from an unverified candidate field.

Check punctuation and prompt grammar mechanically, then inspect templates and unusual records manually.

## 6. Verify feed/Following rows as source projections

Treat each feed-style record as a separate reviewed record. Resolve its stable source entity ID (for example a release-group ID) in the raw response and compare title, type, source date, and canonical source URL exactly. A future source date is not automatically an error: it may be scheduled catalog metadata. It becomes a finding only when wording or UI labeling turns that date into an unsupported `released`, `current`, `latest`, `official`, or real-time assertion.

## 7. Audit editorial semantics

- Open-ended relations must say that no end date was supplied; they must not say `current` merely because the end field is null.
- Closed relations must state both beginning and ending dates.
- `first dated` is acceptable only when explicitly bound to a source field such as `first-release-date`; it is not permission for a general superlative.
- Scan for `latest`, `current/currently`, `newest`, `official`, `only`, `all`, `most`, and `first`, then manually distinguish source titles and field-scoped wording from unsupported status claims.
- Require visible source/provider labeling, retrieval or source-date context where the contract requires it, and an explicit non-official/non-real-time disclaimer for community catalog data.
- Scan recursively for forbidden source families or fields outside the rights decision.

## 8. Review-state, release-identity, receipt, and key-authority discipline

Count mappings, claims, questions, and feed records independently. Verify every first-review object and ensure the proposed second reviewer is distinct. A manifest-level reviewer name never authorizes individual records.

For signed review receipts, separate **envelope integrity** from **key-registration authority**:

1. With the exact fixed trust registry, mutate outcome, review time, reviewer ID, record class/ID, release version, and nested editorial disposition independently. Recompute every caller-controlled record digest and outer checksum manifest while retaining the original signature. Every mutation must reject.
2. Ensure the reviewer-ID mutation actually changes the original value; select the other registered ID dynamically rather than assigning a hard-coded value that may already be present.
3. For nested dispositions, recompute the parent reviewed-record digest before validation. Rejection at a stale digest comparison does not prove that the signature binds the nested field; require rejection at envelope/signature verification or an equivalent authenticated binding.
4. Probe coordinated provider substitution with source ID/URL/payload/name/evidence hash and reviewed-record digests changed together. Under the fixed registry and without reviewer private keys, it must reject.
5. Independently test the authority above the signatures. If the public-key registry is candidate-local, replace it on a disposable copy with attacker-generated keys, resign all receipts using only those fresh disposable private keys, recompute every affected semantic/evidence hash and the complete outer checksum manifest, and rerun the production validator. Use distinct attacker keys first so duplicate-key rejection cannot mask whether the external anchor closes registry replacement; probe duplicate active keys separately. Acceptance under the originally pinned anchor is an implementation blocker even when all fixed-key mutations reject.
6. Run a paired positive control with the same fully re-signed hostile copy: deliberately supply its attacker-computed registry digest. If the validator accepts only under that digest and rejects under the originally pinned digest, the cryptographic closure works and protected digest delivery is proven to be the remaining authority boundary. Report both results; do not misstate a required CLI digest argument as independently trusted merely because it is required.
7. Probe the registry lifecycle independently: missing/wrong anchors, duplicate active keys, a receipt signed by a now-revoked key while enough other active keys keep the registry structurally valid, silent syntactically valid version rotation, and registry-ID mutation. A revocation test that leaves fewer than the minimum active identities can stop at cardinality and fail to exercise revoked-receipt rejection.
8. Require a trust anchor outside candidate-controlled bytes: immutable registry identity/version/digest, enrollment and identity proof, independence of unique signing identities, rotation/revocation/compromise handling, and a defined private-key custody/signing boundary. Bind that registry identity into the receipt or immutable review package. Assess delivery separately from validation: protected environment ownership, attestation binding, who may update the value, rollback approval, and rejection of candidate/PR-selected values must be determinate before deployment promotion.

Never request or access real reviewer private keys. Fixed-registry hostile probes need no private key; a candidate-registry-takeover probe may generate fresh ephemeral attacker keypairs solely in the disposable copy. Re-sign every non-null receipt in the hostile graph, not only visibly changed source/mapping records, because aggregate and child receipts can otherwise fail for stale setup rather than the authority boundary under test.

When recomputing checksum manifests for hostile copies, preserve the original manifest path order. Sorting paths into a new order changes the manifest digest even for an unmodified baseline and weakens comparison clarity. First prove that a no-op recomputation reproduces the exact original manifest digest, then record each hostile manifest digest.

Close release metadata semantically, not only structurally: reject empty/impossible release versions, unknown lifecycle/status values, and enum drift in every nested metadata object (including aliases). An exact-key check does not validate the values behind those keys. Mutate each enum independently and include at least one syntactically present but empty release identifier.

If PASS, issue a compact receipt only for records actually verified and bind its applicability to the exact candidate hash. When schemas differ (`reviewerId` versus `reviewer_id`), provide equivalent serialization forms without changing the semantic reviewer/time/outcome tuple. Never apply a blanket receipt to unverified entity, source, relation, pack, or profile records merely because they share the same candidate.

## Publication-finalization authority closure

When an eligibility-reviewed candidate is later signed, finalized, compiled, or projected for publication, audit the complete authority path rather than stopping at valid exact bytes:

1. Verify the release-level receipt cryptographically yourself, then separately trace whether the production compiler verifies its exact envelope, enrolled reviewer, signature, registry/release/record identity, report digest, reviewed-candidate digest, and chronology. A compiler that checks only the private-release hash, a passing outcome, and a nonempty candidate digest has an unsigned-receipt bypass even when the supplied receipt happens to be valid.
2. Compare the exact records consumed by the compiler with the normalized signed inventory. If the compiler reads a separate private projection, enumerate every source, mapping, change, claim, and question review in that projection. Valid signatures in a sibling normalized release do not authorize records the compiler never reads.
3. Derive an inventory-difference equation. In particular, check whether feed/change rows are excluded from the normalized receipt count. If they later become published records, require their own digest-bound first and second receipts or a contractually sufficient aggregate envelope that authenticates both stages; abbreviated `{reviewer, time, outcome}` stamps are not equivalent.
4. Treat report-token scope as signed semantics. If a report says it authorizes only second-review eligibility and expressly disclaims publication, no finalizer may use mere token presence to mark records or a release published. Require a separate publication decision or make the later signer’s authenticated envelope explicitly assert publication authority without contradicting the bound report.
5. Resolve every receipt digest to contained, checksum-closed bytes. A `reviewedCandidateSha256` whose preimage is absent from both the outer and nested immutable manifests is not independently reproducible merely because a report repeats the digest.
6. Inspect finalizer source for synthetic review creation. A tool that copies reviewer IDs/timestamps or manufactures abbreviated per-record reviews while changing lifecycle to `published` must not be treated as evidence that those records were actually signed.
7. Reconstruct the public projection independently and validate its schema, but keep content correctness separate from authorization correctness: an exact, leak-free projection can still be publication-blocked by a bypassable compiler or invalid review lineage.

## First-stage eligibility versus publication authority

Some workflows ask whether a fully first-reviewed candidate is eligible to receive independent second reviews, not whether it may publish yet. Keep those gates distinct:

1. Derive the exact normalized record inventory by class and verify every first receipt independently. A useful closure equation is `sources + entities + profiles + relations + packs + claims + questions`; do not trust an asserted aggregate.
2. For every receipt, independently reconstruct the substantive digest, verify the complete canonical signed envelope, require the expected enrolled first reviewer, and check `evidence retrieval <= first review <= release creation`.
3. Feasibility rows may legitimately combine digest-bound `content_status: production-enabled` (the reviewed target) with lifecycle `mapping_review_status: first-reviewed`. In that state, the derived production-enabled summary must remain zero, every second receipt must remain null, and changing lifecycle to published must fail for want of a second review.
4. Bind each feasibility row to the exact candidate-contained manifest path, bytes, digest, import result/count, release version, and completion time. Check `import completion <= first review <= release creation` for every row, not only globally.
5. Run both validator modes. The ordinary exact-candidate command must pass; the publication-required command must fail specifically on missing second review. That paired result proves readiness for second review and continued non-authorization.
6. When an unsigned private projection separately carries feed/change rows that are not part of the normalized signed inventory, audit their exact evidence projection and explicitly report that their null reviews are intentional. Do not incorrectly add them to the normalized receipt count.
7. If the candidate directory is not a Git repository, do not invent a cleanliness or commit claim. Capture all required file hashes before review, rerun the complete deterministic audit afterward, and require byte-identical structured results.
8. If the requester supplies an outer checksum manifest, treat its complete payload set as the privacy/source-rights boundary even when the named content YAML is clean. Scan every manifested text/metadata payload and recursively inspect governed evidence packages. A package whose governing decision says `candidate_included: false`, external-only, restricted, or non-deployable is a blocker when its response bodies or normalized copies are nevertheless listed in the outer manifest. Separately count machine-local paths in machine-readable artifacts; exact hashes do not cure prohibited inclusion or privacy leakage. Scan **all manifested text**, including historical Markdown reviews and test transcripts—not only JSON and current release data—for macOS/Linux home paths, Windows profiles, local-file URI schemes, and absolute temporary paths under both the system temp root and its macOS realpath alias. Treat macOS var-folders paths the same way: probe both the private-prefixed real path and its non-private absolute alias. A freezer that rejects only home-directory prefixes—or only one lexical alias of the same machine-local location—is incomplete. In external scratch, first prove a valid baseline freezes, then independently inject each prohibited path class and each relevant lexical alias and require every negative fixture to reject. Keep candidate-byte cleanliness separate from freezer completeness: zero occurrences in the current immutable payload does not excuse a bundled freezer that accepts a prohibited hostile fixture. Distinguish a generic documentation mention of a local-file URI scheme from a concrete local path disclosure, but report both scan classes separately when the contract is broad. In the durable review, cite exact file/line and occurrence counts without copying the forbidden path bytes when that report may itself later be byte-scanned.
9. Trace the requested eligibility verdict token through every bundled consumer before issuing it. A nominally phase-limited token is unsafe if a finalizer/compiler accepts the same token as publication authority. Require a distinct final-publication decision/capability and verify that downstream tools consume the complete signed inventory rather than synthesizing abbreviated reviews. This remains an eligibility blocker because issuing the token would directly unlock an out-of-scope action. Exercise a three-case external-scratch authority matrix against the real finalizer: eligibility-only must reject before private-input reads, a mixed eligibility/final-publication report must reject, and final-publication-only must pass the report gate but stop safely at a deliberately absent later input. Assert no release or receipt output exists in every case; this proves token separation and write ordering without keys or mutation.
10. If the requester allows exactly one verdict token, count both allowed verdict strings in the completed report: require one occurrence of the selected token, zero of the other, and one total. Then independently compute and return the report's SHA-256 and reverify the candidate manifest digest after the report write.
11. Treat the named hostile freezer matrix as a minimum, not a representation ceiling. Run the exact required forms and report `N/N`, then add operational aliases separately—for example Windows profiles with both separator spellings—even when one alias is incidentally caught by a broader substring such as a macOS-home fragment. First prove a valid baseline freezes; run each hostile value alone; and remove any accepted read-only scratch output safely before the next case. Distinguish “required forms” from “expanded representations” in the durable report so a passing aggregate cannot hide an untested spelling.

For first-stage eligibility, a positive verdict authorizes only the next review action. It is not a scoped second-review receipt and must not be described as publication, signing, promotion, or deployment authority. Do not issue it when any bundled consumer treats it as broader authority.

## Minimum report

- exact verdict vocabulary requested by the user;
- before/after candidate hash;
- raw-manifest row/check counts and mismatch count;
- mapping count and explicit risk-row dispositions;
- claim/question/feed counts and locator-class totals;
- relation open/closed wording counts;
- record-level findings with exact IDs and fields, or an explicit zero count;
- source-rights and status-inference conclusion;
- scoped second-review receipt only on PASS when the task actually requests a publication/content verdict, not merely eligibility to perform second review;
- files modified (`none` for immutable review, or the exact requested report only).
