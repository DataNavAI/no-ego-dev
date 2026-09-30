# Remediation closure matrix

Use after a child fixes a high-risk boundary finding and before aggregate parent approval. Do not impose this specialized matrix on unrelated routine changes.

## Closure rows

Record exact candidate/base identity, hostile input, expected and observed result, evidence path, and inherited-versus-new status for each applicable row:

- remote handoff: live remote ref, exact head/base, and changed-head rejection;
- closed objects and arrays: unknown/symbol/non-enumerable/accessor/duplicate/sparse/proxy shapes;
- privacy strings and normalization: encoded/malformed/multi-layer forms and canonical-byte ordering;
- timeout/concurrency and budgets: abort-unaware settlement, FIFO ownership, cumulative reservation;
- output schemas: bounded field-specific scalars, dense arrays, and rejected arbitrary objects.

A green suite is incomplete evidence when an applicable matrix row lacks a recorded probe. Child approval does not transfer after the aggregate parent head changes.
