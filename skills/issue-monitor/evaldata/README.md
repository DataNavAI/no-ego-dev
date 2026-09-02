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

## Official deterministic project-watchdog adapter scenario

Project-manager and issue-monitor share one project-scoped official Hermes cron job and one stable per-project Kanban board. Setup verifies active-profile `kanban.max_in_progress=1`, renders a bounded safe script under active-profile `scripts/`, reads back exact bytes/hash, and manually executes that installed script with `--dry-run` before activation. The receipt proves exact identity, three read-only official Kanban argv arrays, `dispatched=0`, and `mutated=false`.

Reconciliation parses the real official list fields `job_id`, `name`, `prompt_preview`, `script`, `no_agent`, `workdir`, `enabled`, `state`, and schedule; binds exact safe filename + workdir + friendly name + optional durable ID; rejects duplicates and partial collisions; preserves pause; uses official operations; and requires a fresh exact-one list. A new paused project orders create → canonical response `job_id` → immediate pause → fresh exact-one paused readback. Runtime uses `script=<relative safe filename>`, `no_agent=True`, exact `HERMES_HOME`, and no prompt or agent; absent profile-name env is allowed but a present mismatch is rejected.

The deterministic script validates complete list/stats/running/dispatch schemas and fixed subprocess argv. Malformed/conflicting/unknown evidence or any running claim yields no dispatch until gateway stale reclaim returns ready. Ready plus verified zero running permits exactly one `dispatch --max 1 --json`. Verified no-op is empty stdout; dispatch/blocker receipts are structured. The script never invokes cron/chat/delegation, and lifecycle pause/remove requires current exact binding plus fresh readback. Kanban owns dependencies, claims, heartbeat/stale reclaim, workers, runtime, runs, and issue workflow stages.
