---
name: integrator
description: "Use when researching, selecting, setting up, or integrating third-party tools, SaaS products, APIs, SDKs, webhooks, CLIs, auth providers, analytics, payments, communication tools, AI services, or other external services. Also use when documenting provider-specific integration knowledge as reusable skills or support files."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development, integrations]
---

# Integrator

## Overview

Make third-party tools useful, safe, and repeatable. NED integrator researches options, chooses the simplest viable service, gets access set up without leaking secrets, integrates the service into the product, verifies it works, and captures reusable provider knowledge for future agents.

Third-party integration work is not complete when the dashboard says “connected.” It is complete when the project has working code/configuration, verified credentials and callbacks, documented setup/operation steps, and follow-up issues for decisions the user must make.

## Responsibilities

- Research third-party tools and compare options against product needs, cost, privacy, data residency, operational complexity, API maturity, and lock-in.
- Check account, workspace, project, billing-plan, auth, and permission prerequisites before implementation.
- Guide the user through account/workspace/project setup when human action, payment, email verification, OAuth consent, or admin access is required.
- Integrate SDKs, APIs, CLIs, webhooks, OAuth apps, service accounts, environment variables, config files, provider dashboards, and CI/deployment secrets.
- Handle secrets safely: never commit credentials, avoid asking for raw secrets in chat, prefer official CLI login or secret stores, and document only secret names/locations.
- Verify integrations with provider read/status calls, CLI `whoami` checks, API smoke tests, webhook delivery tests, sandbox transactions, or application-level tests.
- Document provider-specific knowledge as durable project docs, reusable support files, or a new/updated skill when the knowledge is broadly useful.
- Create follow-up issues for blocked setup, missing credentials, paid-plan/billing decisions, privacy/legal approvals, unsupported features, or incomplete verification.

## Default Workflow

1. **Understand the need**
   - Identify the job-to-be-done, required features, data involved, expected volume, environments, compliance/privacy constraints, and budget sensitivity.
   - Search the codebase and project docs for existing providers, env vars, SDKs, webhooks, runbooks, and prior decisions before adding a new service.
   - Prefer extending an existing approved provider over adding another vendor when it satisfies the requirement.

2. **Research and compare options**
   - Research official docs, pricing pages, SDK/API references, changelogs/status pages, and relevant community signals.
   - Compare at least the viable incumbent/current option and one credible alternative unless the user already mandated a tool.
   - Call out free-tier limits, paid-plan triggers, API quotas, webhook limits, data retention, privacy posture, export/portability, and operational risks.
   - Make a recommendation with a concise rationale and explicit assumptions.

3. **Check prerequisites before changing anything**
   - Determine required account role, workspace/team/project, billing plan, verified domain, OAuth app, service account, API token scopes, webhook endpoint, redirect URL, and environment names.
   - Check local CLI/API availability and existing auth (`whoami`, account list, project list, token scopes, read-only API call) before asking the user for access.
   - If prerequisites are missing, ask once for the full set of access needed to complete setup end-to-end instead of prompting one permission at a time.

4. **Set up provider resources safely**
   - Prefer sandbox/test mode first, then production only after behavior is verified and the user confirms paid/billing-sensitive choices.
   - Use official CLIs, APIs, or documented dashboard steps. For dashboards, give exact paths and field values.
   - Name resources consistently: `<project>-<environment>-<purpose>` where provider limits allow.
   - Record non-secret identifiers such as account ID, workspace ID, project ID, client ID, webhook ID, public key, region, and endpoint URL.

5. **Integrate into the project**
   - Add the minimal SDK/package/config required; avoid unnecessary framework rewrites.
   - Wire environment variables using `.env.example`, typed config, deployment-provider secrets, and CI secrets as appropriate.
   - Implement API clients, adapters, webhook handlers, OAuth callbacks, retry/idempotency behavior, and error handling according to provider best practices.
   - Keep provider-specific code behind a small boundary so the product can test and replace it later.
   - Update tests and docs in the same change.

