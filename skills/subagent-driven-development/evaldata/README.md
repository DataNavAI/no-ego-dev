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

## Cross-round continuity scenarios

- **Prior exact review reports:** Round 2 receives every prior report and verified digest, not a controller summary.
- **Finding disposition ledger:** Stable finding IDs, current dispositions, and the remediation change map are passed with the bound prior-context digest.
- **Contradictory later-round feedback:** A reversal requires `PRIOR_FEEDBACK_CORRECTION`, both statements, and decisive evidence.
- **Unrelated new finding:** Ordinary feedback discoverable from unchanged Round-1 evidence is omitted rather than drip-fed.
- **Material process escape:** A genuine late material defect that was reasonably discoverable earlier remains blocking as `MATERIAL_PROCESS_ESCAPE` and is escalated.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** Any round lacks the exact digest-bound neutral pre-review summary, or its digest changes inside the stable lineage; block before substantive review.
