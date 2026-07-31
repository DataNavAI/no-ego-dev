# Bounded decoder-backed JPEG validation

Use this pattern when a static build or public-artifact verifier must prove that declared JPEG media is genuinely decodable and that canonical dimensions are truthful.

## Contract

A JPEG extension, `image/jpeg` label, SOI/EOI markers, byte count, and SHA-256 identity do **not** prove decodability or dimensions. One shared non-emitted validator should serve both source ingestion and emitted-public verification.

1. Enforce the compressed-byte cap before decoding.
2. Require the exact canonical media type.
3. Decode with a maintained production dependency pinned to an exact version and committed lockfile.
4. Configure decoder resource limits explicitly:
   - maximum resolution appropriate to the schema's width/height ceiling;
   - bounded decoder memory;
   - strict/non-tolerant decoding when available;
   - RGB rather than RGBA output when alpha is irrelevant.
5. Convert every decoder exception into a stable fail-closed boundary error without exposing decoder internals.
6. Require decoded width and height to be positive integers and exactly equal the canonical declarations.
7. Perform ordinary byte-count and digest identity checks as a separate invariant; decoding does not replace identity verification.
8. Keep the helper under build/verification tooling so the decoder is not emitted into browser assets.

Choose limits from the real cohort and schema rather than arbitrary defaults. Confirm every approved asset decodes under the selected limits before committing them.

## TDD matrix

Add focused regressions before implementation:

- source fixture containing `FF D8 + text + FF D9`, with manifest byte count/hash/public path synchronized, must fail specifically at decode;
- valid source JPEG with a falsified declared width or height must fail specifically on dimension mismatch;
- emitted marker-wrapped fake JPEG with its asset-manifest digest and byte count recomputed must fail specifically at decode, before a generic canonical-identity mismatch can hide the gap;
- public verifier must compare decoded dimensions to canonical declarations;
- positive coverage must decode every asset in the exact cohort and compare all dimensions.

When a public verifier imports canonical JSON at module load, test canonical-dimension mismatch through an isolated verifier fixture:

1. Copy the verifier and only its transitive local modules/contracts into a direct temporary tree.
2. Copy the decoder package needed by that fixture (or install from the committed lockfile when the test harness supports it).
3. Mutate the copied canonical manifest before importing the copied verifier.
4. Mutate the emitted canonical manifest identically and re-manifest its bytes.
5. Keep the actual JPEG unchanged, then require the copied verifier to reject the decoded-vs-declared mismatch.

This reaches the dimension assertion without weakening production APIs or adding a test-only option to the verifier.

## Structurally valid markers unsupported by the decoder

A strict decoder can reject a marker that the JPEG container grammar allows. Treat this as a compatibility seam, not permission to normalize arbitrary bytes or weaken either boundary.

1. Write a positive RED test using a real accepted JPEG with a standalone marker inserted at two structural boundaries (for TEM, `FF 01` immediately after SOI and between two marker segments). Keep declared dimensions unchanged.
2. Parse and validate the **complete original container before decoding**. Preserve all existing rules: initial SOI, length-delimited segment bounds, entropy stuffing/restart handling, first EOI at the physical end, rejection of a second SOI, and rejection of malformed/trailing/concatenated bytes.
3. During that structural walk, record exact byte ranges only for allowlisted standalone markers in legal non-entropy positions. Do not search-and-replace marker-like byte strings.
4. If there are no recorded ranges, pass the original byte object to the decoder. Otherwise, allocate a decoder-only derived byte array and copy every untouched slice around the recorded ranges. Never mutate or substitute the source/public bytes used for byte count, digest, manifest path, or publication.
5. Keep all decoder limits and strictness unchanged, and keep exact decoded-dimension parity against the canonical declaration.
6. For questionable placements such as TEM inside entropy-coded data, probe an independent decoder when useful. If the placement is not interoperably decodable, reject it explicitly in the structural parser rather than stripping it. The external probe informs the placement policy; it does not replace the production decoder boundary.

Regression coverage must prove all of the following:

- valid standalone markers at every supported structural boundary decode successfully;
- the input byte digest is unchanged before and after validation;
- marker-like bytes, including the same marker code, inside a length-delimited APP/metadata payload are untouched;
- stuffed bytes and restart markers in entropy data retain their existing interpretation;
- the explicitly unsupported entropy placement fails with a stable structural error;
- marker-wrapped fakes, missing SOI, trailing bytes, concatenated JPEGs, falsified dimensions, byte caps, resolution caps, and memory caps remain rejected.

Do not decode first and sanitize only after a decoder exception: that makes compatibility dependent on decoder error behavior and can accidentally create a generic repair oracle. The original structural container must earn eligibility before any decoder-only projection exists.

## Evidence and publication discipline

- Record intended failing **leaf** tests separately from failed parent/aggregate test counts in Node's test runner.
- After GREEN, run the focused media/static files, then the repository's bare canonical test and build scripts as separate invocations.
- If the workspace verifier reports stale evidence after edits or commit, rerun the exact canonical script (`npm run test`, not an equivalent direct runner), then the exact build script, against the unchanged head.
- Run dependency audit/license checks, working-tree and full-history secret scans, deterministic dual-build coverage, exact cohort count/dimension probes, and `git diff --check` when required by the task.
- Stage exact paths, commit once, push the existing feature branch, and prove local SHA = remote branch SHA = PR head SHA with a clean worktree.
- Keep prior exact-head reviews explicitly invalidated after the remediation commit; leave a draft PR unmerged pending fresh exact-head review.
