---
name: agent-identity-and-access
description: "Use when setting up or maintaining an agent-owned project identity for SSO, OAuth/delegated access, signed-in browser sessions, service signups, notifications, and email communication."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, identity, access, oauth, sso, email, integrations]
---

# Agent Identity and Access

## Overview

Own the project agent's operational identity. A project agent needs a stable account that can receive service notifications, sign in to SaaS tools, approve OAuth/delegated access with the user's help, keep an isolated browser session signed in, and send email as the project agent when appropriate.

This skill keeps identity and access setup safe and repeatable. The user owns the account and sensitive recovery paths; the agent uses official OAuth, delegated mailbox, browser profile, or service-specific authorization flows. Never treat passwords, cookies, backup codes, recovery codes, or raw long-lived tokens as normal chat text or source-controlled project artifacts.

## When to Use

Use this skill when:

- Starting a new project that needs third-party tools, analytics, support inboxes, alerts, calendars, Drive docs, app-store/vendor accounts, or email reporting.
- A project needs a dedicated Gmail/Google Workspace identity for Sign in with Google / SSO.
- The agent needs OAuth, device-code, delegated mailbox, service-specific Google authorization, or CLI/browser login.
- The agent must keep a browser profile signed in so it can use Google SSO across services.
- The agent will email the user, collaborators, testers, vendors, support channels, or service providers.
- Another skill (`project-manager`, `integrator`, `devops`, `marketer`, etc.) needs account identity or access before continuing.

Do not use this skill to bypass security controls, collect passwords, store raw tokens, or take ownership of a user's personal account. Use organization-owned Workspace accounts/aliases when available.

## Core Principles

- **Dedicated identity by default:** Use a project/agent-owned Google account or Workspace alias instead of a user's personal inbox when possible.
- **User-owned recovery:** The user or organization owns account recovery, 2FA, billing approvals, and emergency lockout paths.
- **OAuth over secrets:** Prefer official OAuth/delegated-access/device-code flows over passwords, cookies, app passwords, or raw tokens.
- **Least privilege:** Request only scopes and roles needed for the immediate task; expand later only with a reason.
- **Session isolation:** Use a dedicated browser profile for the agent identity so Google SSO does not mix with the user's personal browsing session.
- **Durable but non-secret records:** Record account email, purpose, granted scopes, access method, browser profile path/name, verification evidence, and follow-up tasks. Never record secrets.

## Project Identity Record

Create or update a project runbook, PRD operations section, or issue with this non-secret identity block:

```yaml
agent_identity:
  google_account: <project-agent@gmail.com or workspace alias>
  account_owner: <user/org owner>
  recovery_owner: <user/org owner>
  purpose:
    - SSO/signups for project services where Google login is acceptable
    - analytics/billing/support/vendor/service notifications
    - project email communications with user, collaborators, vendors, support, and testers
  email_access_method: <Hermes email integration | delegated mailbox | not configured yet>
  oauth_status: <not requested | user action needed | granted | expired | revoked | failed>
  oauth_scopes: <scopes actually granted, not requested-by-default wish list>
  oauth_access_path: <OAuth consent URL | device-code flow | delegated mailbox setup | service-specific auth flow>
  browser_sso_status: <not configured | user action needed | signed in | expired | blocked>
  browser_profile: <profile name/path or managed browser session label>
  last_verified: <date/time + verification action>
  security_notes: <2FA/recovery/access boundaries, no secrets>
```

If the account does not exist, ask for it and create a setup issue. Continue with non-blocked planning, but do not pretend email, SSO, or OAuth access is configured.

## Account Setup Ask

When no dedicated identity is documented, ask the user once with a concrete request:

```text
Please create or confirm a dedicated Google account for this project/agent, such as <project-agent>@gmail.com or a Workspace alias if you have a domain. I will use it as the agent-owned identity for Sign in with Google/SSO, project service notifications, and project email communications.

Please keep the password, recovery email/phone, backup codes, and 2FA ownership with you or the organization. Do not send me those secrets. After the account exists, I will ask you to approve specific OAuth/delegated-access or browser sign-in steps so I can operate the account safely.
```

