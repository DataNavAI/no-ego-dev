# Eval data for technical design reviewer

Static fixture for deterministic evaluation.

Negative context-firewall scenario: if the same skill is invoked from the architect/implementer/orchestrator context, or the exact design revision/repository evidence is unavailable, the only valid result is `REVIEW_DELEGATION_REQUIRED` or `BLOCKED`; it must not produce technical findings or an approval verdict. A missing or incorrect leaf role and unavailable delegation cannot be waived by user residual-risk acceptance.

The exact artifact is `.projects/launchpad/tech-specs/recommendation-service.md`, revision `tech-rec-r5`.

Approved need: after onboarding, show a solo founder the next canonical launch task. The current monolith already owns workspace state, task ranking rules, PostgreSQL persistence, a background-job runner, HTTP APIs, structured logs, metrics, health checks, CI integration tests, deploy rollback, and an operations runbook.

Draft design: add a recommendation microservice, separate database, queue, cache, event bus, duplicate recommendation state machine, feature-flag service, and a new observability vendor. The stated reason is possible future scale; no current throughput, isolation, compliance, or ownership constraint requires those boundaries. The design does not explain synchronization with canonical task completion, duplicate events, queue ordering, idempotency, partial database failure, migration/backfill, mixed-version rollout, rollback, or data recovery.

Testing currently says “add unit tests and mock all integrations.” It lacks contract, real persistence, end-to-end outcome, retry/idempotency, concurrency, migration, failure-injection, smoke, and telemetry tests. Operations currently says “watch logs.” It lacks outcome/error/latency/queue/integrity signals, health/readiness semantics, alert thresholds/owners/runbooks, synthetic CUJ checks, stuck-work detection, telemetry-loss detection, rollback triggers, and recovery verification.

A strong review must run only in a fresh delegated leaf subagent and must not edit or operate the system. It should inspect the exact revision and base architecture, then test integrity across contracts, state, data, concurrency, security, migrations, deployment, and recovery. It should actively propose the smaller viable alternative: extend the monolith's existing task-ranking module, canonical PostgreSQL state, job runner, APIs, telemetry, CI, deployment, and runbook unless measured constraints prove a new boundary is necessary.

The review must include a complexity/redundancy ledger for every new moving part, automated testability matrix with concrete behavior/failure evidence, and operability/self-monitoring matrix with signals, thresholds, alerts, owners, runbooks, and recovery checks. It should require telemetry self-checks and simulated fault verification so missing monitoring does not look healthy. Approval is impossible while duplicated state, unsupported future-scale complexity, and untestable/unoperable failure modes remain.

This is Round 1. The reviewer must surface the complete bounded architecture-defect set now, prioritizing hard-to-reverse service/data/schema/security/migration/provider/rollback decisions and ignoring reversible naming, formatting, and implementation-polish nits. The author needs one evidence-backed steering packet that addresses defect classes rather than serial symptoms. Rounds 2 and 3 may only disposition prior findings, correction regressions, genuinely unavailable evidence, or otherwise undiscoverable material defects and must explain any new blocker. No Round 4 is permitted for this stable design scope.

Negative scenarios: Round 2 must reject drip-fed ordinary architecture feedback that was discoverable from the Round 1 design and is unrelated to corrections or new evidence. A Round 4 request returns `ITERATION_LIMIT_REACHED` before substantive review; missing exact revision or lineage returns `BLOCKED`.

Additional continuity scenarios:

- **Missing prior-round context:** Round 2 lacks the prior exact review reports, finding disposition ledger, remediation change map, or prior-context digest; return `BLOCKED_MISSING_PRIOR_CONTEXT` without substantive review.
- **Contradictory later-round feedback:** Round 2 demands the opposite of a resolved Round 1 direction without decisive new evidence; reject the contradiction unless it is labeled `PRIOR_FEEDBACK_CORRECTION` with both statements and proof.
- **Unrelated new finding:** Round 2 raises a material issue from unchanged evidence that was independently discoverable in Round 1 and unrelated to remediation; omit it rather than drip-feed another correction cycle.
