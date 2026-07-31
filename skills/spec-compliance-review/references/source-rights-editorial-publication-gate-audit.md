# Source-rights and editorial publication-gate audit

Use this recipe for immutable product/PRD bundles that combine ranked catalogs, third-party source decisions, editorial review workflows, and release validators.

## 1. Close immutable evidence, not only policy prose

- Verify the checksum manifest digest, exact entry count, every entry, and file/directory write bits before and after review.
- Resolve every local evidence reference named by rights decisions. A document claiming that raw/normalized responses and a receipt manifest live under `evidence/` is not candidate-bound when those paths are absent from the checksum-closed bundle.
- If raw publisher material cannot be included, require a separately pinned restricted package: immutable digest, complete receipt index, retrieval timestamps, response hashes, normalized relied-on quotations, and explicit linkage from the public candidate.
- Never replace missing immutable receipts with a later live re-fetch. The later bytes may differ and endpoint availability is not a license.

## 2. Apply the license boundary to research/ranking inputs too

Do not limit source-rights review to production feed adapters. Ranking and catalog-prioritization datasets can also enter public bundles.

For each third-party metric source, determine one of two explicit outcomes:

1. rights/terms permit the exact stored and displayed fields; or
2. values, normalized datasets, and receipts are governance-only and excluded from production bundles, APIs, analytics, and UI.

A statement such as “not live telemetry” does not decide whether dated copied values or scores may be publicly displayed. HTTP status, robots, RSS discovery, hashes, and technical accessibility do not grant copying, retention, or republication rights.

## 3. Trace held adapters through every architecture contract

Search source policy, migrations, fixtures, seed scripts, rollback/read-both rules, release criteria, and operational runbooks. A held adapter is not safely held if any stale contract still permits an “approved RSS seed,” legacy enablement, production polling, or retained production records.

Require a migration regression proving held adapters cannot:

- seed production data;
- inherit an enabled flag from legacy state;
- be probed by the production worker;
- become readable through rollback/read-both compatibility; or
- contribute current-state or freshness claims.

## 4. Adversarially test the validator's authorization model

A normal pilot pass plus an expected `--require-published` failure is insufficient. Construct a valid-cardinality hostile fixture outside the immutable candidate and try to produce false success.

At minimum, test a 50-pack/250-claim/250-question fixture with:

- one global pair of reviewer names but no per-record reviews;
- missing first/second review outcomes and publication statuses;
- a skeletal or rights-blocked source lacking URL, rights decision, hash, freshness, or active status;
- claims lacking evidence locators or freshness classes;
- questions lacking teaching feedback, source refs, review state, or publication state;
- group packs without required lineage/member concepts and solo packs using group semantics.

The publication validator must reject each mutation independently. Aggregate counts and a global reviewer pair cannot authorize individual records.

Prefer importing the real validator in a disposable, no-bytecode probe and calling its production validation path directly. Keep the target read-only and create no fixtures inside it.

## 5. Separate architecture plausibility from publication feasibility

An all-cohort mapping/concept matrix can be sufficient architecture input only when it is honestly labeled as planned and the release remains fail-closed. Report separately:

- exact cohort and unique mapping count;
- first-reviewed, second-reviewed, and production-enabled counts;
- planned concept slots versus directly evidenced claims;
- thin-history or ambiguous-identity rows;
- pilot counts and covered risk cases;
- final publication totals and reviewer-capacity gate.

Do not call generic concept slots proof that all packs are publishable. Conversely, do not require all final content before architecture if the product decision explicitly separates those gates and the executable release validator is sound.

## 6. Verdict severity

Treat these as architecture blockers:

- a publication validator can falsely approve unreviewed or rights-unverified records;
- a relied-on immutable rights-evidence package is missing;
- public/runtime treatment of third-party ranking data is undefined;
- a migration or rollback path contradicts a held-adapter policy.

Treat incomplete second reviews/final packs as launch-held rather than architecture-blocking only when the candidate says so explicitly, the model is structurally plausible, and the executable release gate cannot be bypassed.

## 7. Close the exact candidate against executable cache artifacts

A claimed `N`-file checksum-closed candidate is not exact when it contains unlisted `__pycache__/*.pyc`, generated bytecode, caches, or other regular files. This is especially serious when documented verification imports the corresponding modules: Python may execute valid cached bytecode that is not bound by the source manifest.

- Compare all regular files with `manifest entries + manifest itself`; list every difference.
- Treat executable unmanifested bytecode as candidate-identity mismatch, not harmless metadata.
- In a disposable copy, delete all bytecode caches and rerun the canonical suite source-only before interpreting test results.
- Require a replacement immutable candidate with all caches removed (or intentionally manifested, though removal is preferable), an updated exact file count, and a regenerated manifest.