Prefer Workspace aliases/groups when a project has a domain. Use personal user accounts only when explicitly approved or required by a provider.

## Chat-Based OAuth / Delegated Access Workflow

OAuth often requires human approval. Handle it as a short, explicit chat workflow instead of asking for passwords.

### 1. Prepare the consent request

Before asking the user to act:

- Identify the tool or service that needs access.
- Identify the account that should approve the request.
- Determine the narrowest practical scopes or role.
- Explain why each scope is needed in plain language.
- Prefer read/status or send-only scopes before broad read/write/admin scopes.
- Confirm whether the flow is OAuth browser consent, device code, delegated mailbox, service account grant, CLI login, or provider-specific auth.

### 2. Ask the user to complete a few actions over chat

Use this template and fill it with exact service/account/scope details:

```text
I need your help completing OAuth/delegated access for <project/service>.

Please do these steps:
1. Open this authorization link or device-code page: <url or provider page>.
2. Sign in as <agent_google_account>, not your personal account.
3. Confirm the app/service name is <expected app/service/client name>.
4. Review these requested permissions:
   - <scope/permission>: <why it is needed>
   - <scope/permission>: <why it is needed>
5. Approve only if the scopes match this list.
6. Tell me “done” when the approval is complete, or paste only the non-secret device code/result message if the tool explicitly asks for that.

Do not send me the password, recovery codes, backup codes, cookies, or raw OAuth tokens.
```

If the flow prints a device code, share the code only when the provider's official device-flow instructions say the code is intended to be typed by the user. Treat access tokens, refresh tokens, cookies, client secrets, and app passwords as secrets; do not ask the user to paste them into chat.

### 3. Wait and verify

After the user says the flow is complete:

- Run a harmless verification: `whoami`, account profile read, mailbox label/list read, draft creation, send test to an approved address, calendar list, Drive file metadata read, provider project list, or equivalent.
- Verify the returned account matches `agent_google_account`.
- If verification fails, report the exact failure and ask for the smallest next user action.
- Record `oauth_status`, `oauth_scopes`, `oauth_access_path`, and `last_verified` in the project identity record.

### 4. Reauthorization and revocation

If consent expires, is revoked, or switches accounts:

- Mark `oauth_status: expired`, `revoked`, or `failed`.
- Stop OAuth-dependent work until reauthorized.
- Create or update a setup issue with the exact flow to repeat.
- If access is no longer needed, ask the user to revoke it and record the revocation.

## Signed-In Browser SSO Workflow

Some services only support dashboard setup or Sign in with Google. Keep a dedicated browser session signed in to the agent identity so the agent can use SSO without touching the user's personal session.

### Browser session rules

- Use a dedicated browser profile/session for the project agent identity. Do not reuse the user's personal Chrome profile unless the user explicitly requests it.
- Name/label the profile clearly: `<project>-agent-google` or similar.
- Keep the browser session isolated from unrelated projects unless the account is intentionally a portfolio-wide agent identity.
- Never export, commit, or paste browser cookies, session storage, local storage, or profile data.
- If a login requires password/2FA/passkey/CAPTCHA, pause and ask the user to complete that step in the browser; do not ask for the secret in chat.
- Use signed-in browser SSO for services that support Google login, but still check the selected Google account and workspace before creating resources.

### Ask the user to sign in over chat

```text
I need the agent browser profile signed in as <agent_google_account> so I can use Sign in with Google for project services.

Please do these steps:
1. Open or let me open the dedicated browser profile named <profile/session label>.
2. Sign in to Google as <agent_google_account>.
3. Complete any 2FA/passkey/recovery/CAPTCHA prompts yourself.
4. Leave the browser signed in; do not send me passwords, cookies, backup codes, or recovery codes.
5. Tell me when the Google account avatar/account switcher shows <agent_google_account>.

I will then verify with a harmless account page or by opening the target service's Sign in with Google flow and confirming the selected account.
```

