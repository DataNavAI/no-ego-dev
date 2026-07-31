# Subagent-driven development eval fixture

The fixture is a multi-task software plan governed by higher-level schema and UI contracts. Some tasks can proceed in parallel, while others share files or depend on earlier outputs.

A passing response must establish one canonical contract table before implementation, use fresh focused implementers, preserve TDD evidence, and gate each immutable candidate through specification then quality review. Lifecycle completion is not acceptance. Timeouts require remote-first artifact recovery, and shared worktrees must remain stable while writers or snapshot reviewers are active.

Because per-child continuation matters, the response should use separate single-task delegations instead of assuming a fan-out batch produces first-finisher callbacks. It should keep runnable safe work active, but never by racing writers or changing a frozen review target.
