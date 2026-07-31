# Reusable Review Service Security Audit

Use this matrix for browser plugin + private API + agent CLI + cloud deployment reviews.

## Credential destination confinement

A syntactically clean HTTPS URL is not an authorization boundary. Trace environment selection through every override into both access redemption and privileged API requests.

Probe production with an attacker-controlled clean HTTPS origin and a capture opener/server. Require production credentials to remain bound to the canonical production origin; staging/test overrides must not silently apply to production. Capture both URL path credentials and privileged headers.

## Migration completion receipts

Treat migration receipt publication as a transaction. For each uploaded record, validate before advancing:

- HTTP status and exact response envelope;
- response schema;
- returned comment identity and tenant/mock identity;
- immutable request fields;
- persisted disposition semantics.

Probe `200 {}`, wrong-comment success, mismatched immutable fields, malformed JSON, lost response, receipt-write failure, and a **minimal matching subset** that includes the obvious identity/request fields but omits required server fields such as timestamps, nullable disposition fields, and activity history. Validate exact own-key sets recursively for both envelope and returned record; checking only the fields used by the UI can falsely publish a receipt for a malformed success. A malformed success must retain pending state, write no receipt, and leave initialization usable. Do not accept “2xx” or a matching field subset as confirmation.

Require browser migration prevalidation to be semantically equivalent to the server validator, not merely regex-shaped. Probe impossible calendar timestamps, stale/future timestamps, encoded routes that exceed the server length bound, and viewport values outside the API range. One API-invalid legacy record must be rejected or skipped according to policy before transmission; it must not pause a sequential uploader and strand later recoverable records.

Probe every accepted identifier against JavaScript special property names, especially `__proto__`, `constructor`, and `prototype`. A receipt mapping built with `{}` plus `mapping[id] = value` can silently omit `__proto__` while still publishing a success receipt and deleting pending state. Use `Object.create(null)` or a `Map` converted through an own-key-safe representation, then verify the serialized receipt contains an own mapping entry for every confirmed record before removing pending state.

For agent mutation clients, classify **valid JSON with the wrong success schema** as uncertain just like malformed JSON, timeout, connection loss, and 5xx. Reproduce both branches: (1) matching authoritative readback accepts the committed result; (2) unchanged readback triggers exactly one byte-identical retry and an unconditional final strongly consistent readback. A client that parses `200 {}` and then merely fails without the required retry violates recovery even if it never reports false success.

## Deployment-role privilege escalation

Least-privilege review must inspect permissions *the deployment role can grant*, not only resources it can directly operate. A role with `iam:PutRolePolicy`/`AttachRolePolicy` plus code-update permission can expand an allowed runtime role and execute through that workload.

Require a permissions boundary or equivalent policy constraint that caps delegated runtime privileges. Also inspect wildcard API Gateway/CloudFront permissions for account-wide blast radius where resource-level scoping is supported.

Do not stop at whether GitHub or another CI principal can assume the CloudFormation execution role directly. Trace what attacker-controlled templates can make the deployment service do through each allowed named stack. `Resource: '*'` API Gateway mutations can let a permitted stack create routes or integrations against unrelated existing API IDs; broad CloudFront update/delete grants can similarly exceed the intended product boundary. Scope supported actions/resources to named distributions, functions, APIs, policies, and roles, and document the narrow create-time wildcard exceptions that the provider genuinely requires.

## Exact committed release closure

Review the immutable Git tree, not a developer workspace that may contain generated but untracked output. From a clean `git archive HEAD` or equivalent materialization:

1. enumerate every required generated shared asset, configuration object, and manifest evidence field with `git ls-files`/object reads;
2. run the same verification command used by CI before deployment;
3. confirm the deployment workflow does not rely on an uncommitted prior local build;
4. trace the production manifest pin into the committed site and verify the real integration script/config and migration allowlist are present, rather than accepting only synthetic builder tests.

A committed verifier that fails because required shared assets are absent is a release blocker even when unit tests for generating those assets pass. Missing production integration and missing migration manifest keys are separate from generator correctness and must be checked on the shipped snapshot.

## Lifecycle and recovery closure

Trace operational requirements into shipped artifacts, not just design prose:

- reusable agent/NED skill or equivalent procedure exists;
- backlog checks occur at required lifecycle points;
- teardown requires complete export and API disablement;
- retained resource names are recorded;
- redeploy documents CloudFormation resource import or explicit data export/import;
- rollback never applies a template that drops retained logical resources without a forward-recovery procedure.

Search the immutable tree for the actual skill/runbook artifacts. A normative specification does not substitute for an executable or discoverable operating procedure.

## Disposable adversarial probes

Run probes in a disposable exact snapshot. If a probe intentionally edits copied tests or is expected to fail, restore/delete those files before the final verdict and rerun the canonical verification command so automation does not treat probe mutations as stale product verification. Preserve the failing probe output separately as finding evidence.