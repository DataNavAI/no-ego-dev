# Evaluation data

This package evaluates scheduled issue-monitor behavior when reviewer work is slow, interrupted, or repeatedly dispatched for an unchanged immutable candidate.

The canonical scenario requires:

- a durable review identity keyed by repository, PR, exact SHA, review kind, and attempt;
- one reviewer attempt per scheduled run;
- no duplicate review after a valid negative verdict for the unchanged SHA;
- report-first timeout recovery before replacement dispatch;
- reuse of trustworthy exact-SHA CI instead of broad check duplication;
- explicit fail-closed `INCOMPLETE` outcomes when the time budget cannot satisfy every gate; and
- fresh independent review only after remediation creates a new candidate SHA.

Additional liveness cases require the monitor to:

- classify a worker ending exactly at its effective wall-clock or iteration limit as a runtime-budget problem before declaring a product blocker;
- increase both child and gateway budgets when the legitimate stage envelope exceeds the cap while preserving `gateway > child`;
- distinguish an orphaned `agent:in-progress` label from a valid lifecycle-backed active-worker lease;
- preserve a live lease's worktree during registration grace and a forced monitor tick;
- debounce completion bursts so they wake one serialized cron reconciliation without duplicate dispatch.

Scheduled-session restart case: one cron run verifies an implementation dispatch receipt and ends immediately as `IMPLEMENT_PENDING`. A fresh scheduled run with no original conversation must start from canonical issue/PR state plus the attempt-scoped report, avoid duplicate dispatch while the attempt is live, and advance only one eligible successor after verified durable completion. The same rule applies to `REVIEW_PENDING` and `MERGE_PENDING`; completion wakes only accelerate the fresh reconciliation pass.

Every non-silent issue-monitor update must use `Purpose:`, `Executive summary:`, `Action needed:`, and `Detailed information:` and lead with the affected product or release outcome rather than raw worker mechanics.
