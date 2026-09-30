# Single-worker PR-first controller

Use only when an owner explicitly requires one global worker and all pull requests before issues. This must not serialize independent work by default.

Persist the phase (`PR_DRAIN` or `ISSUE_DRAIN`), selected item and immutable identity, active lease/stage, authoritative open counts, and prior terminal evidence outside the repository. Keep a verified live/recoverable worker in its slot. Any open PR forces `PR_DRAIN`; remain on the selected PR through review, fix, re-review, merge/close, required release verification, and cleanup. Enter `ISSUE_DRAIN` only after an authoritative zero-open-PR readback; return immediately to PR drain if issue work opens a PR.

Implementation, review, fixing, merge, deployment, and verification share the one-worker slot. Read-only reconciliation may run concurrently but may not mutate the candidate or launch another worker. Before reporting, read back worker count, selected item/stage, exact PR head/checks/verdict, open counts, ancestry or closure reason, and required release result. Unchanged ticks are silent and mutation-free.
