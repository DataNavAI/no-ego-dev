# Metric-gap task kickoff

Use this pattern only when the monitor is explicitly accountable for a measurable operational metric and the repository contract names the canonical checker, target, and eligible population. It does not apply to every issue monitor, and a generic issue queue must not invent metric ownership.

## Preserve serialized authority

Official Kanban remains the sole scheduling, claim, dependency, heartbeat, stale-reclaim, and dispatch authority. Metric kickoff records intent in the existing serialized lineage; it does not create another controller slot, custom worker pool, lifecycle-plugin scheduler, direct detached runner, or multi-slot controller. Resume an unfinished official task before creating another, and keep `max_in_progress=1`.

## Task-first rule

Each eligible tick reconciles one existing unfinished metric task or creates and starts exactly one atomic task through official Kanban. A priority list without a durable kickoff and an advanced stage is not progress.

1. Measure the live baseline and target gap with the named canonical checker.
2. Reconcile open PRs, official Kanban tasks/runs, durable review artifacts, and active-worker evidence.
3. Resume the oldest unfinished task before selecting another.
4. If none exists, rank eligible issue candidates by expected metric gain, current product usage, evidence/implementation feasibility, and duplication risk.
5. Select one issue/task in the existing serialized lineage and persist a `TASK_STARTED` receipt before mutable work.
6. Advance one durable Kanban stage: research, reproduce, implement, fix, review, merge, deploy, or verify.
7. Persist the resulting stage and immutable handles before exit.

## Kickoff receipt

Record this in the canonical issue/card/state store:

```text
TASK_STARTED
metric: <current>/<eligible> (<percent>), gap <count> to target
subject: <one record/outlet/defect>
why_now: <usage rank + feasibility evidence>
deliverable: <one concrete artifact or product change>
completion: <objective acceptance criterion>
kanban_task: <official task and lineage identity>
base_identity: <exact SHA/version>
next_stage: <one durable stage>
```

A task is not kicked off merely because it appeared in a report. The receipt must exist and official Kanban work must have entered a durable stage.

## Completion and hold semantics

- Count metric improvement only after the canonical live checker verifies the merged/deployed result.
- A supported hold reduces uncertain backlog but is not metric gain.
- Do not switch to a second task after a hold in the same tick; persist the hold and let the next serialized tick reconcile it.
- If review or CI is unavailable, preserve candidate identity, evidence, and the exact pending gate; do not start a duplicate task.
- Report the live metric/gap, the one task and durable stage reached, and the blocker or exact next stage.
