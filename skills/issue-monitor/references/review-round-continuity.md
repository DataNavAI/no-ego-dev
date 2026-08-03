# Review-round continuity packet

Use this contract when `review_gate.py` claims Round 2 or later for a changed immutable candidate. The readiness receipt remains schema version 1, but every round after Round 1 fails closed without `prior_round_context`.

## Receipt shape

Round 1 uses:

```json
{
  "pre_review_summary_digest": "eadd261fe5b9692753114a9c8b3f353f4a22af017a2222dfdfa011656332bb87",
  "pre_review_summary_artifact": "{\"acceptance_criteria\":[\"observable result\"],\"change_inventory\":[\"governed files\"],\"governing_request\":[\"authoritative request\"],\"hard_to_reverse_surfaces\":[\"durable gate state\"],\"inherited_findings\":[\"none\"],\"intended_approach\":[\"factual implementation direction\"],\"known_tradeoffs\":[\"fail closed on old state\"],\"lineage\":\"issue-17\",\"open_questions\":[\"none\"],\"risk_assumptions\":[\"reviewer-challengeable assumption\"],\"schema_version\":1,\"scope\":{\"in\":[\"review gate\"],\"out\":[\"automatic approval\"]},\"verification_matrix\":[\"claim -> exact evidence\"]}\n",
  "prior_round_context": null
}
```

Round 2 and later use this shape, with `report_history` extended through every preceding generation:

```json
{
  "pre_review_summary_digest": "eadd261fe5b9692753114a9c8b3f353f4a22af017a2222dfdfa011656332bb87",
  "pre_review_summary_artifact": "{\"acceptance_criteria\":[\"observable result\"],\"change_inventory\":[\"governed files\"],\"governing_request\":[\"authoritative request\"],\"hard_to_reverse_surfaces\":[\"durable gate state\"],\"inherited_findings\":[\"none\"],\"intended_approach\":[\"factual implementation direction\"],\"known_tradeoffs\":[\"fail closed on old state\"],\"lineage\":\"issue-17\",\"open_questions\":[\"none\"],\"risk_assumptions\":[\"reviewer-challengeable assumption\"],\"schema_version\":1,\"scope\":{\"in\":[\"review gate\"],\"out\":[\"automatic approval\"]},\"verification_matrix\":[\"claim -> exact evidence\"]}\n",
  "prior_round_context": {
    "round": 1,
    "candidate_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "base_sha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "report_digests": {
      "composite": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    },
    "report_history": [
      {
        "round": 1,
        "candidate_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "base_sha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "report_digests": {
          "composite": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
        }
      }
    ],
    "pre_review_summary_digest": "eadd261fe5b9692753114a9c8b3f353f4a22af017a2222dfdfa011656332bb87",
    "finding_disposition_digest": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "remediation_change_map_digest": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  }
}
```

`round` is the immediately prior round. `report_digests` must exactly match the terminal report digest for every authorized bundle in that generation. `report_history` is the ordered cumulative chain for every preceding generation, starting at Round 1 and ending at `round`; each entry binds that generation's round, candidate, base, complete bundle manifest, and terminal report digests. Therefore a requested Round N contains exactly N-1 history entries. `pre_review_summary_artifact` is the exact canonical JSON text embedded at readiness top level; `pre_review_summary_digest` is its verified identity and is repeated inside every later-round context packet. The two controller-owned digests bind the finding ledger and remediation change map that the reviewer receives.

## Immutable pre-review summary

Before Round 1, create one neutral, evidence-linked summary for the stable lineage. It must contain:

1. The governing request, in-scope and out-of-scope boundaries, and acceptance criteria.
2. The intended implementation approach and factual change inventory, without arguing for approval.
3. Risk assumptions, hard-to-reverse surfaces, known tradeoffs, and unresolved questions.
4. The planned verification matrix and exact evidence/artifact locators available to reviewers.
5. Any inherited historical finding IDs and dispositions when work was materially rescoped from a prior lineage.

Canonical shape:

