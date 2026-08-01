# Recovering timed-out delegated TDD work

A coding delegation can time out after completing edits or while running the broad suite. Treat timeout as an unknown repository state—not as implementation failure and not as permission to restart blindly.

## Recovery sequence

1. Inspect `git status`, recent commits, `git diff --stat`, and `git diff --check` immediately.
2. If intended files are modified but uncommitted, read the changed implementation and focused tests before editing.
3. Run syntax checks and the smallest focused suite first. Preserve genuine RED evidence reported by the delegation; do not manufacture a second RED by reverting working code.
4. If focused checks pass, run the canonical suite from the parent session with a sufficient foreground timeout.
5. Restore only known generated-output trees, verify exact scope, and commit under the planned message.
6. Re-dispatch immutable spec and quality review from the resulting SHA instead of asking another coder to reimplement the slice.

## Isolated-worker and worktree recovery

- A delegated worker may use an isolated checkout that is not attached to the controller's parent clone. Require an immediate branch push and a draft PR after the first coherent GREEN commit, but do not assume later uncommitted work is inaccessible: after the run is confirmed stopped, inspect registered worktrees and search the active profile workspace by repository/branch or one authorized filename. Treat any found diff as untrusted partial work, record its path, read every scoped file, and run focused tests before finishing or reverting it. Never re-clone or reset over a located child workspace before inventorying it.
- On timeout, inspect the exact remote ref and PR head first. Distinguish `timed_out_with_recovered_artifact` from `timed_out_without_recoverable_artifact`; never infer either from the absence of a summary.
- When splitting a bounded correction, assign non-overlapping path ownership and unique recovery branches. Cherry-pick verified commits onto the original PR branch, then run a unified integration RED→GREEN cycle for cross-workstream adapters.
- **Worktree cwd pitfall:** `git worktree add /new/path ... && git cherry-pick ...` still executes `cherry-pick` in the shell's original checkout. Run worktree creation separately, or execute every subsequent Git/test command with `workdir=/new/path` (or an explicit `git -C /new/path`). If false modify/delete conflicts appear, inspect `CHERRY_PICK_HEAD`, abort only the accidental parent operation, and verify the intended worktree is clean before retrying there.
- After integration, push the original PR branch, verify the remote full SHA, rerun the canonical suite and external/browser probes, and review that immutable SHA. Do not transfer approval from component commits or the pre-integration head.

## Generated-output and review-loop discipline

- Broad suites may leave thousands of generated-file changes and drown the useful diff. Restore only the known generated-output tree before inspecting or committing; never clean arbitrary paths.
- A timeout after generation is not a signal to restart. Check whether the intended source/test commit already exists, then run the smallest focused test from the controller.
- Preserve genuine RED evidence from the worker. If the implementation is already green, do not manufacture a new RED by reverting it.
- When the composite review finds boundary flaws, keep the task blocked and add adversarial tests for the exact class: HTML script breakouts, inherited names, Symbols, Proxies/reflection traps, DOM accessors, stale session state, route-prefix drift, and partial instrumentation.
- For generated browser analytics, verify the actual lifecycle—not only extracted helpers: hydration, direct load, SPA replacement, back/forward, delegated events, route prefixes, and non-target pages.
- Share one immutable generated fixture across lifecycle tests when generation is expensive; keep one end-to-end generation assertion and focused unit probes for hostile inputs.
- After any production correction, rerun the composite independent review on the new immutable SHA. A reviewer timeout is no verdict; recover durable evidence and re-dispatch only the missing scope against the same immutable SHA.

If focused checks fail, continue from the existing diff or re-dispatch with explicit context that the worktree contains partial uncommitted changes. Never let a second worker edit the same worktree concurrently. A timeout alone is not evidence that the implementation or tool is broken; the durable lesson is the recovery sequence.
