# NED CLI Release and Operations Runbook

## Environments

This is a user-installed CLI, not a continuously hosted application.

- Staging: GitHub branch/PR CI plus unpublished npm tarball installed into a temporary prefix.
- Production: public npm package `no-ego-dev` and GitHub release tag.
- Provisioned user runtime: private Daytona sandbox in target `us` by default, or `DAYTONA_TARGET=eu`.

## Release flow

1. Run `npm ci`, `npm test`, `npm audit --omit=dev`, `npm pack --dry-run --json`.
2. Install the real tarball into a fresh prefix and run `ned create --dry-run`.
3. Run the live Daytona test plan on macOS and Linux for the exact tarball.
4. Merge a green PR.
5. Publish with npm provenance from the tagged release once npm auth is configured.
6. Reinstall from the registry and repeat dry-run plus one live create/destroy smoke.

## Required credentials

- `DAYTONA_API_KEY`: local process/secret store only; scopes `write:sandboxes`, `delete:sandboxes`, `manage:secrets`.
- OpenRouter: browser PKCE; no stored publisher key required.
- npm publisher authorization: official npm web login or GitHub Actions trusted publishing; do not use a token in chat.
- GitHub: authenticated `gh` CLI with repo/workflow access.

## Health

`ned doctor` starts the workspace if necessary and verifies:

1. Daytona sandbox reachability.
2. Pinned Hermes executable.
3. Installed `ned` profile.
4. Successful OpenRouter-backed inference.

## Logs and privacy

Daytona command output is available through the CLI. The CLI must never print credential values. Anonymous telemetry is not shipped in 0.2.0 because no user-owned collector or privacy policy is configured; local command failures are user-visible only.

## Cost visibility

- Daytona compute while running; automatic stop after 15 idle minutes.
- Daytona disk while stopped; automatic archive after seven idle days.
- Archived sandboxes retain restorable state without active sandbox billing according to Daytona documentation.
- OpenRouter inference billed to the user-controlled OAuth key.
- Check current Daytona pricing and account quotas before public launch; limits and pricing can change.

## Rollback

- npm: deprecate the bad version, republish a fixed patch version, and update the `latest` dist-tag.
- GitHub: revert the merge and tag a patch release.
- User workspace: `ned reset` reapplies the bundled profile; `ned destroy --yes` removes the remote sandbox.
- Failed creation automatically attempts remote deletion and does not save local state.

## Current release blockers

- npm publisher authorization is not configured; registry publication is out of scope for this staging milestone.
- Analytics collector/privacy policy is not configured; anonymous opt-in telemetry remains deferred.

## Browser `ned create` AWS staging

Status: implementation checkpoint only; deployment is blocked and production is prohibited.

- Account/region: `061039762362`, `us-east-1`.
- New isolated prefix: `noegodev-ned-staging`; existing `noegodev-site-staging` and `noegodev-site` are inspected but must not be mutated.
- Architecture/spec: `docs/ned-create/PRODUCTION_ADAPTER_TECH_SPEC.md`.
- Infrastructure: `infra/ned-create-staging.yaml` (App Runner, Cognito, DynamoDB TTL/PITR, KMS, Secrets Manager, least-privilege runtime role, CloudWatch alarms).
- Image repository: `061039762362.dkr.ecr.us-east-1.amazonaws.com/noegodev-ned-staging`; immutable source-SHA tags only.
- Deploy stack: `aws cloudformation deploy --region us-east-1 --stack-name noegodev-ned-staging --template-file infra/ned-create-staging.yaml --capabilities CAPABILITY_NAMED_IAM --parameter-overrides ImageIdentifier=<immutable-uri> DeploymentRevision=<40-char-sha> PublicOrigin=<https-origin>`.
- Rollback: update the same stack with the previous recorded immutable image URI/revision, wait for `UPDATE_COMPLETE`, then verify `/healthz` reports that exact revision and dependency readiness.
- Delete: first destroy every product workspace and verify Daytona zero readback; verify zero owned model secrets; then remove App Runner/alarms, test identity/pool, DynamoDB after export approval, retained secrets, ECR, and finally schedule KMS deletion. Never delete retained data before provider cleanup is proven.

Required runtime secret names only: `DAYTONA_API_KEY` is injected from `noegodev-ned-staging/daytona`; user model credentials are owner-scoped Secrets Manager records under `noegodev-ned-staging/model/*`. Staging test password/recovery material belongs only in macOS Keychain service `noegodev-ned-staging/test-user`, never repository/chat/logs/argv.

Monitoring: `/healthz`; App Runner 5xx and active-instance metrics; custom `CleanupPending`, sweep failure, quota rejection, job outcome, provider error-class metrics. Alarm destinations are intentionally not claimed until configured and verified. Cost visibility uses tags `Project=noegodev-ned`, `Environment=staging`; App Runner minimum instance is expected to dominate monthly staging cost.

Current blockers discovered 2026-08-07:

1. The direct Anthropic credential available to this profile failed a harmless provider authentication probe with HTTP 401. The only other authenticated credential is OpenRouter, whose browser contract requires delegated PKCE and therefore may not be silently reused as an API-key fallback. A valid direct OpenAI/Anthropic/Gemini server-side key or completed supported delegated flow is required before any Daytona resource is created.
2. A recoverable Cognito test identity cannot be created safely without the intended staging email address. The generated password/recovery secret will be written directly to Keychain after that non-secret identity is provided.
3. Fresh independent exact-candidate review is required before staging promotion/merge; this mission explicitly allows only one worker, so self-review cannot satisfy that gate.

Verified access boundary: principal `arn:aws:iam::061039762362:user/devbot`; IAM policy simulation returned allowed for required App Runner/ECR create/update/delete/push, named-role create/policy/PassRole, Cognito create/admin, DynamoDB create/TTL/data, Secrets Manager, KMS, CloudWatch, EventBridge/Scheduler actions. A real CloudFormation change set remains the required pre-mutation proof for the exact template and roles.
