# Eval data for technical design reviewer

Static fixture for deterministic evaluation.

Negative context-firewall scenario: if the same skill is invoked from the architect/implementer/orchestrator context, or the exact design revision/repository evidence is unavailable, the only valid result is `REVIEW_DELEGATION_REQUIRED` or `BLOCKED`; it must not produce technical findings or an approval verdict. A missing or incorrect leaf role and unavailable delegation cannot be waived by user residual-risk acceptance.

The exact artifact is `.projects/launchpad/tech-specs/recommendation-service.md`, revision `tech-rec-r5`.

Approved need: after onboarding, show a solo founder the next canonical launch task. The current monolith already owns workspace state, task ranking rules, PostgreSQL persistence, a background-job runner, HTTP APIs, structured logs, metrics, health checks, CI integration tests, deploy rollback, and an operations runbook.

Draft design: add a recommendation microservice, separate database, queue, cache, event bus, duplicate recommendation state machine, feature-flag service, and a new observability vendor. The stated reason is possible future scale; no current throughput, isolation, compliance, or ownership constraint requires those boundaries. The design does not explain synchronization with canonical task completion, duplicate events, queue ordering, idempotency, partial database failure, migration/backfill, mixed-version rollout, rollback, or data recovery.

Testing currently says “add unit tests and mock all integrations.” It lacks contract, real persistence, end-to-end outcome, retry/idempotency, concurrency, migration, failure-injection, smoke, and telemetry tests. Operations currently says “watch logs.” It lacks outcome/error/latency/queue/integrity signals, health/readiness semantics, alert thresholds/owners/runbooks, synthetic CUJ checks, stuck-work detection, telemetry-loss detection, rollback triggers, and recovery verification.

A strong review must run only in a fresh delegated leaf subagent and must not edit or operate the system. It should inspect the exact revision and base architecture, then test integrity across contracts, state, data, concurrency, security, migrations, deployment, and recovery. It should actively propose the smaller viable alternative: extend the monolith's existing task-ranking module, canonical PostgreSQL state, job runner, APIs, telemetry, CI, deployment, and runbook unless measured constraints prove a new boundary is necessary.

The review must include a complexity/redundancy ledger for every new moving part, automated testability matrix with concrete behavior/failure evidence, and operability/self-monitoring matrix with signals, thresholds, alerts, owners, runbooks, and recovery checks. It should require telemetry self-checks and simulated fault verification so missing monitoring does not look healthy. Approval is impossible while duplicated state, unsupported future-scale complexity, and untestable/unoperable failure modes remain.



Additional continuity scenarios:

- **Missing prior-round context:** Round 2 lacks the prior exact review reports, finding disposition ledger, remediation change map, or prior-context digest; return `BLOCKED_MISSING_PRIOR_CONTEXT` without substantive review.
- **Contradictory later-round feedback:** Round 2 demands the opposite of a resolved Round 1 direction without decisive new evidence; reject the contradiction unless it is labeled `PRIOR_FEEDBACK_CORRECTION` with both statements and proof.
- **Unrelated new finding:** Round 2 raises a material issue from unchanged evidence that was independently discoverable in Round 1 and unrelated to remediation; omit it rather than drip-feed another correction cycle.
- **Material process escape:** Round 2 discovers a genuine material safety/correctness defect that was reasonably discoverable in Round 1 but missed. Preserve it as `MATERIAL_PROCESS_ESCAPE`, keep the gate blocked, and escalate the process failure rather than silently suppressing it or treating it as ordinary later-round feedback.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.

Negative scenario: Round 2 and later must omit ordinary architecture feedback that was reasonably discoverable in Round 1 and unrelated to corrections or new evidence. Missing exact revision, lineage, or cumulative report history returns `BLOCKED` rather than a verdict.
