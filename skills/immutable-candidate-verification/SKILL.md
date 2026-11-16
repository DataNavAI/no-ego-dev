---
name: immutable-candidate-verification
description: Verify the exact software candidate with self-review, relevant checks and reproducible source and deployment evidence.
version: 1.0.66
---

# Immutable Candidate Verification

## Default verification policy

Self-review and appropriate automated checks are the default. Use a separate reviewer only when the user explicitly requests one. Do not add review rounds, lineage packets or approval receipts unless the user also requests that formal process. Historical separate-review procedures in linked references are optional, not completion gates. Preserve user authorization, real test/provider verification, secret protection and truthful delivery evidence.

Use when verification or deployment must refer to exact committed bytes. A commit identity makes evidence traceable; it does not create a separate reviewer requirement.

## Verify the candidate

1. Read the governing request, acceptance criteria, current base and complete diff. Preserve unrelated work. Record the source revision or exact staged snapshot needed by the task.
2. Check material correctness, ownership/authentication, privacy, failure/retry behavior and data changes yourself. Focus on the changed contract and its real consumers.
3. Run the repository's required checks after the final relevant edit. Use focused regressions for new risks, reuse passing exact-candidate CI where appropriate, and distinguish mocks from actual provider evidence.
4. Fix material defects and rerun affected checks. A changed candidate invalidates evidence for changed behavior; it does not require another review round or approval receipt.
5. Merge or publish only within existing user authorization and branch protections. Bind built artifacts and deployment configuration to the intended source. Verify actual runtime/readback before reporting deployment complete.

## Evidence and recovery

Keep concise results naming the source, checks run, artifact identity, actual deployed environment and material limitations. Never label a timeout, missing report, skipped check or unavailable provider as success. Actual failures remain blockers even when no separate reviewer is used.

For an interrupted mutation, inspect persisted state before retrying. Preserve data, permanent identities, credentials and unrelated resources. Recover only task-owned state; source verification does not expand deployment authority.

If another actor is changing a checkout, inspect a separate snapshot or coordinate ownership. Do not reset someone else's work to manufacture a clean candidate.

## Explicitly requested reviews

When the user asks for a separate review, supply the relevant contract, current candidate and available evidence. Address its material findings and record what was actually checked. Do not introduce fixed review rounds, cumulative lineage packets or specialist approval chains unless the user explicitly requested that formal process.

Domain-specific references remain available for their declared technical boundaries. Their historical reviewer/receipt procedures are optional and never become default implementation gates.
