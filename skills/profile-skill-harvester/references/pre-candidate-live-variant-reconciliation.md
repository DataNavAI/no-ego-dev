# Pre-candidate live-variant reconciliation

Use this before editing or freezing any canonical skill candidate that will later roll out to live sibling profiles.

## Why this gate exists

Version and inventory state are metadata, not semantic authority. A lower-version or previously baselined profile can contain the best reusable instruction, fixture, script, template, or safety control. Inspecting only newer/newly-observed variants silently loses learned behavior; preserving every target-only file as “local” merely freezes divergence.

## Gate sequence

1. Resolve the canonical **generation** before inventory. Fetch the remote default branch, record its exact SHA, and compare the target package's version and digest across every plausible local checkout plus live profiles. A remembered repository path, a clean-looking checkout, or a higher local version is not authority when that checkout is on a stale/diverged branch. Use a fresh isolated worktree rooted at the fetched `origin/<default>` SHA. If editing began from an older generation, abandon that candidate and reapply the behavior change to the latest remote-default package; never sync the stale candidate over newer live copies.
2. Inventory the complete canonical package, active global/default copy, and every authorized sibling package before the first behavior edit.
3. Group identical complete-package digests, then inspect every distinct digest regardless of lower/equal/higher/missing version or prior baseline state.
4. Compare every package file—not only `SKILL.md`—and build a semantic disposition ledger. For each behavior/support-file delta record origin, evidence, applicability, and exactly one disposition:
   - `adopted`: reusable behavior enters canonical;
   - `scoped`: compatible behavior enters canonical under an explicit lifecycle/use-case boundary;
   - `superseded`: evidence proves the canonical successor intentionally replaces it;
   - `product-local`: it belongs only to the owning profile and requires a declared adaptation with hashes/reason;
   - `unsafe`: it may not deploy;
   - `unresolved`: same-scope evidence cannot select a safe rule yet.
5. Treat state as scheduling/deduplication only. Baselined divergence still participates in semantic synthesis every generation.
6. Synthesize the most complete compatible predecessor from the union of evidence; never select bytes by highest version, newest mtime, first path, or source-profile identity.
7. Add regressions that prove requested behavior and retention of every adopted/scoped predecessor control. Include a lower-version unique-control case and a previously-baselined divergence case.
8. Freeze an exact-SHA candidate only after every distinct delta has a disposition. Unsafe/unresolved conflicts block only the affected package; do not baseline or overwrite it.

## Drift found during rollout

Re-read every target immediately before mutation. If a reusable delta is absent from the merged canonical generation, stop that package’s rollout and re-harvest it into a new validated, independently reviewed, merged generation. User standardization authority, matching/newer versions, and backups cannot bypass semantic disposition, safety, canonical publication, or immutable-source gates.

Only `product-local` deltas may become a three-way adaptation:

- base: immutable canonical package at the target’s last verified deployment ancestor;
- ours: package exported from the verified new merge commit;
- theirs: target package captured immediately before mutation.

Dry-run all targets globally, build adaptations outside profile directories, record adaptation maps and digests, back up complete packages, and swap transactionally. Never call adapted bytes canonical-identical.

## Convergence closure

Canonical publication alone is incomplete. Apply the latest verified canonical package set to every nonblocked enrolled profile—including the source profile and equal-version targets. Require one of:

- exact canonical package bytes; or
- a declared, hash-verified `product-local` adaptation.

Then prove fresh-process loading and re-hash after adoption. Advance a profile/skill digest only after verified merge, successful rollout/read-back, and convergence proof. Report blocked profiles by name and leave their prior state unadvanced.
