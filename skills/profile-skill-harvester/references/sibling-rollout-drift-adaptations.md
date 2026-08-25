# Sibling rollout with same-path live drift

Use this procedure when a reviewed canonical skill package must be propagated to sibling profiles and a target has changed since the rollout baseline. This is a rollout-integration case, not permission for newest-file-wins replacement.

## 1. Freeze three inputs

For every `(profile, skill)` pair retain:

1. the approved canonical package and exact tree/SHA;
2. the canonical package at the target's last verified baseline, bound to an immutable **pre-change** commit SHA;
3. the live target package immediately before mutation.

After the canonical PR merges, do not use mutable `origin/main` as the three-way ancestor: it now contains the approved package and collapses the base/source distinction. Export the ancestor from the recorded pre-change SHA and export the rollout source from the verified remote merge SHA. A dry-run must prove each adapted file merges without conflict before any backup or target mutation.

Compare complete package files by frontmatter identity and digest. Exclude generated caches (`__pycache__/`, `*.pyc`, test caches, OS metadata) from package identity, including caches created by running tests inside an immutable review archive.

## 2. Preflight all targets before mutating any

Run one global fail-closed pass across every target. Classify each path as:

- unchanged canonical path;
- canonical path changed by the approved source;
- target-only additive path;
- same-path live drift;
- source-removed canonical path.

Do not start copying after the first clean target. A later target may contain an unharvested change that requires integration or blocks the transaction.

## 3. Resolve same-path live drift

For each drifted file, inspect the semantic diff against both baseline and approved source.

- **Superseded:** replace only when the approved policy explicitly supersedes the live behavior.
- **Compatible additive:** create a deterministic adaptation from the approved source and replay only the compatible live addition.
- **Contradictory or unclear:** block that package/target; do not guess.
- **Product-local:** retain it only in the owning profile and label the adaptation as local.

When adapting a `SKILL.md`, preserve the approved universal policy first, then reapply the scoped live addition. Remove stale contradictory clauses rather than leaving both policies in different sections. Bump the adapted package version when practical. Update companion support files when their old wording would contradict the adapted skill.

Never claim an adapted package is byte-identical to canonical source.

## 4. Stage and verify adaptations outside targets

Build adaptation files in a non-repository scratch directory before target mutation. Validate:

- frontmatter identity and version;
- referenced support-file existence;
- `EVAL.yaml` and fixture loading;
- syntax/compilation for scripts;
- semantic contradiction scans across the complete adapted package;
- exact digest of each adaptation artifact;
- explicit distinguishing markers for every known profile-local policy that must survive the merge, not merely unchanged file counts.

Record an explicit adaptation map: `(profile, skill, relative path) -> artifact digest and reason`. For same-path additions, the manifest should name the retained section/marker so a successful three-way command cannot silently lose semantically required local guidance.

## 5. Back up, overlay, and swap transactionally

Before the first mutation, back up every complete target package. For each target:

1. copy the target to a temporary sibling directory;
2. overlay approved canonical files;
3. remove baseline-canonical paths deliberately removed by source;
4. apply recorded adaptations;
5. preserve target-only additions not superseded by an adaptation;
6. verify expected digests in the temporary directory;
7. atomically rename target to rollback and temporary to target;
8. restore rollback on swap failure; delete it only after successful verification.

Do not let validation imports create caches that become part of the expected package set.

## 6. Report exact and adapted outcomes separately

The manifest must distinguish:

- exact canonical packages, e.g. `48/50`;
- approved local adaptations, e.g. `2/50`;
- target-only files preserved;
- target-only files intentionally adapted;
- compiled scripts and package metadata checks;
- stale-policy contradiction count;
- fresh-process explicit-skill smokes;
- gateway/runtime adoption state.

A combined `canonical_verified=50/50` counter is misleading when two packages contain authorized adaptations. Store the adaptation files themselves—or immutable copies plus hashes—under the backup/evidence root so the manifest remains independently reproducible after scratch cleanup.

## 7. Post-adoption verification

After overlay:

- re-hash every installed canonical/adapted path;
- load the explicit skill in one fresh process per profile;
- verify provider response and gateway health separately;
- rescan installed package directories, not the whole profile tree, so historical cron outputs and review reports do not create false stale-policy matches;
- remove only the exact scratch script/worktree created for this transaction.

Same-name skill content hot-loads for new invocations. Existing conversations should use `/reset` or `/new`; do not restart gateways unless changed artifact classification actually requires process adoption.
