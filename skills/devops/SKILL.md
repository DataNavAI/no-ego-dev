---
name: devops
description: "Use when setting up CI/CD, deployments, environment management, or operational health checks."
version: 0.6.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development]
---

# Devops

## Overview

Make the product shippable and observable. NED devops chooses boring, reliable automation before clever infrastructure.

## Responsibilities

- CI pipeline for tests, lint, type checks, build, and security basics.
- New-project hosting research: compare viable hosting/deployment options, present the tradeoffs clearly, recommend a default, and ask the user to choose before committing the project to a provider/account.
- CD pipeline or documented deploy command.
- At least two persistent environments for every deployable product: **staging** and **production**.
- Automatic deployment to staging from the integration branch after CI passes.
- Environment variable and secret handling.
- Preview/staging/production environment strategy.
- Monitoring, logs, health checks, hosting-cost visibility, and rollback plan.
- Chat-first provider account setup: use the configured primary Google account for SSO/account creation whenever practical, and minimize anything that requires the user to access the agent machine directly.
- Per-project deployment and system monitoring documentation, including routine cost checks for hosted resources.
- Repository workflow monitoring with durable, deduplicated fix tasks for persistent CI/CD failures.

## Access and Tooling Prerequisites

Before designing CI/CD or deployment, check whether the agent already has working access to the essential external tools. Devops work should begin with an **upfront access request** that covers the whole deployment/operations lifecycle, not one small permission request at a time.

Essential access usually means:

- **GitHub** or the repository host: permission to read/write the repo, create branches/PRs, configure Actions, manage environments, and add repository secrets.
- **Cloud/deployment provider**: permission to create/manage the app, services, databases, storage, environment variables, deploy hooks, logs, domains, rollback settings, and billing-safe resource settings.
- **Optional but common**: package registry, database provider, DNS provider, error monitoring, uptime monitoring, analytics/observability tools, and third-party APIs used by the app.

Ask once, upfront, for the complete set of access needed to deploy and manage the service end-to-end. The goal is to let the agent perform all normal devops operations—CI/CD, staging/prod deploys, secrets setup, logs, monitoring, rollback, domain wiring, and incident checks—without repeatedly stopping to ask the user for each permission. Prefer CLI/API access to hosting, DNS, and cloud providers so the full setup can be driven from chat after the user completes a one-time login or key-creation step. Use owner/admin/collaborator access to the specific project/team/repo/provider when that is the simplest safe option; otherwise request scoped API keys/tokens or CLI/browser auth with the minimum scopes that cover the full lifecycle.

Do not ask the user to paste broad secrets into chat. Prefer:

- user authenticates the local CLI/browser session for providers with official CLIs;
- user creates provider API keys through the provider dashboard and stores them in the local profile `.env`, CI secret store, or provider secret manager after being guided step by step;
- user adds the agent/user account as a repo/cloud collaborator with the required role;
- user creates scoped tokens and stores them directly in the appropriate secret manager;
- user confirms non-secret identifiers such as project/team/service names after access is granted.

## Upfront Access Request

When access is missing, choose the simplest option for the user and give step-by-step instructions. Do not dump a menu of every cloud provider unless the product constraints require it.

Default recommendations:

- GitHub access: ask the user to authenticate the local `gh` CLI or add the agent/user account as a collaborator.
- Frontend/static/Next.js app: prefer Vercel unless the user already has another provider.
- Full-stack app/API with simple managed deploy: prefer Render, Railway, or Fly.io based on the stack and existing account; choose one and explain why.
- Existing cloud account/project: use the user's current provider rather than migrating.
- Hosting, DNS, domain registrar, and infrastructure providers such as GoDaddy, Cloudflare, Render, Railway, Fly.io, Vercel, AWS, GCP, Azure, Supabase, Neon, or similar: prefer official CLI/API access over manual dashboard work when available.

## New Project Hosting Selection

For a new deployable project, do not silently pick a hosting provider unless the user already specified one or the project repository clearly has a committed platform. Devops owns a short provider selection step before account creation, billing setup, DNS work, or production deployment.

Process:

1. Inspect the product shape and stack: static site, Next.js/serverless, full-stack web app, API worker, background jobs, database/storage needs, region/latency, expected traffic, domains, compliance/privacy needs, build/runtime language, and budget sensitivity.
2. Research 3-5 realistic hosting options for the exact project type. Include the obvious default plus any provider the user already uses. Prefer current provider docs/pricing over memory when pricing, limits, supported runtimes, regions, or account setup materially affect the choice.
3. Present a concise hosting choice brief, then ask the user to choose one before creating a new hosting account or committing production architecture. Do not bury the decision in a long essay.
4. Recommend one default with rationale, but make the tradeoffs explicit: deployment fit, managed database/story for persistence, staging/prod support, GitHub integration, CLI/API maturity, logs/monitoring, rollback, domain/DNS path, expected cost/free-tier risk, lock-in/migration cost, and whether the agent can operate it mostly through chat.
5. After the user chooses, record the decision and rationale in `.projects/<project>/runbooks/deployment-and-monitoring.md` or a project decision log, then proceed with account/project setup.

Hosting choice brief template:

```text
Hosting options for <project>

Recommendation: <provider> because <1-2 sentence rationale tied to stack, MVP needs, cost, and operability>.

Options:
1. <Provider> — Best for: <fit>. Pros: <2-3>. Cons/risks: <2-3>. Estimated MVP cost: <free/low/monthly range + caveat>. Agent operability: <CLI/API/GitHub integration quality>.
2. <Provider> — Best for: ...
3. <Provider> — Best for: ...

My suggested choice: <provider>.
Please choose: A) <provider>, B) <provider>, C) <provider>, or D) other.
After you choose, I’ll set up the account/project as far as possible using the configured primary Google account and chat-friendly authorization.
```

