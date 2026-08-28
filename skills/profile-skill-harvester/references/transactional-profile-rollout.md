# Transactional canonical-skill rollout

Use this after a reviewed skill candidate lands in the canonical repository and must be synchronized to several live profiles.

## 1. Bind review to an exact candidate generation

Compute and record a deterministic staged-diff digest before review:

```bash
git diff --cached --binary | shasum -a 256
```

The reviewer must echo the digest. Any byte change—including version or README edits—creates a new generation and invalidates prior verdicts. This digest is useful for pre-commit review, but it does not replace exact commit-SHA approval when the publication workflow requires an immutable candidate SHA.

Before dispatching a binding reviewer, validate every supplied identity as an actual commit object and prove ancestry:

```bash
git cat-file -e "$BASE^{commit}"
git cat-file -e "$CANDIDATE^{commit}"
test "$(git merge-base "$BASE" "$CANDIDATE")" = "$BASE"
```

Use full SHAs copied from `git rev-parse`, not hand-transcribed abbreviations. A typo in review metadata can correctly invalidate an otherwise sound review. If that happens and candidate bytes did not change, reissue the review with corrected immutable identities; do not edit code merely to create a new SHA.

When a finding exposes contradictory prose, add a negative or semantic regression assertion that rejects the old wording or behavior; positive marker-only tests are insufficient.

## 2. Verify the merged object, including evidence-only children

A repository may require a final evidence-only commit whose parent is the approved code candidate. Prove that relationship before merge:

```bash
test "$(git rev-parse "$PR_HEAD^")" = "$APPROVED_CODE_CANDIDATE"
test "$(git diff --name-only "$APPROVED_CODE_CANDIDATE" "$PR_HEAD")" = ".github/manual-test-result.json"
```

After a guarded squash merge, compare the remote merge tree to the actual PR-head tree, not automatically to the code-candidate tree:

```bash
git fetch origin --prune
test "$(git rev-parse "$REMOTE_MERGE_COMMIT^{tree}")" = \
     "$(git rev-parse "$PR_HEAD^{tree}")"
```

If only skill bytes matter for rollout, additionally compare the merged `skills/` subtree or exported file blobs to the approved generation. Never ignore an evidence-only child when asserting whole-tree equality.

GitHub CLI may complete the server-side merge and then fail while trying to fast-forward a divergent local checkout. Treat the remote PR state and fetched merge object as authority; do not reset an unrelated local branch to silence the warning.

Use an immutable rollout source outside repositories. Either create a detached worktree or export the exact merged subtree:

```bash
git worktree add --detach "$ROLLOUT_WORKTREE" "$REMOTE_MERGE_COMMIT"
# or
git archive "$REMOTE_MERGE_COMMIT" skills | tar -x -C "$EXPORT_ROOT"
```

For an archive, verify representative or all exported blobs against Git before mutation with `git hash-object` and `git rev-parse "$REMOTE_MERGE_COMMIT:path"`.

## 3. Resolve every distinct digest and duplicate identity

Version is metadata, not package authority. Inspect every distinct complete live package whose version is lower, equal, higher, missing, or malformed, including divergence already present in inventory state. Before rollout, assign every behavior and support-file delta exactly one evidence-backed disposition: `adopted`, `scoped`, `superseded`, `product-local`, `unsafe`, or `unresolved`. A reusable delta not represented in the frozen canonical generation requires re-harvest, validation, review, and merge before replacement; an unresolved or unsafe delta blocks only that package/profile and leaves its state unadvanced.

Inventory by frontmatter `name`, not directory basename. If the same skill identity appears at multiple paths, select the canonical live path only from complete-package evidence and the disposition ledger, never from version rank. Back up every duplicate and retire only a semantically inspected copy explicitly dispositioned `superseded`. Never treat the first path returned by filesystem traversal as authoritative.

## 4. Globally stage, back up, and fail closed before mutation

Preflight every target before changing any target:

1. Discover every package and duplicate identity.
2. Compare every complete-package digest and record version only as context.
3. Complete the semantic disposition ledger for every delta across every target.
4. Abort the generation and re-harvest any reusable live delta absent from canonical; do not overwrite it under standardization authority.
5. Compute exact-canonical overlays and explicitly declared `product-local` adaptations. Generic target-only preservation is not a substitute for semantic disposition.
6. Validate every staged package, `SKILL.md`, `EVAL*.yaml`, fixture, and support-file path.
7. Copy every affected live package—including superseded duplicates—to a timestamped backup outside repositories.
8. Write a receipt containing source merge SHA, selected target path, every disposition/reason, canonical per-file SHA-256 values, product-local adaptation hashes, and retired duplicate paths.
9. Acquire one external transaction lock.
10. Abort globally if any preflight, backup, path-containment, disposition, re-harvest, or staged validation fails.

A path omitted from the action set proves only that it was not targeted; it does **not** prove a supposed local package exists. Verify existence and pre-rollout digest separately before claiming that a named local package was preserved.

## 5. Atomically overlay canonical files and preserve compatible additions

Assemble each target in a sibling staging directory from its current package plus canonical files:

- atomically replace every canonical file;
- preserve target-only references/templates/scripts only when the ledger declares them `product-local`; re-harvest reusable additions and block unresolved/unsafe additions;
- verify staged canonical and preserved-local hashes before swapping;
- rename the live package to a rollback path, then rename the staged package into place;
- only after the canonical path is live, rename proven superseded duplicates to rollback paths;
- register the current action in the rollback journal **before** duplicate retirement so a mid-dedupe failure restores both the package and any already-moved duplicate;
- retain external backups even after success; remove only temporary rollback/staging paths.

If any action or global postcondition fails, roll back all completed actions in reverse order. Release only the exact owned lock on every exit.

## 6. Verify discovery and runtime loading

For every target profile:

1. Re-hash every canonical and preserved target-only file from the receipt.
2. Confirm retired duplicate paths are absent and exactly one enabled package exists per frontmatter name.
3. Run a fresh profile-scoped registry check, for example:

   ```bash
   hermes -p <name> skills list --source local --enabled-only
   ```

4. Run a fresh one-shot Hermes process that explicitly preloads the changed skill and reports a distinguishing contract.
5. Derive expected probe values from the frozen source. Ask for an existing heading, version, and unique policy decision; never ask for a nonexistent section such as “Phase 0,” because that tests model improvisation rather than loading.
6. Compare the returned values to source-derived expectations. Do not count a fixed prompt-size estimate as proof that a preloaded skill body was injected.
7. Re-hash the receipt after the runtime probe.

Skill-only updates normally hot-load for new invocations and do not require gateway restart. If restart is explicitly required for another changed artifact, perform it through a genuinely external shell or supervisor, never from the gateway handling the current request. Verify a new supervised PID/platform readiness, then repeat the receipt re-hash.

## 7. Close the transaction

Before reporting success:

- verify the immutable remote merge SHA and exact default-branch CI runs;
- verify backup readability and receipt status;
- prove the transaction lock, staging paths, rollback paths, and failed-swap paths are absent;
- report exact/adapted package counts, preserved target-only file counts, retired duplicate counts, backup/receipt paths, and runtime-load evidence;
- distinguish confirmed preserved packages from assumptions or merely untargeted paths.
