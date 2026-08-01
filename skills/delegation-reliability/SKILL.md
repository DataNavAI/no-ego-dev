---
name: delegation-reliability
version: 1.10.0
description: Supervise background subagents, detect interrupted or stale delegation batches, and recover without inventing results.
author: NoEgoDev
created_by: agent
---

# Delegation Reliability

Use when work depends on one or more `delegate_task` subagents, especially on gateway or messaging surfaces where the parent process may restart.

## Core invariants

- A delegation handle is an identifier, not evidence that an agent is still running.
- `/agents` (alias `/tasks`) shows active work only. Completed, interrupted, and lost children should not appear.
- Background delegation is process-local and not durable across parent/gateway shutdown. Use a tracked background process for one bounded long command, cron for time-based polling/watchdogs, and **Hermes Kanban for durable dependency-driven engineering that must dispatch the next task on completion and survive restarts**.
- A completion notification establishes that the batch stopped running, but its consolidated payload—not the handle alone—establishes results.
- A `completed` batch can still be **deliverable-partial** when the worker exhausted its tool/iteration budget after an early push and only self-reported later isolated edits. Run state, requested-deliverable completeness, and remote durability are separate dimensions.
- Never invent a verdict or artifact from dispatch/completion metadata. Verify returned report paths, hashes, remote SHAs/PRs, or other durable handles.

## Completion-triggered work

Choose continuation mode explicitly instead of assuming every dependency graph needs a second queue.

**Hook-only mode (preferred when the user rejects queue duplication):** keep GitHub/Linear canonical, launch continuation-sensitive workers as separate single-task delegations, and rely on each async completion delivery to re-enter the parent session. The parent verifies the durable artifact and verdict, reconciles live tracker state, and immediately dispatches the next dependency-safe worker. `subagent_stop` is observer-only and cannot itself prove success or launch a child through its ignored return value. This mode is process-local and must not be described as restart-durable.

**Durable queue mode (explicit trade-off):** use Hermes Kanban only when unattended dependency execution and restart survival materially outweigh queue duplication. Keep external issues canonical and cards thin. A hook may request one idempotent dispatch pass, while verified Kanban state and atomic claims remain authoritative.

A multi-child `delegate_task(tasks=[...])` batch drains before the parent receives consolidated completion, so do not promise immediate first-finisher continuation from a batch. If each child must trigger independent scheduling as soon as it stops, use separate single-task delegations. Never infer PASS from `child_status=completed`; verify the exact SHA/PR/report, required checks, and review verdict before downstream kickoff.

**Cron/scheduled mode is different from an interactive parent session.** Do not assume an async delegation completion will be reinjected into the cron run that launched it—or into the next fresh cron session. Before dispatch, require an attempt-scoped durable sink that a later run can read: a structured external report or a stable marked tracker comment bound to repository, PR, exact SHA, review kind, and attempt ID. A scheduled run dispatches at most one reviewer, ends as `REVIEW_PENDING` when no result is yet durable, and reconciles that sink before any retry on the next run.

Deduplicate reviews by `(repository, PR, exact SHA, review kind)`. A structurally valid negative verdict is completed evidence, not a failed attempt: route its blockers to one fixer and suppress review of that same SHA until the candidate changes. On timeout, recover the attempt artifact first; re-dispatch only the missing evidence scope, preserve trustworthy exact-SHA CI and prior check evidence, and never repeat broad suites or stress loops merely because the summary delivery was lost.

If work is already running under another mechanism, do not duplicate it. Secure and verify its durable artifact first, then resume using the selected mode.

### Attempt-scoped artifacts and late-result reconciliation

Give every original, replacement, and retry a unique report/evidence namespace (for example an attempt or delegation suffix), even when they review the same immutable SHA. Never point two live workers at the same report or checksum path: a late original can overwrite a verified replacement, destroy provenance, or make a sidecar refer to different bytes.

When a supposedly lost original returns after a replacement was dispatched:

1. Preserve and independently verify each attempt's report, checksum, immutable target, and verdict.
2. Reconcile by reviewed identity and evidence, not arrival order or lifecycle label. A late result remains actionable when it is complete and bound to the unchanged target.
3. Keep the candidate frozen until every already-running read-only reviewer for that SHA has stopped, unless deliberately invalidating and re-dispatching those reviews is worth the cost.
4. If verdicts disagree, reproduce the objective claim independently and keep the gate closed; do not select the friendlier report.
5. Consolidate all verified findings into one remediation matrix so one writer addresses the complete bounded class instead of racing serial fixes.