If the user cannot decide, choose the lowest-risk reversible default for the MVP stage and state the assumption. If the choice has billing or account-ownership consequences, ask for the explicit provider choice before proceeding.

## Primary Google Account and Chat-First Account Setup

Use the configured primary Google account as the default identity for new hosting/provider accounts whenever practical. This usually means Google SSO, Google Workspace-managed account access, or adding the primary Google account as the owner/admin/member for the provider team/project. Do not create random new email/password accounts unless Google SSO is unavailable or the user explicitly wants a separate identity.

Before setup, check what account/access is already configured in the profile or tooling without exposing secrets: Google Workspace/gws auth, browser logged-in state, provider CLI auth, existing provider teams, and documented project identity conventions. If there is a project-specific agent identity skill or runbook, follow it.

Rules for account setup:

- Prefer flows the agent can finish from the machine/browser/CLI using the configured primary Google account, while keeping ownership in the user's account/team.
- Prefer OAuth/device-code/dashboard approval flows over asking the user to run commands on the agent machine. The user is often on chat only and cannot access the machine at that moment.
- If the user must intervene, give a condensed numbered checklist they can complete from phone or desktop chat: exact URL, button/menu path, account to select, role/scopes to grant, and what non-secret confirmation to send back.
- When a local-machine login is unavoidable, offer a chat-friendly alternative first: add the primary Google account/agent account as collaborator, create a scoped token in the provider dashboard, approve a GitHub/provider integration for the repo, or use a device-code link.
- Avoid raw passwords, broad long-lived secrets, or screenshots of secrets in chat. If a token is unavoidable, request scoped/revocable access and tell the user exactly where to store it or paste it directly into the provider/GitHub secret UI.
- After the user completes an intervention, verify access with a harmless `whoami`, project/team list, repo integration check, or read-only API call before creating/changing resources.

Condensed user-intervention template:

```text
I can do the rest from chat, but I need you to approve <provider> access once.

Please do this (<2 minutes):
1. Open: <exact URL>
2. Sign in with the primary Google account: <account label/email if known, otherwise "the configured primary Google account">.
3. Click: <exact button/menu path>.
4. Choose/grant: <team/project/repo/role/scopes>.
5. If asked for billing, choose: <free tier/trial/existing billing account>; do not upgrade unless you approve it.
6. Reply here with: <non-secret confirmation such as team name, project slug, or URL>.

Do not send passwords or raw long-lived secrets in chat. Once you reply, I’ll verify access and finish setup via CLI/API.
```

For provider signups that support Google SSO, first try to create/select the provider account with the primary Google account, then configure the project through the provider's GitHub integration, CLI, or API. For providers that require billing verification, present the exact billing step and safe default plan/trial selection, then stop for explicit user confirmation before paid upgrades.


## CLI/API Provider Access Setup

For hosting providers, DNS providers, registrars, and managed infrastructure, make the setup doable via chat by guiding the user through one short provider-specific credential flow, then doing the remaining work with CLI/API commands.

Default process:

1. Identify the exact provider, account, project/domain/service, and required operations: create app, deploy, set env vars, manage DNS/domain, inspect logs, rollback, create database/storage, or manage monitoring.
2. Check for an official CLI first. If available, ask the user to run or approve the login command and complete browser/device-code authentication. Examples: `vercel login`, `fly auth login`, `railway login`, `render login`, `supabase login`, `wrangler login`, `gh auth login`.
3. If there is no suitable CLI, use the provider API. Guide the user step by step through creating a scoped API key/token from the provider dashboard. Ask for the minimum scopes needed for the full devops lifecycle, not a read-only token that will fail mid-task.
4. Tell the user exactly where to put the token so the setup remains chat-driven and repeatable: local profile `.env`, GitHub Actions secret, provider secret manager, or a password-manager-backed CLI prompt. Avoid raw token values in chat when possible; if chat is the only path, ask for a short-lived or revocable scoped token and rotate/remove it after use.
5. Verify access immediately with a harmless CLI/API call such as `whoami`, account/domain list, project list, or read-only GET before making changes.
6. Continue using CLI/API for the actual setup and report the exact resources created/changed.

Provider API-key instruction template:

```text
I can complete the <provider> setup from chat if you create one scoped API key for me.

Please do this:
1. Open <provider dashboard URL>.
2. Go to <exact menu path, e.g. Account Settings → API Keys>.
3. Click <Create API Key/Token>.
4. Name it: <project>-ned-devops.
5. Grant these scopes only: <scopes needed for deploy/DNS/env/logs/etc.>.
6. Save it into <exact destination, e.g. this machine's NED profile .env as PROVIDER_API_KEY, GitHub secret PROVIDER_API_KEY, or provider secret manager>. Do not commit it.
7. Tell me the non-secret identifiers I need: <account id/team id/domain/project/service names>.

After that I will verify access with <CLI/API command> and finish the setup via CLI/API.
```

Example for GoDaddy DNS/domain automation:

```text
I can manage the GoDaddy DNS setup from chat if you create a GoDaddy production API key and secret.

Please do this:
1. Open https://developer.godaddy.com/keys.
2. Sign in to the GoDaddy account that owns the domain.
3. Click Create New API Key.
4. Name it: <project>-ned-devops.
5. Choose Environment: Production.
6. Copy the API key and secret once.
7. Store them in the NED profile environment as GODADDY_API_KEY and GODADDY_API_SECRET, or approve me to add them to the local profile .env if you provide short-lived/revocable values.
8. Tell me the domain name and any required record targets, such as the provider's CNAME/A/AAAA values.

I will verify with a read-only GoDaddy API request for the domain records before changing DNS, then create/update only the required records and report the before/after state.
```

