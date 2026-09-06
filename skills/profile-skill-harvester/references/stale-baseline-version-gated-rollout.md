# Stale-baseline, version-gated profile rollout

Use this fallback when a user explicitly asks to apply the latest canonical distribution skills, but the recorded per-package deployment ancestor is stale, missing, or cannot support a trustworthy three-way comparison.

This is a **selection fallback**, not a substitute for exact-source verification.

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
- semantic `version` when present and valid;
- complete package path and digest;
- duplicate same-name packages;
- canonical-path files, target-only files, and generated caches.

Fail closed on malformed frontmatter, unsafe symlinks, invalid EVALs/fixtures, ambiguous ownership, or **unresolved** duplicate names. A duplicate is not permission for arbitrary deletion. It may be retired deterministically only when one live package is the unique selected package (for example, the sole highest valid semantic version), every duplicate is older/superseded rather than divergent, and the rollout authority includes standardization. Back up every duplicate at its original relative path before mutation; otherwise block that profile/skill.

## 3. Semantic disposition rules

When no reliable ancestor exists, inspect every distinct digest regardless of version or prior baseline state. For every behavior and support-file delta, record exactly one evidence-backed disposition: `adopted`, `scoped`, `superseded`, `product-local`, `unsafe`, or `unresolved`.

1. **Canonical skill absent in target:** select it for installation.
2. **Both versions are valid `MAJOR.MINOR.PATCH` and canonical is newer:** select it as an update candidate.
3. **Versions are equal:** inspect the semantic difference; equality grants neither preservation nor overwrite authority.
4. **Target version is newer:** inspect it like every other distinct digest; reusable drift must be re-harvested before overwrite.
5. **Either version is missing or non-semantic:** classify as ambiguous and inspect manually. Do not pretend that an unversioned target is older.
6. **Standardization request:** record it as scope authority only. It cannot waive semantic disposition, safety, canonical publication, or immutable-source gates. Preserve only declared, hash-verified `product-local` adaptations; block `unsafe`/`unresolved` drift with state unadvanced.

Semantic versioning orders inspection and supports a monotonic final version; it never decides which packages warrant examination, preservation, replacement, or retirement.

## 4. Preflight every target before mutation

Build one global plan across all named profiles before copying anything. For each selected package:

- validate source package completeness and every `EVAL*.yaml` with the repository loader when available;
- hash every canonical file;
- hash every target-only file that must survive;
- state the exact target path discovered by frontmatter identity;
- record old/new versions and the selection reason;
- identify added skill names separately from same-name updates.

A late ambiguous package blocks or is explicitly excluded before the first target changes.

## 5. Transactional overlay

For each authorized package:

1. back up the complete selected target package and every superseded duplicate outside repositories, retaining each original profile-relative path;
2. copy the selected target into a temporary sibling directory on the same filesystem;
3. remove only known generated caches;
4. overlay exact canonical files from the frozen export when the selection rule authorizes an update; for duplicate-retirement-only actions, preserve the selected package bytes unchanged;
5. preserve and re-hash only target-only files whose semantic delta ledger explicitly classifies them as `product-local`; reusable drift must first enter a newly reviewed and merged canonical generation, while unsafe or unresolved drift blocks that package;
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

Report separately: exact-canonical, declared product-local adaptations, blocked unsafe/unresolved drift, re-harvested reusable drift, installed, fresh-process smokes, catalog rescans, and post-smoke hash verification. Never use `preserved-same-version`, `preserved-live-ahead`, or generic target-only preservation as a semantic disposition.
