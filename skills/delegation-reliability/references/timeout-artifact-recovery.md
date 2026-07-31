# Timeout artifact recovery

Use this when an async delegation ends with `status=timeout`, especially for reviewers asked to save a Markdown report.

## State model

Track two independent dimensions:

| Dimension | Values |
|---|---|
| Run state | `active`, `completed`, `interrupted`, `timed_out`, `unknown` |
| Artifact state | `missing`, `partial`, `complete_unverified`, `complete_verified` |

A valid combination is `timed_out + complete_verified`. The report's explicit candidate-bound verdict may be acted on, but the agent run must still be reported as timed out.

## Recovery procedure

1. Read the exact output path requested in the delegation prompt; do not search only completion messages.
2. Reject a partial artifact if it lacks the requested identity, verdict, findings/blockers, evidence, and no-modification statement.
3. Independently hash the artifact and record the digest.
4. Re-run a cheap immutable-target integrity check and confirm the target was not modified.
5. If complete and verified, preserve/copy the artifact into the canonical review history and act on its explicit verdict.
6. If missing or partial, re-dispatch with a narrower task:
   - write the report before optional checks;
   - prioritize unresolved blockers and regression probes;
   - skip installs, browser suites, and network calls already supported by immutable prior evidence;
   - keep the same exact candidate path and digest.
7. Never infer approval from tests, elapsed API calls, a completion/timeout label, or the mere existence of a report.

## Direct-write implementation recovery

A coding child may stop after pushing an early checkpoint and then continuing in an isolated workspace. This can happen after `timeout`, interruption, **or a nominal `completed` summary caused by a hard tool-call/iteration ceiling**. Track requested-deliverable completeness separately from run state.

1. Confirm from authoritative runtime state that the child has stopped; do not inspect or edit files concurrently with an uncertain writer.
2. Reconstruct the exact baseline, branch name, requested draft PR, and authorized path scope from the dispatch prompt.
3. Check **three durable surfaces** before declaring the work absent:
   - remote branch: compare its head to the exact baseline and inspect any ahead commits;
   - shared checkout: inventory the scoped diff if the child was authorized to write there;
   - isolated child workspace/worktree: enumerate known worktrees first, then search the profile workspace by repository/branch or one authorized filename when the checkout is not attached to the parent clone.
4. A common recoverable state is `remote = first GREEN checkpoint` plus `isolated workspace = later uncommitted RED/GREEN work`. Preserve both. Never reset or re-clone over the isolated workspace before reading its status and diff.
5. Classify each expected output as missing, partial, or present. File existence and a self-report are not completion evidence.
6. Read the complete scoped files—not only the diff hunk—because interrupted refactors often leave old variable names, fixture shapes, or call sites behind. Run the narrow tests named in the dispatch and use their failures to finish or revert only the incomplete adaptation.
7. Inspect security-critical or destructive code yourself. A green targeted suite verifies the recovered patch, not the child run or the whole feature.
8. Preserve unrelated parent work and avoid broad resets. When the remote/PR is unchanged but the authorized shared worktree contains a coherent dirty continuation, leave the remote untouched while you read the complete diff, run the narrow recovered tests, and inspect safety-critical code. Only after focused and canonical verification should the parent commit those exact scoped files and push the requested branch. Then verify local SHA = remote branch SHA = PR `headRefOid`, require a clean worktree, refresh stale PR-body identity/count evidence, and dispatch fresh immutable reviews; the parent commit does not reclassify the child run as completed.
   - `git worktree add <path> ...` does **not** change the shell's current directory. A chained cherry-pick, test, commit, or push still runs in the parent checkout unless the next command uses an explicit tool `workdir`, `git -C <path>`, or a subshell that changes directory. Before applying commits, verify `git rev-parse --show-toplevel` and `git status` inside the target worktree. If a cherry-pick accidentally starts in the parent, abort it there before retrying in the correct checkout.
9. If work remains, re-dispatch a smaller non-overlapping task or finish it in the parent. Report the original run as `timed_out_with_recovered_changes` or `timed_out_with_partial_changes`.

### Recovery evidence to record

- exact baseline, remote branch head, and recovered workspace path;
- whether the remote had no commit, an early checkpoint, or the full requested patch;
- scoped `git status`/diff inventory;
- focused test result before and after repair;
- full canonical verification after integration;
- explicit statement that the timed-out run itself did not complete successfully.

## Authorized external-side-effect recovery

A timed-out worker may have finalized its report and completed authorized tracker mutations immediately before the runtime deadline, even though no consolidated summary was returned. Treat these writes as untrusted until independently reconciled.

1. Reconstruct the exact mutation allowlist and dependency order from the dispatch prompt (for example: post evidence, close child, close parent, preserve release gate, leave milestone open).
2. Verify the finalized local artifact and checksum **before** trusting any remote mutation based on it.
3. Read back every authorized remote object—not only the first expected change—including comments, issue/PR states, milestone state/counts, labels, and the immutable default-branch SHA.
4. Compare actual writes with the allowlist and report decision. Confirm preserved/forbidden objects remained untouched.
5. Classify the run as `timed_out_with_recovered_artifact_and_reconciled_writes`; do not call it completed merely because all intended writes landed.
6. If writes are partial, resume only the missing dependency-safe step after rechecking the immutable target. Do not repost duplicate evidence or re-close already closed objects.
7. If the recovered verdict exposes a new smallest blocker, create/update its canonical issue and dispatch the next non-overlapping worker in the same parent turn when runnable; do not let timeout recovery leave the queue idle.

Record the artifact digest, immutable target SHA, exact remote URLs/states, preserved gate states, and the next runnable task. This pattern applies to issue trackers, PR metadata, deployment control planes, and other authorized APIs; never broaden the original mutation scope during recovery.

## Reporting language

Use precise wording such as:

> The reviewer process timed out, but a complete report was recovered, independently hashed, and bound to the unchanged candidate. The run is classified as timed out; the report verdict is `NEEDS_REVISION`.

Avoid saying the agent “completed” or that a timeout produced “no result” without checking the durable output.
