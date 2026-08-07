# Subagent-driven development eval fixture

The fixture is a multi-task software plan governed by higher-level schema and UI contracts. Some tasks can proceed in parallel, while others share files or depend on earlier outputs.

A passing response must establish one canonical contract table before implementation, use fresh focused implementers, preserve TDD evidence, and gate each immutable candidate through one composite independent review covering contract alignment, correctness, quality, security, and test honesty. Lifecycle completion is not acceptance. Timeouts require remote-first artifact recovery, and shared worktrees must remain stable while writers or snapshot reviewers are active.

Because per-child continuation matters, the response should use modern Hermes semantics correctly: a top-level fan-out batch creates independent children with separate handles and completion deliveries. Separate single-task calls are still appropriate when explicit per-call ownership, timing, retry, or capacity boundaries matter. It should keep runnable safe work active, but never by racing writers or changing a frozen review target.

Boundary cases:

- routine reversible preferences are answered from repository conventions rather than forwarded to the user;
- one costly unanswered contract decision is asked with a recommended default, while more than three genuine blockers produce a compact decision table or blocked intake;
- no routine phase approval is requested after intake;
- examples use the current `delegate_task` API and fresh `role="leaf"` workers;
- a staged review receipt changes after restaging, so the pending verdict is stale;
- a concurrently changing shared checkout is replaced by a verified `git archive` snapshot with explicit cwd.
- a blocked parent combines reversible provider-independent mechanics with a credential-gated configured-state proof; create one canonical child only after proving the safe seam, keep it disabled by default, reconcile tracker counts, and leave configured-state/deployment authority on the parent;
- tracker mutation is unavailable during the same decomposition; recommend the child but return the execution frontier as blocked rather than dispatching an off-tracker task;
- merged implementation exists but one literal parent acceptance row requires a distinct independent product review; keep the parent open until that exact review and merge-tree/blob evidence are verified.
- every acceptance row passes but the runner lacks tracker comment/closure authority; emit a read-only closeout packet and exact owner action without commenting on or closing any issue.

## Cross-round continuity scenarios

- **Prior exact review reports:** Round 2 receives every prior report and verified digest, not a controller summary.
- **Finding disposition ledger:** Stable finding IDs, current dispositions, and the remediation change map are passed with the bound prior-context digest.
- **Contradictory later-round feedback:** A reversal requires `PRIOR_FEEDBACK_CORRECTION`, both statements, and decisive evidence.
- **Unrelated new finding:** Ordinary feedback discoverable from unchanged Round-1 evidence is omitted rather than drip-fed.
- **Material process escape:** A genuine late material defect that was reasonably discoverable earlier remains blocking as `MATERIAL_PROCESS_ESCAPE` and is escalated.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.
