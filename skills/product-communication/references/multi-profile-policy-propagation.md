# Multi-Profile Policy Propagation

Use this checklist when a communication, reporting, safety, or workflow policy must behave consistently across profile-local runtimes.

## Canonical publication prerequisite

- First add the policy as a complete eval-backed package in the canonical repository and merge it into the remote default branch.
- Verify the exact remote-default merge commit and export rollout bytes from that immutable commit.
- A global/default installation, profile-local copy, mutable checkout, pushed branch, or open PR is not publication and must not be used as the rollout source.
- If publication is incomplete, stop before target mutation and preserve durable continuation coordinates; do not advance the unpublished package's observed inventory digest.

## Discovery

- Enumerate live profiles and identify which ones are in the requested rollout scope.
- Locate the effective skill copy for global/default and every target profile; a local copy may shadow the global skill.
- Compare every distinct complete package digest, canonical file, and target-only addition before writing, regardless of version or baseline state.
- Assign every semantic/support-file delta exactly one evidence-backed disposition: `adopted`, `scoped`, `superseded`, `product-local`, `unsafe`, or `unresolved`. Version is context, not authority.
- Freeze source bytes exported from the verified remote-default merge commit and record their hashes.

## Transactional rollout

- Preflight all targets before the first write.
- Keep an external lock outside directories that will be swapped.
- Create one readable backup and receipt covering the whole rollout.
- Stage from each target and overlay canonical files. Preserve local EVALs, fixtures, and domain references only when explicitly dispositioned `product-local` with hashes/reason. Re-harvest reusable additions into a newly validated, exact-SHA-reviewed, merged canonical generation before overwrite; block unsafe/unresolved packages with state unadvanced.
- User standardization authority and backups cannot bypass semantic disposition, safety, canonical publication, or immutable-source gates.
- Swap atomically where supported. Maintain a reverse-order rollback journal so partial failure restores every changed target.
- Do not silently delete target-only files or overwrite unrelated profile specialization; unclassified drift blocks mutation.

## Verification

For every target:

1. Re-hash every canonical file against the frozen source.
2. Re-hash every declared preserved file against its pre-rollout value.
3. Confirm the skill appears in fresh registry discovery.
4. Start a fresh explicit preload and ask it to return the new version plus a distinguishing policy contract.
5. Confirm backup receipt immutability after runtime probes.
6. Remove staging, rollback, lock, probe, and source-snapshot artifacts; retain the backup and receipt.

## Reporting boundary

Say `all profiles` only when live inventory proves every relevant profile was included. Otherwise name the exact included profiles and explicitly identify meaningful exclusions. Separate filesystem verification from fresh-runtime verification.
