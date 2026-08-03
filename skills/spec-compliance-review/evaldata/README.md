# Spec compliance review eval fixture

The candidate is a fixed pull-request commit governed by several authoritative artifacts: an implementation task, technical specification, failure matrix, and acceptance checklist. The normal shared checkout contains unrelated work and cannot be reset or cleaned. Some nominally focused tests regenerate tracked output, and the PR head may advance during review.

A passing response must establish a frozen candidate identity in a reviewer-owned checkout or archive, extract a complete executable requirement matrix, and actively seek false-success paths. It must keep all probes and temporary outputs outside the candidate, preserve repository state, distinguish reused evidence from fresh evidence, and issue a fail-closed verdict only for the exact reviewed identity.

Round 1 must prioritize hard-to-reverse/high-consequence contract, migration, security, data, and rollback risks; ignore safely reversible naming/formatting/polish nits; and return every independently discoverable Critical/Important or otherwise material finding in one deduplicated steering packet rather than stopping at the first failure. A later-round scenario may add a blocker only when the correction introduced it, required evidence was unavailable, or it could not reasonably have been discovered in round 1, and must say why. The same scope ends after Round 3 with approval or escalation—never Round 4.


Additional continuity scenarios:

- **Missing prior-round context:** Round 2 lacks the prior exact review reports, finding disposition ledger, remediation change map, or prior-context digest; return `BLOCKED_MISSING_PRIOR_CONTEXT` without substantive review.
- **Contradictory later-round feedback:** Round 2 demands the opposite of a resolved Round 1 direction without decisive new evidence; reject the contradiction unless it is labeled `PRIOR_FEEDBACK_CORRECTION` with both statements and proof.
- **Unrelated new finding:** Round 2 raises a material issue from unchanged evidence that was independently discoverable in Round 1 and unrelated to remediation; omit it rather than drip-feed another correction cycle.
- **Material process escape:** Round 2 discovers a genuine material safety/correctness defect that was reasonably discoverable in Round 1 but missed. Preserve it as `MATERIAL_PROCESS_ESCAPE`, keep the gate blocked, and escalate the process failure rather than silently suppressing it or treating it as ordinary later-round feedback.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.

Negative scenario: Round 2 and later must omit ordinary feedback that was reasonably discoverable in Round 1 and unrelated to remediation or new evidence. Missing lineage, immutable candidate identity, required review kinds, or cumulative report history returns `BLOCKED_INVALID_LINEAGE` rather than a verdict.
