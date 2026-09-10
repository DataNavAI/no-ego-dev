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

A live PID is necessary but not sufficient proof that a lock still owns useful work, and a stale owner PID may have been reused by an unrelated process. Never signal it merely because it is old or matches owner metadata. Before reclaiming a live lock, prove all of the following:

- the exact PID and token match the lock owner record;
- the process command is the dedicated lock keeper, not a worker or unrelated process;
- the process is detached/orphaned or otherwise no longer associated with a live scheduled session;
- the recorded worktree is absent or has already reached a terminal publication disposition;
- any PR/merge named by the run is terminal and reconciled;
- no active harvester child, reviewer, publication, or rollout process still depends on the lock.

If proof is incomplete, report the lock as blocked and do not mutate it.

When orphanhood is proven, a live keeper may self-terminate only through an authenticated control path, such as a token-authenticated loopback channel. Never signal a PID from owner metadata. For a dead or expired owner, reclaim only the exact token-owned lock. In both cases verify keeper disposition and lock absence; do not delete a live owner's directory first. See [`self-unblocking-publication.md`](self-unblocking-publication.md).

## Acquisition must be transactional before owner publication

Treat `mkdir(lock_dir)` through atomic owner-record publication as one initialization transaction. A socket-constructor, socket-option, bind, listen, or owner-write exception must not strand a directory with no usable owner record and make every later run return `BUSY` forever.

On initialization failure:

1. close a control socket only if construction succeeded;
2. if an exact owner record was already published, use the normal PID-plus-opaque-owner-proof cleanup path;
3. otherwise remove the directory only with non-recursive `rmdir`, and only when it is still empty;
4. preserve any unexpected file or concurrently published owner record and fail closed rather than recursively deleting unknown state.

### Exact-owner cleanup must claim before authenticating

A read-authenticate-unlink sequence is still unsafe: another actor can replace `owner.json` after authentication but before unlink, causing cleanup to delete unknown state. Cleanup must atomically move the current canonical owner pathname into a private, unpredictable claim directory first, then authenticate the file actually claimed.

Use this state machine:

1. create a mode-`0700` random claim directory under the lock directory;
2. atomically move the current `owner.json` into that claim;
3. read only a regular, non-symlink claimed owner file (use no-follow/open-and-`fstat` checks where supported);
4. if the claimed PID/proof matches, remove only that claimed file, then use non-recursive `rmdir` for the claim and lock directories;
5. if the claim is unknown or malformed, restore it to the canonical pathname with a no-overwrite operation such as a hard link followed by unlink of the claim;
6. if another canonical owner appeared after the claim, preserve it, leave the lock directory busy, and return cleanup failure;
7. never recursively delete claim directories or unexpected contents.

This pattern also protects normal release and dead/expired-owner reclamation, not only acquisition failure. Add deterministic race tests for replacement after claim validation, preexisting owner mismatch restoration without claim artifacts, malformed/symlink owners, and a concurrently created canonical owner. The required invariant is stronger than “the directory eventually disappears”: **only the exact file actually claimed and authenticated as ours may be deleted**.

### Final `rmdir` failure must not erase ownership

Claim authentication alone is insufficient. If cleanup deletes the authenticated claim and an unexpected artifact makes the final non-recursive `rmdir(lock_dir)` fail, it has created an ownerless lock that every future acquisition may report as permanently busy.

Use a recoverable removal sequence:

1. after authenticating the claimed regular owner file, create an unpredictable hard-link backup in the lock directory's parent (same filesystem), preserving the exact inode and owner-only mode;
2. remove the in-lock claim file and claim directory;
3. attempt only non-recursive `rmdir(lock_dir)`;
4. on failure, restore the backup to canonical `owner.json` with a no-overwrite hard link;
5. if a concurrent canonical owner already exists—including a broken symlink detected with `lstat`, not `exists()`—preserve it and delete only the authenticated backup;
6. if restoration itself fails while canonical ownership is absent, retain the backup and return failure rather than deleting the last recoverable owner identity;
7. after either successful directory removal or successful/preserved canonical ownership, remove the known backup and prove no backup artifact leaked.

Fault-inject an extra file before cleanup and assert all three outcomes: cleanup reports failure, the exact authenticated owner record is readable again, and the unexpected file remains untouched. Also retain the post-validation canonical-replacement race: cleanup may remove its private authenticated claim but must preserve the newer canonical owner.

### Bounded stale initialization reclamation

Fresh ownerless or malformed locks remain fail-closed. To prevent a crash between `mkdir(lock_dir)` and owner publication from blocking forever, define a conservative stale-initialization classifier with a threshold greater than the maximum valid lease plus a small grace period. Reclaim only:

- an empty lock directory older than that threshold; or
- a directory older than the threshold containing exactly one old, malformed, regular, non-symlink `owner.json`.

Do not reclaim a readable owner record, a symlink, a fresh directory/file, or any directory with extra entries. Atomically claim the malformed owner before deleting it, recheck that the claim is still old and malformed, and use the same backup/no-overwrite restoration protocol if a concurrent artifact blocks final removal.

A concurrent canonical replacement may appear after the stale file has been claimed and validated. At that point the private claim is known to be old and malformed, so it is safe to discard **only that claimed file** rather than trying to overwrite or retain it indefinitely. Preserve the canonical replacement, remove the private `.stale-*` claim directory, and return reclamation failure so the replacement remains authoritative. Before discarding, hard-link the stale claim to an unpredictable parent backup and recheck the canonical pathname afterward; if the replacement disappeared during the race, restore the backup with no-overwrite semantics. Never leave `.stale-*`, `.cleanup-*`, or backup artifacts that can poison later authenticated cleanup. A deterministic regression must install a replacement from the claimed-file validation hook, assert that only canonical `owner.json` remains, then prove the replacement owner can release normally.

Tests must cover old empty and malformed success plus fresh, old-valid, symlink, and extra-entry preservation.

Keep atomic-write temporary-file cleanup in `finally`. Add separate fault-injection tests for socket construction, bind/listen setup, and owner-record writing; each must prove the fresh ownerless directory is absent afterward. Also retain mutation tests proving unknown non-empty contents and concurrently replaced owners are not removed.

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