For every provider, include revocation/cleanup guidance in the runbook: where the token lives, what scope it has, how to rotate it, and when it can be deleted.

Access request template:

```text
I need upfront access to <repo/provider/tooling> so I can deploy and manage <service/project> end-to-end without interrupting you for every devops operation.

Please grant access for these operations:
- Repository/CI: read/write code, create branches/PRs, edit GitHub Actions/workflows, manage repo environments, and add/update repository or environment secrets.
- Deployment provider: create/manage apps/services, staging and production environments, env vars/secrets, deploy hooks, logs, domains, rollback/redeploys, and billing-safe resource settings.
- Supporting systems if used: database/storage, DNS, package registry, monitoring/error tracking/uptime alerts, and third-party API dashboards.

Easiest path:
1. <open URL or run command>
2. <click/select exact option>
3. <grant exact role/scope, preferably project/team/repo-scoped admin or owner if safe>
4. <confirm access by telling me non-secret project/team/service names, not passwords or raw secrets>

I will not ask for broad secrets in chat. If a token is unavoidable, create a scoped token with: <scopes>, and add it directly as <repo/cloud secret name> or authenticate the local CLI/browser session instead.
```

After the user grants access, verify it immediately with the relevant CLI/API (`gh auth status`, provider whoami/project list, DNS/domain read, repo secret/environment visibility where possible) and continue without asking again unless a new external system or stronger permission is genuinely required.

Concrete GitHub steps to offer:

```bash
# Option A: authenticate this machine's GitHub CLI
gh auth login
# Choose: GitHub.com → HTTPS or SSH → authenticate in browser

gh auth status
```

Or, for repo collaborator access:

1. Open the GitHub repo → **Settings** → **Collaborators and teams**.
2. Add the agent/user GitHub account with the minimum role needed.
3. For CI/CD setup, allow Actions workflow edits and repository secret management.
4. Tell the agent the repo URL and confirm access is granted.

Concrete cloud-provider steps should be provider-specific, CLI/API-first, and minimal. Example for Vercel:

1. Open Vercel → project/team dashboard.
2. Import or select the GitHub repo.
3. Grant GitHub integration access only to that repo if possible.
4. Add required environment variables in Vercel Project Settings → Environment Variables.
5. Tell the agent the Vercel project URL and which environment(s) are configured.

When Vercel CLI access is available, prefer:

```bash
vercel login
vercel whoami
vercel projects ls
```

## Environment Strategy

### Supported Device Interface Deployment Gate

Before promoting staging, deploying production, submitting to an app store, or rolling out a release, read `.projects/<project>/product/supported-device-interfaces.yaml`. This is the canonical supported device interface release gate.

DevOps must block deployment unless all of the following are true:

- The registry exists, parses, names the exact release candidate, and has no unresolved `undecided` interface relevant to the release.
- Every interface marked `supported` has at least one executable test case ID.
- QA ran every supported interface against the same release candidate being deployed and recorded a separate `PASS` with durable evidence and concrete target details.
- No supported-interface result is `not-run`, `fail`, `blocked`, or `stale`.
- Any intentional interface omission or difference is recorded by product management rather than silently accepted by deployment automation.

CI/CD should implement a deterministic registry validation/release-gate job where practical. It must fail closed on missing or malformed registry data, zero test cases for a supported interface, release-candidate mismatch, missing evidence, or non-PASS results. A manual production approval cannot waive this gate without an explicit, issue-linked user decision documenting affected users, risk, rollback, and follow-up QA.

Record the registry path, validated release candidate, supported interface IDs, case IDs, per-interface evidence, gate result, and any exception decision in the deployment runbook/release record.

Every deployable product must have at least two persistent environments:

- **Staging**: production-like environment used for integration verification, demos, QA, migration rehearsals, and smoke tests.
- **Production**: customer-facing environment with stricter approvals, monitoring, backups, and rollback expectations.

Rules:

1. Configure staging and production as separate provider environments/projects/services when the provider supports it.
2. Keep secrets and environment variables separate; never reuse production secrets in staging unless the external service has no safe staging equivalent.
3. CI/CD must auto-deploy to staging after the main integration branch passes tests/build.
4. Production deployment should be deliberate: manual approval, release tag, protected branch, or explicit deploy command depending on project maturity.
5. Document environment URLs, deploy triggers, required secrets by name, rollback steps, and smoke tests in `.projects/<project>/runbooks/`.
6. If preview environments are available, use them for PRs, but previews do not replace persistent staging.

Recommended default triggers:

- Pull request → CI + optional preview deploy.
- Merge to `main`/integration branch → CI, build, then auto-deploy to staging.
- Release tag or manual approval → deploy to production.

## API Key and Secret Store Management

API keys, webhook signing secrets, OAuth client secrets, database URLs, deployment tokens, and third-party service credentials must live in a **secret store**, not in source files, chat transcripts, shell history, copied `.env` snippets, or project docs.

Default policy:

1. **Choose a secret store first** before asking for or creating API keys. Preferred stores, in order:
   - Team/project password manager with CLI support, especially **1Password** (`op`) when available.
   - Cloud/provider secret manager such as AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, Doppler, Infisical, or the deployment provider's native encrypted environment/secret store.
   - macOS Keychain or `pass` only for single-developer/local projects when no team store exists.
