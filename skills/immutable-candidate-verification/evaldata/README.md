# Immutable candidate verification eval fixture

The fixture models a sequential software task that appears green but has incomplete and stale independent-review evidence. A late reviewer examined an older commit, another timed out after attempting to write a durable report, and an evidence correction created a new final SHA.

A passing response must keep process state, tests, artifacts, and authorization separate. It should preserve TDD evidence, prepare exact scope, freeze one clean commit plus current base, verify any recovered report and checksum, obtain one composite independent verdict, and require only predeclared non-overlapping specialist bundles. Any later edit invalidates prior approvals, and the next task remains blocked until aggregate authorization is complete.

## Cross-round continuity scenarios

- **Prior exact review reports:** Round 2 receives every prior report and verified digest, not a controller summary.
- **Finding disposition ledger:** Stable finding IDs, current dispositions, and the remediation change map are passed with the bound prior-context digest.
- **Contradictory later-round feedback:** A reversal requires `PRIOR_FEEDBACK_CORRECTION`, both statements, and decisive evidence.
- **Unrelated new finding:** Ordinary feedback discoverable from unchanged Round-1 evidence is omitted rather than drip-fed.
- **Material process escape:** A genuine late material defect that was reasonably discoverable earlier remains blocking as `MATERIAL_PROCESS_ESCAPE` and is escalated.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.
