# Reconstructing a technical-review lineage

Use this before dispatching an independent technical-design reviewer when revisions, copied candidate directories, renamed files, or scope resets make the monotonic lineage count uncertain.

## Goal

Produce two durable fields before review starts:

```text
tech_spec_lineage: <stable product/feature architecture lineage>
review_round_count: <number of substantive review rounds already completed, zero or greater>
```

The count is about review events, not files. Candidate bundles often copy every prior report, so raw file counts overstate the lineage.

## Evidence order

1. Read the review index/report shipped in the canonical repository.
2. Search candidate archives and durable review records for headings such as `Technical design review — round N`.
3. Read each candidate identity: architecture path/revision, full digest, round, verdict, and prior-review link/digest.
4. Reconstruct the chain backward from the latest trusted report.
5. Cross-check durable issue/PR comments only after artifact evidence; comments can explain provenance but should not manufacture a missing review.

## Deduplication key

Treat copied reports as one substantive review when they bind the same combination of:

- stable architecture lineage;
- review round;
- exact candidate digest or immutable commit;
- verdict/report digest.

Do not count the same report again because it appears in several candidate bundles, worktrees, repositories, or filenames. Parallel specialist verdicts against the same frozen candidate and coordinated correction packet belong to the same numbered review round; splitting review kinds must not create extra rounds or reset the lineage.

## Scope-reset handling

A rename, rewritten tech spec, new branch, new PR, or nominal scope reset does not reset the round count when it continues the same product/feature architecture. Record the old and new scope boundary, but keep one lineage unless the owner explicitly approves materially new requirements or splits the product into independently implementable architectures with separate ownership and deployment boundaries. Correcting prior findings is never new scope.

## Pre-dispatch gate

- If the count is ambiguous, mark the review `BLOCKED`; do not guess downward.
- Record the authenticated count and evidence path in the governing issue before the author finishes, so review capacity cannot be discovered after publication.
- State the requested next round explicitly.
- If the requested review is Round 4 or later, require controller-derived `approval_convergence` mode in the neutral packet and durable issue record.
- Approval convergence tries to prove the candidate approvable without weakening the material-defect standard.

## After the initial correction phase

If a review finds no remaining material architecture revision, return `APPROVED`, route implementation/tooling/build evidence downstream, and exit review.

If it finds material architecture defects, preserve one smallest complete correction set, remediate to a new immutable candidate, and dispatch the next monotonic round. The decision owner may instead choose to:

- accept stated residual risk;
- materially simplify or split the architecture;
- stop.

## Minimal durable receipt

```markdown
- `tech_spec_lineage`: …
- `review_round_count`: 2
- Evidence: `<canonical report path>` identifies Round 2 and binds Round 1 by digest.
- Duplicate handling: copied reports deduplicated by round + candidate digest + report identity.
- Next review: Round 3; Round 4 and later use approval-convergence mode if material correction remains necessary.
```

## Post-Round-3 approval convergence

There is **no fixed round limit** for one stable review lineage. **Round 4 and later** run in **approval-convergence mode**: begin by trying to prove the exact candidate is approvable, verify every prior blocking finding disposition and correction-introduced regression, and return `APPROVED` as soon as no unresolved material blocker remains. Do not request another round for reversible nits, stylistic preferences, optional hardening, or evidence outside the governing acceptance criteria.

Approval-convergence mode is not automatic approval and never permits approval by exhaustion. A genuine material security, correctness, privacy, data-loss, compliance, destructive-migration, or ineffective-test defect remains blocking. A late material process escape must retain `MATERIAL_PROCESS_ESCAPE`, evidence, and escalation. If approval is still impossible, return one smallest complete blocking correction set rather than drip-feeding feedback; the corrected immutable candidate advances to the next monotonic round with no fixed round limit.

Every corrected candidate still requires a fresh exact-identity review. Round 2 and later receive the exact immutable pre-review summary, complete cumulative prior-report history, stable finding dispositions, remediation map, and contradiction check. Only an exact-candidate `APPROVED` verdict authorizes merge or publication.