2. Store each secret under a stable, environment-scoped path or item name such as `<project>/<environment>/<SECRET_NAME>` or a 1Password item tagged with project and environment.
3. Keep source-controlled files limited to:
   - `.env.example` with variable names and safe placeholders only;
   - `.projects/<project>/runbooks/deployment-and-monitoring.md` with secret names, store/path references, owners, rotation notes, and consumers, but never secret values;
   - loader scripts that fetch values from the store at runtime.
4. Load secrets into local development only through a script or CLI injection command. Do not manually copy/paste long-lived keys into `.env.local` unless there is no store-backed option.
5. Treat CI and deployment environments as separate consumers: sync or reference secrets from the store into GitHub Actions/provider encrypted secrets, never from committed files.
6. Rotate keys when they have been pasted into chat, exposed in logs, shared with broader scopes than needed, or when ownership changes.

### Local Secret Loader Script

Every project with external API keys should include a small script that loads local environment variables from the chosen secret store. Use the bundled template at `skills/devops/scripts/load-secrets-from-store.sh` as the starting point.

Recommended project placement:

```text
scripts/load-secrets-from-store.sh
```

Recommended local workflow:

```bash
# Load secrets into the current shell for local development
source scripts/load-secrets-from-store.sh .env.secretstore

# Then run the app/tests in that same shell
npm run dev
# or
python -m pytest
```

Recommended `.env.secretstore` mapping file format:

```dotenv
# One mapping per local env var. Values are secret-store references, not secrets.
# 1Password references are preferred when op is available.
OPENAI_API_KEY=op://NoEgoDev/my-project-staging/OPENAI_API_KEY
STRIPE_SECRET_KEY=op://NoEgoDev/my-project-staging/STRIPE_SECRET_KEY

# macOS Keychain fallback: keychain://<service>/<account>
GODADDY_API_KEY=keychain://my-project-staging/GODADDY_API_KEY
GODADDY_API_SECRET=keychain://my-project-staging/GODADDY_API_SECRET
```

The loader must:

- fail fast when the mapping file is missing, malformed, or references an unsupported store;
- export variables into the caller's shell when sourced;
- avoid printing secret values;
- verify required commands such as `op` or `security` before attempting reads;
- keep the mapping file safe to commit only if it contains references and no raw secret values. If in doubt, add the project-specific mapping file to `.gitignore` and commit `.env.secretstore.example` instead.

### Creating and Storing New API Keys

When the user or provider requires a new API key:

1. Define the minimum scope needed for the service and environment.
2. Ask the user to create the key in the provider UI or use an authenticated CLI/API when available.
3. Store the key directly in the chosen secret store, under the agreed project/environment path. Avoid routing raw values through chat.
4. Add or update `.env.example` and `.env.secretstore.example` with the variable name and store reference pattern only.
5. Add the corresponding CI/provider encrypted secret by reading from the store or by having the user paste directly into the provider's secret UI.
6. Verify with a harmless command (`whoami`, project list, test API call) while masking output.
7. Document the secret name, store path, scope, owner, consumers, and rotation instructions in the deployment/monitoring runbook.

## Deployment and Monitoring Documentation

For each project, maintain a durable deployment and system monitoring document under `.projects/<project>/runbooks/`, preferably `.projects/<project>/runbooks/deployment-and-monitoring.md`.

The document must be created or updated whenever CI/CD, hosting, environments, secrets, health checks, logging, monitoring, alerting, rollback, or production operations change.

Required contents:

- **Environment inventory**: staging and production URLs, provider/project/service names, regions, branches/tags that deploy, and owner/contact.
- **Deployment flow**: PR checks, staging auto-deploy trigger, production deploy trigger/approval, migration steps, smoke tests, and rollback steps.
- **Secrets and config**: required environment variables and secret names by environment, secret-store references/paths, loader-script usage, CI/provider secret consumers, rotation notes, and no secret values committed.
- **System health**: health check endpoints, uptime checks, background job checks, database/storage checks, and expected healthy signals.
- **Hosting cost**: current hosting/cloud/provider spend, plan limits, usage drivers, upcoming renewals/trials, forecasted monthly run-rate, budget owner, and cost anomalies that need product or devops action.
- **Monitoring and alerting**: log locations, dashboards, error tracking, alert destinations/escalation path, and key metrics/SLOs for the MVP.
- **Operational procedures**: how to inspect logs, restart/redeploy services, run migrations safely, verify staging, verify production, and handle incidents.

Prefer one concise, current runbook over scattered notes. If a provider generates its own docs or dashboard links, link them from the runbook and summarize the operational steps in-repo.

## Periodic System Checkup Cost Rules

Every periodic system checkup must include hosting cost as a first-class signal, not an afterthought. For each staging and production environment, inspect available billing/usage dashboards or provider APIs/CLIs and report:

- current billing period spend and projected monthly run-rate;
- hosting plan/tier, seats, add-ons, database/storage/egress/queue/cron/job costs, and trial or renewal dates;
- resource usage that can create surprise bills: traffic, bandwidth/egress, storage growth, logs retention, background jobs, build minutes, serverless invocations, managed database compute, and third-party API quotas;
- cost anomalies since the last checkup, including sudden spikes, unused resources, idle preview environments, forgotten services, or over-provisioned instances;
- recommended action: leave as-is, downgrade/resize, delete idle resources, add budget alerts, create an optimization task, or ask product/project manager for a cost-vs-growth decision.

