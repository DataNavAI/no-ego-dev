# Stale-baseline semantic reconciliation and profile rollout

Use this fallback when a user explicitly asks to apply the latest canonical distribution skills, but the recorded per-package deployment ancestor is stale, missing, or cannot support a trustworthy three-way comparison.

This is an **ancestry fallback**, not a version-selection shortcut or a substitute for exact-source verification. It increases the amount of semantic inspection required because a trustworthy three-way ancestor is unavailable.

## 1. Freeze authority before selection

Require:

- an approved canonical code candidate and any required evidence-only follow-up commit;
- all reported PR checks green;
- a verified merge commit on the remote default branch;
- a clean export or Git archive from that exact merge SHA.

Do not deploy from a mutable worktree, untracked files, generated caches, or the pre-merge branch merely because its content appears equivalent.

## 2. Inventory by frontmatter identity

Across the canonical export and every target profile, record:

- exact `name` from `SKILL.md` frontmatter;
- semantic `version` when present and valid, as metadata only;
- complete package path and digest;
- duplicate same-name packages;
- canonical-path files, target-only files, and generated caches.

Fail closed on malformed frontmatter, unsafe symlinks, invalid EVALs/fixtures, ambiguous ownership, or **unresolved** duplicate names. A duplicate is not permission for arbitrary deletion. It may be retired deterministically only after complete-package semantic inspection proves one package adopted and every duplicate identical or explicitly `superseded` rather than divergent; version rank alone is never proof. Back up every duplicate at its original relative path before mutation; otherwise block that profile/skill.

## 3. Complete semantic reconciliation rules

When no reliable ancestor exists:

1. Enumerate every canonical and live package by frontmatter identity and complete digest, regardless of whether its version is lower, equal, higher, missing, or malformed.
2. Inspect every distinct package and per-file semantic delta. A version may prioritize inspection order, but every differing digest warrants examination.
3. Build the same semantic disposition ledger used during harvest: every behavior/support-file delta is `adopted`, `scoped`, `superseded`, `product-local`, `unsafe`, or `unresolved` with evidence and origin.
4. **Canonical skill absent in target:** install only after confirming no same-name live package or duplicate contains reusable drift that still needs harvesting.
5. **Different digest at any version relation:** synthesize reusable guidance canonically first. Apply exact canonical bytes or a declared `product-local` adaptation only after verified merge.
6. **Unversioned or malformed version:** do not infer age; semantic inspection still proceeds and malformed package metadata remains a validation blocker where required.
7. **Unresolved or unsafe:** block that profile/skill and leave its state unadvanced. User standardization authority may resolve a genuine product-policy choice, but it cannot bypass safety, canonical publication, semantic disposition, or exact-source gates.

Semantic versioning may assist ordering and final monotonic version choice; it never decides which packages warrant examination and does **not** prove content equality, compatibility, authority, review approval, or rollout success.

## 4. Preflight every target before mutation

Build one global plan across all named profiles before copying anything. For every canonical/live package pair:

- validate source package completeness and every `EVAL*.yaml` with the repository loader when available;
- hash every canonical file;
- hash every target-only file that must survive;
- state the exact target path discovered by frontmatter identity;
- record old/new versions as metadata plus every semantic disposition and convergence reason;
- identify added skill names separately from same-name updates.

A late ambiguous package blocks or is explicitly excluded before the first target changes.

## 5. Transactional overlay

For each authorized package:

1. back up the complete selected target package and every superseded duplicate outside repositories, retaining each original profile-relative path;
2. copy the selected target into a temporary sibling directory on the same filesystem;
3. remove only known generated caches;
4. overlay exact canonical files from the frozen export only when the disposition ledger authorizes exact convergence; otherwise apply a predeclared `product-local` adaptation or block;
5. preserve and re-hash target-only files;
6. validate frontmatter, EVALs, fixtures, and support scripts in the staged package;
7. atomically swap staged and live directories, then atomically rename superseded duplicates aside;
8. enroll the current package in the rollback ledger **before** duplicate retirement so a failure during the current action restores both the selected path and any duplicate already moved;
9. roll back every completed/current swap if the transaction fails;
10. retain the external backup and a permission-restricted JSON receipt containing source merge SHA, selection reason, target path, removed duplicate paths, and per-file SHA-256 maps for canonical and preserved target-only files.

Exercise the real `--apply` path first against a disposable profile that contains both an outdated package and a stale nested duplicate. After installation and again after runtime smoke, verify every receipt digest and require every retired duplicate path to remain absent.

Do not update harvest state merely because copies completed.

## 6. Adoption proof

For skill-only changes:

- run one fresh process per profile that explicitly loads a changed skill and requires an exact provider-smoke response;
- re-hash canonical and preserved target-only files after the smoke;
- use `/reload-skills` for added or removed names when the long-lived catalog must rescan;
- tell existing conversations to use `/reset` or `/new` before relying on changed instructions;
- do not restart gateways solely to manufacture adoption evidence.

Report separately: inspected digests, semantic dispositions, exact-canonical targets, declared product-local adaptations, blocked unresolved/unsafe targets, installed packages, target-only files preserved, fresh-process smokes, catalog rescans, and post-smoke hash verification. Version relation may be reported as context but never as a preservation or overwrite decision.
