---
name: devops
description: "Use when setting up CI/CD, deployments, environment management, or operational health checks."
version: 0.5.1
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
14. Add health checks, hosting-cost visibility, budget-alert expectations, and operational runbook details.
15. Verify by running CI locally where possible, checking staging deployment status, testing store-backed secret loading without printing values, and confirming the production deploy path, monitoring setup, and cost-check sources are documented.

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
- [ ] Environment variables/secrets are separated by environment and documented by name only.
- [ ] API keys and credentials are stored in a secret store rather than source files, chat, shell history, or committed `.env` files.
- [ ] A local loader script exists (for example `scripts/load-secrets-from-store.sh`) and loads secrets from the store without printing values.
- [ ] `.env.example` / `.env.secretstore.example` document variable names and store references only, with no raw secret values.
- [ ] Per-project deployment and system monitoring doc exists at `.projects/<project>/runbooks/deployment-and-monitoring.md` or an equivalent documented path.
- [ ] The deployment/monitoring doc includes environment inventory, deployment triggers, rollback, health checks, hosting cost/budget visibility, logs, dashboards/alerts, and operational procedures.
- [ ] Periodic system checkups include current hosting spend, projected run-rate, plan limits, resource-usage cost drivers, renewal/trial dates, and cost anomalies or missing-cost-visibility tasks.
- [ ] Secrets are documented but not committed.
- [ ] Deploy path is reproducible.
- [ ] Health/rollback docs exist.
