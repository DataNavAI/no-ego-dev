# Immutable unverified candidate compilers

Use when a compiler may validate and freeze a deterministic candidate but must have zero publication, promotion, reviewer, evidence, or operator authority.

## Authority boundary

Separate candidate construction from every authority decision:

- Accept one serialized input boundary (prefer JSON text), not caller-owned objects.
- Parse internally, then recursively snapshot through own enumerable data descriptors with bounded arrays/objects.
- Reject non-string inputs by `typeof` before reflection so accessors and proxy traps cannot run.
- Return only candidate language such as `status: "candidate"` and `authorization: "unverified"`.
- Never return `eligible`, `authorized`, `publishable`, or equivalent positive authority states.
- Make the publication-authority function argument-free and permanently fail closed until protected prerequisites exist. Extra JavaScript arguments must not affect the result.
- Treat shape-valid review receipts, signatures, digests, and evidence metadata as explicitly unverified. Structural validation is not cryptographic verification.

Document future authority prerequisites concretely: externally protected reviewer-registry digest, real signature verification over recomputed substantive-record digests, authoritative entity graph, evidence byte/hash/size/path closure, trusted clock, and signed operator attestation bound to the immutable candidate.

## Resource bounds for serialized input

JSON text avoids caller-controlled getters and proxy traps, but it is not inherently bounded. Before `JSON.parse`, reject input above an explicit UTF-8 byte limit and enforce a lexical nesting-depth limit with a string/escape-aware scanner. Use a cheap code-unit ceiling before UTF-8 byte counting so a huge already-allocated string is rejected without unnecessary encoding work. After parsing, traverse iteratively or with an explicit depth guard and enforce practical limits for:

- maximum nesting depth;
- total object/array nodes;
- maximum array length before iteration;
- maximum own-key count per object;
- maximum string length and aggregate string bytes;
- total canonical output bytes.

Do not rely on recursive snapshot/canonicalization alone: deeply nested valid JSON can exhaust the call stack, and large sparse-style or dense arrays can consume unbounded CPU/memory even without executable object behavior. Add exact-limit and limit-plus-one regressions, including deeply nested arrays/objects and oversized text, and require stable fail-closed result codes rather than thrown `RangeError` or process termination.

## Immutable output

- Project only allowlisted fields and validate the public-compatible projection internally.
- Do **not** return that publication-shaped projection as the detachable primary payload when authority is absent. Wrap it in a closed candidate-specific envelope whose hashed bytes embed `publicationState: "candidate"`, `authorization: "unverified"`, and explicit receipt/evidence trust states.
- Keep asserted but unverified review hashes out of verified-sounding fields such as `reviewDigest` inside the projection preview. Rename them explicitly (for example `assertedReviewDigest`) and bind them inside the candidate envelope until real authority recomputes and verifies them.
- Deep-freeze the complete candidate envelope.
- Canonicalize the envelope to a primitive UTF-8 string with deterministic key ordering and newline policy, then hash that exact string.
- Do not return a mutable `Buffer`, typed array, stream, or caller-owned byte container.
- Keep candidate generation side-effect free; do not write release files, sign, deploy, or publish.
- Audit every callable export for the same hostile-input promise. A safe JSON-text compiler can still expose an unsafe object-taking hash/helper export that reflects over a Proxy. Keep object canonicalizers private or expose only serialized-text APIs with the same bounds.

## Shared secret scanning

Use one dependency-free scanner module at both the generated-public boundary and candidate boundary. Scan **both** each projected primitive string before serialization and the complete canonical candidate text immediately before returning it. Primitive scanning prevents JSON escaping from hiding a credential; serialized scanning preserves parity with generated-file boundaries.

Generic credential patterns must accept JSON-escaped quote forms. For example, raw `api_key="abcdefghijklmnop"` becomes an escaped quote sequence in JSON and must still reject in both candidate and rebuilt allowlisted-file tests. Add parity fixtures that place the same credential in a raw projected string, canonical JSON, and a re-manifested allowlisted build file.

Cover at least:

- synthetic credential sentinels;
- private keys;
- provider-token formats;
- generic credentials;
- user/home/temp/local paths and file URIs;
- governance/private/editorial markers forbidden by the product boundary.

Exercise every mutable projected string class. Fields whose values are fixed by a frozen catalog or strict grammar should remain structurally closed rather than weakened merely to inject scanner fixtures.

## Freshness and duplicate semantics

For source-backed claims, compute age from source `retrievedAt` to candidate/release `createdAt`, not from two caller-selected evaluation clocks. Typical class rules:

- `immutable`: exempt;
- `annual`: at most 365 days;
- `active-lineup-30d`: at most 30 days;
- `catalog-180d`: at most 180 days.

Duplicate-review checks should require `reviewedAt <= createdAt`; every compared ID must exist, be distinct, and not refer to the claim itself. A clear result may have no comparisons when the contract permits it; a flagged-pass result must name valid comparisons.

## Strict TDD matrix

Capture RED on the absent narrowed API, then prove GREEN for:

1. permanent no-authority truth table, including ignored forged arguments;
2. ordinary first-review records yielding no candidate;
3. exact structurally second-reviewed records yielding an immutable unverified candidate envelope whose canonical hashed payload contains the candidate/unverified discriminator and does not expose a verified-sounding detachable `reviewDigest`;
4. object/accessor/proxy rejection with zero getter/trap calls across **every exported callable**, including proof that object-taking canonical hash helpers are not exported;
5. deterministic canonical text/hash/golden vector and deep immutability;
6. shared scanner attacks across projected string classes, including raw and JSON-escaped quoted generic credentials plus re-manifested build parity;
7. pre-parse exact-limit/limit-plus-one byte and nesting-depth rejection;
8. freshness exact-boundary, future-source, and stale cases;
9. duplicate-review chronology/reference closure;
10. cohort identity/cardinality/order/source binding.

After any wrapper verification command, run the repository's bare canonical `npm test` and `npm run build` commands separately so verification evidence is freshly recognized. Confirm the build leaves the worktree clean, then verify the remote branch resolves to the tested SHA.