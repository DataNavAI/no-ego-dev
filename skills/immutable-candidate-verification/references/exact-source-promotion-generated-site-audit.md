# Exact source-promotion and generated-site audit

Use for a read-only review where a hub commit pins an immutable product/source commit and commits the generated static snapshot.

## Review identity and isolation

1. Resolve the hub candidate as a commit and record its tree, parent, changed paths, and clean checkout status.
2. Perform executable checks in a disposable archive of the exact hub commit, not the mutable shared checkout.
3. Clone or detach the product source into a separate disposable source root at the pinned SHA. Give it the canonical origin URL if the builder verifies repository identity.
4. Remove disposable review directories at the end and recheck that the original hub checkout remains at the candidate SHA with zero status entries.

## Remote source readback

Do not trust only a locally present source object. Verify that the expected remote branch or immutable ref resolves to the pinned SHA, then fetch that exact SHA into the disposable clone and assert `FETCH_HEAD` equals the pin. Record both values. This proves the promoted source is remotely recoverable without mutating the authoritative source checkout.

## Three independent parity layers

Require all three:

1. **Source object → build manifest**
   - Enumerate product files with `git ls-tree -r --name-only <source-sha> -- <source-path>/` so hidden and ignored tracked files are included.
   - Read each blob directly from the Git object, compute its digest and byte count, and compare the complete relative-path map to the hub build manifest.
   - Fail on missing, extra, duplicate, hash-mismatched, or size-mismatched entries.

2. **Build manifest → committed site**
   - Recompute every shared and product-file digest and byte count from the committed site.
   - Require unique resolved output paths, exact shared-config shape, exact `sourceRevision`, preserved migration/storage keys, and the complete expected shared-asset set.

3. **Clean rebuild → committed site**
   - Run the real hub builder against the disposable exact-SHA source checkout.
   - Compare every generated non-manifest file byte-for-byte.
   - Compare manifest semantics after normalizing only explicitly nondeterministic fields such as `generated_at`; never normalize paths, source identities, file sets, sizes, or digests.

A passing site verifier alone is insufficient if it merely checks a self-consistent but hand-edited manifest and snapshot. The independent source-object comparison and clean rebuild close that gap.

## Scope and private-review preservation

- Assert every changed path is either the authoritative source-pin file or generated site output.
- Compare protected hub subtrees against the parent commit: shared review plugin, infrastructure, workflows, tests, build scripts, and dependency locks should be unchanged unless the candidate explicitly authorizes them.
- Prove the product HTML still loads the shared review runtime and retains its host trigger/integration hook.
- Search the exact product tree for copied/bespoke plugin assets that should have been removed; do not confuse host integration files or evidence whose parent directory contains the word `review` with plugin copies—match relative basenames and specific asset patterns.

## Verification receipt

A promotion verdict should report:

- exact hub SHA and source SHA;
- remote source readback result;
- source/manifest/site file counts and parity outcome;
- clean-rebuild parity outcome;
- shared config and private-plugin preservation;
- protected-subtree and changed-scope result;
- canonical Node/Python/infrastructure test totals;
- final original-checkout identity and cleanliness;
- whether any durable files were modified.

Return a fail-closed blocker-only verdict. Missing remote readback, source-object parity, clean rebuild parity, required tests, or final clean-state proof means the promotion is not approved.