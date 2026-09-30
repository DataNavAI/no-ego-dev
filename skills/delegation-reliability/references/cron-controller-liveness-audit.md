# Scheduled controller liveness audit

Use when a user asks whether a scheduled delivery controller is maintaining active workers, reviving stalled work, or merely reporting status.

## Evidence hierarchy

1. **Worker lifecycle evidence:** active Kanban/process/delegation state plus an attempt-scoped durable report, PR, or review artifact.
2. **Controller output history:** `<HERMES_HOME>/cron/output/<job-id>/*.md`.
3. **Job metadata:** `<HERMES_HOME>/cron/jobs.json` for schedule, retained lifetime tick count, and last status.
4. **CLI execution history:** `hermes cron runs <job-id>` is useful when populated, but an empty execution table is not evidence that the controller never ran; reconcile it with output artifacts.

## Audit method

1. Read the active job configuration and identify its workdir, cadence, toolsets, and whether its prompt requires durable stage receipts.
2. Count the retained output files and state their date range. Treat retention as a sample, not lifetime history.
3. Classify each response into: silent/no-op, status-only/waiting, implementation or PR advancement, review verdict, durable worker dispatch/claim, merge/release verification.
4. Independently read back claimed PRs, reviews, checks, and remote state. Do not count a sentence such as "next active work" as a worker.
5. Report separately:
   - whether work advanced;
   - whether a live worker was actually confirmed;
   - whether the controller reliably revived a next-stage worker;
   - the concrete control gap.

## Interpretation

A frequent schedule is not worker maintenance. A controller that creates a PR or records a review can have advanced work without ever maintaining a durable active worker. If runnable work exists but no active worker is evidenced, call it a liveness/dispatch gap—not failed CI or an external blocker.

## Remediation

Before increasing cadence, make the controller reconcile worker liveness and durable artifacts each tick. It must dispatch at most one dependency-safe next stage only after proving no existing worker owns it. Use durable Kanban or another tracked process for work that must survive a cron session; do not rely on process-local delegation alone.
