# Dirty Worktree Remediation to Immutable Draft-PR Head

Use when a prior implementation/remediation already exists as unstaged or untracked bytes in the correct feature worktree and the user wants those bytes preserved, finalized, pushed, and frozen for rereview.

## Recovery sequence

1. **Anchor identity before touching bytes.** Record branch, local HEAD/tree, remote branch SHA, base SHA, merge base, PR head/base/draft state, and the complete dirty path list. Read the prior immutable review reports and authoritative contract/reference before interpreting the recovered diff.
2. **Inspect; do not reconstruct.** Read the complete dirty diff plus every untracked file. Do not restore, regenerate, reformat, or rewrite recovered files merely to reproduce the earlier development process. Treat the dirty bytes as the candidate under recovery.
3. **Run the focused gate before staging.** Execute the exact remediation test file and `git diff --check`. Confirm every named blocker has a real non-vacuous regression and coherent implementation. If a required hostile case is not committed, prefer an outside-repository probe unless a genuine regression gap requires changing the recovered tests.
4. **Checkpoint remote-first.** Once focused GREEN and scope checks pass, stage only the explicit recovered paths, verify the staged path set exactly, commit, push the original feature branch, and compare local SHA, `ls-remote`, and live PR head. Do this before optional broad verification so the recovered artifact is durable.
5. **Check governance/index closure.** If the recovered slice adds a contract, schema, runbook, or other governed artifact, inspect the repository’s contract README/index and architecture verifier. Add only the minimum truthful index/required-file/count update. Do not broaden the feature scope.
6. **Run fresh final evidence after the last edit.** Any post-checkpoint edit—even documentation whitespace or an index line—creates a new candidate. Commit/push it, then rerun the focused test, the literal canonical test command, and the full verify/build/public command as separate bare invocations when required by the repository evidence recorder.
7. **Run final hygiene at exact head.** Check cumulative base-to-head scope, `git diff --check`, clean status, ordinary added-line conflict/debug/TODO/credential patterns, current-tree secrets, full-history secrets, architecture verification, and public-boundary verification. Use hostile outside-repo probes for contract cases not worth changing preserved test bytes (for example custom/null-prototype receipts).
8. **Refresh the PR body and read it back.** Record blocker-by-blocker dispositions, exact regression test names, canonical counts, privacy/public-boundary evidence, changed paths, base SHA, candidate SHA/tree, and remediation commits. Keep the PR draft if rereview is requested. Read back live PR JSON and require local HEAD = remote branch = PR head, base/merge-base current, mergeability acceptable, and worktree clean.

## Important distinctions

- **Preserve recovered bytes** means do not casually reconstruct or overwrite them; it does not require retaining a proven hygiene defect such as trailing whitespace that makes the mandated diff check fail. Make the smallest correction, preserve it as a follow-up commit, and rerun final evidence.
- An explicit `git fetch origin branch` may update only `FETCH_HEAD` depending on invocation/refspec. For final identity, compare `git ls-remote` or fetch with an explicit remote-tracking refspec before trusting `origin/<branch>`.
- A wrapper passing is not a substitute for the repository’s literal canonical test command. Run both if the workflow requires both forms of evidence.
- A newly added architecture contract is not fully integrated merely because the file exists; its index/verifier/count must tell the truth.

## Final report

Report the immutable SHA/tree/base, remediation commits, focused/full/verify counts, build/public/architecture counts, scans, exact changed paths, live PR draft/merge state, clean worktree, and any blocker. Do not merge, mark ready, deploy, or close unless explicitly authorized.
