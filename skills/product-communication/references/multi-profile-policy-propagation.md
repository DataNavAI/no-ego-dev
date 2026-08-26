# Multi-Profile Policy Propagation

Use this checklist when a communication, reporting, safety, or workflow policy must behave consistently across profile-local runtimes.

## Discovery

- Enumerate live profiles and identify which ones are in the requested rollout scope.
- Locate the effective skill copy for global/default and every target profile; a local copy may shadow the global skill.
- Compare package version, canonical files, and target-only additions before writing.
- Freeze the approved source bytes and record their hashes.

## Transactional rollout

- Preflight all targets before the first write.
- Keep an external lock outside directories that will be swapped.
- Create one readable backup and receipt covering the whole rollout.
- Stage from each target, overlay canonical files, and preserve compatible local EVALs, fixtures, and domain references.
- Swap atomically where supported. Maintain a reverse-order rollback journal so partial failure restores every changed target.
- Do not silently delete target-only files or overwrite unrelated profile specialization.

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