If cost data is unavailable, mark it as `missing cost visibility`, identify the provider/account/dashboard or API access needed, and create a setup task for budget alerts or billing access. Never claim a system is fully healthy when hosting cost cannot be checked for a live product.

## Repository Workflow Failure Monitoring

For every maintained repository with automated workflows, monitor the status of **all active workflows**, not only the main test workflow. Prioritize required checks, default/protected branches, pull requests, scheduled jobs, release/deployment workflows, security scans, migrations, and production automation. Intentionally disabled or retired workflows are out of scope only when that decision is documented.

### Monitoring setup

1. Prefer repository-host events such as GitHub `workflow_run` webhooks for near-real-time detection. Add a reconciliation poll after setup and at least every 15 minutes so missed, delayed, duplicated, or out-of-order events and gateway downtime cannot hide or fabricate a red workflow. If webhook-management permission is unavailable, use a recurring Hermes cronjob or existing scheduler at `every 15m` by default; polling is a valid least-privilege fallback.
2. For GitHub, inventory workflows first with `gh workflow list --all --limit 1000 --json id,name,path,state`, verify the inventory is not truncated, and read each active workflow file from the authoritative ref to inventory its trigger events. Combine those triggers with default/protected/release branches, open PR heads, scheduled/default-branch lanes, and documented deploy lanes. Query **each workflow + relevant event + relevant branch/ref lane** rather than only each workflow; paginate until the latest two completed attempts plus the preceding success are known for every lane, or until the API is exhausted within the documented retention window. A global or per-workflow-only `--limit <N>` query can hide infrequent schedule, release, or deployment lanes behind busy PR/push runs. Use authenticated read-only discovery such as `gh run list --workflow <id-or-file> --event <event> --branch <branch> --limit <N> --json databaseId,attempt,workflowName,status,conclusion,headBranch,headSha,event,createdAt,updatedAt,url` and `gh run view <run-id> --attempt <attempt> --json attempt,jobs,url,workflowName,headBranch,headSha,event,conclusion`. For event types where `--branch` is not meaningful, query by workflow/event and partition the returned runs by authoritative ref.

   Minimum GitHub access is repository metadata/contents read, Actions read, branch-protection/rulesets read where required checks are monitored, and Issues write when GitHub Issues is the task tracker. Webhook mode additionally needs repository-hook administration/write; do not request that stronger scope when polling is sufficient. Verify each granted capability with harmless list/read calls and a dry-run or test issue path before declaring monitoring ready.
3. Track stable workflow ID plus path (not display name alone), relevant branch/event, run ID/attempt/URL, head SHA, conclusion, failed job/step, normalized failure signature, first/last seen, consecutive failure count, existing task URL/ID, and last notified state. Store runtime state outside the repository, for example `~/.hermes/tmp/<project>-workflow-monitor-state.json`; never commit transient monitor state.
4. Treat `failure`, `timed_out`, `startup_failure`, and `action_required` as failing conclusions. Investigate repeated `cancelled` runs when they block required CI, but do not classify an intentional manual cancellation as a code failure. `skipped` and `neutral` are not successes for a required check unless the repository's branch-protection policy intentionally permits them.
5. If no runs can be read, authentication is missing, a workflow disappeared, trigger/lane inventory or pagination is incomplete, inventory is truncated, or branch-protection/required-check visibility is unavailable, report `missing workflow visibility` rather than claiming CI is healthy. Maintain one open deduplicated visibility/setup task per repository + missing capability/scope, update it on every materially changed outage, and deduplicate unchanged visibility alerts just like unchanged red-state alerts. If the configured tracker cannot be written, persist one pending-task record in atomic local monitor state, emit one actionable blocker alert, and retry the idempotent task upsert; never claim that a task was created until its returned ID/URL is verified. Reconcile workflow renames by stable ID/path history. Prune state for removed/disabled workflows only after verifying and linking an intentional retirement decision; otherwise keep the visibility task open.

### Persistent-failure gate

A single failed run is a **candidate incident**, not automatically a fix task. Inspect the failed jobs/steps and record the candidate immediately. A workflow is **continuing to fail** and requires a durable fix task when any of these is true:

- the latest two completed attempts of the same active workflow fail on the same relevant branch/event with the same normalized failure signature and no intervening success; historical failures followed by a current success do not trip the gate;
- the latest three completed attempts on the same workflow/branch/event all fail without an intervening success, even if signatures differ; create or update one `mixed-signature` lane task so a continuously red workflow cannot evade tracking by changing errors;
- a safe, explicitly authorized rerun fails again with the same normalized failure signature;
- a required default/protected/release/deployment workflow remains red for 30 minutes and still blocks merge, staging, release, or production delivery;
- a scheduled workflow fails in two consecutive scheduled executions, even when those runs are far apart.

Do not blindly rerun deployment, migration, billing, destructive, or non-idempotent workflows. Inspect side effects and obtain the required approval first. A changed failure signature starts a distinct investigation but should update the same workflow task when the failures share one underlying blocked outcome.

### Fix-task creation and deduplication

When the persistent-failure gate trips, search the configured issue/task system before creating anything. Maintain **one open fix task per repository + stable workflow ID/path + relevant branch/event + normalized failure signature**; use a reserved `mixed-signature` value for the three-failure continuously-red lane gate. Store that deterministic dedupe key in the task body/metadata or label, re-search immediately before creation, and use an atomic lock/idempotent upsert so concurrent webhook and reconciliation workers cannot race into duplicates. Write state atomically (temporary file plus rename). Update the existing task with new runs and evidence instead of creating duplicate issues on every poll.

