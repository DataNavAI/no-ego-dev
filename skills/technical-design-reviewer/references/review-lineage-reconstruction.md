# Reconstructing a capped technical-review lineage

Use this before dispatching an independent technical-design reviewer when revisions, copied candidate directories, renamed files, or scope resets make the three-round lineage count uncertain.

## Goal

Produce two durable fields before review starts:

```text
tech_spec_lineage: <stable product/feature architecture lineage>
review_round_count: <number of substantive review rounds already completed, 0-3>
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

Do not count the same report again because it appears in several candidate bundles, worktrees, repositories, or filenames. Parallel specialist verdicts against the same frozen candidate and coordinated correction packet belong to the same numbered review round; splitting review kinds must not create extra rounds or reset the three-round lineage.

## Scope-reset handling

A rename, rewritten tech spec, new branch, new PR, or nominal scope reset does not reset the round count when it continues the same product/feature architecture. Record the old and new scope boundary, but keep one lineage unless the owner explicitly approves materially new requirements or splits the product into independently implementable architectures with separate ownership and deployment boundaries. Correcting prior findings is never new scope.

## Pre-dispatch gate

- If the count is ambiguous, mark the review `BLOCKED`; do not guess downward.
- Record the authenticated count and evidence path in the governing issue before the author finishes, so review capacity cannot be discovered after publication.
- State the requested next round explicitly.
- Reject a requested Round 4 or higher without substantive review.
- If the requested review is Round 3, say explicitly that it is final in the neutral packet and durable issue record.
- Do not bias the reviewer toward approval. The cap changes routing after the verdict, not the verdict standard.

## At the final round

If Round 3 finds no architecture revisions, route implementation/tooling/build evidence downstream and exit review.

If it finds architecture defects, do not dispatch another reviewer. Preserve the exact findings and ask the decision owner to choose among:

- accept stated residual risk;
- materially simplify or split the architecture;
- stop.

## Minimal durable receipt

```markdown
- `tech_spec_lineage`: …
- `review_round_count`: 2
- Evidence: `<canonical report path>` identifies Round 2 and binds Round 1 by digest.
- Duplicate handling: copied reports deduplicated by round + candidate digest + report identity.
- Next review: Round 3, final permitted substantive review.
- Post-verdict routing: no Round 4; unresolved architecture risk goes to decision owner.
```
