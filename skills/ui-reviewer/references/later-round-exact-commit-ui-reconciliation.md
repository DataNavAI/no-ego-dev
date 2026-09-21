# Later-round exact-commit UI reconciliation

Use for Round 2+ read-only review when the requested candidate is not shared-checkout `HEAD`, prior reports are digest-bound, and acceptance depends on refreshed runtime/pixel proof.

## Continuity preflight

Verify the immutable pre-review summary, current prior-context packet, every referenced earlier packet/report/digest, candidate ordering, stable finding IDs, disposition ledger, remediation map, and authorized scope delta. Require remediation paths to match actual parent-to-candidate correction scope. A missing link blocks substantive review.

## Exact commit without shared-checkout mutation

1. Record shared HEAD and status.
2. Verify candidate object, parent, tree, local/remote refs, and live PR head when available.
3. Inspect `parent..candidate` from Git objects.
4. Export the candidate with `git archive` to a unique reviewer-owned temporary directory outside the repository.
5. Run browser probes against that archive only.
6. Recheck shared HEAD/status and candidate refs before verdict.

Record exact viewport/scroller/card geometry and distinguish intentional scroller overflow from document overflow. Inspect both committed pixels and fresh archive-bound captures. Keep browser reports/traces outside candidate source so broad lint globs cannot be contaminated.

For each prior finding, preserve its stable ID and mark resolved only when mapped source/evidence and a fresh focused probe agree. New later-round findings are limited to remediation regressions, authorized scope, genuinely unavailable evidence, or previously undiscoverable material defects. A material earlier miss remains a process escape, not ordinary drip-fed feedback.
