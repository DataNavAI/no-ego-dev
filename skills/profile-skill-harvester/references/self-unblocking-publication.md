# Self-unblocking publication state machine

Use this whenever a harvest finds an existing automation PR, continuation marker, local-ahead worktree, failed required check, or reviewed candidate that has not reached verified default-branch publication. This continuation has priority over new discovery.

## Core rule: resume-before-inventory

An unfinished existing PR is a first-class durable queue item. Before starting new inventory or producing another candidate:

1. Fetch the remote default branch and the existing feature branch.
2. Reconcile the continuation marker, local worktree HEAD, remote PR head, exact review receipt, CI runs, and merge state.
3. Preserve local-ahead commits and independently useful review findings. Never reset, force away, or silently abandon unpublished candidate bytes.
4. Resume from the first incomplete state below. Do not repeat completed expensive stages unless candidate bytes, parentage, evidence bytes, or required external state changed.
5. Start new inventory only after the existing PR is merged, deliberately closed with a stable reason, or reduced to independently blocked packages while safe packages continue.

A report that merely names the blocker is not a successful harvest when the job has authority and tools to repair it.

## Durable states and transitions

Persist the exact state outside the repository after every transition. Use these state names verbatim so the next run can resume deterministically:

1. `resume_existing_pr`
   - Verify repository, PR number, worktree, local HEAD, remote head, base SHA, and changed package set.
   - If the local worktree is ahead of the remote PR, validate and publish that integrated head rather than inspecting only the stale remote head.
2. `classify_failed_check`
   - Read the exact failed job log immediately.
   - Classify it as: expected evidence gate, candidate defect, external transient, stale-base conflict, unavailable authorization/infrastructure, or unrelated failing default-branch condition.
3. `repair_candidate`
   - For a candidate defect, use TDD, narrow or repair only the affected package, run focused and full validation, freeze a new code SHA, and obtain fresh exact-SHA approval.
   - Preserve safe independent packages when one package is unexercisable or unsafe.
4. `write_evidence_commit`
   - When `manual-test-gate` requires a separate evidence-only child, exercise the exact approved code commit, write `.github/manual-test-result.json` with `candidate_sha` equal to that code commit, verify it with the repository script, and commit only that evidence file.
   - Never ask a user to create routine evidence that the autonomous harvest can generate from its own completed checks.
5. `review_final_tree`
   - Obtain independent approval bound to the complete final PR head after the evidence-only child exists. Code-only approval does not approve later evidence bytes, even when the evidence names the approved code parent.
   - Verify the final review receipt names the exact evidence-child SHA, its parent is the exercised code candidate, and the evidence file is the only child change. Any later byte or parentage change invalidates this approval.
6. `guarded_merge`
   - Push without overwriting concurrent remote work, wait for required checks, and merge directly with `gh pr merge ... --match-head-commit <verified-pr-head>`.
   - The guarded SHA must equal the independently approved complete final-tree SHA, not the earlier code-only candidate.
   - Do not arm unguarded auto-merge from an external review verdict.
7. `post_merge_ci`
   - Fetch the remote default branch, prove the merge commit is reachable, discover workflows applicable to that exact SHA, and wait for their terminal results.
   - A broken exact default-branch run starts bounded remediation; it is not a successful publication report.
8. `rollout`
   - Derive the complete selected skill set from the harvest disposition and prove every selected package exists in the verified remote-default merge commit. A package that exists only in a live/global installation, local worktree, pushed branch, or open PR is not published and cannot enter rollout.
   - Export packages from the verified merge commit, not a mutable checkout. Follow the transactional sibling-rollout contract and verify each target independently.
   - If any selected update is absent from the merge commit, stop before target mutation, persist canonical-publication continuation coordinates, and leave its inventory state unadvanced.
9. `release_lock`
   - Release the exact PID/token-owned lock and prove both keeper exit and lock absence on every terminal path: success, no-change, blocked package, failed check, timeout reserve, exception, cancellation, or external-action boundary.

## Failed-check decision table

| Classification | Autonomous action |
|---|---|
| Expected evidence gate | Complete exact-code tests/review, create and verify the evidence-only child, obtain fresh independent approval of the complete final PR head, push/wait checks, and continue only with that reviewed head. |
| Candidate defect | Fix or narrow with TDD, revalidate, invalidate stale approvals, obtain fresh exact-SHA approval, then continue. |
| External transient before candidate code ran | Rerun only the failed job once as a bounded retry; require the same SHA to pass. |
| Default branch advanced | Rebase/integrate without discarding either side, regenerate stale evidence, revalidate, and re-review the new SHA. |
| One package has an impossible fixture or unsafe behavior | Defer that package with a stable reason; publish independent safe packages. |
| Missing user authorization, destructive ambiguity, or unavailable external system | Persist exact coordinates and the smallest safe user action, release the lock, and resume-before-inventory on the next run. |

A retry is bounded retry, not an infinite loop. One transient rerun is allowed per unchanged SHA/failure class. A repeated failure must be diagnosed or repaired, never repeatedly rerun.

## Lock lease and cleanup

Never use an immortal detached `while True` keeper. Every lock owner must have a lease TTL shorter than the scheduler interval and long enough for the declared maximum run. The owner record must include PID, random token, acquisition time, `expires_at`, controller/session identity, worktree, branch, and PR when known.

Use the packaged helper rather than inventing a new inline keeper:

```bash
python3 scripts/lease_lock.py hold \
  --lock-dir ~/.hermes/state/profile-skill-harvester/harvest.lock \
  --lease-seconds 7200 \
  --session-id <scheduled-run-id> \
  --controller-profile default \
  --provider openai-codex \
  --model gpt-5.6-sol
```

Run `hold` as a managed background process and retain the emitted PID/token. Release it explicitly on every terminal path:

```bash
python3 scripts/lease_lock.py release \
  --lock-dir ~/.hermes/state/profile-skill-harvester/harvest.lock \
  --pid <exact-pid> \
  --token <exact-token>
```

- The active run may heartbeat the lease only while it still owns productive work.
- The keeper must self-terminate and token-safely remove its own lock when the lease TTL expires.
- Normal completion must explicitly enter `release_lock`; TTL is crash containment, not normal cleanup.
- A live keeper accepts release only through its token-authenticated loopback control channel. Never send a process signal based only on a PID from owner metadata; PID reuse could terminate unrelated work.
- A fresh run may reclaim a dead or expired owner's lock after matching PID/token metadata and proving no productive child, review, publication, or rollout remains. Reclaim the lock only; do not signal an unverified live PID.
- Never delete the lock directory while a live owner remains.

## Budget discipline

Reserve enough execution budget for evidence generation, one review, CI disposition, guarded merge, post-merge proof, state advancement, and `release_lock` before starting another eval or candidate generation. If the reserve is threatened:

1. stop creating new work;
2. persist the current state name and immutable coordinates;
3. terminate/disposition background work;
4. execute and verify `release_lock`;
5. let the next scheduled run perform resume-before-inventory.

The next run must continue the existing PR before scanning for new work. This makes interruption resumable without requiring routine human intervention.

## Completion proof

A self-unblocked harvest is complete only when one of these is verified:

- merged default-branch SHA plus applicable exact-SHA CI, selective state advancement, sibling rollout receipts, and lock absence;
- no-change inventory plus target reconciliation and lock absence;
- a stable irreducible external/user boundary with a verified continuation marker and lock absence.

“Blocked before publication” is not terminal when the remaining action is within the harvester's existing GitHub, file, test, review, or rollout authority.
