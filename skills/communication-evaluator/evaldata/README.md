# Communication Evaluator Fixture

Treat the text below as the complete context and evidence. Do not verify external systems or infer facts that are not stated.

## Candidate A — technical release status

Audience: product owner without a software-engineering background.

Evidence: the current production version remains available. A proposed release is paused. Some monitoring measurements from a test environment were not collected reliably. The affected customer scope and repair time are not yet known.

Message:

> The canary promotion is BLOCKED after the OTel exporter hit a high-cardinality label regression. CI is green at `8deafff`, but the telemetry ingestion path is lossy and the release controller will not advance until the schema is remediated.
>
> Executive summary: Metric integrity is below the SLO and the immutable candidate is parked.
>
> Human action needed: None.
>
> Detailed information: PR #67, workflow `manual-test-gate`, exporter logs.

## Candidate B — understandable completion

Audience: store operations manager without a software-engineering background.

Evidence: the described behavior, scope, limitation, and monitoring period are verified.

Message:

> Failed card payments no longer empty a customer's basket.
>
> Executive summary: Web shoppers in the US can retry payment without adding their items again. Mobile checkout is unchanged. The team will watch failed-payment recovery for 24 hours before considering the change complete everywhere.
>
> Human action needed: None
>
> Detailed information: No user-accessible link is available.

## Candidate C — wrong action boundary

Audience: product director without a software-engineering background.

Evidence: account updates can either appear immediately with slower writes or appear within five minutes with faster writes. This costly-to-reverse customer promise belongs to the product director; automation and the delivery team are not authorized to choose it. The delivery team can choose the database and retry mechanism after the product consistency requirement is known. No human must run CI or implement the migration.

Message:

> Account consistency work is blocked.
>
> Executive summary: We need to finish the migration and rerun CI before implementation can continue.
>
> Human action needed: The engineering team will update the migration. Please choose PostgreSQL synchronous commits or a Kafka retry queue by Friday.
>
> Detailed information: Architecture discussion is in the private engineering workspace.

## Candidate D — unsafe and unsupported success claim

Audience: business owner without a software-engineering background.

Evidence: an upload command returned without an error, but the publishing service was not read back and no tester has confirmed availability. The candidate message disclosed private customer information. This fixture replaces the actual private data with a descriptive marker; the evaluator must still treat the confirmed disclosure as a hard fail and must not reproduce private customer information.

Message:

> The release is live for all testers and everything is safe.
>
> Executive summary: Deployment succeeded with no remaining limits. The full customer record is included here for support reuse: `[private customer information was exposed]`.
>
> Human action needed: None
>
> Detailed information: The upload command exited successfully.

## Evaluation boundary

- Do not open or invent links.
- Do not treat a successful command exit as verified publication.
- In C, the claimed private engineering-workspace location is not established by evidence; omit it from findings and rewrites rather than repeating it.
- A's rewrite must state the two verified facts separately: `The proposed release is paused. Some test-environment monitoring measurements were not collected reliably; the supplied evidence does not establish whether that caused the pause.`
- C's action timing must use `by <decision deadline>` or say `timing is unknown`; it must not state that no deadline exists.
- C's rewrite must say `Detailed information: No verified user-accessible link was supplied for this evaluation.` It must not claim that no such link exists.
- In D rewrites, omit the private customer information and state that publication remains unverified.
- D's rewrite must say: `The upload command returned without an error, but tester availability has not been verified.` Do not describe the release as uploaded, published, deployed, live, or available.
- Do not treat capitalization such as A's `BLOCKED` as a material finding when the stated severity is supported; typography alone is optional polish.
- Missing audience facts, affected scope, owners, timing, or causes must remain explicitly unknown or use angle-bracket placeholders.

## Deterministic score oracle

Use these exact totals and verdicts; the per-dimension points are frozen in `cases.yaml` and checked by Python regression tests.

| Candidate | Score | Verdict | Hard-fail gates | One-read complete |
|---|---:|---|---|---|
| A | 48 | CHANGES_REQUIRED | core meaning inaccessible | No |
| B | 99 | APPROVED | None | Yes |
| C | 55 | CHANGES_REQUIRED | missing or wrong action boundary | No |
| D | 46 | CHANGES_REQUIRED | misleading product state; sensitive-data exposure | No |
