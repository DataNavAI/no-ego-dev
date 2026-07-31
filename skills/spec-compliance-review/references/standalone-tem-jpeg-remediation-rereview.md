# Standalone JPEG TEM remediation rereview

Use this after a whole-container JPEG scanner correctly rejects trailing/concatenated bytes but the selected strict decoder falsely rejects valid standalone TEM (`FF01`) markers.

## Required design

1. Structurally validate the **complete original container before decoding**.
2. Recognize TEM only at validated structural marker boundaries. Record exact byte ranges without interpreting `FF01` inside length-delimited APP/COM payloads as structure.
3. Reject TEM encountered while scanning entropy-coded data when that placement is intentionally unsupported; corroborate the boundary with an independent decoder when practical.
4. Build decoder-only bytes by removing only recorded standalone TEM ranges. Do not mutate the caller buffer or use derived bytes for hashes, byte counts, filenames, receipts, manifest identity, or public emission.
5. Strictly decode the derived bytes and require exact positive declared-dimension parity. Preserve all existing byte, pixel, resolution, memory, first-EOI, and no-trailing-data limits.
6. Ensure the same shared validator is called at source ingestion and emitted-public verification.

## Minimum positive matrix

Start from a known-valid JPEG and preserve its declared dimensions:

- unchanged baseline;
- TEM immediately after SOI;
- TEM between two length-delimited marker segments;
- marker-like `FF01` bytes inside an APP/COM payload (must remain untouched);
- marker fill before an ordinary marker;
- progressive/multi-scan JPEG;
- restart-marker JPEG.

For each TEM-positive case, hash the original input before and after validation to prove non-mutation.

## Minimum negative matrix

- TEM inserted into entropy-coded data, with a stable explicit rejection;
- missing/second SOI;
- malformed length `< 2`;
- truncated segment/container;
- missing EOI;
- valid JPEG plus trailing text/binary;
- concatenated valid JPEGs below the byte cap;
- falsified declared dimensions.

Run trailing and concatenated attacks at both source and public boundaries with every attacker-controlled identity updated so an earlier hash/path mismatch cannot mask structural acceptance.

## End-to-end identity probe

Use a disposable isolated source tree containing the exact candidate `src/`, `schemas/`, `scripts/`, and decoder dependency. Insert standalone TEM into one valid source JPEG, then update only the disposable canonical derivative hash, byte count, content-addressed path, and credits path. Run the real build and public verifier with the reviewed revision explicitly bound. Require:

- build and public verification pass;
- emitted bytes equal the complete TEM-bearing source bytes byte-for-byte;
- emitted SHA-256 equals the TEM-bearing canonical digest;
- only decoder input is TEM-stripped;
- the disposable source/output is removed afterward.

This closes the key false-success risk: a helper-level decode test can pass while the real build hashes or emits the derived TEM-free buffer.

## Independent corroboration and cohort inventory

When available, run a second decoder such as `djpeg` against structural-TEM and entropy-TEM fixtures. Treat this as corroboration, not the contract. Independently inventory every committed production JPEG for SOS count, stuffing, restarts, fill, TEM, terminal EOI, and trailing bytes; this proves which state-machine paths the real cohort exercises.

## Evidence to report

Report separately: exact SHA/base/tree, focused and canonical test counts, direct positive/negative probe counts, independent-decoder results, end-to-end TEM identity preservation, production cohort marker inventory, build/public counts, dependency audit, final moving-PR head, and clean exact checkout. Temporary probes and worktrees must be removed.