# Recovering Timed-Out Implementation Slices

Use this when an implementation worker times out or loses its completion summary after it may have committed, pushed, opened a PR, or modified a surviving worktree. The semantic-renderer notes below remain useful for HTML/copy/generated-page slices, while the recovery sequence applies to any repository task.

## Recovery sequence

1. Stop overlapping writers; treat durable repository and remote state as authoritative, not the missing completion summary.
2. If the worker used an isolated context whose local checkout may be gone, inspect external residue first: remote feature ref, open/all-state PR by head branch, commits on that ref, issue/PR comments, then surviving local worktrees. Classify the result as no checkpoint, recoverable RED, recoverable GREEN, or review-ready candidate; timeout alone is none of those verdicts.
3. Recover the exact remote head into a fresh isolated worktree. Run identity/status commands **from that recovery worktree's path**—a worktree created by a command does not change the controller shell's current directory. Verify local HEAD = remote ref = PR head, record base and merge-base, and require clean status.
4. Inspect HEAD/status, staged and unstaged diffs, exact paths, syntax, and `diff --check`; re-read all modified files before touching them. If a late result says it modified files the parent read earlier, re-read those paths again.
5. Check whether the canonical base advanced while the worker ran. A PR can be conflict-free yet still be based on an older main commit. Integrate current base **before** independent review, preserving useful RED/GREEN commits when practical; rerun focused and canonical verification, push the integrated head, and invalidate all earlier exact-head verdicts/evidence.
6. Run narrow semantic/feature tests first, then the canonical suite. Restore only known generated output; never blanket-clean unrelated paths.
7. Stage exact approved paths and request specification review of the full recovered/integrated slice.
8. Convert every review or parent-inspection finding into a focused regression test, capture real RED, make the smallest correction, capture GREEN, rerun canonical verification, and re-request the same immutable review gate.
9. Run ordinary quality review only after specification PASS; apply the workflow's proportional MVP/security-review policy. Commit/merge only after required gates clear.
10. Record the recovery classification and evidence on the durable issue/PR so the reason for draft/blocking status is not hidden in chat.

## Semantic renderer lessons

- **Visible provider labels and accessible action names serve different jobs.** Preserve exact visible labels such as `Wikidata`, `MusicBrainz`, or `Official artist or agency source`; add claim context through an `aria-label` such as `View Wikidata source for Born`. Avoid awkward duplication like `source source` by normalizing the provider phrase.
- **Shared identity state belongs in the shared identity renderer.** If every root/detail route must preserve a checked date, Follow state, disambiguation, or relationship summary, render it in the shared identity component rather than a late root-only section.
- **Frozen copy variants must be patched independently.** Root/current and schedule copy may be limited to official sources while release/media copy may refer to reviewed sources. Do not use broad replacement across similar strings.
- **Do not fabricate historical TDD evidence.** If a timeout left code but no RED transcript, report that honestly. Fresh verification plus independent review can recover the slice; subsequent corrections must use real RED→GREEN.
- **Generated output is disposable unless explicitly authorized.** Canonical tests may regenerate tracked trees; restore those known paths before staging and verify no unrelated artifacts remain.

## Minimum evidence to record

- starting and final HEAD;
- changed/staged paths;
- focused RED and GREEN for review corrections;
- complete feature and canonical test totals;
- generated-output restoration command/result;
- `git diff --check` and clean unstaged scope;
- specification verdict, then quality/security verdict.
