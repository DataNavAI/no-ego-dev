# Bounded Self-Unblocking Publication

Use this when a scheduled harvest encounters an existing automation PR, failed required check, local-ahead worktree, stale review/evidence receipt, or orphaned lock keeper.

## Resume existing PR before new inventory

Treat unfinished publication as a durable continuation queue. Before scanning for new packages:

1. enumerate open PRs, remote automation branches, registered worktrees, continuation markers, and review/evidence receipts; do not filter only on one legacy prefix such as `automation/skill-harvest-*`, because a renamed harvester branch may own the active publication;
2. enumerate marker families such as `continuation*.json`, not only a canonical `continuation.json`; order timestamped markers, follow `supersedes` links, and treat the newest coherent chain as historical evidence until live state confirms it;
3. reconcile each matching PR's remote head, local worktree, continuation marker, and current default branch;
4. treat a closed-unmerged PR as historical publication state, not automatic terminality, when its automation branch, local-ahead commits, dirty worktree, review/evidence receipts, or continuation marker still preserve unpublished candidate bytes. Record the live `CLOSED` state immediately, keep those bytes untouched, and after generation-sensitive preflights clear choose one evidence-backed path: reopen the same PR when GitHub permits and its lineage remains coherent, or continue on one explicitly superseding automation PR. Never create duplicate publication for the same candidate set or describe a closed PR as still open;
5. preserve local-ahead commits unless proven disposable;
6. if an isolated worktree is dirty, preserve all uncommitted bytes and freshly recompute its exact path, HEAD, branch/PR coordinates, modified-path set, binary-diff SHA-256, and diff byte size during every reconciliation. Do not reuse an older marker's dirty-path list or digest merely because `HEAD` and the remote PR head are unchanged; interrupted work or another authorized actor may have changed the uncommitted generation;
7. do not clean, reset, commit, or selectively copy dirty bytes during a read-only controller-restart boundary;
8. inspect the exact failed-job log rather than stopping at a red summary;
9. bind every test, review, evidence, push, and merge claim to immutable SHAs.

A dirty worktree is continuation evidence, not authorization to publish. After the runtime or authorization boundary clears, resume from those preserved bytes, rerun validation, freeze a clean commit, and obtain fresh exact-SHA review before evidence or merge.

## Failure classification

- **Expected evidence boundary:** when `manual-test-gate` requires proof, exercise the exact approved code candidate, then create a separate evidence-only child commit.
- **Candidate defect:** add a failing regression, fix the candidate, rerun affected/full validation, and obtain fresh exact-SHA review.
- **External transient:** retry only the failed job once; never loop all checks.
- **Independent unsafe package:** omit or stably reject that package while allowing safe packages to continue.
- **Irreducible authorization or user decision:** persist exact continuation coordinates and stop without claiming publication.

Any candidate-byte change invalidates the previous approval and manual-test evidence. A manual-evidence child does not change the reviewed code candidate, but code-only approval does not approve the later evidence bytes: obtain fresh independent exact-SHA approval of the complete final evidence-child tree, then require the repository's checks and bind guarded merge to that reviewed final head.

## Publication state machine

Use explicit durable states:

```text
resume_existing_pr
classify_failed_check
repair_candidate
write_evidence_commit
review_final_tree
guarded_merge
post_merge_ci
rollout
release_lock
```

The normal path is:

1. freeze and validate the code candidate;
2. obtain independent review of that exact SHA;
3. create an evidence-only child when required;
4. push and wait for required checks;
5. merge with an exact-head guard;
6. verify applicable exact default-branch CI;
7. roll out only immutable merged bytes;
8. advance state selectively;
9. release and verify the lock.

“Blocked before publication” is not terminal when the remaining repair is within the harvester's existing GitHub, test, review, file, or rollout authority.

## Lock safety and PID reuse

A live PID is not proof of productive lock ownership. Correlate owner metadata with the scheduled transcript, session, worktree, PR, age, command ancestry, and current continuation state.

Use a finite lease shorter than the scheduler interval. Normal completion must release explicitly; lease TTL is crash containment only.

**Never signal a PID from owner metadata.** PIDs can be reused. For a live keeper, require an authenticated same-user control mechanism, such as a token-authenticated loopback control channel through which the keeper self-terminates. A dead or expired owner may have only its exact token-owned lock reclaimed; do not signal an unverified live PID.

Every terminal path—success, no change, validation failure, repeated CI failure, rollout failure, timeout/budget cutoff, cancellation/exception, or external authorization—must:

1. disposition background work;
2. invoke exact-owner release;
3. verify keeper disposition;
4. verify lock absence;
5. persist continuation coordinates if work remains.

## Eval design

If a behavioral eval supplies no authenticated disposable GitHub target, real PR coordinates, or signalable keeper process, it must not demand fabricated side effects. Make it an explicit deterministic simulation that requires:

- ordered state transitions;
- exact production command shapes with placeholders;
- evidence required at each gate;
- a cleanup matrix for every terminal path;
- a statement that production runs with verified coordinates must execute the actions.

This preserves behavioral coverage without teaching the model to invent merges, CI, or process cleanup.

## Completion proof

A run is complete only with one of:

- merged default-branch SHA, applicable exact-SHA CI, selective state advancement, rollout receipts, and lock absence;
- verified no-change reconciliation and lock absence;
- stable irreducible boundary with an actionable continuation marker and lock absence.
