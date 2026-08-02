# Review-round continuity packet

Use this contract when `review_gate.py` claims Round 2 or Round 3 for a changed immutable candidate. The readiness receipt remains schema version 1, but later rounds now fail closed without `prior_round_context`.

## Receipt shape

Round 1 uses:

```json
"prior_round_context": null
```

Round 2 and Round 3 use:

```json
{
  "prior_round_context": {
    "round": 1,
    "candidate_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "base_sha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "report_digests": {
      "composite": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    },
    "finding_disposition_digest": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "remediation_change_map_digest": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  }
}
```

`round` is the immediately prior round. `report_digests` must exactly match the terminal report digest for every authorized bundle in that generation. The two controller-owned digests bind the finding ledger and remediation change map that the reviewer receives.

## Canonical context artifacts

Persist these outside the candidate checkout in the controller's attempt-scoped artifact store:

1. Exact prior reviewer reports, unchanged and digest-verified.
2. A stable-ID finding disposition ledger. Each prior finding is one of `UNRESOLVED`, `RESOLVED`, `SUPERSEDED`, or `OWNER_DECISION`, with evidence and correction owner.
3. A remediation change map from every prior finding ID to changed files/sections and focused verification. Record authorized scope additions separately.
4. The original governing request/specification and complete current candidate evidence.

Canonicalize the ledger and change map as UTF-8 JSON with sorted keys and compact separators before hashing. Record the SHA-256 result as exactly 64 lowercase hexadecimal characters, matching `review_gate.py`'s existing report-digest format.

## Dispatch and result gates

Before dispatch, `review_gate.py claim` verifies:

- Round 2/3 includes a structurally valid context object;
- prior round, candidate, and base match the immediately prior terminal generation;
- report-bundle names and report digests exactly match terminal gate state; and
- the gate records a digest of the complete `prior_round_context` object with the claim.

The controller must then provide the digest-bound artifacts—not a summary—to the fresh reviewer. Reject a later-round result unless it contains:

- `Prior-round reconciliation` covering every stable finding ID;
- `Contradiction check`;
- `New material findings`, even when empty; and
- an explicit `PRIOR_FEEDBACK_CORRECTION` with both conflicting statements and decisive evidence whenever prior feedback is reversed.

Unrelated new findings and reversible preferences do not extend the lineage. A real material safety or correctness defect may still be reported through the explicit late-discovery/correction path; continuity must never conceal a known defect.