### Verify browser SSO

- Open a Google account page, Gmail, or the target service's account chooser and verify the visible account is `agent_google_account`.
- For each new service signup, confirm service name, workspace/project name, account email, selected plan/free tier, and requested permissions before proceeding.
- Avoid enabling paid plans, billing, or domain-wide permissions without explicit user approval.
- Record `browser_sso_status: signed in`, profile/session label, and verification evidence.

### Maintaining the browser session

- Prefer leaving the dedicated browser profile signed in if the user wants ongoing SSO automation.
- If the profile signs out or hits a security challenge, ask the user to reauthenticate with the same safe chat template.
- When a project ends or access should be reduced, sign out of services or ask the user to revoke sessions from Google Account security settings, then update the identity record.

## Email Communication Identity

When the agent emails the user or others on behalf of a project, use the configured agent identity whenever possible.

Rules:

- Send from the dedicated agent/project account or approved delegated mailbox, not the user's personal inbox by default.
- Make the sender identity clear in the email body/signature: project/agent name, purpose, and how to reply.
- Use the agent identity for status reports, vendor/support threads, tester coordination, app-store/provider communications, and service notifications.
- Before emailing external recipients, confirm recipient, purpose, tone, and whether the message can be sent now unless the project has an explicit standing communication policy.
- Record important sent-email context in the durable project issue/status system: recipient group, subject, date, purpose, and evidence/link when available.
- If email OAuth/delegation is missing, create a setup task and ask the user to complete the required authorization flow; do not send from a fallback personal account unless the user explicitly approves.

## Third-Party Service Signup / SSO Rules

When using the agent identity to create or access SaaS tools:

1. Check the project docs for an existing approved provider/account first.
2. Prefer cost-effective/free-tier tools that meet project requirements, but surface paid-plan triggers before enabling billing.
3. Use `integrator` for provider research and implementation details when the service setup is more than a simple login.
4. Sign in with Google using the dedicated browser profile or OAuth flow.
5. Verify the selected Google account is the agent identity before continuing.
6. Record non-secret identifiers: service name, account email, workspace/project ID, plan, admin URL, owner, and billing status.
7. Do not store raw secrets in project docs; store only secret names/locations and owner.

## Common Pitfalls

1. **Asking for passwords instead of OAuth.** Ask for consent/link/device-code actions, not passwords, cookies, app passwords, backup codes, or raw tokens.
2. **Using the wrong Google account.** Always verify account email in OAuth results, browser account switcher, or provider account settings.
3. **Overbroad scopes.** Start with least privilege and explain each scope. Broad Gmail/Drive/admin scopes require a clear reason.
4. **Mixing browser profiles.** A signed-in personal browser session can create resources under the wrong owner. Use a dedicated profile/session.
5. **Assuming OAuth worked.** Always perform a harmless verification and record evidence before reporting access is ready.
6. **Forgetting revocation/expiry.** Mark expired/revoked access and create follow-up setup work; do not keep retrying failed calls as if access exists.

## Verification Checklist

- [ ] Project has an `agent_identity` record or a setup issue exists.
- [ ] User owns account recovery/2FA; no passwords, cookies, raw tokens, backup codes, or recovery codes were requested or stored.
- [ ] OAuth/delegated access was requested through official flow with least-privilege scopes and plain-language scope rationale.
- [ ] User completed consent/device-code/browser/delegated access steps over chat without sharing secrets.
- [ ] Access was verified with a harmless status/read/draft/test action and account email matched the agent identity.
- [ ] Dedicated browser profile/session is signed in as the agent identity when SSO is needed, or a setup issue exists.
- [ ] Browser SSO profile/session label and verification evidence are recorded without cookies/session data.
- [ ] Email communications use the configured agent identity or are blocked pending access/user approval.
- [ ] Third-party service signups record non-secret account/workspace/plan/billing identifiers and avoid unapproved paid plans.
