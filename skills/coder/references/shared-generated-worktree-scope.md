# Shared Worktree: Generated Artifacts and Scoped Commits

Use this when implementing a focused change in a shared worktree where generators rewrite many tracked files and other agents may be editing unrelated paths.

## Workflow

1. **Capture the baseline before generation.** Run `git status --short --branch` and note unrelated modified/untracked paths. Never assume a dirty file belongs to your task.
2. **Write the behavior test first.** For removal tasks, use negative assertions against representative rendered routes and exact legacy identifiers.
3. **Change the canonical generator/source.** Do not hand-edit generated output when it will be overwritten.
4. **Run the generator and targeted tests.** Also deterministically search the complete generated output tree for forbidden legacy tokens; representative route tests alone do not prove global absence.
5. **Run every gate that embeds generated-output expectations.** A build/static verifier may still require the legacy token even when the unit/route suite passes. Watch the gate fail for that stale expectation, then convert it from a positive requirement to a negative assertion.
6. **Run the full relevant suite and build.** Record RED and GREEN commands/results separately. Use output-directory overrides for focused generator tests, but do not automatically apply them to the canonical full-suite command: integration tests may intentionally read the freshly generated default tree. If an overridden full run fails against stale tracked output, rerun the unmodified canonical command before diagnosing production code.
7. **Restore generated output only from an owned clean baseline.** If the task explicitly forbids generated-output changes, first prove the generated tree was clean before your run; after the canonical suite passes, restore only that known-owned tree and confirm it has no diff. In a dirty or concurrently generated tree, leave it untouched and report it instead.
8. **Re-establish verification evidence after cleanup.** Restoring generated output changes the filesystem after the canonical test run, so verification harnesses may correctly mark that evidence stale even when only generated files were restored. After cleanup, confirm `git status --short`, then run the narrowest non-generating suite that exercises the changed source and isolated-generator behavior. Report both results distinctly: the canonical suite passed against freshly generated default output, and the post-clean focused suite passed against the final clean worktree. Never claim the canonical run itself describes a filesystem state that was subsequently changed.
9. **Inspect only the scoped diff.** Use `git diff --check -- <paths>` and `git diff -- <paths>`.
10. **Stage by explicit path list.** Verify with `git diff --cached --name-only` before committing.
11. **Do not broadly restore or clean a shared worktree.** Generated files may now include concurrent agents' source changes. Leave unrelated/generated dirt unstaged and report it unless ownership is certain and cleanup was explicitly coordinated.
12. **Protect concurrent untracked artifacts.** A writer enforcing “exact file scope” may remove untracked files it did not create while cleaning up. Do not create a durable untracked document or evidence file while another writer is active in the same worktree unless its path is explicitly reserved; wait for the writer to finish, or commit the artifact by exact path before launching the writer. Cleanup must never use broad `git clean`, `git restore .`, or equivalent scope-erasing commands.
13. **Verify the commit.** Check `git show --format= --name-only HEAD` and confirm the index is empty.

## Key Distinction

Generated files can be required for verification without being permitted in the commit. Treat “run generation” and “commit generated output” as separate decisions. Follow the task's explicit commit scope.

## Common Pitfalls

- Updating route tests but forgetting a static verifier that positively requires the removed behavior.
- Assuming a full test script includes the build/static verification gate.
- Running `git restore public/...` after generation in a shared worktree and erasing another agent's direct or generated work.
- Using `git add .` in a shared checkout.
- Reporting “all generated pages are clean” after checking only two routes; search the entire output tree for exact forbidden identifiers.
- Exporting a temporary generator output directory for the canonical full suite when integration tests read the default generated tree; this can create misleading count or freshness failures against stale tracked artifacts. Keep the override scoped to isolation tests, and verify with the repository's unmodified canonical command.