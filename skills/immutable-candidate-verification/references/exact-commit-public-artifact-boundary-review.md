# Exact-commit public-artifact boundary re-review

Use when independently re-reviewing a corrected PR whose claim is that a deterministic public build excludes private, governance, mock, raster, source-map, local-path, or secret bytes.

## Freeze identity first

1. Fetch the PR head and base explicitly from the remote.
2. Resolve both to full SHAs and require the head to equal the user-requested SHA.
3. Review from a detached clean checkout or isolated worktree.
4. Read the issue/PR acceptance contract before deciding which adversarial probes are material.
5. Recheck `HEAD` and tracked cleanliness after builds and probes.

## Verification layers

Run all three; none substitutes for another:

- Canonical suite/build/public checker.
- Static review of the validator, renderer, router, schemas, and destructive filesystem operations.
- Independent hostile reproduction outside the repository tree.

Passing newly added regression tests only proves the named fixtures. Reproduce the prior attack classes independently and vary representations.

## Public-boundary hostile matrix

Build into a fresh temporary directory, then mutate one emitted artifact at a time. If a manifest row exists, recompute its digest and byte count so the probe tests semantic safety rather than trivial integrity mismatch.

Required classes:

- unlisted nested file;
- source map;
- every supported raster extension;
- absolute local paths in macOS, Linux, and both Windows separator forms;
- private-key, cloud credential, repository token, package-registry token, payment-provider token, bearer token, and generic password/client-secret assignments;
- private/governance/editorial markers;
- publication records hidden inside an otherwise allowlisted JSON/JS/HTML/CSS path;
- duplicate, missing, malformed, traversal-shaped, and media/cache-mismatched manifest rows.

Use inert synthetic values that match recognizable provider formats; never use a real credential. A security scanner flag on the probe command is expected and is not evidence that the application boundary rejected the bytes.

## Important distinction

A positive path allowlist plus matching SHA-256/length proves only that an allowed path contains the manifested bytes. It does **not** prove those bytes are safe to publish. Blacklists covering a few named markers are not a general secret/private-byte boundary. Require either robust maintained secret detection plus semantic file validation, or a construction/provenance mechanism that makes arbitrary content in each allowed artifact impossible.

## Decoder-backed raster contracts

When a closed public contract intentionally permits selected raster assets, file extensions, declared MIME, SOI/EOI magic bytes, hashes, and numeric schema bounds are not enough. They prove naming and byte identity, not that bytes decode as the claimed format or that declared dimensions describe the raster.

For each permitted raster format:

- use one shared decoder-backed validator at both source-ingestion/build and emitted-public boundaries;
- cap encoded byte length before decode and configure practical resolution and memory limits in the decoder;
- disable tolerant decoding when the contract is fail-closed;
- require successful decode plus positive integer dimensions exactly equal to canonical declarations;
- keep derivative hash, byte count, immutable path, rights receipt, credits, and arbitrary-raster rejection as separate checks;
- pin and lock any decoder dependency, inspect its license/transitive dependency graph, and run the package-manager production audit;
- prove all accepted canonical assets decode and match dimensions, and prove two builds remain byte-identical.

Required hostile probes include: ordinary text with a raster extension; valid start/end magic wrapped around text; truncated/corrupt bytes; a valid raster whose canonical width or height is falsified; and a re-manifested emitted fake whose digest and byte count were updated by the attacker. For public-boundary dimension tests, run the verifier against an isolated canonical contract carrying the falsified declaration so failure comes from decoded-dimension parity rather than canonical-byte mismatch.

### Full-input and coherent-canonical probes

A successful decode does not prove that the decoder consumed the complete byte string. Many decoders stop at the first logical end marker and silently accept arbitrary trailing bytes or a second concatenated image. Do not infer whole-artifact validity from decoded dimensions alone. Require full-input consumption when the decoder exposes it, or retain an equivalent canonical terminal-structure check alongside strict decoding. Add regressions at every source-ingestion and emitted-public enforcement call site.

For JPEG without decoder-reported consumed length, do not merely require the final two bytes to be EOI: two concatenated JPEGs also end in EOI. A structural scanner must locate the **first real EOI** and require it to terminate the byte string. It must skip length-delimited marker payloads (where marker-like bytes are ordinary data), handle marker fill bytes, SOS entropy-coded data, `FF00` stuffing, restart markers, and multiple/progressive scans, and reject malformed/truncated lengths, a second SOI, missing EOI, or bytes after the first real EOI. Pair negative trailing/concatenation probes with a positive valid JPEG containing EOI/SOI/stuffing/restart-looking bytes inside an APP payload so the hardening does not become a false-rejection parser.

Probe at least these variants independently:

- valid image plus inert trailing text;
- two valid images concatenated while still under the encoded-byte ceiling;
- missing terminal marker and multiple truncation depths;
- false declared dimensions;
- marker-wrapped non-image bytes;
- oversized valid prefix.

Mutating only emitted bytes is insufficient when the canonical digest correctly rejects them. To test whether hostile bytes could be committed and published, export the exact commit into a temporary complete source tree, attach the exact locked dependencies, mutate the canonical source artifact, and recompute every legitimately coupled field: encoded byte count, derivative digest, content-addressed public path, projected credits, and related manifest references. Then run the ordinary build followed by the standalone public verifier. If both pass, the publication policy itself accepts the hostile artifact. Delete the fixture afterward and keep the reviewed checkout untouched.

For every current accepted asset, independently record successful decode, decoded-versus-declared dimensions, byte-count parity, and terminal structure. For a newly introduced decoder dependency, record its exact lockfile version/integrity, dependency tree, audit result, strict/tolerant mode, byte/resolution/memory limits, and any residual parser semantics.

## Other exact checks

- Destructive output: output equals root, output contains root, symlink output, symlink parent, and arbitrary nested disposable-looking names must all reject before deletion while preserving marker files.
- Routing: malformed percent encoding, trailing slashes, aliases, legacy routes, direct loads, refresh, Back/Forward, and unknown IDs.
- Browser: denied storage, scoped search rerender/focus stability, head-level noindex lifecycle, output escaping, inline-handler absence, and CSP compatibility. Distinguish artifact compatibility from actual response-header enforcement.
- Publication: exact ordered cohort identity, truthful bootstrap state, canonical static surfaces, and absence of the unpublished release payload.
- Schemas: closed nested objects, exact ordered prefix/cohort closure, unknown-keyword failure, hostile mutations across every nested class, and byte parity with approved contracts where required.

## Verdict and output

Fail closed on any material security concern, logic error, acceptance-contract gap, wrong/dirty identity, or incomplete evidence. If the user requests JSON only, return one valid JSON object with no prose or Markdown fences. Include the exact full SHA, blocking findings, nonblocking suggestions, reproduced checks, and a no-modification statement.