```json
{
  "schema_version": 1,
  "lineage": "stable-scope-identity",
  "governing_request": ["authoritative request or artifact locator"],
  "scope": {"in": ["bounded surface"], "out": ["explicit exclusion"]},
  "acceptance_criteria": ["observable outcome"],
  "intended_approach": ["factual implementation direction"],
  "change_inventory": ["planned path or artifact class"],
  "risk_assumptions": ["assumption requiring reviewer challenge"],
  "hard_to_reverse_surfaces": ["auth, data, public contract, or other risk"],
  "known_tradeoffs": ["accepted cost and rationale"],
  "open_questions": ["unresolved decision or none"],
  "verification_matrix": ["claim -> exact planned evidence locator"],
  "inherited_findings": ["stable finding ID -> disposition or none"]
}
```

Canonicalize it as UTF-8 JSON with sorted keys, compact separators, unescaped Unicode (`ensure_ascii=false`), and **exactly one trailing LF**. Embed that exact text as `pre_review_summary_artifact`, hash those exact bytes as a bare lowercase SHA-256 digest, and supply the verified artifact to every reviewer. The authority-bearing gate parses the embedded artifact, requires the exact closed schema above, verifies its lineage and canonical bytes, recomputes its digest, and persists the verified text and identity. The digest is mandatory in Round 1 readiness and must remain identical with the exact artifact in all later generations/context packets. A changed summary means the governing scope or assumptions changed and requires an explicitly new lineage; it cannot silently reset or steer an existing review. This summary supplements the exact contract, candidate, reports, and evidence—it never substitutes for them or narrows independent review.

## Canonical context artifacts

Persist these outside the candidate checkout in the controller's attempt-scoped artifact store:

1. The exact immutable pre-review summary whose digest is bound in readiness and later context.
2. All exact prior reviewer reports from Round 1 onward, unchanged and digest-verified.
3. A stable-ID finding disposition ledger. Each prior finding is one of `UNRESOLVED`, `RESOLVED`, `SUPERSEDED`, or `OWNER_DECISION`, with evidence and correction owner.
4. A remediation change map from every prior finding ID to changed files/sections and focused verification. Record authorized scope additions separately.
5. The original governing request/specification and complete current candidate evidence.

Canonicalize the ledger and change map as UTF-8 JSON with sorted keys and compact separators before hashing. Record the SHA-256 result as exactly 64 lowercase hexadecimal characters, matching `review_gate.py`'s existing report-digest format.

## Dispatch and result gates

Before dispatch, `review_gate.py claim` verifies:

- every round embeds a present, size-bounded `pre_review_summary_artifact` with the closed schema, matching lineage, and exact canonical serialization;
- the gate recomputes the artifact's SHA-256 and requires it to equal `pre_review_summary_digest` before dispatch;
- Round 2 and later include a structurally valid context object with the same summary digest;
- the summary digest remains identical across every candidate generation in the stable lineage;
- prior round, candidate, and base match the immediately prior terminal generation;
- immediate report-bundle names and digests exactly match the immediately prior terminal generation;
- `report_history` exactly matches every terminal prior generation from Round 1 onward, including candidate/base identities and all authorized bundle report digests; and
- the gate records a digest of the complete `prior_round_context` object with the claim;
- Rounds 1 through 3 derive `review_mode=standard`; and
- Round 4 and later derive `review_mode=approval_convergence` without accepting a caller override.

The controller must then provide the digest-bound artifacts—not a summary—to the fresh reviewer. Reject a later-round result unless it contains:

- `Prior-round reconciliation` covering every stable finding ID;
- `Contradiction check`;
- `New material findings`, even when empty; and
- an explicit `PRIOR_FEEDBACK_CORRECTION` with both conflicting statements and decisive evidence whenever prior feedback is reversed.

Unrelated new findings and reversible preferences do not extend the lineage. In approval-convergence mode, approve as soon as every prior material blocker is resolved and no new material defect remains. A genuine material security, correctness, privacy, data-loss, compliance, destructive-migration, or ineffective-test defect may still be reported through the explicit late-discovery/correction path; continuity and round count must never conceal a known defect or create automatic approval.
