# Static web build and SPA verification

Use this for static-site/SPA production scaffolds, deterministic artifact builders, and public/private packaging boundaries.

## Destructive build safety

- Exercise `output == root`, `output` containing `root`, arbitrary lookalike temp names, symlinked ancestors, and special files.
- Require realpath/ancestor validation **before** recursive deletion.
- Prefer exactly `<repo>/dist` or a direct child of the real OS temp root; never trust a basename prefix alone.
- Plant a marker and prove rejected configurations do not delete it.

## Public artifact closure

- A blacklist is defense-in-depth, not proof of closure. A correctly re-manifested provider token inside an allowlisted HTML/JSON/JS/CSS file can still pass path, digest, size, media-type, and manifest checks.
- Positively allow emitted path shapes, media types, source inputs, and generated data schemas.
- Require manifest completeness, digest/size/media/cache identity, no unlisted bytes, no symlinks/special files, and byte-identical rebuilds.
- Semantically validate every structured publication artifact after emission. For bootstrap/schema/version JSON, require exact keys, compare emitted schemas to the canonical source contract, validate data against that canonical schema, and bind version digests/identity to the emitted bytes. Do not accept arbitrary JSON merely because an attacker updated its manifest row.
- Add defense-in-depth token detection for high-confidence provider classes (for example npm, Stripe, Google, Slack, bearer credentials, and generic client-secret/API-key assignments) across every allowlisted textual file class. Construct synthetic token fixtures at runtime so repository scanners do not flag literal fake secrets.
- Reproduce attacks by modifying an allowlisted file, recomputing its manifest digest and byte count, and requiring verification to reject it. Include the exact independently reported bypass plus multiple provider families.
- Test the boundary at both stages. For **source-time** attacks, clone only the minimum build root (for example `src/` and `schemas/`) into a direct OS-temp child, mutate manifests/credits/media there, and run the real builder; synchronize derived credits only when the test is meant to reach a later identity/MIME check. For **emitted-time** attacks, build clean output, mutate an allowlisted contract or media file, recompute its asset-manifest SHA-256 and byte count, and require the standalone public verifier to reject it.
- Prove required-set closure with omission attacks, not only substitutions: remove each required contract or media file from both disk and the asset manifest and require rejection. This catches verifiers that validate present rows correctly but silently treat mandatory artifacts as optional.
- When Node test output includes nested subtests, report intended failing **leaf cases** separately from the runner's aggregate failure count; failed parent tests can otherwise make RED evidence look larger than the actual gap matrix.
- Run an external maintained scanner such as Gitleaks over the exact final tree. Investigate findings rather than suppressing broadly; if a deterministic test fixture is a false positive, construct it from bounded fragments at runtime and rerun the scan.
- Probe source maps; PNG/GIF/AVIF/JPEG/WebP/TIFF/BMP/ICO; absolute local paths; secret-like fields; and private/governance/editorial/review markers.
- Validate generated JSON against the deployable schema, not only inside one build code path.

## SPA routes and browser behavior

- Router unit tests do not prove server-level direct loads. Test actual static-tree or plain-server resolution for every supported route class and representative parameterized routes.
- Malformed percent encoding must fail closed rather than throw.
- Canonical routes render truthful route-specific states, not generic not-found fallthroughs.
- Keep storage access inside startup recovery; manage robots metadata in `document.head`; avoid inline handlers under strict CSP.
- Do not replace active form controls on every keystroke; preserve the node or caret/selection.
- For mobile evidence, use CDP device-metrics emulation and record `innerWidth`, `scrollWidth`, and element bounds. Headless Chrome may clamp outer-window width, so a cropped screenshot is not mobile verification.

## Runtime schema and release trust

When a browser will eventually consume a release artifact, do not fetch the release and an unconstrained schema from the same origin and call the result verified: a bad deployment can weaken both together.

- Emit the canonical closed schema byte-for-byte even while the release payload remains absent, and assert emitted/source byte parity in the deterministic build test.
- Anchor the browser to the expected canonical schema SHA-256 compiled into the hashed application module. Reject schema-byte drift before parsing or validation.
- Keep a stable schema endpoint revalidatable (`no-cache`) unless its URL is content-addressed; an immutable cache policy on a stable schema URL can strand old contract bytes.
- Bound declared and actual response bytes **before** JSON parsing. Prefer a streaming reader that cancels once the cap is crossed; `Response.text()` followed by a size check is not a resource boundary.
- Reject redirects, wrong JSON media types, malformed UTF-8/JSON, candidate or unverified envelopes, schema-invalid releases, wrong release identity, and unknown entities to one truthful unavailable/noindex state.
- Keep publication authority outside the browser loader. The loader proves canonical bytes and shape; protected materialization and operator authorization remain separate gates.
- Test exact schema success, one-byte schema drift, malformed/candidate release, declared oversize, streamed oversize cancellation, redirects, wrong media type, and absence of the release payload from the public manifest.

## Schema closure

- Separate truthful unavailable/bootstrap data from future publishable release data when publication is blocked.
- Encode frozen identity/cardinality in executable schema, not only build-time code.
- Mutation tests assert nonzero counts for missing, type, enum/const, bounds, extra field, identity, duplicate, and order categories.
- Verify byte parity for copied authoritative schemas.

## Long-running agent recovery

- Require an early pushed checkpoint for bounded agent runs.
- After timeout, inspect remote refs before restarting and classify the result as recovered artifact or no recoverable artifact.
- Split retries into non-overlapping files/commits; integrate onto the existing PR when scope is unchanged.
- Review an immutable SHA, and after fixes commission one exact-commit re-review rather than an unbounded loop.