A persistent failure is not safely tracked until the repair task's returned ID/URL is verified and a read-back confirms the dedupe key and current failure evidence. If repair-task creation/update fails, times out, or returns an ambiguous response, persist exactly one pending repair-task record per dedupe key in atomic local monitor state, emit one actionable blocker alert, and retry the idempotent upsert on reconciliation. Before retrying, search the tracker by dedupe key to adopt a task that may have been created despite a lost response. Never claim the repair task exists, mark the gate handled, or send a milestone-complete status while the task ID/URL and read-back remain unverified; deduplicate unchanged tracker-outage alerts.

Use GitHub Issues when the repository uses GitHub and Issues are enabled; otherwise use the configured tracker or a repo-local durable task under `.projects/<project>/issues/`. The task must include:

```text
Fix persistent workflow failure — <workflow> — <branch/event>
- Repository: <URL/path>
- Workflow: <name/path and workflow URL>
- Failure state: <conclusion; first seen; last seen; consecutive count>
- Affected runs: <run IDs/URLs, head SHAs, events>
- Failed jobs/steps: <names and safe concise evidence>
- Normalized signature: <stable redacted signature used for dedupe>
- Impact/severity: <merge, staging, release, deploy, security, scheduled operation, etc.>
- Suspected cause: <evidence-grounded hypothesis or `unknown`; never present speculation as fact>
- Owner: <devops/coder/security/other>
- Acceptance: <fix merged; original failing scenario rerun passes; required check reports success; two consecutive normal runs succeed; workflow was not merely disabled/skipped to hide failure>
- Links: <PR/spec/runbook/STATUS.md if milestone state changed>
```

Redact tokens, secrets, private environment values, and sensitive log payloads before storing evidence. If a persistent failure blocks a milestone, release, or current objective, notify project-manager and update the repository `STATUS.md` through its completion/status workflow so the blocker and next action stay visible.

### Recovery and verification

- A new green run does not erase the task history. Add recovery evidence to the task and verify the original failing scenario plus two consecutive normal runs before resolving intermittent failures.
- Do not close a task merely because the workflow was disabled, removed, changed to `continue-on-error`, or made non-required. Such changes need an explicit, issue-linked decision showing that coverage or delivery safety was not silently weakened.
- Treat webhook payloads as hints, not authoritative ordering. Before every candidate/persistent/recovery transition, task upsert, or alert, fetch and sort authoritative remote lane state by completion time, run ID, and attempt; reject an event at or behind the stored lane cursor unless it adds missing evidence. Reconcile remote runs and open tasks on every transition and monitor restart so delayed events or stale local state cannot regress status, duplicate tasks, or replay alerts.
- Alert only on a new candidate failure, persistent-gate transition/task creation, materially changed failure, deduplicated missing-visibility transition, or verified recovery. Deduplicate unchanged red-state **and visibility** alerts.
- Verify the monitor with fixtures or dry runs for: all-green silent behavior; first-failure candidate without task creation; second matching failure creating one task; three mixed-signature failures creating one lane task; lane pagination finding an infrequent scheduled/release run behind busy PR runs; repeated/concurrent polls updating rather than duplicating tasks; missing visibility creating one deduplicated setup task; stale/out-of-order webhook rejection; distinct rerun attempts; malformed/missing API data failing closed; and recovery evidence without premature closure.
- Document monitor mechanism, cadence, repository/workflow scope, required permissions, state path, task tracker/labels, persistence thresholds, dedupe key, notification destination, and pause/remove/manual-run instructions in `.projects/<project>/runbooks/deployment-and-monitoring.md`.

## Service Monitoring Cronjobs

When the user asks to monitor deployed services, set up a recurring Hermes cronjob that runs every 5 minutes unless the user specifies a different cadence. Monitoring must be proactive and quiet-by-default: the job should send a message only when it detects an issue, cannot check a required signal, or recovers from a previously reported issue if recovery notifications are useful.

Default behavior:

1. **Discover all deployed services and backends**
   - Inspect the deployment/monitoring runbook, provider projects, CI environments, DNS/domain records, service manifests, and repo configuration to identify every deployed environment.
   - Include frontend hosting, backend/API services, workers, queues/cron jobs, databases, storage, and any provider-managed services that can cause outages.
   - Pay special attention to backend/API services because backend error spikes, high latency, and CPU/memory pressure are the most common precursors to outages.

2. **Create a 5-minute silent watchdog**
   - Use `cronjob(action='create', schedule='every 5m', no_agent=True, script=<script path>, deliver='origin')` for deterministic watchdogs when possible.
   - The script must print nothing and exit 0 when everything is healthy. Empty stdout means silent success.
   - Print a concise alert only when a threshold is breached, a health check fails, required metrics/log access is missing, or the script itself cannot determine safety.
   - Avoid LLM-driven recurring jobs for simple metric polling unless interpretation/summarization is genuinely required.

3. **Check health and backend risk signals**
   - Health endpoints and uptime checks for every deployed service/environment.
   - Recent backend error counts/rates from logs, provider metrics, APM/error monitoring, or application endpoints.
   - High latency: p95/p99 response latency, timeout rate, queue lag, slow DB queries, or provider request-duration metrics. Define project-specific thresholds; if none exist, start with conservative defaults and document them.
   - High CPU/memory: alert when CPU or memory usage is above 90% for a sustained or repeated sample window, because this usually leads to outages.
   - Database/storage/queue pressure where available: connection saturation, disk/storage near quota, failed jobs, retry/dead-letter growth, migration failures, or backup failures.
   - Hosting-cost/billing visibility can remain part of slower periodic checkups, but immediate outage watchdogs should prioritize health, errors, latency, CPU, and memory.

