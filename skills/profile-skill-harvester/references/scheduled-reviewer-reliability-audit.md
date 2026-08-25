# Scheduled reviewer reliability audit

Use this reference when sibling Hermes profiles appear to have slow, timing-out, or repeatedly dispatched reviewers. Diagnose the lifecycle before raising timeouts or weakening independent review.

## Evidence sources

Inspect the profile's direct operational sources, without reading credentials:

- gateway/agent logs for dispatch, child-session IDs, completion, interruption, continuation, and token counts;
- delegation summaries and attempt artifacts for exact candidate SHA and verdict;
- cron job definitions, attached skills, enabled toolsets, cadence, and output history;
- child transcripts for start/end timestamps, tool-call count, loaded skills, commands, and final report;
- tracker comments or external reports used as durable review receipts.

Correlate by `(repository, PR, exact SHA, review kind, attempt ID)`. Do not infer a reviewer timeout from a missing parent summary alone.

## Classify the failure

| Evidence | Likely failure | Corrective pattern |
|---|---|---|
| Child produced a complete verdict, but later cron runs re-review the same SHA | Async result delivery/reconciliation failure | Require a durable result sink and reconcile it before dispatch |
| Many complete negative verdicts exist for one unchanged SHA | Negative verdict mistaken for transport failure | Treat `REQUEST_CHANGES`/`FAIL` as complete; route one fixer and wait for a new SHA |
| Parent starts with very large skill/context payload and ends after continuation exhaustion | Controller context overload | Attach only one controller skill; restrict toolsets; children load role-specific skills |
| Reviewer spends most of its budget on installs or equivalent full/race/lint/stress suites | Verification duplication | Reuse trustworthy exact-SHA CI and run missing focused/adversarial probes only |
| Reviewer times out after creating useful evidence | Report closure starvation | Reserve the final 20% for an atomic durable `APPROVED`, `REQUEST_CHANGES`, or fail-closed `INCOMPLETE` report |
| Durable approval exists but CI finishes later | Approval-to-merge deadlock | Persist `merge_pending`; later use one exact-SHA approval-consuming merge-only executor with an atomic expected-head merge guard |

Measure representative child duration and tool calls, but also count duplicate durable results for the same SHA. Repeated completed reviews are usually a controller/reconciliation defect, not evidence that every reviewer timed out.

## Bounded durable protocol

1. Before dispatch, search for a structurally valid current-SHA result and a plausibly live attempt.
2. Dispatch at most one reviewer per scheduled run.
3. Require a durable sink readable by a fresh run: a stable marked tracker comment or attempt-scoped external report.
4. Bind every result to repository, PR, lineage, round, exact head SHA, base SHA, review bundle, attempt ID, required-check identities, and report digest.
5. Before spending reviewer capacity, validate a machine-readable readiness receipt bound to that same identity plus a **complete predeclared review-bundle manifest**. Ordinary work authorizes only one composite bundle; specialized bundles are named up front only for real high-risk expertise gaps.
6. Lock the receipt/manifest digest for the candidate. Reject foreign repository/PR receipts, a second manifest for the same SHA/round, arbitrary new bundles, and attempts to reset the round while keeping unchanged bytes. A corrected candidate must have a new SHA.
7. Require implementation evidence such as static analysis, focused/full tests, build, secret scan, and self-audit to be `PASS`. Reserve `PASS_OR_NOT_REQUIRED` only for a genuinely absent provider check; never use it as a general waiver.
8. Reserve the final 20% of the child budget for report closure and readback.
9. Reuse verified exact-SHA CI for broad suites; independently inspect the full diff and run only missing high-risk probes.
10. Return `INCOMPLETE` when evidence is missing. It is never approval.
11. A valid negative verdict suppresses same-SHA redispatch and routes one consolidated remediation generation in the current scheduled run.
12. Every remediation creates a new SHA and invalidates old approval. Review opportunities have no fixed round cap: if another material blocker is found, keep the candidate blocked, preserve the monotonic lineage, correct it on a new SHA, and obtain fresh exact-SHA review; never patch-and-merge unreviewed bytes.
13. A durable exact-SHA approval can be consumed later only by a narrowly scoped merge-only executor that revalidates identity, approval, checks, and branch policy, cannot edit code or waive gates, and invokes an atomic expected-head merge operation. On GitHub use `gh pr merge ... --match-head-commit APPROVED_SHA`; if no atomic final-head guard exists, do not merge.
14. Do not use GitHub auto-merge to consume an external agent verdict. Its head check occurs when auto-merge is enabled, while an authorized later push may leave the pending automatic merge armed for changed, unreviewed bytes.

