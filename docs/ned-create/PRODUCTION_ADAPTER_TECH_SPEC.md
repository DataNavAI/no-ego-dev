# Production adapter and AWS staging technical specification

Status: IMPLEMENTING — staging only; production promotion prohibited
Revision basis: merged PR #27 at `15627c8776a3001ca97831767479136f06807bd2`
Region/account: AWS `us-east-1`, account `061039762362`

## Smallest sustainable architecture

A separate `noegodev-ned-staging-*` stack uses one public App Runner service, one Cognito user pool/client, one DynamoDB lifecycle table, Secrets Manager encrypted with a staging KMS key, and CloudWatch logs/metrics/alarms. App Runner stays at one minimum instance for this staging slice. The application owns a one-minute durable sweeper loop; DynamoDB TTL is delayed garbage collection, never the cleanup authority. Existing `noegodev-site-staging` and `noegodev-site` are unrelated static-site services and are not mutated.

Cognito manages email/password identity and account recovery for the single staging tester. The browser sends credentials only in an HTTPS POST body; the server verifies the Cognito ID token and then issues the existing Secure/HttpOnly/SameSite=Strict owner-session cookie. This avoids falsely claiming Google/GitHub SSO. Upgrade path: a reviewed Cognito federation/OIDC adapter with the same owner identity contract.

## Runtime boundaries

- `CognitoIdentityAdapter.authenticate(request, body)` accepts exactly bounded email/password credentials and returns verified `sub` plus display email.
- `DynamoLifecycleStore.loadAll/save/delete` stores non-secret session, job, idempotency, cleanup, lease, quota, and tombstone state. Conditional writes/transactions provide per-user single-flight and restart-safe admission.
- `SecretsManagerVault.put/delete/readForJob` stores credentials and encrypted transient job payloads under the staging prefix with KMS and owner tags. Values never enter URLs, browser storage, logs, traces, analytics, argv, source, fixtures, or screenshots.
- `DaytonaJobService.create/get/cancel` is a typed allowlist only: create, first request, resume, destroy. It retains exact non-secret workspace/secret IDs for compensation and tombstones destroy only after direct provider absence plus secret revocation.
- A one-minute sweeper retries expired sessions and `cleanup_pending`; stale pending work emits a CloudWatch metric and alarm. Provider cleanup always runs in `finally`; failed direct deletion remains a durable cleanup task.

## State, ordering, and quotas

Partition keys separate `SESSION`, `JOB`, `IDEMPOTENCY`, `QUOTA`, and `CLEANUP` records. Jobs transition queued → running → terminal through conditional versions. One active mutation per user/session is reserved before a provider call. Idempotency receipts survive restart. Destroy writes cleanup intent first, verifies Daytona deletion and credential revocation, then writes the tombstone and clears readiness. Daily job quota and active-session quota fail closed; no generic command or caller-selected host/model/environment exists.

## Monitoring, rollback, cost, deletion

Health reports revision and dependency readiness without identifiers. Metrics: request/job outcomes, latency, quota rejection, cleanup pending/age, sweeper failure, provider error class, and secret-revocation failure. Alarms cover 5xx, failed sweeps, stale cleanup, and no healthy App Runner instance. Logs are structured and allowlisted.

Rollback pins App Runner to the prior immutable ECR digest, then verifies `/healthz` revision and dependency readiness. Data is backward-compatible; rollback never deletes the table or secrets. Staging deletion order: disable service, run/verify sweeper and Daytona zero readback, delete test user, App Runner, schedules/alarms, secrets, table, Cognito pool, ECR images/repository, then KMS key after its waiting period.

Budget expectation: App Runner minimum instance dominates; DynamoDB on-demand, Cognito one user, low-volume Secrets Manager/KMS, ECR, and CloudWatch remain small but non-zero. Tag every resource `Project=noegodev-ned`, `Environment=staging`; inspect Cost Explorer after allocation-tag propagation.

## Release gates

Startup fails closed unless identity, lifecycle persistence, sweeper, alarms/metrics, quotas, Daytona, and one model adapter authenticate. Exact-candidate desktop and mobile web must be PASS in the supported-interface registry. Required event taxonomy: `web_setup_started`, `compute_authorization_completed`, `model_authorization_completed`, `instance_create_started`, activation `instance_activation_completed`, `instance_create_failed`, primary journey completion `browser_request_completed`, `instance_resumed`, `instance_repair_completed`, `instance_destroyed`. Events contain stage/result classes only.

Staging promotion requires immutable image digest/revision, canonical checks, full create/inference/stop/resume/inference/destroy lifecycle, direct Daytona and secret zero-orphan readback, safely injected cleanup retry, backend metric datapoints and evaluated alarms, rollback test, and fresh independent exact-candidate review. This mission has one worker, so merge and production promotion remain blocked pending that review.
