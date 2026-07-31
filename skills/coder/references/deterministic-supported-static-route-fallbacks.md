# Deterministic supported static-route fallbacks

Use this pattern when a static/SPA deployment needs directory-index files for direct loading of a closed route set, while the main build integration is owned by a separate task.

## Contract

- Keep the generator standalone: accept an output directory, canonical `index.html` bytes, and the closed catalog as explicit inputs.
- Generate only supported extensionless routes. Do not add a catch-all, wildcard, unknown-route fallback, or overwrite the caller-owned root `index.html` unless the task explicitly owns it.
- For a fixed catalog, preflight the complete input before the first write:
  - enforce the exact expected cardinality;
  - require bounded slug IDs such as `^[a-z0-9]+(?:-[a-z0-9]+)*$`;
  - reject traversal, separators, percent escapes, malformed IDs, and duplicates.
- Build the complete canonical route list in memory, sort it deterministically, then write `<output>/<route>/index.html` with the exact caller-supplied bytes.
- Return the sorted routes and explicit nonzero route/file counts so a parent build can merge manifests or verification evidence without scraping the filesystem.

## TDD tracer bullets

1. RED on the missing standalone module with one exact-route-set test.
2. GREEN the supported route matrix and prove the root index remains caller-owned.
3. RED→GREEN malformed/traversal IDs, asserting rejection occurs before any output appears.
4. RED→GREEN duplicate IDs.
5. RED→GREEN wrong catalog cardinality.
6. Compare two isolated output trees byte-for-byte and compare returned metadata.

The positive test should derive the expected matrix independently from the catalog and declared route families, assert exact equality (not only `includes` checks), and read every generated `index.html` back as bytes. Include explicit negative assertions for `/` and arbitrary unknown paths.

## Recoverable branch discipline

When work must start from an exact commit in a repository with dirty or occupied worktrees:

1. Resolve the full commit SHA with `git rev-parse '<short>^{commit}'`.
2. Create a new dedicated worktree and branch from that immutable SHA; do not disturb an existing dirty worktree.
3. Push the empty branch immediately so the base is remotely recoverable.
4. Stage only the standalone module and dedicated test file.
5. Run the focused test, the bare canonical package test command, and any repository verification command.
6. Commit, push, and verify local SHA equals `git ls-remote --heads` for the branch.

A repository may have a narrow or stale `remote.origin.fetch` refspec. If ordinary `git fetch origin` targets a deleted branch, do not rewrite shared repository configuration merely to proceed; first use an already-present exact object or an explicit reachable ref, then create the isolated worktree.
