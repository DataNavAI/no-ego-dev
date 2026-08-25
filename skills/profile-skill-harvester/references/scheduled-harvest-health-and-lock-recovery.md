# Scheduled harvest health and orphan-lock recovery

Use this when a scheduled harvest appears healthy in the scheduler but canonical state, inventories, PRs, or profile rollout evidence are not advancing.

## Scheduler status is not harvest status

A scheduler result such as `ok` or `execution_success=true` proves only that the scheduled agent session ended without a scheduler-level delivery failure. It does **not** prove that the harvest:

- acquired and released its single-flight lock correctly;
- completed inventory or semantic reconciliation;
- advanced external state;
- published or deliberately dispositioned candidates;
- checked every rollout target;
- reached a legitimate no-change `[SILENT]` result.

For each health audit, verify all of these independent signals:

1. the latest cron session transcript and its final disposition;
2. lock existence, owner token, owner PID, command, age, and process ancestry;
3. inventory/state/continuation artifact modification times and contents;
4. current isolated worktree and branch existence;
5. live PR/merge state and reachability from the remote default branch;
6. per-target rollout/adoption evidence when rollout is part of the job.

A repeated `BUSY`, an immediate `[SILENT]` after only lock preflight, or unchanged state across expected runs is degraded operation even when the scheduler says `ok`.

## Distinguish contention from an orphan

A live PID is necessary but not sufficient proof that a lock still owns useful work. Never kill it merely because it is old. Before requesting release of a live lock keeper through the packaged helper, prove all of the following:

- the exact PID and token match the lock owner record;
- the process command is the dedicated lock keeper, not a worker or unrelated process;
- the process is detached/orphaned or otherwise no longer associated with a live scheduled session;
- the recorded worktree is absent or has already reached a terminal publication disposition;
- any PR/merge named by the run is terminal and reconciled;
- no active harvester child, reviewer, publication, or rollout process still depends on the lock.

If proof is incomplete, report the lock as blocked and do not mutate it.

When orphanhood is proven, reread the current owner record and invoke `scripts/lease_lock.py release` with its exact PID/token. A live keeper may exit only after the token-authenticated loopback handshake succeeds. Never send a direct process signal based on owner metadata. For a dead or expired owner, reclaim only the matching lock without signaling any live PID. Verify keeper disposition and lock absence; do not delete the lock directory first while its owner remains alive.

## Recovery verification

After releasing a proven orphan:

1. trigger one manual reconciliation using the existing job; do not create a duplicate schedule;
2. inspect the new session transcript, not only scheduler metadata;
3. verify whether it inventories, reaches another explicit prerequisite boundary, publishes, or returns a legitimate no-change result;
4. require a continuation marker for any restart or external-action boundary;
5. confirm `state_advanced=false` and `mutation_performed=false` when the run stops before inventory/publication/rollout;
6. leave the next scheduled run enabled and report the exact remaining unblock action.

A controller restart boundary is distinct from lock failure. If persisted timeout configuration is newer than the active gateway and runtime adoption cannot be proved, stop before delegation or deployment, release the lock, write a continuation marker, and require an external restart plus a fresh scheduled request. Do not call that run a successful harvest.

## Legitimate silence

`[SILENT]` is valid only after the run has completed the required inventory and target reconciliation and found no new change or blocker. Lock contention, stale runtime adoption, missing visibility, skipped targets, and unchanged stale state are reportable health failures—not no-change results.
