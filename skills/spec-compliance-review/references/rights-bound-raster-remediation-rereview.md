# Rights-bound raster remediation rereview

Use this checklist when an exact-head rereview follows a finding that extension markers and hashes were accepted without decoding an image.

## Candidate and contract binding

1. Freeze the current PR head and tree, record the base, and query the moving PR head again after all probes.
2. Read the implementation issue, its parent epic/milestone, PR body, and issue/PR comments. Earlier verdicts and test counts are historical after remediation.
3. Diff the exact base-to-head range and confirm excluded surfaces (UI, analytics, deployment, infrastructure, publication) did not change.

## Receipt-to-production reconciliation

Treat historical review receipts and the new production manifest as separate authority layers:

- Keep receipt files byte-unchanged when the issue calls them read-only inputs.
- Mechanically reconcile every promoted record across source page URL, original URL, creator, license, license URL, source hash, derivative hash, dimensions, and derivative bytes.
- A historical `NOT_APPROVED` receipt does not by itself prove the new implementation fails when the governing issue explicitly creates a new production-eligibility decision. Conversely, a new manifest field that merely self-asserts `production_eligible` is insufficient unless the governing contract authorizes that promotion and defines its complete eligibility predicate. Record which authoritative issue/policy grants the new disposition.
- Ensure review-only composites and other excluded receipt rows are absent from the production cohort and every public artifact.
- Verify public credits are a complete canonical projection and preserve the source URL as a separately exposed field when the human-readable attribution omits it.

## Decoder-backed JPEG closure

Require one shared validator at source ingestion and emitted-public verification:

- exact MIME contract (`image/jpeg`);
- actual strict decoder success, not only SOI/EOI markers, extension, `file`, or hash;
- bounded input bytes, decoder resolution, and decoder memory;
- positive integer decoded dimensions exactly equal canonical declarations;
- schema dimension caps independently enforced;
- full derivative SHA-256 and byte-count parity;
- exact content-addressed public filename derived from the full digest;
- regular-file and no-symlink/containment checks at source;
- exact manifest allowlist so every unlisted raster extension remains rejected.

At minimum reproduce both prior false-success classes at both boundaries: marker-wrapped text with attacker-updated identity, and a valid JPEG with falsified declared dimensions.

## Dependency and artifact checks

For a newly introduced decoder, verify package and lockfile exact-version parity, registry integrity/license, transitive dependency count, and a fresh production audit. Then run:

- focused media/static tests;
- full canonical tests;
- exact-revision build and public-boundary scan;
- deterministic two-build comparison;
- receipt/asset reconciliation over all cohort rows;
- artifact counts, MIME classification, byte/dimension maxima, publication-state check;
- exclusion scans for review-only composites and forbidden paths/tokens;
- final diff check, exact HEAD/tree, clean status, and moving PR-head requery.

Keep administrative state separate: a technically passing draft PR can receive a technical PASS while remaining procedurally unmergeable until draft/review rules are satisfied.