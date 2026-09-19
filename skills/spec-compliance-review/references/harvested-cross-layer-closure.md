# Harvested cross-layer closure

## Identity and archive binding

1. Record caller cwd, repository root, HEAD, status, named base/candidate, and PR coordinates.
2. Search bounded sibling repositories/worktrees for both commit objects before concluding they are absent.
3. Otherwise retrieve authenticated candidate and base archives plus host metadata. Bind commit, parent, tree, archive digest, extracted-file manifest, and every command cwd.
4. Query moving PR identity again at report close; never transfer a frozen verdict to another head.

## Authority table

List source catalog, released authority, runtime selector, router, static generator, manifest, fallback output, tests, and public consumers. Compare exact accepted/emitted ID sets for populated, future, empty, duplicate, malformed, omitted, and foreign inputs. Authority-bearing arguments are required; omission must not broaden to the source catalog. Distinguish absent optional fields from own-`undefined` before normalization.

## Publication and lifecycle transaction

Exercise source/lock replacement and failures before staging, between each write/rename, and after visibility. Readers observe the previous complete generation or one complete new generation, never a mixed bundle. Async starts capture generation/version and cancellation identity; completion commits only when still current. Probe close, replacement, reorder/shrink, restart, retry, and stale completion.

## Local auth-broker probe

Use a disposable local broker only to supply the production-shaped registered route with the same credential/header contract. Keep secrets out of arguments, logs, fixtures, and reports. A helper-only auth pass or disabled middleware is not route evidence. Verify both accepted and rejected credentials and downstream call counts.

## Report recovery

Finish canonical verification before final report hashing where possible. After report and sidecar creation, verify final bytes from the sidecar directory, rerun host checks made stale by report artifacts, remove only reviewer-owned residue, and reconfirm repository/candidate identity.

Provider/domain recipes are conditional. Use AWS, DynamoDB, mobile-store, publication, or push-provider matrices only when the candidate has that boundary; retain universal identity, transaction, and evidence invariants.