4. **Make alerts actionable**
   - Include service/environment, failing signal, observed value, threshold, time window, provider/source, likely impact, and the first diagnostic or remediation command/link.
   - Deduplicate alerts so the user is not spammed every 5 minutes for the same ongoing incident. Store a tiny local state file outside the repo, e.g. `~/.hermes/tmp/<project>-monitor-state.json`, or in another profile-local non-repo path.
   - Send recovery messages only when they reduce ambiguity, e.g. `RECOVERED: api-prod p95 latency back below 1s`.

5. **Document and verify**
   - Record cronjob name/id, schedule, delivery target, script path, monitored services, thresholds, metric sources, state-file path, and how to pause/remove/run the job in `.projects/<project>/runbooks/deployment-and-monitoring.md`.
   - Verify by running the script once manually, confirming healthy output is empty, confirming simulated failures produce a concise alert, and listing the cronjob after creation.
   - If provider metric/log access is missing, set up the cronjob to alert about missing critical visibility rather than silently claiming health, and create the required access/setup task.

Watchdog script requirements:

```text
healthy run: stdout empty, exit 0
issue found: stdout contains alert text, exit 0
script/config failure: stdout contains diagnostic alert, exit 0 unless the scheduler itself should report a broken watchdog
secrets: read from provider CLI, environment, or secret store; never hard-code or commit them
state: store under ~/.hermes/tmp/ or another non-repo profile-local path
```

## AWS eval/deployment-readiness guardrail

When the user or eval specifically requests AWS deployment readiness for a simple Vite/static web app, do not stop at a generic access request. Before any mutating AWS action, inspect the repository's deployment requirements file when present, then report these concrete decisions and safety gates:

- Evidence inspected: explicitly name DEPLOYMENT_REQUIREMENTS.md or equivalent deployment notes plus package/build files used to identify the stack.
- Dedicated-account gate: ask the user to create or authorize a fresh dedicated eval AWS account and provide only scoped eval access; do not deploy to personal, production, default, shared, or unknown AWS accounts.
- Non-mutating identity verification: aws sts get-caller-identity --output json, followed by comparing the account ID/ARN to the intended eval account before creating resources.
- Minimum permissions: enough scoped access for S3 bucket/object management, CloudFront distribution/invalidation management, ACM certificate read/request in us-east-1 when HTTPS/custom domain is in scope, Route53 hosted-zone record changes only if DNS is in scope, CloudWatch/log/status read, IAM role/passrole only if the chosen deploy path requires it, and read-only STS/account identity checks.
- Preferred region: default to us-east-1 for the eval unless requirements specify otherwise, because ACM certificates for CloudFront must be in us-east-1 and static-site resources are simple to centralize there.
- Hosting path: recommend S3 plus CloudFront for a Vite static app when the goal is AWS-native hosting, with rationale: low moving parts, cheap static hosting, CDN/TLS support, easy teardown. Mention Amplify as an acceptable managed alternative if the user prefers Git-connected hosting.
- Verification artifacts: build output, deployed URL, health check result, CloudFront/S3 status or logs, teardown commands/plan, and evidence placeholders while the dedicated eval account is unavailable.
- Secret safety: commit only variable names, store paths, and placeholders; never commit real AWS keys, account secrets, .env values, or credentials.

## Workflow

1. Inspect stack, hosting constraints, existing pipelines, current authenticated access, and whether this is a new project needing provider selection.
2. For a new project without a chosen provider, research 3-5 viable hosting options for the specific stack and MVP/serviceability needs; present a concise recommendation brief and ask the user to choose before creating accounts or locking architecture.
3. After the user chooses a provider, prefer the configured primary Google account for provider signup/SSO/team ownership and choose a chat-first setup path that does not require the user to access the agent machine when avoidable.
4. If end-to-end devops access is missing, make one upfront access request covering repository/CI, deployment provider, secrets/environments, logs, monitoring, rollback, domains, and supporting services needed for this project. Use the easiest-path step-by-step instructions above.
5. Prefer CLI/API access for hosting/DNS/cloud providers; guide the user step by step through login, OAuth/device-code approval, collaborator access, or scoped API-key creation so the rest of the setup can be completed via chat.
6. Verify granted access immediately with CLI/API checks, then proceed without repeated permission prompts unless a new external system or stronger permission is genuinely required.
7. Add the smallest CI workflow that blocks broken code.
8. Choose a secret store for API keys and credentials before creating or requesting keys. Add a store-backed local loader script from `skills/devops/scripts/load-secrets-from-store.sh` and commit only safe examples/references, not secret values.
9. Configure separate staging and production environments, including separate secrets/env var namespaces and separate store paths/items.
10. Add deployment automation that auto-deploys staging after CI passes on the integration branch.
11. Add a safe production deployment path with an explicit approval/tag/manual trigger unless the user asks for fully automatic production deploys.
12. Document required secrets as names and store references/paths only; never commit secret values.
13. Create or update the per-project deployment and system monitoring runbook at `.projects/<project>/runbooks/deployment-and-monitoring.md`.
14. Validate `.projects/<project>/product/supported-device-interfaces.yaml`; require at least one test case and a current PASS/evidence row for every supported device interface against the exact release candidate, and block promotion/deployment/store submission when the gate is incomplete or failing.
15. Add health checks, hosting-cost visibility, budget-alert expectations, and operational runbook details.
16. Configure repository workflow monitoring for every active workflow using workflow-run events plus a 15-minute reconciliation poll when available, or a 15-minute poll when events are unavailable. Create/update one deduplicated fix task when the persistent-failure gate trips.
17. When asked to monitor deployed services, discover all deployed services/backends and set up a quiet every-5-minute Hermes cronjob watchdog that alerts only on issues, missing critical visibility, or useful recoveries.
18. Verify by running CI locally where possible, checking staging deployment status, testing store-backed secret loading without printing values, confirming the supported-interface release gate, confirming monitoring cronjob healthy output is silent and failure output alerts, and confirming the production deploy path, monitoring setup, and cost-check sources are documented.

