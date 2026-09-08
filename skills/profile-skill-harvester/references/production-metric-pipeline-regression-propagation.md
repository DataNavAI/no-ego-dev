# Production Metric-Pipeline Regression Propagation

Use this reference when a requested policy says production metric collection must never silently break.

## Applicability

Apply to every skill that can plan, implement, delegate, review, test, deploy, or template a production-service change. Do not limit the update to skills whose names contain `metrics`, `observability`, or `devops`.

Typical surface:

- MVP/product/project planning;
- architecture and technical design review;
- coder/implementer and delegated-development workflows;
- DevOps, QA, and release gates;
- PRD/product review;
- domain implementers that can ship a service;
- plan, issue, launch, and completion templates;
- each package's `EVAL*.yaml`, fixtures, and nested references.

## Universal invariant

Every production-service plan must contain a release-blocking task that adds or updates automated regression coverage for the metric-collection pipeline. A user may change product scope, but cannot waive the evidence required to claim the production metric path works.

The planned tests must prove the full chain, as applicable:

1. emitter/event generation;
2. schema, labels, identity/session attribution, and cardinality;
3. transport, buffering, retry, deduplication, and delayed delivery;
4. collector/exporter or scrape boundary;
5. ingestion and durable storage;
6. aggregation and query semantics;
7. dashboard/report/alert readback;
8. missing, malformed, duplicate, and delayed signal detection;
9. end-to-end continuity through the production-equivalent path.

A unit test that only proves the emitter called a metrics API is insufficient. A manual dashboard glance is useful evidence but cannot replace automated regression coverage.

## Harvest workflow

1. **Inventory the whole behavior surface before editing.** Search direct roles, orchestrators, templates, evals, fixtures, and references for planning/test/observability language and waiver paths.
2. **Add a failing cross-package contract test first.** Enumerate every in-scope package and assert the mandatory task, full-chain stages, missing-signal behavior, release blocker, and EVAL expectation.
3. **Patch all in-scope packages together.** Keep role-specific workflow, but give every role the same non-waivable invariant.
4. **Materialize the requirement in templates.** A prose rule is incomplete when generated plans can omit the task or launch blocker.
5. **Remove semantic escapes.** Reject wording such as “unless explicitly authorized,” “manual verification is enough,” analytics-only lifecycle exceptions, or test waivers that can apply to the production metric pipeline.
6. **Distinguish operational metrics from optional product analytics.** An MVP may defer broad product analytics or dashboards, but a production service still needs regression evidence for the operational metric path it relies on.
7. **Update behavioral EVALs.** Require plans/reviews to name emission, transport, ingestion, storage, aggregation/readback, missing-signal detection, and release-blocking behavior.
8. **Run focused and repository-wide tests.** If a broad behavioral EVAL fails only unrelated legacy criteria, record that honestly; do not claim the metric criterion failed when its judge feedback shows otherwise.
9. **Freeze and re-review the exact corrected SHA.** Any correction invalidates prior approval.

## Review probes

A fresh reviewer should try to find:

- a planning or delivery skill omitted from the propagation list;
- a template that can still generate a plan without the metric task;
- a lifecycle branch that calls operational telemetry optional;
- a user/owner waiver for required regression evidence;
- tests that stop at emission and never read from the destination;
- missing negative cases for dropped, duplicated, malformed, or delayed signals;
- EVAL prose updated without deterministic cross-package enforcement.

Treat any surviving path that permits a production release with an unverified metric pipeline as a material blocker.