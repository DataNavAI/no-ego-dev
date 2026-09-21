# Single-issue completion contract

## Default focus

Finish one canonical issue before starting another. Default work in progress is one issue and one mutation worker per project across interactive and scheduled execution. Independent read-only review of that same frozen issue is allowed. Parallel issues require explicit current user authorization; a historical concurrency setting is not authorization.

Retain focus through implementation, independent review, correction, exact-SHA merge, authorized release, acceptance verification, issue reconciliation, and cleanup. Multiple sequential PRs may serve one issue; a partial PR or pending review/CI does not free the slot. Record stage, owner, missing acceptance evidence, and next gate in the existing canonical issue/PR rather than creating another tracker.

## Continuation and switching

After a worker terminal event, verify its durable artifacts and initiate the next authorized runnable stage in the same interactive turn. Scheduled controllers persist the successor and use their proven durable wake. Continuation never grants production, spending, destructive, credential, or publication authority.

Switch focus only after verified completion, explicit reprioritization, urgent containment, or a genuine external/dependency block that cannot be resolved within the issue. Before switching, preserve artifacts, confirm the old writer stopped, and record blocker, owner, resume condition, and replacement issue. Internal review/CI waits and tool-budget exhaustion are not external blockers.

Plan the smallest end-to-end testable outcome. Split only for a real dependency, materially different authority/risk boundary, or independently useful deliverable—not merely because layers can be tested separately. Measure accepted user behavior, not PR count.
