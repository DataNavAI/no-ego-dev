# Durable completion-triggered engineering with Hermes Kanban

Use this reference when a user expects work to continue automatically after each agent finishes, especially across gateway restarts or multi-day engineering milestones.

## Choose the right primitive

| Primitive | Use for | Continuation semantics |
|---|---|---|
| `delegate_task` | Short reasoning, implementation, or review needed by the current parent | Process-local. A single child returns independently; a batch returns a consolidated result only after all batch children finish. Parent/gateway exit loses unfinished children. |
| `terminal(background=true, notify_on_complete=true)` | One bounded long-running command/build | Completion notification for that process; not a dependency-aware engineering queue. |
| Cron | Time-based polling, reporting, watchdogs | Runs on a schedule, not task-completion events. Cron sessions must not recursively create more cron jobs. |
| Kanban dispatcher | Durable issue graphs, role pipelines, automatic next-task dispatch | A worker completes a durable card; linked children become ready; the gateway dispatcher claims and spawns them when capacity is available. Survives conversation/gateway restarts. |

**Default:** use Kanban—not cron or a chain of background delegations—when the job is “start the next dependency-ready engineering task whenever this one completes.”

## Completion event layers

Distinguish notification latency from durable scheduling correctness:

- A standalone `delegate_task` result re-enters the parent conversation independently. A batch presents one consolidated parent result after all children finish, even though Hermes emits `subagent_stop` once per child.
- A `subagent_stop` plugin/shell hook can request an immediate Kanban dispatch pass after each delegated child stops. Make that pass idempotent and bounded; Kanban's atomic claims make it safe to race the gateway dispatcher.
- `subagent_stop` observes `delegate_task` children only. A Kanban worker is a full process, not necessarily a delegated child. Kanban task completion, dependency promotion, and the gateway dispatcher remain the durable continuation mechanism; the hook is only a latency optimization.
- Do not let an event hook infer that implementation succeeded from `child_status`. It may trigger reconciliation/dispatch, but a card completes only from verified branch/commit/PR/test evidence or the worker's durable Kanban completion contract.
- If immediate per-child parent reasoning is required instead of board dispatch, use separate single-child delegations. Do not use a batch and expect its parent-facing result before every child finishes.

For a custom event integration, prefer a small class-level plugin that registers `subagent_stop`, performs one bounded dispatch/reconciliation action, logs failures, and never blocks the child pipeline. Validate manifest parsing, plugin import, hook registration, and a synthetic callback before restart. Enable the plugin explicitly. Defer gateway restart until process-local children have stopped and their durable artifacts are secured.

## Safe setup

1. Verify the live capabilities and service before promising automation:
   - `hermes kanban --help`
   - `hermes gateway status`
   - inspect only the `kanban` config section; confirm `dispatch_in_gateway`, interval, failure limit, and available profile concurrency.
2. Inspect existing boards/projects first. Never create a second queue for the same project by accident.
3. Use a stable clean primary checkout, not a session scratch clone. Create a project-specific board and bind a Hermes project to the primary repository so task worktrees and branches are deterministic.
4. Use one durable Kanban card per independently reviewable issue/PR. When GitHub/Linear is already canonical, keep the card thin: canonical issue URL/ID, repo/project, assignee/profile, workspace/branch, specialist skill, idempotency key, and completion evidence contract. Require the worker to read the live issue before editing; do not copy the whole issue body into a second independently maintained specification.
5. Model real dependencies with Kanban links because the dispatcher needs machine-readable edges, but treat them as an execution index derived from the canonical issue tracker. Reconcile changed/closed issues before dispatch. Do not merely order card creation and assume that means dependency order.
6. Use isolated `worktree`/project workspaces for repository writers. Keep one writer per overlapping path set.
7. Encode implementation → exact-head specification review → code-quality review → integration/merge verification as dependent cards. A worker self-report never skips review.
8. Reserve capacity for review/integration. With three workers, a useful default is two non-overlapping implementation lanes plus one review/verification lane—not three writers that leave a review pile.
9. Run `dispatch --dry-run` and inspect board/task readback before enabling execution. Confirm no unintended ready task will mutate production, merge, publish, or deploy.

## Transitioning in-flight work

An ordinary `delegate_task` already running before Kanban setup is outside the board. Kanban cannot observe that child's completion as a task event.

- Do not create a duplicate ready implementation card.
- Let the in-flight child finish and verify its durable branch/commit/PR or report.
- Then create/complete the corresponding bridge card from verified evidence and seed downstream dependencies, or start the queue at the next unblocked card.
- If the parent/gateway must restart before the child finishes, classify the child as potentially interrupted and recover durable remote artifacts before creating replacement work.
- Do not restart a stale gateway service definition while process-local children are active; refresh it after their results/artifacts are secured.

## Worker completion contract

A Kanban worker should complete only after it records verifiable output:

- exact branch and commit SHA;
- PR/report/artifact URL or durable path;
- commands and real results;
- blockers and residual risks;
- downstream facts required by child cards.

On failure, block with a concrete reason and recovery instruction. Let the configured failure circuit breaker stop repeated crashes; do not create retry storms.

## Verification

- Board/project binding resolves to the intended stable repository.
- Dependency links promote only genuinely unblocked children.
- Dispatcher interval/capacity and assigned profiles match the plan.
- A dry run shows no duplicate or unsafe spawn.
- One simulated completion promotes the expected child.
- Running, completed, interrupted, blocked, and missing-result states remain distinct in user reports.
- Time-based watchdogs are optional supervision only; they do not replace the Kanban dependency graph.
