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

Every non-silent issue-monitor update must open with a natural purpose sentence without a `Purpose:` label, then use `Executive summary:`, `Human action needed:`, and `Detailed information:` while leading with the affected product or release outcome rather than raw worker mechanics. The human-action field is exactly `None` unless a human owns the decision/task; when populated it names the actor, imperative action, timing, result unblocked, and why automation cannot perform it safely. Autonomous next work stays in the executive summary.

## Cross-round continuity scenarios

- **Prior exact review reports:** Round 2 receives every prior report and verified digest, not a controller summary.
- **Finding disposition ledger:** Stable finding IDs, current dispositions, and the remediation change map are passed with the bound prior-context digest.
- **Contradictory later-round feedback:** A reversal requires `PRIOR_FEEDBACK_CORRECTION`, both statements, and decisive evidence.
- **Unrelated new finding:** Ordinary feedback discoverable from unchanged Round-1 evidence is omitted rather than drip-fed.
- **Material process escape:** A genuine late material defect that was reasonably discoverable earlier remains blocking as `MATERIAL_PROCESS_ESCAPE` and is escalated.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.
- **Executable gate durability:** The controller atomically persists the derived review mode, suppresses duplicate same-candidate dispatch, allows only one narrow `INCOMPLETE` recovery, and waits for the complete authorized bundle manifest before advancing a monotonic candidate generation.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.
