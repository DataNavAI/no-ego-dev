# Live-source freeze and sibling-profile propagation

Use this procedure when the source profile can keep editing its own skills while a harvest is being prepared, or when merged packages must be installed into sibling profiles.

## Freeze the live source deliberately

A profile directory is live mutable state, not an immutable input.

1. Run deterministic inventory and classify the candidate package.
2. Copy the complete package into the isolated canonical worktree.
3. Before commit, compare every live-source file byte-for-byte with its proposed canonical counterpart.
4. Maintain a tiny explicit allowlist for canonical adaptations such as required eval fixtures or semantics-preserving scanner-safe prose. Every other mismatch, missing file, or newly added file is source drift.
5. If source drift appears, re-copy the affected package, rerun package validation and scans, and repeat the comparison.
6. The final commit SHA is the harvest snapshot boundary. Changes after that boundary belong to a later harvest rather than being silently added to the frozen PR.

This catches the common race where a live agent adds a reference or updates `SKILL.md` after initial inventory but before commit.

## Complete an incomplete package safely

Canonical package requirements still apply when the live source omitted distribution artifacts.

- Preserve every live source file.
- Add the smallest required `EVAL.yaml`, `evaldata/` fixture, frontmatter correction, or package metadata needed by the canonical repository.
- Do not invent new behavioral guidance merely to satisfy structure.
- State each canonical-only addition in the PR and validate it independently.
- A missing eval is not a reason to discard otherwise reusable guidance, but it is a reason not to publish an uncompleted package.

## Handle secret-scan findings without weakening the gate

1. Generate a redacted report and inspect the exact file/line context.
2. Distinguish real credentials, intentional synthetic secret fixtures, and ordinary prose that only resembles a key/value assignment.
3. For ordinary prose, prefer a semantics-preserving rewrite that avoids credential-like syntax. Rerun the staged scan.
4. Use an exact fingerprint suppression only for required deterministic non-secret fixture bytes, after independent proof and only when repository policy permits it.
5. Never add a broad rule/path exclusion merely to make the harvest green.

## Propagate only after merge

Before replacing sibling-profile packages:

1. Verify the reviewed PR head, checks, merge, and canonical merge commit.
   - Bind the merge to the independently approved head with `--match-head-commit APPROVED_SHA`.
   - Do not assume `gh pr checks --required` returning nonzero means a check failed: GitHub also returns nonzero when the branch has **no configured required checks**. Distinguish that state explicitly, inspect the complete `gh pr checks`/status-rollup result, require every reported check to pass, and re-read the PR head immediately before merging. Under `set -e`, keep the optional `--required` probe separate so the harmless “no required checks reported” state cannot abort the guarded merge path.
   - After a squash merge, compare the approved candidate tree ID with the merge commit tree ID, then export package bytes from the verified merge object into non-repository staging. Never use the candidate worktree as the rollout source, even when tree IDs match.
2. Back up each existing target package to a non-repository profile-local backup root. Do not include credentials or runtime state.
3. Replace only the selected skill package directories. Never copy profile config, auth files, memory, logs, sessions, caches, or workspaces.
   - Build each replacement in a temporary sibling directory on the same filesystem, verify its complete-package digest, rename the old directory aside, then rename the verified temporary directory into place. Delete the renamed old directory only after installation succeeds; retain the external backup.
4. Discover same-name target packages by frontmatter identity, including nested category paths. Back up and remove superseded duplicates before installing one canonical package; directory basename alone is not a safe identity check.
5. Preserve the target's intended category/path policy while ensuring only one package declares each frontmatter skill name.
6. Compare resulting package file counts and digests with the merged canonical package.
7. Classify runtime adoption before attempting lifecycle commands.
   - For existing same-name `SKILL.md`, references, templates, scripts, EVALs, and fixtures, Hermes reads skill content from disk when invoked. Verify a **skill hot-swap** with a fresh process that explicitly loads a changed skill, require the provider smoke response, and re-hash canonical plus target-only files. Existing conversations should use `/reset` or `/new`; `/reload-skills` is only for added or removed skill names.
   - Restart only when the rollout changes Hermes code, plugins, environment, startup-loaded configuration, or another artifact proven to be cached by the gateway process. On macOS, discover exact labels before using `launchctl kickstart -k gui/$UID/<label>`; then require a changed PID, supervised status, platform reconnection, provider smoke, and post-restart package hashes.
   - In `launchctl list`, a populated PID means the job is running; the adjacent numeric status is the prior exit status and may remain nonzero. Do not diagnose a failed restart from that status column alone.
   - Rich-rendered `hermes skills list` output ellipsizes long names. For machine verification, request local enabled skills with a wide noninteractive terminal or use the resolver/API, then require every expected frontmatter name exactly once.
8. When profiles can fall back to a shared/default package, inspect resolver ownership explicitly. Update that shared fallback only when the requested rollout scope includes it, and back it up separately.
9. Advance an observed package digest only after remote-default merge verification and the applicable rollout evidence: post-smoke bytes for skill hot-swaps, or post-restart generation/readiness/provider/hash evidence for process-loaded changes. Keep blocked/rejected dispositions separate and do not baseline unpublished bytes.
10. Release the exact harvest lock on every success or failure exit; a stale lock must not block the scheduler indefinitely.

When a target has a materially different same-name package, classify it before replacement. An explicit request to standardize siblings on the harvested canonical package can authorize exact replacement, but preserve a backup and report that target-specific extras were superseded. Without that authority, consolidate compatible context or block the one conflicting package rather than silently deleting it.
