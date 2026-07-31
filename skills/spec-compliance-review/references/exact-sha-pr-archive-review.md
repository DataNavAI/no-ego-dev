# Exact-SHA pull-request review from an authenticated source archive

Use when the requested PR head is absent from local Git or the available checkout is dirty/shared and must not be fetched/reset.

## Identity binding

1. Query PR metadata and require the reported `headRefOid` and `baseRefOid` to equal the requested candidate and baseline.
2. Query commit metadata for the exact SHA and record its parent and tree IDs.
3. Download head and base archives through the authenticated host CLI. For private GitHub repositories, redirect `gh api repos/{owner}/{repo}/tarball/{sha}` to a file; an unauthenticated archive URL may return 404 even when commit metadata is accessible through `gh`.
4. Extract each archive into a reviewer-owned disposable directory outside shared checkouts.
5. Verify the extracted head tree mechanically:

```bash
(
  cd "$HEAD_SNAPSHOT"
  git init -q
  git add -A
  test "$(git write-tree)" = "$API_REPORTED_TREE"
)
```

Remove the temporary `.git` directory before canonical tests so the archive remains an archive-bound candidate. If a build normally calls `git rev-parse`, pass the project-supported revision override, such as `BUILD_REVISION=$EXACT_SHA`.

If the canonical build requires live Git metadata and exposes no revision override, do **not** fabricate a commit inside the archive: its commit ID will not equal the reviewed SHA. Instead, create a reviewer-owned clone or bare object store outside every shared checkout, fetch/clone the authoritative repository there, and add a detached disposable worktree at the exact SHA. Before testing, require exact matches for `HEAD`, `HEAD^{tree}`, API-reported SHA/tree/parent, and a clean status. Build and test only that disposable exact worktree, then remove it. Keep the original authenticated archive and API metadata as an independent identity cross-check when practical.

## Verification sequence

- Inspect the authoritative contracts and changed source/tests before executing them.
- Run the claimed focused command and verify the exact reported test count.
- Run the canonical repository suite, exact-revision build, public/artifact boundary checks, and secret scan separately so each result remains attributable.
- Add deterministic external adversarial probes for false-success gaps not exercised by canonical tests. Keep probes outside the snapshot.
- Re-extract the original archive and compare it to the tested source while excluding only known generated output. This proves tests did not mutate reviewed source.
- Recheck the shared checkout's HEAD/status against the initial observation, then remove all snapshots and probes.

### Refresh stale PR-body evidence after a merge-head advance

A PR description can continue to claim an earlier branch-tip SHA, test count, build-file count, or tree digest after the author merges the base branch and GitHub advances the PR head to a merge commit. Treat those body values as historical evidence, not exact-head verification.

1. Record the API-reported current head, base, tree, and complete parent list. A current PR head may legitimately be a merge commit whose parents are the prior feature tip and current base.
2. Use the host compare endpoint for `base...head` to confirm the merge base and exact changed-file scope; do not assume first-parent diff semantics represent the PR.
3. Rerun focused and canonical commands on the frozen current head. Report the observed counts even when newly merged base tests or routes increase them.
4. Classify stale body counts or an earlier body SHA as procedural evidence drift, not a technical implementation blocker, unless the governing closure contract explicitly requires the PR body itself to be current. The new independent exact-head review can supply the missing current closure evidence.
5. Keep the verdict bound to the API head and state that publication/deployment authority remains separate.

For archive-vs-base whitespace checking, `git diff --no-index --check BASE_DIR HEAD_DIR` exits `1` for an ordinary nonempty difference even when it emits no whitespace diagnostics. Accept `0` or a silent `1`; treat diagnostics or an execution error (`>1`) as failure rather than requiring exit `0`.

## Async hostile-value nuance

When an `async` loader returns a Proxy or thenable-looking hostile value, JavaScript Promise resolution reads its `then` property before the caller's `await` completes. A strict assertion of **zero proxy traps** is therefore invalid at that boundary. Distinguish:

- the unavoidable Promise-assimilation `get("then")`;
- forbidden domain-field, descriptor, key, or payload reads after handoff.

The release gate should require fail-closed unavailable/noindex behavior, no attacker bytes rendered, and no domain reads. For a true zero-getter assertion, use an ordinary accessor-backed object whose `then` is not hostile, or test the synchronous snapshot helper directly.

## Verdict discipline

Bind the verdict to the exact SHA and distinguish:

- **technical merge verdict**: implementation/spec/security blockers;
- **repository administration**: draft status, required checks, approvals, signing policy;
- **publication/deployment authority**: separate editorial and production gates.

A technically passing draft PR may be reported `passed=true` with draft/check state listed as a procedural condition, unless the requester defines draft status itself as a blocker. Never let a technical pass imply publication or deployment approval.
