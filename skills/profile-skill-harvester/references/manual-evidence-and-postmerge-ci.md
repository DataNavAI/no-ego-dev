# Manual-evidence publication and post-merge CI proof

Use this companion to `transactional-profile-rollout.md` when a canonical skill change adds code/tests, the repository requires fresh manual evidence tied to the latest code commit, and the merged package will roll out to divergent live profiles.

## Self-referential evidence: use two commits

When `.github/manual-test-result.json` (or equivalent) must name the latest code-change commit, it cannot truthfully name the commit that contains itself. Use this exact sequence:

1. Freeze the code/eval/test index against immutable remote-default bytes; require zero unstaged/untracked files and hash the binary staged diff.
2. Obtain independent approval for that exact code-only candidate.
3. Commit the approved code bytes.
4. Exercise that exact code commit with the repository's required focused, full, and live/manual checks.
5. Write and stage only the evidence file with `candidate_sha` equal to the code commit.
6. Run the repository's real evidence verifier with the intended base and code HEAD.
7. Hash and independently review the complete remote-default-to-index tree: committed code plus staged evidence.
8. Recheck the exact final-tree hash, then commit only the evidence.

Any evidence edit invalidates final-tree approval. Do not bypass the gate, invent a future SHA, put self-referential evidence in one commit, or treat code-only approval as approval of later evidence bytes.

## Default-branch movement after evidence exists

A guarded merge may report conflicts because the default branch advanced and changed the repository's shared evidence file. Treat that as a new candidate generation, even when the product/skill files do not conflict.

1. Fetch the current remote default branch and list every path changed since the candidate base.
2. Rebase the code commit(s) first. If the evidence-only commit conflicts, **drop/skip that stale evidence commit** rather than hand-merging old candidate coordinates.
3. Re-run the complete code validation, scanners, and any behavioral/manual eval against the rebased code commit.
4. Generate a new evidence-only commit whose `candidate_sha` names that rebased code commit; run the repository's real manual-evidence verifier.
5. Force-update a previously published feature branch only with an exact `--force-with-lease` bound to the old remote head. Never force the default branch.
6. Obtain fresh exact-SHA approval for the rebased code candidate and final tree as required. Identical source text on a new parent is not the previously approved commit.
7. Re-read the PR head, base SHA, mergeability, and complete checks immediately before retrying a head-guarded merge.

This avoids preserving stale evidence coordinates or accidentally resolving a conflict by accepting the default branch's evidence for an unrelated candidate.

## Classify external CI failures before editing source

Read the exact failed job log. If a job failed entirely in an external prerequisite—for example a dependency clone/download returning a rate-limit or transient network status—and no candidate code executed, label it infrastructure evidence rather than a product regression. Rerun only the failed job once when repository policy permits, keep the same candidate SHA, and require the rerun to pass. If the failure repeats or candidate code ran before failure, investigate normally; never add a source workaround merely to disguise an upstream transient.

## Trigger-aware exact-head CI

After merge, discover the remote default branch and exact merged HEAD. Derive the required post-merge contract from workflow/check triggers:

- require every workflow/check configured for that exact default-branch event/SHA;
- retain successful PR-only required checks as merge-gate context;
- do not falsely require a PR-only check on a post-merge push unless it is also configured for that commit;
- treat an empty, unauthorized, stale, or partial query as missing visibility, not healthy CI.

Wait for every applicable run/job to terminate. If any applicable run is broken or missing after its bounded grace, search for the canonical incident, create/reuse one issue, and begin bounded remediation immediately. If all applicable exact-head runs/jobs are green, record their durable URLs and do not create an incident.

## Squash-merge rollout boundary

A reviewed candidate worktree is not the rollout source after squash, rebase, or merge. Export the skill from the verified merge commit. For targets with same-path local extensions, use:

- **ours:** current target profile file;
- **base:** immutable canonical file from before the change;
- **theirs:** file exported from the verified merged commit.

Dry-run all targets before mutation. Back up full target packages, preserve target-only files and known profile-policy markers, fail on conflicts, install atomically with rollback, and prove adoption through a fresh explicit skill load in every target profile. Remove temporary worktrees/archives/scripts after verification, but retain the timestamped rollback backup.