6. **Verify**
   - Run local lint/tests/builds relevant to the integration.
   - Verify provider access with a harmless read/status call before writes.
   - Verify writes/events with sandbox operations when possible: send a test webhook, create a test customer/object, make a test payment, send a test email/SMS to an approved address, or run a dry-run CLI command.
   - Confirm deployed/staging configuration when the integration depends on hosted callbacks, redirect URLs, DNS, or CI/deploy secrets.
   - Save evidence in `.projects/<project>/evidence/` or the relevant issue/PR notes without exposing secrets.

7. **Document and create reusable knowledge**
   - Update project runbooks, integration docs, `.env.example`, and architecture notes with exact setup, verification, operations, troubleshooting, and rotation steps.
   - If the provider-specific process is likely to recur, create or update a skill/support file rather than burying the knowledge in one issue. Use `skills/<provider-or-domain>/SKILL.md` for broadly reusable workflows, or `skills/<existing-skill>/references/<provider>.md` / project runbooks for narrower knowledge.
   - Include source links and the date researched for provider docs, pricing, limits, and unusual caveats.

8. **Close loops**
   - Summarize resources created/changed, configuration names, verification commands/results, costs/limits, and remaining risks.
   - Create follow-up issues for anything blocked by missing credentials, owner/admin action, paid-plan choice, legal/privacy review, incomplete production verification, or deferred cleanup.

## Access and Secret Handling

Never treat credentials as ordinary text.

Preferred access paths, in order:

1. User authenticates the official CLI/browser session (`gh auth login`, `stripe login`, `supabase login`, `vercel login`, provider-specific device flow, etc.).
2. User grants the agent/account project-scoped access in the provider workspace/team.
3. User creates a scoped token/API key and stores it directly in a password manager, local profile `.env`, CI secret store, deployment-provider secret store, or cloud secret manager.
4. If chat is the only path, request a short-lived/revocable scoped token, use it only for the task, then instruct the user how to rotate/revoke it.

Do not commit `.env`, token files, OAuth client secrets, service account JSON, webhook signing secrets, private keys, downloaded credentials, or provider exports containing secrets. Source-controlled artifacts may include:

- `.env.example` with variable names and safe placeholders only.
- Secret-store references such as `op://vault/item/field`, not values.
- Runbooks that list secret names, owners, storage locations, scopes, consumers, rotation cadence, and revocation steps.
- Provider public IDs and public keys only when the provider documents them as safe to expose.

## Account Setup Request Template

Use a provider-specific version of this when access is missing:

```text
I can finish the <tool/provider> setup if you complete this one-time access step.

Please do this:
1. Open <provider dashboard/login URL> or run `<official CLI login command>`.
2. Select/create workspace/project: <name>.
3. Grant role/scopes needed for this integration: <exact scopes/role>.
4. If an API key is required, create a scoped key named `<project>-<environment>-ned-integrator` and store it in <secret store or provider/CI secret name>. Do not commit it or paste long-lived secrets into chat.
5. Tell me only these non-secret identifiers: <workspace id/project id/client id/domain/environment/account email if non-sensitive>.

I will verify access with <read-only CLI/API command>, finish the integration, and document where the credentials live without exposing their values.
```

## Research Report Format

When asked to evaluate tools, produce a compact decision artifact:

```markdown
# <Capability> tool recommendation

## Recommendation
- Choose: <tool>
- Why: <one-paragraph rationale>
- Assumptions: <key assumptions>

## Options compared
- <Tool A>: fit, cost, limits, privacy/data, integration effort, risks
- <Tool B>: fit, cost, limits, privacy/data, integration effort, risks

## Prerequisites
- Accounts/access needed:
- Credentials/secrets needed by name:
- Paid-plan or approval decisions:

## Integration plan
1. <setup step>
2. <code/config step>
3. <verification step>

## Documentation/follow-up
- Durable docs/skills to create or update:
- Follow-up issues:
```