Read:
- [`references/harness-completion-hooks.md`](references/harness-completion-hooks.md) for hook-only and durable modes, event semantics, batch-vs-single behavior, state routing, activation safety, non-invasive independent review, and smoke verification.
- [`references/recovered-review-artifact-integrity.md`](references/recovered-review-artifact-integrity.md) when a timed-out/interrupted reviewer may have left a report, checksum, or evidence directory; recompute final-byte integrity and route by the recovered verdict.
- [`references/durable-kanban-continuation.md`](references/durable-kanban-continuation.md) only when the user accepts durable queue mode.

## Completion-triggered scheduling wake

Every terminal worker event—success, failure, interruption, or timeout—must trigger one bounded scheduling reconciliation. Interactive completion delivery re-enters the parent; durable `subagent_stop` hooks wake a serialized controller or Kanban dispatcher. The reconciler, not the callback payload, verifies artifacts and verdicts, releases or blocks dependencies, checks capacity, and schedules the next eligible worker.

**Hook callbacks never dispatch children directly.** They emit a content-free wake or invoke one fixed-argument idempotent dispatcher pass. Child status and summaries are untrusted observations, not executable input or promotion authority. Debounce concurrent completion bursts under one lock, retain a periodic fallback for lost wakes, and prove by smoke test that one completion starts at most one eligible successor.

## Work-conserving liveness invariant

Treat worker capacity as a resource to keep productively occupied while the execution queue has unfinished **runnable** work.

- At the end of every parent turn and after every completion/interruption/timeout callback, reconcile three separate facts: unfinished tasks, dependency readiness, and actual runtime workers. A todo marked `in_progress` is bookkeeping, not proof of activity.
- When at least one task is dependency-safe, authenticated, non-overlapping with active writers, and does not require a user decision, keep at least one real worker active. If active delegated/Kanban/process worker count is zero, dispatch the highest-priority runnable task in that same turn before replying.
- Prefer separate single-task delegations for continuation-sensitive gates. Fill additional capacity only with independent, non-overlapping work; never create activity by racing writers or mutating an immutable review target.
- If an `in_progress` task has no live worker and no durable completion result, immediately classify it as lost/interrupted, inspect recoverable artifacts, and re-dispatch an exact-input replacement. Do not leave it nominally in progress while `/agents` is empty.
- After dispatch, record the handle and expected output. If the runtime exposes no start after a short grace period, inspect lifecycle evidence and recover/re-dispatch rather than waiting for the user to notice.
- It is valid to have zero workers only when every unfinished task is genuinely blocked by dependencies, missing auth, an explicit user decision, a safety gate, or an already-running external operation. Mark those tasks blocked/waiting with the concrete reason; do not manufacture busywork.
- Before sending a status-only or final response, run this liveness check. Never end with a promise that a later hook will dispatch work when a runnable task can be dispatched now.

## Workflow

1. **Dispatch with verifiable outputs.** Ask each child to return an exact verdict plus durable artifact path and digest. Pass every candidate path, expected digest, trust input, language, and immutability constraint in context.
2. **Record the batch handle.** Tell the user which handle to look for in `/agents`; do not claim a model/person identity that the runtime does not expose.
3. **Keep making independent progress.** Do not poll `delegate_task`. Work only on tasks that do not alter the immutable review target.
4. **Resolve visibility discrepancies immediately.** If the user says no agents are visible, inspect the authoritative runtime log/state rather than assuming the UI is wrong. Distinguish:
   - dispatched and recently active;
   - child finished, consolidation pending;
   - batch-complete notification delivered;
   - interrupted by gateway/parent shutdown;
   - stale with no recent activity.
5. **Recover interrupted work.** Verify no requested report was produced, then re-dispatch with the same exact immutable inputs and explicitly identify it as replacement work. Do not reuse partial self-reports as verdicts.
6. **Recover timeout artifacts before re-dispatching.** A `status=timeout` batch means the agent did not return a consolidated summary; it does **not** prove that requested durable artifacts are absent. Inspect the exact requested report/output path. If an artifact exists, verify that it is structurally complete, hash it, verify the reviewed immutable target stayed unchanged, and use its explicit verdict while still classifying the agent run itself as `timed_out_with_recovered_artifact`—never as successfully completed. If the artifact is absent or incomplete, re-dispatch a narrower replacement that writes the durable report before optional slow checks and explicitly skips installs, browser runs, or network probes already covered by preserved evidence. See `references/timeout-artifact-recovery.md`.
   - For review workers, assign a wall-clock budget and reserve the final 20% for atomically finalizing and reading back the durable verdict. If required evidence does not fit, finalize `INCOMPLETE` with the missing gate; never spend the whole budget on optional commands and lose the result.