## 8. Verify rights-evidence packages are portable, restricted, and internally coherent

A local verifier can report success while reading evidence outside the candidate. Inspect every manifest path and verifier join:

- reject absolute paths and path traversal;
- resolve evidence relative to the package root and assert the resolved path remains inside it;
- prove each manifest row hashes the candidate-local byte, not an earlier scratch/work directory;
- test the verifier after copying the candidate to a new temporary location with the original evidence workspace unavailable.

Bundling raw publisher HTML, RSS bodies, images, embeds, or scripts can also conflict with a decision that says retention is prohibited or not affirmatively licensed. Require an explicit outcome: either a separately pinned access-controlled restricted-evidence package with digest/index/retention basis, or a minimized package containing only necessary quotations, metadata, and hashes. Scan raw receipts for otherwise prohibited source classes (for example YouTube embeds) and ensure the build denylist covers evidence bytes, URLs, source maps, APIs, database seeds, monitoring payloads, and downloads—not only the sanitized runtime catalog.

Treat superseded operational instructions inside an evidence package as hazardous unless they are clearly marked non-operative. A historical file that calls for weekly probing of held sources can contradict a current no-probe policy even when the newer top-level decision is conservative.

## 9. Extend publication adversaries beyond missing reviews

A validator may close the obvious global-review bypass yet still authorize rejected or incoherent records. Probe these independently on the real production validation path:

- a production source with no record-level first/second reviews;
- a `published` mapping whose first and second review outcomes are both `reject`;
- a lifecycle-`published` claim with duplicate disposition `flagged-reject`;
- questions whose concept IDs are swapped away from their referenced claims while pack-level concept cardinality stays valid;
- syntactically valid fabricated source hashes and rights scopes too narrow for the relied-on claim fields;
- profiles and membership relations with empty provenance/source references;
- source/review timestamps after immutable release creation.

Require dependency closure, not merely field syntax: every published record must have passing reviews, a non-rejected duplicate disposition, evidence hashes bound to exact bytes, rights scope covering the exact relied-on fields, nonempty provenance, per-question claim/concept coherence, and temporal ordering such as `retrieved_at <= reviews <= release_created_at`.

## 10. Keep editorial feasibility and publication approval separate

Report all-50 feasibility using exact counts: unique mappings, first/second reviewed rows, production-enabled rows, directly evidenced claims/questions, generic planned concept slots, risk-flagged rows, named reviewer capacity, measured throughput, and dated forecast. A batch limit such as “ten packs per review day” is a policy, not capacity evidence. It can remain launch-held for implementation approval only when the publication validator is demonstrably non-bypassable.

## 11. Audit signed mapping reuse as connection authority

When product state reuses a signed source/feasibility mapping as the authority for `connected`, `enabled`, or equivalent status, verify the complete authorization predicate rather than only the receipt signature:

1. Identify the exact signed record class, stable record ID, release binding, substantive digest, and lifecycle field used by production.
2. Inspect the digest helper's exclusion rules. Prose must not claim lifecycle or enablement is digest-bound when fields such as `status`, `review_status`, or `mapping_review_status` are omitted.
3. Close semantic enums for every retained enablement-like field. Two overlapping fields such as `content_status` and `mapping_review_status` must have one authoritative role or one must be removed.
4. Probe a current one-review row: flipping only the lifecycle to production must reject for the missing second review.
5. More importantly, construct a disposable valid-two-review **held** row using ephemeral reviewer keys in an in-memory/copy-only registry. First prove that the held row validates, then flip only each unsigned lifecycle/enablement field. If production validation changes from held to enabled while the signed digest remains byte-identical, an unsigned field performs the promotion. Either authenticate that assertion or derive lifecycle exclusively from authenticated receipt state.
6. Independently mutate record class, record ID, release version, outcome, substantive fields, reviewed digest, and unknown/extra enablement fields. Recompute caller-controlled digests where necessary so stale-digest rejection does not mask signature closure.
7. Distinguish “an unsigned field cannot manufacture missing signatures” from the stronger property “no unsigned field can activate production after valid signatures are staged.” The former does not prove the latter.

For state taxonomies such as `not_connected` versus `empty`, search every active product, route, coverage, source, migration, and release contract—not only the newly edited PRD table. Require one shared objective predicate. A mapped artist with an explicit successful zero-record release must not satisfy both “no published records” and “valid empty release.” Add a matrix covering missing mapping, one-review mapping, two-review held mapping, enabled mapping without an import, enabled mapping with a valid zero-record release, stale, mixed/partial, populated/ready, and transport error. Treat contradictory operative prose as an implementation blocker even when future release criteria promise tests, because tests cannot select an authoritative meaning from conflicting contracts.