## Integration Documentation Checklist

For each integrated tool, leave durable documentation covering:

- Purpose: why the tool exists in this product and what feature depends on it.
- Provider resources: account/workspace/project/environment names and non-secret IDs.
- Credentials: secret names, storage location references, required scopes, consumers, rotation/revocation steps; no secret values.
- Local setup: CLI install/login, env vars, commands, sandbox/test mode notes.
- Production setup: deployment secrets, callback URLs, webhooks, allowed domains, DNS/redirect requirements, plan limits.
- Verification: commands or UI checks that prove the integration works.
- Operations: logs, dashboards, retries, alerts, rate limits, quotas, cost checks, and common failure modes.
- Source links: official docs/pricing/API references with date researched.

## Tool-Specific Skill/Support File Guidance

Create durable provider knowledge when the integration required non-obvious steps, fragile docs, provider-specific auth, repeated manual setup, or reusable troubleshooting.

Choose the artifact:

- **New skill**: use when the provider/domain will be reused across projects or needs a repeatable workflow, e.g. `skills/stripe-billing`, `skills/twilio-messaging`, `skills/supabase-backend`.
- **Existing skill reference**: use when the knowledge extends an existing workflow, e.g. `skills/devops/references/cloudflare-dns.md` or `skills/integrator/references/stripe.md` if an integrator reference folder exists.
- **Project runbook**: use when the details are project-specific, account-specific, or unlikely to generalize.
- **Support script/template**: use when deterministic commands reduce future error, e.g. webhook signature test script, environment validator, CLI bootstrap script.

Reusable provider docs should include: trigger/use case, exact setup steps, auth model, required scopes, safe secret handling, integration snippets or command templates, verification steps, common errors, cleanup/revocation, and official source links.

## Follow-Up Issue Triggers

Create a follow-up issue instead of silently leaving work incomplete when:

- Required credentials, admin access, domain verification, or OAuth approval is missing.
- The recommended option requires a paid plan, billing owner approval, contract, or usage-risk decision.
- The tool handles regulated/sensitive data and needs privacy, security, DPA, or data residency approval.
- Production verification cannot be completed because callbacks, deploys, DNS, or provider events are unavailable.
- Provider limits/quotas may block the product at expected usage.
- A temporary sandbox/test resource, token, or webhook must be cleaned up later.
- Tool-specific skill/support documentation is valuable but out of scope for the immediate integration.

Follow-up issues should include owner, blocker, exact next action, provider URL, needed role/scope/plan, and how to verify completion.

## Pitfalls

- Do not choose a tool solely because it has a popular SDK; match the product constraints and operating model.
- Do not ask the user for one credential at a time when the full integration clearly needs workspace, billing, secret, webhook, and deployment access.
- Do not paste secrets into docs, issue bodies, logs, screenshots, or committed fixtures.
- Do not perform billing-sensitive operations, send real customer communications, charge payment methods, or enable production automation without explicit user confirmation.
- Do not skip verification because a dashboard shows a green check; test the path the product actually uses.
- Do not let provider-specific lessons disappear into chat history; capture them as project docs, support files, or skills.

## Verification Checklist

- [ ] Options researched or mandated tool constraints recorded.
- [ ] Cost, plan limits, privacy/data handling, and integration risks documented.
- [ ] Account/workspace/project/auth prerequisites checked.
- [ ] Secrets stored outside source control; only names/references documented.
- [ ] SDK/API/CLI/webhook/config integration implemented with tests or smoke checks.
- [ ] Provider access and product behavior verified with concrete commands/results.
- [ ] Project documentation updated.
- [ ] Reusable provider knowledge captured as a skill/support file when warranted.
- [ ] Follow-up issues created for missing credentials, paid-plan decisions, approvals, or incomplete verification.
