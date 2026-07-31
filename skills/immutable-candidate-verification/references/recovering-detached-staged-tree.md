# Recovering a detached staged-tree review

Use when a reviewer is given an exact index-tree SHA, but the stated/current directory is not the matching Git checkout or the live index has already moved.

## Producer-side prevention: materialize a read-only review snapshot

A raw `git write-tree` identifier may be unavailable to an isolated reviewer that starts in another checkout. Before dispatching asynchronous pre-commit review, freeze the staged index into a detached worktree that has both a reachable commit and an explicit absolute path:

```sh
tree=$(git write-tree)
review_commit=$(printf 'review snapshot\n' | git commit-tree "$tree" -p HEAD)
review_path="$PROFILE_TMP/review-snapshots/project-$review_commit"
git worktree add --detach "$review_path" "$review_commit"
test "$(git -C "$review_path" rev-parse HEAD^{tree})" = "$tree"
test -z "$(git -C "$review_path" status --porcelain)"
```

- `commit-tree` does not move the source branch; the detached worktree keeps the otherwise-dangling commit reachable for the review duration.
- Give **every** parallel reviewer its own complete context containing the absolute snapshot path, exact commit, exact tree, requirements, prior findings, and no-edit instruction. Batch siblings do not inherit another task's working directory.
- Do not modify the snapshot or source index while its verdict is expected to authorize that tree. If the source tree changes, keep useful findings but mark the verdict stale and materialize a new snapshot.
- After all reviews finish, remove the worktree deliberately with `git worktree remove <path>` and `git worktree prune`; never broadly delete a directory that Git still registers as a worktree.

## Recovery sequence

1. **Do not reinterpret the wrong checkout as the candidate.** If `git rev-parse --show-toplevel` fails, or `git write-tree` does not equal the supplied tree, stop reviewing that directory.
2. **Locate the project from source identifiers, not guesswork.** Search local workspaces for distinctive changed symbols, paths, or domain files named in the request. Candidate repositories may exist in sibling workspaces or a primary checkout outside the agent workspace.
3. **Prove object availability and prefer an exact live-index match.** In each plausible repository, run `git cat-file -t <tree>` and require `tree`. When the request identifies the object as the current staged tree, compare it read-only with `git diff --cached --quiet <tree> --`; a zero exit proves that repository's live index matches the supplied tree without invoking `git write-tree`, which may create a Git object despite a strict no-modification instruction. Search bounded known workspace roots first; broaden locally only when needed. If several repositories contain the object but exactly one has a matching index, use that unique checkout. A matching domain or object availability alone is insufficient.
4. **Recover the staged baseline without changing the index.** If no live index matches, compare the supplied tree against recent reachable commit trees. The correct baseline is normally the commit tree producing the smallest coherent task-scoped diff. Confirm the resulting paths and patch match the requested review scope; do not select a base solely by size when multiple branches are plausible.
5. **Review objects directly.** Use `git diff <baseline-tree> <frozen-tree>`, `git show <frozen-tree>:<path>`, `git grep <pattern> <frozen-tree> -- <paths>`, and `git ls-tree` rather than checking out, resetting, staging, or materializing files.
6. **Bind every conclusion to the supplied tree SHA.** Historical notes found inside the tree are context only; they do not replace direct inspection of the frozen production and test blobs.
7. **Preserve the live checkout.** Record the plausible repository's status before and after. Existing untracked or unrelated work is baseline state, not evidence that the detached tree review modified the repository.

## Fail-closed conditions

Return no verdict if:

- no local repository contains the supplied tree object;
- the baseline cannot be identified unambiguously enough to reconstruct the staged patch;
- the recovered diff does not match the requested feature or files;
- any command changes the live index or worktree and preservation cannot be proven.

## Blocker-only output

When the user requests `APPROVED`/`REQUEST_CHANGES` first and concrete blockers only:

- return only `APPROVED` when no blocker exists;
- otherwise begin with `REQUEST_CHANGES` and include only reproducible requirement, location, reproducer, and consequence;
- omit path-recovery narration, passing checks, and repository summaries unless path identity itself prevents a valid review.
