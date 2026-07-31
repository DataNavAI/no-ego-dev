# Bounded feed-refresh expansion

Use this pattern when a freshness-gated deployment fails because a source-backed refresh produces fewer than its minimum publishable rows.

## Safe sequence

1. **Probe without mutating the candidate**
   - Copy the existing inventory to a non-repository scratch path.
   - Run proposed query variants against the real transport and unchanged parser/publication gate.
   - Record query count, successful queries, fetched rows, accepted rows, and accepted source/title/freshness metadata separately.
   - Do not lower the minimum or widen the trusted-outlet/publication policy to make the refresh pass.

2. **Expand deterministically**
   - Preserve the original broad/artist queries.
   - Add a finite reviewed matrix of high-signal topics such as `album`, `tour`, and `comeback` for selected high-volume identities.
   - Export a pure feed-plan builder and test exact count, uniqueness, representative query/identity pairs, and non-focused identities retaining baseline coverage.

3. **Bound execution, not just the plan**
   - `Promise.allSettled(feeds.map(fetch))` is an unbounded burst even when the feed list itself is finite.
   - Use a fixed-size worker pool. Preserve input-index result order and `fulfilled`/`rejected` semantics so existing error attribution remains correct.
   - Validate the configured ceiling (for example, integer `1..16`) and choose a conservative production default.
   - Add a deterministic async test whose fake worker increments an in-flight counter, delays briefly, and asserts the observed maximum equals—but never exceeds—the configured ceiling. Include one rejection and assert its result remains at the original index.

4. **Run the real refresh through the final path**
   - Execute transport → parser → dedupe → refresh-candidate → final publication gate.
   - Require all retained rows to remain metadata-only, source-bound, unique, and within the publication freshness window.
   - Persist a mode label only when it truthfully describes the implementation. A label such as `sequential-bounded` is not evidence by itself.

5. **Requalify the candidate**
   - Re-run focused ingestion tests, canonical tests, and the release build.
   - Restore generated output only after verification, stage exact durable files, freeze a new tree, and repeat independent review. Any worker-pool or refreshed-inventory correction invalidates earlier verdicts.

## Review checklist

- [ ] Minimum publishable count remains fail-closed.
- [ ] Trusted source and final publication gates are unchanged or separately reviewed.
- [ ] Query plan is finite, unique, and deterministic.
- [ ] Actual network concurrency is mechanically bounded and regression-tested.
- [ ] Result ordering preserves per-query error attribution.
- [ ] Live refresh evidence distinguishes successful queries, fetched rows, and published rows.
- [ ] Stored rows contain no article bodies, descriptions, credentials, or machine-local paths.