6a. **Recover direct implementation writes as an untrusted patch set—even when the batch says `completed`.** When a stopped child was authorized to edit a repository, check all three durable surfaces before re-dispatching: (1) the requested remote branch/commit/PR, (2) any shared checkout diff, and (3) the child's isolated workspace/worktree. A child may have pushed an early commit, reached a hard tool-call ceiling, returned a completion summary that describes later GREEN work, and still left those later files uncommitted in an inaccessible workspace. Treat self-reported file lists and test counts as recovery leads, not artifacts. Confirm the child is no longer writing; compare the remote head to the exact baseline; locate the isolated checkout by repository/branch or an authorized filename; inventory only declared paths; rerun narrow targeted tests yourself; and inspect safety-critical changes. If the isolated workspace is absent, state that only the last pushed SHA is recoverable and reconstruct the missing slice from requirements—do not claim the summarized edits exist. Classify the deliverable as `completed_with_partial_deliverable`, `timed_out_with_recovered_changes`, or `timed_out_with_partial_changes` while preserving the actual run state. Never treat passing tests as the missing child review, and never infer completion from files merely existing. Avoid overlapping replacement edits until the old child is confirmed stopped. See the direct-write section in `references/timeout-artifact-recovery.md`.
6b. **Preserve coherent RED-only checkpoints instead of restarting.** A remote branch containing only a deliberate failing-test commit is a useful partial artifact, but it is not GREEN acceptance. Fetch and inspect the exact commit, recreate from its 40-character SHA when branch/worktree resolution is ambiguous, rerun the smallest focused test to prove the intended RED, and compare coverage against the whole task. If `main` advanced compatibly, rebase the checkpoint and update the feature branch only with a lease bound to the observed old remote SHA. Give the replacement worker the exact recovered worktree, RED SHA/output, current base, missing acceptance coverage, and an explicit instruction not to delete or restart the checkpoint. See `references/red-checkpoint-recovery.md`.
6c. **Reconcile authorized external writes after timeout.** A worker can time out after finalizing its report and performing issue/PR/milestone/API mutations but before returning a summary. Reconstruct the prompt's exact mutation allowlist and dependency order, verify the report/checksum first, then read back every affected and explicitly preserved remote object plus the immutable target. Resume only missing idempotent steps; never duplicate evidence comments or broaden scope. Classify this as `timed_out_with_recovered_artifact_and_reconciled_writes`, not completed. If recovery reveals one new runnable blocker, create/update its canonical task and dispatch the next non-overlapping worker in the same turn. See the external-side-effect section in `references/timeout-artifact-recovery.md`.
   - Treat **repository bytes and collaboration metadata** as separate completion surfaces. A timed-out writer may have a complete committed/pushed branch while still missing a PR-body section, issue evidence comment, draft/ready transition, or tracker update. Authenticate local and remote candidate bytes, then each allowed comment/body/state mutation independently. If code/spec bytes are complete, **do not launch another writer**; finish only missing idempotent metadata from the parent and preserve the timed-out run classification.
7. **Validate returned or recovered results.** Read or hash the reported artifacts and act on the exact candidate-bound verdict. Completion deliveries may intentionally show only a head/tail excerpt and provide a path to the complete saved summary. Treat `SUMMARY TRUNCATED`, `middle omitted`, character-limit notices, or full-output footers as proof that the visible message is incomplete: read the complete saved summary before counting findings, scoping remediation, or dispatching the next gate. If the saved summary is missing or unreadable, the detailed result is absent even when the excerpt contains a verdict. Test success does not override a blocking verdict. If reviewers disagree on an objective claim, run an independent read-only probe and record the resolved evidence.
8. **Close supervision.** Once completion, interruption, or timeout is confirmed, stop expecting that run to appear in `/agents`; recovered artifacts affect the task verdict, not the run-state classification, and liveness checks should become silent.

## Quiet watchdog pattern

For important short-lived delegations, use a script-only cron watchdog that checks expected-active work every 10 minutes:

- derive expectation from an explicit expected-active registry when one exists; otherwise use the newest unresolved dispatch and its expected child count;
- never put completed, interrupted, or merely historical delegation IDs into the expected-active set;
- discover child session IDs after dispatch and treat recent unfinished activity as healthy;
- treat normal child completion as no longer expected-active; distinguish all-children-finished/consolidation-pending from a delivered batch result;
- alert on missing starts after a short grace period, explicit interruption/failure, stale unfinished work, or unusually delayed consolidation/delivery;
- emit nothing while healthy or fully complete;
- deduplicate identical alerts and clear alert state after recovery.

Create the scheduler as a recurring `no_agent=True` job, omit a finite repeat count unless the user requested one, deliver to the origin, run the script once manually, then list the job and verify its schedule/next run. The watchdog must auto-discover work rather than hardcode one session's ID. See `references/log-watchdog-pattern.md` for markers, state transitions, implementation guidance, and scheduler verification.

## Pitfalls

- Do not scope remediation from a truncated completion excerpt. When the delivery names a complete saved summary, read that file first; omitted middle findings remain part of the verdict.
- Do not equate `status=timeout` with “no result.” Check the requested durable output path first; a complete report may have been flushed before the process deadline.
- Do not relabel a timed-out run as completed merely because its artifact is usable. Keep run-state and artifact/verdict state separate.
- Do not re-run slow browser/install/network checks in a replacement review when preserved exact-candidate evidence already covers them; narrow the review and require report-first behavior.
- Do not tell the user agents are running merely because dispatch succeeded earlier.
- Do not describe completed agents as running; an empty active-agent view after completion is expected.
- Do not re-dispatch solely because `/agents` is empty until runtime evidence confirms interruption, absence, or staleness.
- Do not recursively launch agents from a cron watchdog. The watchdog alerts; the interactive parent decides whether to re-dispatch.
- Do not spam every interval. Alert on state transitions only.
- Do not make the watchdog dependent on task-specific filenames or verdict text; supervision should remain class-level.

## Verification checklist

- [ ] The continuation mode is explicit: hook-only with the canonical tracker, or durable Kanban by accepted trade-off.
- [ ] Every terminal worker event creates one completion-triggered scheduling wake; duplicate callbacks are debounced and no child is dispatched directly by callback code.
- [ ] The worker type is classified (`delegate_task` child, Kanban worker, background process, or cron) and the matching completion primitive is used.
- [ ] If immediate delegated-child continuation is required, separate single-task delegation is used and batch-drain behavior is documented.
- [ ] Child lifecycle status never releases dependencies without independently verified artifact and gate evidence.
- [ ] In hook-only mode, completion delivery re-entered the parent in a smoke run, no second persistent queue exists, and process-local restart risk is stated.
- [ ] If Kanban is used, any `subagent_stop` callback is observer-only/bounded/idempotent, atomic claims prevent duplicates, and a real smoke completion verified the race path.
- [ ] Batch handle and expected child count are known.
- [ ] Each child has a durable, independently verifiable output contract.
- [ ] `/agents` state agrees with logs, or the discrepancy is explained by completion/interruption.
- [ ] Gateway shutdown/interruption markers after dispatch are checked.
- [ ] Batch completion/interruption/timeout is classified separately from artifact completeness and verdict.
- [ ] On timeout, every exact requested output path was checked before deciding to re-dispatch.
- [ ] Any truncated or omitted delivery was expanded from its named complete saved summary before findings were counted.
- [ ] Any recovered artifact has complete required sections, an independently computed digest, and unchanged-target integrity evidence.
- [ ] After a timeout with authorized external writes, every allowed and preserved remote object was read back; partial writes were resumed idempotently without duplicate comments or broadened scope.
- [ ] Repository bytes and collaboration metadata were verified separately; a complete pushed artifact was not needlessly assigned to another writer.
- [ ] Recovery that exposes a runnable next blocker creates/updates its canonical task and dispatches a dependency-safe worker before the parent turn ends.
- [ ] Missing reports are confirmed before replacement dispatch.
- [ ] Any RED-only checkpoint was recreated from its exact SHA, re-read, and rerun to prove the intended failure.
- [ ] RED coverage was compared with full task acceptance; missing renderer/integration/recovery cases were passed explicitly to the replacement.
- [ ] Any rebased checkpoint update used a force-with-lease bound to the observed old remote SHA.
- [ ] Watchdog healthy path is silent and exits zero.
- [ ] One simulated stale/interrupted state emits exactly one alert.
- [ ] Repeated identical unhealthy runs are silent.
- [ ] Recovery clears the deduplication state.
