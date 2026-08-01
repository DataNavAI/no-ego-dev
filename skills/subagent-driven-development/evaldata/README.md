# Subagent-driven development eval fixture

The fixture is a multi-task software plan governed by higher-level schema and UI contracts. Some tasks can proceed in parallel, while others share files or depend on earlier outputs.

A passing response must establish one canonical contract table before implementation, use fresh focused implementers, preserve TDD evidence, and gate each immutable candidate through specification then quality review. Lifecycle completion is not acceptance. Timeouts require remote-first artifact recovery, and shared worktrees must remain stable while writers or snapshot reviewers are active.

Because per-child continuation matters, the response should use modern Hermes semantics correctly: a top-level fan-out batch creates independent children with separate handles and completion deliveries. Separate single-task calls are still appropriate when explicit per-call ownership, timing, retry, or capacity boundaries matter. It should keep runnable safe work active, but never by racing writers or changing a frozen review target.

Boundary cases:

- routine reversible preferences are answered from repository conventions rather than forwarded to the user;
- one costly unanswered contract decision is asked with a recommended default, while more than three genuine blockers produce a compact decision table or blocked intake;
- no routine phase approval is requested after intake;
- examples use the current `delegate_task` API and fresh `role="leaf"` workers;
- a staged review receipt changes after restaging, so the pending verdict is stale;
- a concurrently changing shared checkout is replaced by a verified `git archive` snapshot with explicit cwd.
