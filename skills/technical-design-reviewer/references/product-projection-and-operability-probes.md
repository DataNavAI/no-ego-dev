# Product projection and operability review probes

Use these probes when reviewing a static-first web MVP with optional APIs, reviewed content, immutable releases and serverless infrastructure.

## 1. Product promise versus public projection

Build a table for every public route/screen:

| Route/screen | Required public fields | Private governance inputs | Runtime consumer/test |
|---|---|---|---|

Flag both directions:

- Product promises a route/entity/state but the closed release schema cannot represent it.
- Public schema exports relations, receipts, ranking or evidence that no shipped screen needs.

The smallest correction may be to narrow the product promise rather than add a runtime entity graph. Private entity/relation/reviewer records may authorize selected public claims without becoming public routes or payload fields. Require the PRD, route contract, schema, compiler, client adapter, router and CloudFront rewrite allowlist to agree exactly.

## 2. Deployable artifact, not source-tree plausibility

For Lambda/serverless designs, verify the exact packaging boundary:

- deterministic bundle command and dependency closure;
- template `Handler` matches the emitted artifact layout;
- generated bundle excluded from source control unless intentionally versioned;
- artifact uploaded under an immutable digest/key;
- smoke test imports the built bundle with a complete production-shaped environment and invokes at least health plus one representative route;
- deployment records full 40-character source SHA, release ID and artifact digest.

A source import test is not a packaging test. Likewise, all test bodies printing green is not evidence if the enclosing process exits nonzero.

## 3. Static core and optional writes

Prefer a static core for read-only Learn/Challenge/Following behavior. If telemetry or feedback writes are optional:

- one operator kill switch must disable writes without breaking static journeys or read health;
- write endpoints return a controlled unavailable response;
- health identifies whether writes are enabled;
- cost/concurrency alarms and rollback can disable the optional surface independently.

## 4. Persisted content health

Do not synthesize “healthy content” from deployment configuration alone. Read a release-bound persisted health record containing release ID/digest, counts, validator status, policy identity and trusted verification time. Distinguish:

- API/runtime health;
- persisted content integrity/freshness;
- telemetry/feedback write health;
- monitoring pipeline health.

Each failure needs a distinct signal, threshold and recovery action.

## 5. Feedback work queue and SLA alerts

A feedback state machine is incomplete unless open work is queryable without a table scan.

Use a sparse work index such as:

- partition: `OPEN#<severity>`;
- sort: `<slaDueAt>#<receiptHash>`;
- remove index keys at terminal states;
- rewrite them on severity/status changes.

Derive safe initial severity from a closed public category enum; do not let anonymous users self-assign S0. Privileged operators may escalate after triage. Capture operator identity from authenticated IAM/SSO context and store a privacy-safe principal digest—not an arbitrary CLI argument.

A scheduled notifier must paginate the index, emit separate S0/S1 breached-work metrics, and feed alarms with explicit missing-data behavior, owner and runbook. CloudWatch alarm state transitions can provide deduplication, but prove the scheduler and metric path with a fault drill. Add separate throttling alarms for every table, not only telemetry.

## 6. Mixed-version release safety

For static content plus APIs, require expand/promote/contract:

1. deploy API capable of old and new release identities;
2. persist and verify new content-health identity;
3. upload immutable static assets;
4. switch the release pointer/static entry;
5. verify live static and API identity agree;
6. retain old assets/API compatibility through rollback window;
7. contract only after evidence confirms no old clients remain in scope.

Rollback must name the exact previous release pointer, API artifact and data compatibility behavior. A generic “redeploy previous stack” statement is insufficient.

## 7. External watchdog independence

For an external watchdog that emits a heartbeat into the monitored cloud, distinguish three failures:

1. the public product probe fails;
2. the watchdog process stops or cannot run;
3. the heartbeat sink, metric API, alarm evaluator, or notification path fails while public probes remain healthy.

A cloud missing-heartbeat alarm can detect (2), but cannot by itself prove detection of (3) when the sink/evaluator is the failed component. If the design claims two independent monitoring halves or detection of the cloud-monitoring path, require the watchdog's independent alert channel to transition on heartbeat-publication failure and recovery, or require a genuinely separate sink. Specify bounded failure codes, deduplication key, credentials/least privilege, redaction, owner/runbook, and a drill that fails metric publication separately from the public probe. Otherwise narrow the independence claim.

## Review output expectations

Treat these as design findings only when in review scope. Distinguish not-yet-implemented work from a contradiction where the spec claims an executable gate or current readiness. Prefer the smallest correction and record which product promise, schema, deployment artifact, persisted state or alarm proves closure.
