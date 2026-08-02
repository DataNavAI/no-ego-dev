# Recoverable implementation review and correction

Use this when implementation reviews expose multiple findings, delegated fix workers may time out, or repeated review risks becoming an unbounded loop.

## Immutable review identity

- Review one exact base SHA and exact head SHA.
- Confirm the remote PR still points to that head before acting on a review.
- Passing tests from a moving branch or different checkout are not evidence for reviewed bytes.

## Predeclared specialist fan-in before correction

Default to one composite independent review covering specification and quality/integration risk for an ordinary frozen candidate. Extra parallel review is justified only by a predeclared named, non-overlapping high-risk expertise gap; latency alone never justifies duplicate reads.

1. Give the composite reviewer and every predeclared specialist a unique report/checksum path and record every in-flight handle for the exact SHA.
2. Keep the PR head frozen until all authorized bundles for that SHA stop. A first failure closes the merge gate but does not make a distinct predeclared specialist irrelevant; its later findings may broaden the same correction class.
3. Independently verify each returned or timeout-recovered report and reproduce consequential objective findings where practical.
4. Fan in all verified blockers and bounded matrices before dispatching a writer. Do not push the first fix while another exact-head reviewer is still running unless deliberately accepting that its verdict will become superseded and must be rerun.
5. Produce one deduplicated remediation matrix with finding IDs, exact reproducers, affected paths, required RED tests, and acceptance checks. One writer owns overlapping corrections.
6. After the new head is frozen, rerun every gate whose reviewed bytes or encoded contract changed; never transfer approval from the superseded SHA.

Late arrival order is not priority. Candidate identity, report integrity, and reproduced evidence decide what must be fixed.

## Recover timed-out work before restarting

1. Inspect the intended remote branch and PR for commits.
2. Classify the worker precisely: `completed`, `timed_out_with_recoverable_artifact`, or `timed_out_without_recoverable_artifact`.
3. Directly verify recovered commits; timeout status and worker self-report are not proof.
4. Require an early remote checkpoint. Split large corrections into non-overlapping branches and cherry-pick them into the original PR.
5. After creating a worktree, run later commands with that worktree as explicit `workdir`; worktree creation does not change the shell directory.

## Bounded correction loop

Absolute maximum for one stable implementation scope: three total review rounds. Every changed SHA still requires fresh independent review within that cap before merge.

One review round is one immutable candidate generation, not one reviewer invocation. Every required review kind against that candidate shares the same round number whether scheduled sequentially or concurrently; timeout replacements stay in that round. Persist the complete required-review-kind set and outcomes in a receipt keyed by lineage, round, and candidate SHA. A corrected candidate increments the round.

For Round 1, create one neutral immutable **pre-review summary** covering governing scope, acceptance criteria, intended approach, hard-to-reverse risks, tradeoffs, open questions, and planned evidence. Embed its exact closed-schema canonical JSON as `pre_review_summary_artifact` in readiness; the authority-bearing gate parses it, verifies lineage/serialization, recomputes the digest, and persists the verified artifact before dispatch. Supply that exact summary to every reviewer and keep both artifact and `pre_review_summary_digest` unchanged for the stable lineage; it is context, not advocacy or a substitute for independent review.

For Round 2 or Round 3, the fresh reviewer must receive the complete continuity packet: the same exact pre-review summary, all **prior exact review reports** and verified digests represented as cumulative `report_history` from Round 1 onward, a stable-ID **finding disposition ledger**, the **remediation change map**, the original governing contract, complete current candidate evidence, and a canonical **prior-context digest**. Fresh means independently delegated, not history-blind. Missing or mismatched history blocks dispatch. The reviewer reconciles every prior finding and records contradiction/new-finding checks. If a genuine material safety/correctness defect was reasonably discoverable earlier but missed, preserve it as a **material process escape** with `MATERIAL_PROCESS_ESCAPE`, keep the gate closed, and escalate rather than suppressing it or treating it as routine drip-fed feedback.

