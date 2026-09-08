# Stale-baseline semantic reconciliation and profile rollout

Use this when a target’s recorded deployment ancestor is stale, missing, or cannot support a trustworthy three-way comparison. This is an ancestry fallback—not a version-selection shortcut. Missing ancestry requires **more** semantic inspection, not less.

## Authority and inventory

1. Freeze an approved canonical code/final-tree generation, verify all applicable checks, verify the remote-default merge commit, and export rollout bytes from that immutable merge object.
2. Inventory canonical plus every target package by frontmatter identity, complete-package digest, per-file hashes, duplicates, target-only files, and generated caches.
3. Record version only as context. Inspect every distinct digest whether its version is lower, equal, higher, missing, or malformed and whether state previously baselined it.
4. Fail closed on unsafe symlinks, malformed packages, invalid EVALs/fixtures, ambiguous ownership, or unresolved duplicate identities.

## Semantic reconciliation

For every behavior/support-file delta, record evidence and exactly one disposition: `adopted`, `scoped`, `superseded`, `product-local`, `unsafe`, or `unresolved`.

- A differing digest always warrants examination.
- A lower version may contain reusable newer behavior.
- Equal/newer versions do not earn automatic preservation.
- User standardization authority and backups cannot bypass disposition, safety, canonical publication, or immutable-source gates.
- Reusable drift absent from canonical requires a new validated, exact-SHA-reviewed, merged generation before overwrite.
- Unsafe/unresolved deltas block only the affected package/profile and leave state unadvanced.

Semantic versions may help order inspection and choose a final monotonic canonical version; they never decide which packages warrant inspection, preservation, replacement, or retirement.

## Global preflight and transaction

Before the first target mutation:

1. complete the disposition ledger across all targets;
2. verify every source package and support path;
3. compute exact canonical overlays and only declared/hash-verified `product-local` adaptations;
4. back up complete target packages and duplicates outside repositories;
5. build and validate staged packages on the same filesystem;
6. write a restricted receipt with source merge SHA, every disposition/reason, target path, canonical hashes, adaptation hashes, and retired duplicates;
7. abort globally on preflight, backup, containment, disposition, re-harvest, or staged-validation failure;
8. swap atomically under one external lock and roll back every completed/current action on failure.

Retire a duplicate only after semantic inspection proves it identical or explicitly `superseded`; version rank alone is never proof.

## Adoption and convergence

For every nonblocked enrolled profile:

- require exact canonical bytes or a declared product-local adaptation;
- verify exactly one enabled package per frontmatter identity;
- load the changed skill in a fresh profile-scoped process;
- re-hash canonical/adapted paths after the smoke;
- use `/reload-skills` only for added/removed names and `/reset` or `/new` for existing conversations;
- advance state only after verified merge, rollout/read-back, and convergence proof.

Report inspected digests, dispositions, exact/adapted/blocked targets, backups, receipts, fresh-load evidence, and post-smoke hashes. Version relation is context only—not the decision reason.