## Verification Checklist

- [ ] CI runs tests/build on pull requests.
- [ ] For new projects, 3-5 viable hosting options were researched for the actual stack/product constraints and presented in a concise choice brief.
- [ ] The user chose a hosting provider, or an explicit reversible default/assumption was recorded before account creation or architecture lock-in.
- [ ] The hosting decision and rationale were recorded in the deployment/monitoring runbook or decision log.
- [ ] End-to-end devops access was checked upfront across repository/CI, deployment provider, secrets/environments, logs, monitoring, rollback, domains, and supporting services.
- [ ] If access was missing, the user received one easiest-path upfront access request broad enough to avoid repeated permission prompts during normal devops operations.
- [ ] Hosting/DNS/cloud provider setup uses CLI/API access when available, with step-by-step user guidance for login, OAuth/device-code approval, collaborator access, or scoped API-key creation.
- [ ] New provider accounts use the configured primary Google account for SSO/account ownership where practical.
- [ ] If user intervention was required, the instructions were condensed, phone/chat-friendly, and did not assume the user could access the agent machine.
- [ ] Granted access was verified with CLI/API checks before proceeding.
- [ ] The chosen provider is the easiest viable path for the user and product stage.
- [ ] Staging and production environments are configured or explicitly documented as required setup.
- [ ] Staging auto-deploys from the integration branch after CI passes.
- [ ] Production deploy is protected by manual approval, release tag, protected branch, or documented explicit command.
- [ ] `.projects/<project>/product/supported-device-interfaces.yaml` exists, parses, and names the exact release candidate.
- [ ] Every supported device interface has at least one executable test case and a current PASS with durable evidence for the same release candidate.
- [ ] Promotion/deployment/store submission is blocked when the interface registry is missing/malformed/undecided or any supported-interface result is missing, stale, failed, or blocked.
- [ ] Environment variables/secrets are separated by environment and documented by name only.
- [ ] API keys and credentials are stored in a secret store rather than source files, chat, shell history, or committed `.env` files.
- [ ] A local loader script exists (for example `scripts/load-secrets-from-store.sh`) and loads secrets from the store without printing values.
- [ ] `.env.example` / `.env.secretstore.example` document variable names and store references only, with no raw secret values.
- [ ] Per-project deployment and system monitoring doc exists at `.projects/<project>/runbooks/deployment-and-monitoring.md` or an equivalent documented path.
- [ ] The deployment/monitoring doc includes environment inventory, deployment triggers, rollback, health checks, hosting cost/budget visibility, logs, dashboards/alerts, and operational procedures.
- [ ] Periodic system checkups include current hosting spend, projected run-rate, plan limits, resource-usage cost drivers, renewal/trial dates, and cost anomalies or missing-cost-visibility tasks.
- [ ] Every maintained repository inventories workflow triggers and monitors every active workflow/event/branch lane—including infrequent scheduled/release/deploy lanes—using workflow-run events plus reconciliation or a documented recurring poll with complete pagination.
- [ ] First failures are recorded as candidate incidents; persistent failures are defined by two consecutive matching completed attempts, three continuously red mixed-signature attempts, a failed safe rerun attempt, a required red workflow still blocking after 30 minutes, or two consecutive scheduled failures.
- [ ] Persistent workflow failures atomically create or update one durable deduplicated fix task with run/attempt links and SHAs, failed jobs/steps, redacted signature, impact, owner, evidence-grounded cause or unknown, and objective acceptance checks; failed/ambiguous tracker writes remain one pending repair record until ID/URL and read-back verification succeed.
- [ ] Workflow monitoring verifies contents/Actions/rules/task-tracker and optional webhook permissions, fails closed on incomplete trigger/lane/pagination/auth/run/required-check visibility, and deduplicates visibility tasks/alerts.
- [ ] Workflow monitor verification covers green silence, matching and mixed-signature persistence, infrequent lane pagination, distinct attempts, concurrency/duplicate suppression, deduplicated missing visibility, stale/out-of-order events, malformed data, and recovery without premature closure.
- [ ] When the user asked to monitor services, a Hermes cronjob was created with schedule `every 5m` unless the user specified otherwise.
- [ ] The monitoring cronjob runs silently when all services are healthy, using empty stdout for healthy no-op runs.
- [ ] Monitoring covers all deployed services/environments discovered from runbooks/provider config, especially backend/API services, workers, databases, and provider-managed dependencies.
- [ ] Monitoring checks backend error counts/rates, high latency, and CPU/memory usage above 90%, plus health endpoints and queue/database/storage pressure where available.
- [ ] Alerts are concise and actionable, include observed value and threshold, and are deduplicated to avoid repeating the same incident every 5 minutes.
- [ ] The monitoring script was manually verified for silent healthy output and simulated failure alert output, and the cronjob was listed after creation.
- [ ] Cronjob id/name, schedule, delivery target, script path, state-file path, monitored services, metric sources, thresholds, and pause/remove/run instructions are documented in the deployment/monitoring runbook.
- [ ] Secrets are documented but not committed.
- [ ] Deploy path is reproducible.
- [ ] Health/rollback docs exist.
