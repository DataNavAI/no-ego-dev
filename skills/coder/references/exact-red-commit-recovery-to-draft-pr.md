# Recovering an exact RED commit into a reviewable GREEN draft PR

Use when a task begins from a named RED commit that already exists locally or remotely and the user requires the GREEN continuation to remain independently reviewable.

## Recovery sequence

1. **Prove immutable starting identity before editing.** Record `git rev-parse HEAD`, `HEAD^{tree}`, branch status, `origin/main`, and the remote feature-branch head. Require local HEAD and remote RED head to equal the requested SHA; do not silently rebase or recreate the RED test commit.
2. **Read the frozen contract and the RED test.** Confirm issue scope, governing specs, exclusions, and canonical verification commands. Inspect the RED commit diff so the implementation satisfies the test contract rather than replacing it.
3. **Reproduce RED exactly.** Run the focused test and verify the failure is caused by the intended absent behavior/module, not syntax or fixture construction.
4. **Complete one vertical GREEN slice.** Add only the production seam, renderer/controller integration, build/public-boundary changes, and focused tests needed by the issue. Preserve exclusions such as analytics, navigation wiring, publication, or deployment.
5. **Verify in layers.** Run focused feature tests, closely related tests, build/public-boundary tests, then each repository-required canonical command as a separate bare invocation. Run `git diff --check` and required current-tree/full-history secret scans.
6. **Stage exact paths only.** Review the complete cumulative diff from base through RED and GREEN, stage named files, run cached diff checks, and commit GREEN separately so the original RED commit remains visible in history.
7. **Push the existing feature branch.** Push `HEAD:<original-remote-feature-branch>` and confirm `git ls-remote` equals local HEAD. Avoid inventing a replacement branch when the requested recovery branch already exists.
8. **Open the requested draft PR immediately.** Include RED failure, GREEN counts, full verification evidence, exclusions, exact base/head, and a clear note that separate exact-head reviews are pending. Do not claim the issue closed; `Closes #N` takes effect only when merged.
9. **Confirm remote recoverability.** Read the PR back and verify draft/open state, base/head OIDs, remote branch SHA, merge state, and clean local worktree.
10. **Refresh verification if the workspace recorder reports stale evidence.** Re-run the canonical test and build scripts as separate bare commands against the unchanged pushed HEAD, then confirm the worktree is still clean and local HEAD equals the remote branch. Do not argue from earlier output when the recorder explicitly requests fresh evidence.

## Evidence report

Report exact RED and GREEN counts separately, then focused, full-suite, build, public-boundary, architecture/mock, diff, and secret-scan results. Include immutable base/head/tree identities, PR URL, changed paths, pending review gates, and whether CI checks exist.

## Pitfalls

- Rewriting or squashing away the supplied RED commit.
- Branching from current main instead of the exact requested RED SHA.
- Treating a pushed branch as complete when a draft PR was explicitly requested.
- Reporting a draft PR as closing the issue before merge.
- Running only aggregate verification or relying on stale pre-commit evidence.
- Claiming CI passed when the PR has no status checks; say that no checks are configured/reported.
