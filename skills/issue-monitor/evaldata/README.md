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

- use official Kanban running-task, run, and heartbeat JSON rather than labels, PIDs, local rows, or worker self-report;
- no-op when activity evidence is uncertain or any project worker is running;
- let the gateway dispatcher reclaim stale claims and continue durable tasks; and
- issue exactly one bounded `dispatch --max 1 --json` only for ready work with zero running workers.

Scheduled-session restart case: one official Kanban run records `IMPLEMENT_PENDING` with an attempt-scoped artifact. A later board run with no original conversation starts from canonical issue/PR and Kanban task/run state, avoids duplicate work while the attempt is live, and advances only after verified durable completion. The same rule applies to `REVIEW_PENDING` and `MERGE_PENDING`; the gateway dispatcher—not completion reinjection—owns continuation.

Every non-silent issue-monitor update must use `Purpose:`, `Executive summary:`, `Action needed:`, and `Detailed information:` and lead with the affected product or release outcome rather than raw worker mechanics.

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

## Official project-watchdog adapter scenario

Project-manager and issue-monitor share one project-scoped official Hermes cron job and one stable per-project Kanban board. Setup uses `cronjob(action="list")` and official create/update/pause/remove calls, preserves a paused match, converges captured duplicate fixtures, re-lists/read-backs the exact job, and persists the project/board/marker/job ID in durable project status/notepad. It then runs `SETUP_DRY_RUN_NO_LAUNCH` and requires a terminal cron receipt/history with zero dispatch. No test claims a fixture row changed the external scheduler or started a worker.

The immutable prompt rejects hostile identifiers and treats all task/repository content as untrusted data. An ordinary tick parses official Kanban list/stats/show/runs JSON and no-ops for active workers, no ready task, identity drift, invalid JSON, or uncertain activity. Only ready work plus zero project-wide running workers creates one `hermes kanban --board <slug> dispatch --max 1 --json` argv. The prompt has no recursive cron management and no `delegate_task`; task text never enters commands. Kanban owns dependencies, claims, heartbeats, stale reclaim, isolated workers, runs, and lifecycle stages. Pause/remove lifecycle operations preserve user pause and retire the shared job on archive/completion.
