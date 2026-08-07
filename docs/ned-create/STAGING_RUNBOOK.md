# `ned create` AWS staging runbook

Status: implementation checkpoint; deployment blocked; production prohibited.

## Scope and isolation

- Account/region: `061039762362`, `us-east-1`.
- New prefix: `noegodev-ned-staging`.
- Do not mutate existing `noegodev-site-staging` or `noegodev-site` services.
- Infrastructure: `infra/ned-create-staging.yaml`.
- ECR: `061039762362.dkr.ecr.us-east-1.amazonaws.com/noegodev-ned-staging`, immutable 40-character source-SHA tags only.

## Deploy and rollback

Validate with `aws cloudformation validate-template --region us-east-1 --template-body file://infra/ned-create-staging.yaml`.

Deploy only a committed image with:

`aws cloudformation deploy --region us-east-1 --stack-name noegodev-ned-staging --template-file infra/ned-create-staging.yaml --capabilities CAPABILITY_NAMED_IAM --parameter-overrides ImageIdentifier=<immutable-uri> DeploymentRevision=<40-char-sha> PublicOrigin=<https-origin>`

Rollback by applying the previous recorded immutable image URI/revision, waiting for `UPDATE_COMPLETE`, and verifying `/healthz` reports that exact revision plus ready identity, lifecycle store, sweeper, secrets, quota, metrics, and adapters.

## Secrets and identity

App Runner receives `DAYTONA_API_KEY` directly from `noegodev-ned-staging/daytona`; user model credentials are owner-scoped Secrets Manager records below `noegodev-ned-staging/model/*`. Never place either in files, URLs, browser storage, logs, traces, analytics, argv, or screenshots. Store the generated staging test password/recovery material only in macOS Keychain service `noegodev-ned-staging/test-user`.

Cognito provides email identity, verified-email recovery, optional TOTP MFA, 15-minute tokens, one-day refresh tokens, anti-enumeration, and admin-only staging user creation. Direct email/password POST is an interim Cognito-managed flow; upgrade to provider-neutral OIDC authorization-code-with-PKCE when callback handling can satisfy the no-code-in-URL/log contract.

## Monitoring, cost, and deletion

Verify `/healthz`, App Runner 5xx/active-instance datapoints, custom `CleanupPending`, sweep failure, quota rejection, job outcome, and provider error-class datapoints. Alarm destinations must be configured and tested before promotion. Cost allocation tags are `Project=noegodev-ned` and `Environment=staging`; the continuously available App Runner instance is expected to dominate staging cost.

Delete in this order: destroy exact product workspaces; verify Daytona zero-resource readback; verify zero owner model secrets; remove App Runner/alarms; remove test identity/pool; export/approve deletion of retained DynamoDB; remove retained secrets/ECR; schedule KMS deletion last. Keep durable cleanup tasks until provider readback reaches zero.

## Current blockers (2026-08-07)

1. The direct Anthropic credential failed a harmless auth probe with HTTP 401. OpenRouter authenticated, but its browser contract requires delegated PKCE and it cannot be silently reused as an API-key fallback. Supply a valid direct OpenAI/Anthropic/Gemini server-side key or complete a supported delegated flow before any Daytona resource is created.
2. A recoverable Cognito test identity needs the intended staging email address. The generated password/recovery secret will go directly to Keychain after the non-secret email is supplied.
3. Fresh independent exact-candidate review is mandatory before staging promotion or merge. This mission's single-worker constraint means self-review cannot satisfy that gate.

The AWS principal is `arn:aws:iam::061039762362:user/devbot`. Policy simulation allowed the required App Runner/ECR deployment, named-role/PassRole, Cognito, DynamoDB, Secrets Manager/KMS, CloudWatch, and Scheduler action families. A CloudFormation change set is still the required exact-resource pre-mutation check.
