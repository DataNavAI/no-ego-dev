# No-launch audit and review continuation

Use this reference when a reasoning-capable monitor or controller has authority to read the required issue/PR and lifecycle evidence but launches no official Kanban worker, or when a stable review lineage must continue after an interrupted or later review generation. It does not apply to the shared no-agent watchdog's ordinary tick: that executable is intentionally limited to three official Kanban reads, optional dispatch, and its existing empty-output no-op contract.

## No-launch audit receipt

A scheduler wrapper reporting `ok` proves only that the cron session exited normally. Before returning `[SILENT]` from a reasoning-capable monitor or controller with the evidence access described above, persist one atomic controller-readable receipt outside the repository:

```json
{
  "timestamp": "RFC3339 UTC",
  "reason_code": "BUSY | NO_ELIGIBLE | GLOBAL_DEPENDENCY_DEADLOCK",
  "origin_base_sha": "40-hex",
  "live_worker": null,
  "evaluated_frontier": [
    {
      "issue": 123,
      "state": "OPEN",
      "labels": ["type: implementation"],
      "blocking_facts": ["depends on open #122"]
    }
  ]
}
```

- `BUSY`: official Kanban shows one scoped worker/run as plausibly live.
- `NO_ELIGIBLE`: no actionable implementation or QA issue remains.
- `GLOBAL_DEPENDENCY_DEADLOCK`: actionable backlog remains, but every frontier issue is blocked by terminal review, human/provider authority, open dependencies, or explicit blocked state.

Compute the frontier from live issue bodies, labels, dependency closure, PR state, official Kanban task/run/heartbeat state, cron state, durable receipts, and the fetched base SHA. Do not infer health from cron status, a label, a process, or `[SILENT]` alone. Write atomically, read the receipt back, and keep it local when delivery policy requires silence.

The receipt is audit evidence only. It does not select work, claim an issue, dispatch a worker, create another queue, or override official Kanban authority. The recurring no-agent cron remains a bounded serialized capacity reconciler and may invoke at most one official dispatch; do not expand its command surface merely to create this receipt.

## Claim-state discipline

`agent:in-progress` means an active or recoverable owned execution, not merely “approved for later.” Apply it only to the issue whose official Kanban lineage is launching, running, or preserving owned recovery state. Leave queued issues unclaimed, and remove stale claims only after proving no live official run and reconciling durable output.

## Review continuation

No-launch audit does not change review authority. Resume the existing candidate generation from durable exact-SHA artifacts. A timeout or missing-evidence recovery on unchanged bytes stays in the same round; a materially corrected candidate advances exactly once. Round 4 and later continue under the package's approval-convergence and [`review-round-continuity.md`](review-round-continuity.md) contracts. Never re-review an unchanged valid verdict, approve by exhaustion, waive exact-SHA/CI/branch-protection gates, or let a fixer self-approve.
