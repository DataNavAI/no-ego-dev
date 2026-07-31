# Multi-repository static review release sequencing

Use when a product repository owns editable mock/source files and a separate hub repository owns shared runtime assets, generated publication snapshots, infrastructure, and deployment.

## Immutable sequence

1. Finish the shared runtime contract far enough to test the product integration locally.
2. Freeze the product repository's complete staged tree, including rendered docs and truthful evidence labels.
3. Run exact-tree product/security reviews without touching the shared checkout or product index.
4. Any code, test, README, rendered HTML, evidence wording, or generated-file correction changes the tree and invalidates the verdict. Restage, record the new tree, and re-review.
5. After approval, commit and push the product source.
6. Pin that exact 40-character product commit in the hub manifest, including migration/storage keys and other authoritative metadata.
7. Check out the pinned source and regenerate the hub's committed site snapshot.
8. Prove the generated site contains the shared runtime assets, authoritative config, exact source revision, migration keys, and unchanged product bytes expected by the build contract.
9. Run hub tests, generated-site verification, infrastructure validation, and exact immutable hub reviews.
10. Commit/push the hub candidate, deploy staging, run supported-interface/security/API checks, then promote the same approved identity to production.

## Phase-scoped findings

State the phase in every reviewer prompt:

- Product integration pre-commit review must not require a hub snapshot that can only be generated after the product commit exists.
- Hub release-candidate review must fail if the committed release snapshot, source pin, shared assets, or migration config are absent/stale.
- A temporary scratch build proves feasibility but does not satisfy a committed release-snapshot gate.

## Candidate-mutation freeze

Before dispatching asynchronous reviewers:

- finish code, tests, README, Markdown review artifact, rendered HTML, evidence labels, source/media boundary wording, and staged deletions;
- record `git write-tree`, staged/unstaged status, and verification receipts;
- give each reviewer the exact tree plus absolute paths and no-edit instructions;
- leave the checkout/index untouched until all verdicts return.

If a late improvement is necessary, make it, explicitly retire every in-flight/returned verdict for the old tree, and dispatch against the new tree. Do not claim that a one-line documentation-only delta preserves immutable approval.

## Missing asynchronous output

A delegation marked complete without preserved verdict text is an absent gate. Retrieve the exact saved result if available; otherwise rerun against the still-frozen identity. Never infer approval from completion status, elapsed time, or another reviewer's result.

## Shared persistence migration gate

For browser-local to shared persistence migrations, bind the hub config to the exact product source revision and legacy key. Freeze the migration matrix before review:

- malformed/oversized/over-limit input and any canonical-ID collision are batch-fatal with zero POST/receipt;
- individually invalid non-colliding records are counted/skipped while recoverable records migrate;
- original local bytes remain unchanged and exact raw recovery data remains exportable;
- immutable pending request bytes are stored before POST and reused across reload/lost-response reconciliation;
- stale, tampered, or malformed pending state fails closed rather than being rebuilt;
- browser-local disposition is untrusted provenance: preserve it as a visible historical claim, but do not let reviewer authentication create a currently resolved record;
- only the agent-authenticated path controls response/resolve/reopen/delete;
- canonical IDs/routes, literal rendering, and receipt-after-every-confirmed-accepted-record are executable gates.

When reviewers expose a contradiction between historical-preservation goals and authorization boundaries, resolve the trust model in the spec first, then update implementation, docs, tests, and rendered artifacts together. Do not alternate between incompatible reviewer interpretations or keep dispatching exact-tree reviews while the contract is still moving.
