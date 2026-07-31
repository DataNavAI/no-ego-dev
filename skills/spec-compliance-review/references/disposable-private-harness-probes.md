# Reusing an In-File Test Harness for Immutable Probes

Use this when the focused test file contains a valuable module-private harness that cannot be imported directly, and reproducing the browser/runtime simulation by hand would be error-prone.

## Disposable-copy technique

1. Keep the repository checkout untouched.
2. Build a disposable test module under the runtime temporary directory.
3. Read the authoritative test file and preserve its helper/harness definitions.
4. Preserve path resolution with one of two approaches:
   - **rewrite approach:** convert relative production imports to absolute `file:` URLs and replace `import.meta.url`-based fixture resolution with the original test module URL;
   - **shadow-tree approach:** create the copied test at the same relative depth in a disposable root, then symlink every required read-only root (`scripts/`, `data/`, `assets/`, `node_modules/`, and `tests/fixtures/` as applicable) back to the checkout. This preserves imports, `import.meta.url`, and generator cwd assumptions without copying a large repository.
5. Before interpreting probe failures, preflight every relative dependency used by the selected helper path—not just module imports. Fixture reads often resolve from `tests/fixtures/`, while spawned generators may also require cwd-relative data and assets.
6. Extend the copied harness minimally with deterministic deferred promises or resolvers required by the missing race case.
7. Append tests with a unique name prefix, then run only that prefix with the runtime's test-name filter.
8. Establish a valid baseline before resolving deferred responses.
9. Assert both final state and forbidden stale effects: storage, rendered controls, analytics counts, success/error toasts, URL/history/DOM state, loading indicators, and request-triggered secondary effects as applicable.
10. Delete the entire disposable root, including symlinks and copied tests.
11. Reconfirm target SHA and repository cleanliness.

## Race-probe patterns

- **Last-intent SPA navigation:** start A, then B; resolve B first, snapshot URL, history, DOM, title/meta when exposed, analytics, and loading state; resolve A once successfully and once as a failure. Assert every winning-B dimension is byte-for-byte or structurally unchanged and no stale redirect occurs.
- **Duplicate mutation controls:** start the same mutation from two controls. Probe both outcome orderings: newest succeeds/older fails and newest fails/older succeeds. Only the newest-started operation may own global state, render, analytics, toast/error UX, and secondary refreshes; stale operations may clear only their own busy indicator.
- **Deferred boot versus completed login:** complete login and follow hydration first; then resolve boot with both signed-out and old-user responses. Assert no state, follow, analytics, or rendered-control rollback.
- **Overlapping hydration:** defer the older authentication's follow response, complete a newer authentication, then release the old response. Assert only the newer follows and success UX remain.
- **Pending mutation versus signout:** defer the old follow mutation, complete signout, release the mutation, and assert no follow event, success toast, or authenticated state resurrection.
- **Deferred home response:** expose minimal home shell/cards in the copied harness, complete a newer operation, then release the old home response. Assert old cards and personalized analytics cannot commit.

## Pitfalls

- Do not copy the test into the repository, even as an untracked file.
- Do not run the copied module without a name filter; copied broad tests may be expensive or depend on generated fixtures.
- Do not treat skipped original tests as fresh evidence.
- A test helper may classify request phase using mutable global flags. Ensure the new deferral intercepts the intended request, and assert request ordering before interpreting state assertions.
- Remove temporary artifacts even after a failed probe.