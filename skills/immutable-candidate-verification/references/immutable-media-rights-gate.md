# Immutable media-rights and asset-operations gate

Use when an exact candidate contains review-only photography, a rights manifest, local runtime evidence, and possibly a separately restricted evidence package.

## Separate the two verdicts

Always issue independent verdicts for:

1. **Access-controlled local design-review use** — assess whether the narrow review-fixture source class, terms capture, source receipt, age/minor handling, derivative chain, exact placements, disclosure, and local-access boundary are sufficient.
2. **Production-media readiness** — assess production grants/licenses, approved/active state, release assumptions, attribution, fallback approval, takedown/purge operations, and exclusion of review-only bytes.

Do not reject local review merely because production approvals are intentionally absent. Conversely, a truthful prototype badge does not cure missing review-use evidence. A candidate can pass the first verdict and fail the second.

## Freeze and verify the candidate

Before opening semantic evidence:

- verify the pinned checksum-manifest digest and exact entry count;
- recompute every listed file checksum;
- enumerate the actual filesystem independently and require exactly the listed files plus the checksum manifest itself, unless the contract explicitly names another allowed unlisted file;
- record the same digest/count/closure after the only authorized report write.

A short Python verifier is often safer than a long shell pipeline because it can assert manifest digest, count, file existence, file checksums, and unmanifested-file closure in one process with an unambiguous exit code. Still use `set -euo pipefail` for shell variants and never let a final `printf` mask an earlier failure.

## Resolve evidence, not just digest strings

For every rights row:

1. Parse the CSV with a real CSV parser and assert exact row/column counts.
2. Resolve `permission_evidence_uri`, `original_storage_key`, and any receipt/inventory paths mentioned in notes.
3. Require the referenced evidence bytes to exist in the frozen candidate **or** in a separately pinned, access-controlled evidence package whose digest/count and reviewer access path are part of the gate input.
4. Recompute evidence hashes, acquired-original hashes, and delivered derivative hashes against the actual bytes.
5. Replay source/age receipts to prove UUID, represented age/adult status, and source hash belong to the same acquired asset. Never infer age from appearance.
6. Treat a README claim that an evidence directory exists as testable. If the directory is absent and no separately pinned restricted package is supplied, fail the local-review verdict closed.

A hash copied into the CSV does not prove that the evidence exists or is retrievable. Do not add or regenerate missing terms captures, receipts, or originals inside the rejected immutable candidate. Restore or reproduce them only in the mutable authoritative source, rerun source→original→derivative and permission-evidence verification, assemble a new immutable candidate, and obtain fresh review.

Before freezing, run the assembly preflight in `references/immutable-bundle-assembly-preflight.md`; checksum closure alone does not prove that claimed evidence was included.

## Evidence authority and documentation mismatches

Not every digest mention has equal authority. Establish the evidence chain before classifying a mismatch:

1. Identify the manifest field or pinned bundle digest that authorizes the evidence package.
2. Verify the bundle file against that digest, then verify every bundle member against the bundle's own path/hash list.
3. Confirm the manifest rows point to that verified bundle and independently replay the source/original/derivative/placement semantics.
4. Treat a conflicting digest in a convenience README or human summary as a documentation defect—not automatically as a broken evidence chain—when the authoritative manifest→bundle→member chain is complete, unambiguous, and independently valid.
5. Fail closed if the conflicting prose is itself the only permission evidence, if authority is ambiguous, if the manifest points to the stale digest, or if any bundle/member replay fails.
6. Record the mismatch visibly and require correction in a future candidate even when it is non-gating for the current narrow local-review verdict. Never silently normalize the report to the value you expected.

This distinction applies only to evidence integrity. It cannot promote review-only media to production or excuse missing approvals, releases, placement grants, or publication/purge proof.

## Avoid false hash mismatches

Derivative IDs often contain only a short digest prefix for readability. Do not compare a full file SHA-256 to that prefix as if it were the authoritative digest. Locate the full derivative digest in the manifest's dedicated field, structured notes, or lineage artifact, verify the prefix agrees with it, then compare the full digest to the delivered file. Report a mismatch only after identifying the intended authoritative field.

