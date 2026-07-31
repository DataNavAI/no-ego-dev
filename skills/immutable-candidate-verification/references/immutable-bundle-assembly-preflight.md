# Immutable bundle assembly preflight

Use when freezing a file-based candidate outside Git, especially a visual-review bundle that mixes generated screenshots, rights evidence, manifests, and human-readable inventory claims.

## Failure mode this prevents

A source workspace can contain valid rights or QA evidence before assembly, yet the frozen candidate can omit it because:

- a capture/build script recreates the whole `evidence/` tree rather than only its generated subtree;
- an exclude pattern is broader than intended;
- assembly copies the runnable app but not restricted receipts or quarantine originals;
- README/source-sheet copy is updated before the referenced artifacts are actually bundled;
- a checksum manifest proves only the files that were included, not that all claimed or referenced files were included.

A perfectly closed checksum manifest can therefore describe an incomplete candidate. Inventory closure and semantic reference closure are separate gates.

## Durable directory rule

Separate **regeneratable output** from **governed evidence**:

- generated captures/reports: `evidence/generated/` or another disposable subtree;
- governed rights/source receipts, quarantine originals, signed approvals, and exact-placement inventories: `evidence/rights/` or a separately pinned restricted package;
- review reports: outside the immutable candidate unless the review protocol explicitly authorizes one report write.

Capture/build scripts may replace only their declared generated subtree. They must never delete the parent evidence directory. Before and after any generator, snapshot governed-evidence path, file count, and digest closure.

## Assembly sequence

1. **Pre-assembly source check**
   - Verify every governed evidence directory exists.
   - Parse each rights/provenance manifest with a real parser.
   - Resolve every local evidence/storage/lineage/placement URI against the source tree.
   - Recompute evidence, original, derivative, and fallback hashes.
   - Verify any README/file-inventory claim against the source tree.

2. **Copy by explicit inclusion**
   - Prefer an allowlisted copy recipe or copy the complete candidate subtree and then remove only explicitly excluded review outputs.
   - Do not assume a successful copy means required semantic inputs were included.
   - If using exclude patterns, enumerate their matches before copying and fail if they intersect governed evidence.

3. **Post-copy semantic closure before freezing**
   - Require every manifest-declared local URI to resolve inside the assembled candidate or a separately pinned restricted package.
   - Require every README/source-sheet named directory and report to exist.
   - Require exact-placement and media-verification artifacts when claimed.
   - Serve the assembled directory on loopback and require representative evidence URLs to return success.
   - Compare representative served bytes with the assembled files.

4. **Create immutable identity last**
   - Only after semantic closure passes, generate the checksum manifest, record its digest and entry count, and make the candidate read-only.
   - Enumerate the filesystem independently and require exactly the manifested files plus the checksum manifest.
   - Archive from the read-only candidate, then record archive hash and size.

5. **Independent review**
   - Give each reviewer the same absolute candidate path, manifest digest, expected entry count, runtime, no-edit instruction, and explicit verdict schema.
   - Require before/after closure.

## Regeneration rule

If the frozen candidate omitted evidence, reject that candidate. Restore or reproduce the evidence only in the mutable authoritative source, rerun the full source-chain verifier, assemble a **new** candidate identity, and obtain fresh candidate-bound review. Never add files to the old immutable directory or pretend its prior verdict covers the replacement.

## Minimal machine checks

At minimum, the preflight should assert:

- checksum manifest digest/count and no unmanifested files;
- all manifest rows/fields parse as expected;
- every `local://` URI resolves;
- README/source-sheet inventory claims resolve;
- permission evidence and original/derivative/fallback hashes match;
- represented-age/adult receipts bind to the exact source asset without appearance inference;
- exact placements and fallback IDs resolve;
- all review-only assets remain fail-closed from production;
- loopback evidence endpoints are reachable when runtime-relative paths are promised.

Do not weaken production rejection to make a private-review gate pass. Keep local-review permission and production-media readiness as independent verdicts.