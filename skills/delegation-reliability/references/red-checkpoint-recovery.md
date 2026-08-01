# Recovering a durable RED-only checkpoint

Use this when an implementation delegation stops or times out after pushing tests but before a complete implementation or PR.

## Classification

Keep three facts separate:

1. **Run state:** timed out/interrupted/completed.
2. **Artifact state:** absent, RED-only, coherent partial GREEN, or complete candidate.
3. **Acceptance state:** blocked until implementation and required reviews pass.

A pushed failing-test commit is `timed_out_with_partial_deliverable`, not completion and not implementation failure.

## Recovery procedure

1. Inspect all durable surfaces before re-dispatch:
   - remote feature branch and exact SHA;
   - PR existence/head/state;
   - controller-visible worktrees and local branches;
   - any reported isolated workspace.
2. Fetch the remote checkpoint and inspect its commit list and complete diff against the recorded base.
3. If symbolic branch/worktree resolution is ambiguous, create the recovery worktree from the **exact 40-character commit SHA**, then assert `HEAD` before reading or testing.
4. Re-read every changed file. Decide whether the checkpoint is a coherent test contract or an unsafe/incomplete patch.
5. Rerun the smallest focused test. Preserve the real failure output and confirm it fails for the intended missing behavior—not syntax, setup, or unrelated breakage.
6. Compare RED coverage to the whole task acceptance. A valid projector test can still be partial if renderer/browser/recovery acceptance is missing.
7. If `main` advanced while the worker ran:
   - verify whether the delta is compatible;
   - rebase the RED commit onto current `origin/main` when safe;
   - push only with `--force-with-lease=<remote-ref>:<old-sha>` so concurrent remote work cannot be overwritten.
8. Dispatch a narrower replacement into the recovered worktree. Give it:
   - exact worktree and local/remote branch names;
   - recovered RED SHA and current base SHA;
   - reproduced RED command/output;
   - missing acceptance coverage to add before GREEN;
   - explicit instruction not to restart/delete the checkpoint;
   - required commit/PR/test evidence.
9. After replacement completion, independently verify local/remote/PR SHA parity, clean status, commit history, changed paths, and every modified file before starting one composite independent review.

## Pitfalls

- Do not call a test-only branch “failed implementation”; the run timed out while the artifact may still be useful.
- Do not call coherent RED “GREEN” because the test itself is well written.
- Do not infer absent work from a missing PR; a remote branch may contain a recoverable checkpoint.
- Do not recreate the feature from scratch until exact-SHA recovery and focused RED reproduction fail.
- Do not force-push without a lease tied to the observed old remote SHA.
- Do not let a replacement silently drop or rewrite honest RED evidence.