For composites and authored fallbacks, determine whether the row treats the delivered byte as the original or as a derivative before choosing the comparison field.

## Runtime and disclosure checks

Corroborate that the running specimen serves candidate-identical bytes for representative HTML, JS, CSS, manifest, and media files. Check the actual listening address: requesting `127.0.0.1` does not prove the process is not also bound to all interfaces.

Inspect desktop and mobile rendered evidence for:

- a persistent global stock/prototype/non-artist disclosure;
- per-frame labels where photographs could otherwise imply identity or official status;
- fictional/static/no-live-source qualification for entities, events, challenges, and recommendations;
- a keyboard-accessible source/credits affordance;
- no production, endorsement, official, or live-data implication.

Verify evidence links through the runtime too. A 404 for a manifest-declared local evidence path is direct operational evidence of an incomplete bundle, even if public serving of restricted evidence would normally be undesirable. If evidence must not be web-served, the manifest should use a separately pinned restricted-store URI rather than a runtime-relative path, and the reviewer must still be able to resolve it through the restricted channel.

## Exact placement and fallback closure

Compare every manifest placement to the real source/render inventory. Distinguish:

- a byte currently rendered on a route;
- a governed fallback available for a route;
- an intended future placement.

Do not silently treat these as equivalent. Require a machine-readable exact-placement inventory and verifier when the candidate claims one exists. The verifier should fail on undeclared media, stale declarations, wrong derivative hashes, or unsupported fallback coverage.

## JPEG whole-container and decoder closure

A correct extension, SOI/EOI signature, checksum, byte count, and successful decoder call do not prove that the complete file is one valid JPEG. For governed JPEG cohorts, share one bounded validator between source ingestion and emitted-public verification:

1. Enforce the byte cap before parsing or decoding.
2. Structurally scan the original bytes first: require SOI at offset zero; parse length-delimited segments without inspecting payload bytes as markers; handle fill bytes, entropy stuffing, restart markers, and progressive multi-scan transitions; reject malformed/truncated lengths, unexpected second SOI, misplaced standalone markers, missing EOI, and any bytes after the first structural EOI. Test trailing text/binary and two concatenated valid JPEGs after updating every attacker-controlled hash/length/manifest field.
3. Decode only after whole-container acceptance, with strict bounded decoder options and exact positive declared-dimension parity. This avoids spending decoder work on a container already known to be invalid and makes structural and semantic failure ordering explicit.
4. Treat decoder quirks separately from JPEG validity. If the structural contract accepts standalone TEM (`FF01`) at legal marker boundaries but the decoder rejects it, derive decoder-only bytes by removing only scanner-identified TEM ranges. Preserve original bytes for hashes, rights receipts, emission, and identity; reuse the original buffer when no TEM exists. Never strip marker-looking bytes inside length-delimited payloads or stuffed entropy data. Verify disputed placements with an independent decoder/spec probe and explicitly reject unsupported placements rather than silently normalizing them.
5. Include positive controls for baseline and progressive images, restart-coded scans, marker fill, TEM at legal boundaries, and marker-like `FFD9`, `FFD8`, `FF01`, `FF00`, and restart bytes inside APP payloads. Include negative controls for restart/TEM placement outside the supported state machine, malformed segment arithmetic, trailing payloads, and concatenation. Reconcile every real source and emitted image against exact hashes, bytes, dimensions, and rights rows after the parser change.

Keep structural validation linear in bounded input size. A bespoke scanner remains a review risk, so require an independent quality probe in addition to the repository regressions.

## Report shape

Record:

- both explicit verdicts near the top;
- immutable identity before and after the report write;
- positive controls separately from blockers;
- exact missing paths/URIs and runtime status where relevant;
- local-review remediation separately from production-promotion requirements;
- an operational-not-legal-advice boundary.

If the workspace is not a Git checkout, do not make Git cleanliness claims. Direct checksum closure is still authoritative for the supplied immutable directory; simply record that repository-status corroboration was unavailable.