### Executable gate and crash recovery

Prompt rules alone are not deduplication. Prefer a small deterministic gate stored outside candidate repositories that atomically claims `(repository, PR, lineage, round, exact SHA, bundle)`, records `IN_PROGRESS`, finalizes one terminal verdict, and emits attempt/suppression/recovery/round/runtime/token metrics.

- Write state through owner-only temporary files plus atomic replace.
- Use an exclusive lock carrying the owner PID (and process-generation evidence when practical). Recover a lock only after proving its owner is dead; malformed/ambiguous ownership stays fail-closed until a bounded stale-lock policy applies.
- An `INCOMPLETE` result permits at most one replacement whose requested scope is a subset of its declared missing evidence.
- If a reviewer process exits without a terminal report but left trustworthy probes/logs, preserve those artifacts, classify the attempt `INCOMPLETE`, consolidate every material discovered defect into one correction packet, and create one replacement SHA. Do not launch another broad review of the obsolete SHA merely to obtain nicer formatting.
- After corrections, request one composite exact-SHA re-review covering prior dispositions and regression risk. Only its terminal approval can unlock merge.

## Cron rollout

Syncing a corrected skill package does not rewrite an existing cron prompt, role launcher, completion hook, or attached-skill list. Treat the approved package and profile-local operational controls as distinct artifacts: a PR approval covers only repository bytes. Hash and independently review any launcher/prompt bytes that will be installed live, or move them into the canonical reviewed package before approval.

After package installation:

1. back up the current job definition and profile-local launcher/hook;
2. install complete approved package directories before wiring scripts that import them;
3. update the job through the Hermes cron CLI/tool, not by hand-editing scheduler files;
4. attach only the controller skill by default;
5. restrict toolsets to the controller's actual needs;
6. add readiness validation, executable claim/finalize reconciliation, one-attempt-per-run, negative-verdict deduplication, and merge-only continuation clauses to the static prompt;
7. prefer a fixed content-free completion wake plus a slower periodic fallback (for example `every 30m`) over frequent polling; callbacks only wake an idempotent reconciliation pass and never promote their own payload;
8. verify the saved job definition, installed launcher hash, cadence, and role authority boundaries;
9. run one controlled dry run and confirm a fresh run reads prior durable evidence rather than dispatching a duplicate reviewer;
10. checkpoint exact approved/merged SHA and rollout stage before any gateway restart or tool-budget boundary so an interrupted session cannot confuse prepared bytes with deployed bytes.

## Validation matrix

- Real repository eval loader accepts every changed `EVAL.yaml`; generic YAML parsing alone is insufficient.
- Same SHA + valid `REQUEST_CHANGES` results in no reviewer dispatch.
- Same SHA + live attempt results in `REVIEW_PENDING`.
- Timed-out attempt + partial report recovers evidence before a narrower replacement.
- Exact-SHA approval + pending CI persists `merge_pending`; a later merge-only executor uses an atomic expected-head guard and no duplicate reviewer.
- GitHub auto-merge remains disabled for external agent verdicts, including when an authorized writer pushes a changed head.
- Changed SHA invalidates prior approval and requires fresh independent review.
- A negative review at any round blocks merge; a corrected SHA remains review-required until approval convergence.
- Parent controller begins with only its controller skill, not the full worker/reviewer library.
