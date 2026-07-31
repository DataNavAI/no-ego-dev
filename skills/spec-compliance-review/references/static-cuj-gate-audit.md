# Static CUJ Gate Audit Patterns

Use this when a deterministic static/API gate validates generated profile or catalog pages without browser evidence.

## Prevent false-success evidence

- Treat each repeated container as a discrete record. Reject nested, unexpected-close, and unclosed markup separately from a valid empty document.
- Bind every populated card to an exact authoritative item tuple, not generic syntax. At minimum compare entity ownership, title, canonical timestamp, source URL, content type, and ordering.
- Compare the complete ordered source-action tuple set `(URL, source type)` with reviewed sources. “At least one HTTPS source” allows missing or substituted sources to pass.
- Assert rendered-card count equals the report count for every row, including honest-empty rows.
- Preserve the boundary: static interface results must say browser evidence is absent; responsive/browser proof belongs to a separate task.

## Exercise dormant branches

A fixed production snapshot can legitimately contain only empty rows. Green cohort tests then do not exercise populated-card validation.

Add a small synthetic behavioral probe for the dormant branch:

1. prove one valid populated card passes;
2. mutate title, timestamp, URL, and content type independently;
3. prove each mutation fails;
4. retain the real fixed-cohort test to prove all current empty states are honestly named and entity-specific.

Do not alter production data merely to make a test branch execute.

## Provenance caution

Do not assume serialized generated JSON can recreate an in-memory selector or model exactly. WeakSet seals, symbols, object identity, frozen validated records, or other non-JSON provenance may be intentionally lost. A rebuilt model can therefore produce different selection results even when visible JSON is identical.

Prefer, in order:

1. structured evidence emitted by the authoritative generator;
2. rebuilding from the generator's original validated inputs and provenance-preserving path;
3. exact matching against emitted inventory with explicit entity ownership and uniqueness assertions.

Always compare a reconstructed baseline with the authoritative report before using it as expected evidence. If they disagree, stop and change strategy rather than weakening the assertion.

## Immutable remediation loop

Any review-driven correction changes the commit identity. Rerun focused tests, feature suite, canonical suite, build, generated-output cleanup, and diff checks; commit the correction; then obtain fresh specification and quality verdicts at the new clean SHA.