- **Round 1** reviews the immutable candidate comprehensively, prioritizes hard-to-reverse/high-consequence risk, follows bounded sibling instances of each defect class, and returns all independently discoverable findings in one closed correction matrix. Reversible nits do not block or create follow-up rounds.
- Add one regression test per blocking finding and apply a bounded correction.
- **Round 2** re-reviews the corrected immutable commit, dispositions the complete round-1 matrix, and actively reproduces prior attacks.
- **Round 3** is the final review for unresolved findings and correction-introduced regressions.
- Later-round new blockers are allowed only for correction-introduced changes, genuinely unavailable evidence, or material defects that could not reasonably have been found in Round 1, and must state `Why it was not discoverable in round 1: <cause>`.
- **No round 4.** If the final review finds another blocker, do not patch-and-merge and do not start another bounded cycle. Reproduce and record it, keep the candidate blocked, and escalate the complete hard-to-reverse decision, residual risk, or scope choice.
- Never merge if the exploit still reproduces, residual uncertainty is material, or exact-commit evidence is missing; escalate instead.

## Public artifact security pattern

Path allowlists and manifest hashes prove file identity, not publishability. Combine:

1. positive path/media allowlists;
2. manifest closure and digest/length checks;
3. exact semantic validation of structured JSON against canonical schemas and exact key sets;
4. provider/generic credential detection in textual outputs;
5. regression fixtures for the exact reviewer bypass;
6. an external scanner such as Gitleaks when available.

Build synthetic credential fixtures at runtime from fragments so repository scanners do not flag test literals as real leaks. Inspect scanner reports redacted, remove credential-shaped literals, and rerun to zero findings.

## Mobile containment review pattern

A clean document-level overflow check can miss clipped content when an ancestor uses `overflow: hidden`. For every newly rendered user-controlled or schema-bounded label at the minimum supported width:

1. Use a maximum-length schema-valid value with no natural break opportunities.
2. Render the exact production markup and stylesheet at the minimum supported viewport (prefer true CDP device metrics; an exact-width containing block is acceptable for a focused CSS reproduction).
3. Measure both levels:
   - document: `documentElement.scrollWidth <= innerWidth`;
   - component: child bounds remain within container bounds and `container.scrollWidth <= container.clientWidth`.
4. Inspect computed `overflow`, `overflow-wrap`, and `word-break`; a hidden container plus an out-of-bounds child is clipping even when the document has no horizontal overflow.
5. Verify keyboard focus outline remains visible and ordinary labels are unchanged.
6. Capture RED with the exact maximum-length fixture, add the smallest stable class/rule (usually block containment plus `overflow-wrap:anywhere`), rerun browser geometry, then the focused/full suites.

Do not weaken schema bounds or truncate meaningful identifiers merely to make the probe pass unless the product contract explicitly allows truncation.

## Hostile input and generated-artifact trust boundaries

A validator that accepts a caller-owned object and later rereads it is vulnerable to accessors and Proxies changing fields after validation. This is especially dangerous when generated images, exports, filenames, analytics, or public artifacts can encode private text.

1. Prefer bounded primitive JSON text at the public boundary when the producer and consumer can exchange JSON.
2. Reject objects, accessors, and Proxies before invoking traps; parse the text once into a fresh plain snapshot.
3. Freeze and validate that exact snapshot, then derive pixels, bytes, metadata, filenames, and side effects only from it. Never reread the caller.
4. Regression-test an alternating Proxy that returns safe values during validation and private/oversized values later. Assert zero traps at the corrected boundary.
5. Test malformed, oversized, duplicate-key, extra/missing-key, Unicode/surrogate, and deeply nested text as applicable.
6. For generated binary artifacts, use independent parsers/decoders, inspect signatures/chunks/checksums/dimensions, render a real sample, and search both encoded metadata and decoded content for forbidden fields.
7. Benchmark synchronous CPU, output bytes, and peak copies on constrained-device assumptions; classify bounded but heavy work as a QA risk or blocker explicitly.

A frozen output does not repair a mutable-input time-of-check/time-of-use flaw. Snapshot first, then validate and render.

## Integration verification

- Expect independently green branches to expose integration REDs where contracts meet. Preserve semantic separation instead of weakening a new contract to fit old output.
- Run targeted tests, the full canonical command, diff and clean-worktree checks, and remote SHA readback.
- For direct-load claims, test real HTTP routes in addition to router unit tests.
