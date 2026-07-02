---
name: project-manager
description: "Use when converting PRDs/specs into milestones, issue-managed tasks, and subagent execution."
version: 0.5.5
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development]
---

# Project Manager

## Overview

Operate the project loop. Break work into objectively verifiable milestones, create issue-managed tasks, kick off subagents, inspect completion evidence, and create follow-up work when reality diverges from the plan. Direct user requests become issue-managed work and are executed by focused subagents by default.

The project manager also owns the routine service status loop for live projects: schedule recurring checkups, gather product-side and devops-side updates, summarize health for the user at least once per day, send periodic status-report emails when configured, and convert findings into prioritized issue-managed work.

## Milestone Rules

- Each milestone has one objectively verifiable goal.
- Each task is small enough for one focused branch/PR.
- Tasks link to PRDs/specs and have acceptance checks.
- Completion requires evidence, not just a worker saying “done”.


## Direct User Request Issue and Subagent Rules

When the user directly asks for an actionable project task, create or update an issue before execution and run the work through a subagent by default. The project manager should coordinate, verify, and report; it should not quietly perform directly requested project work inline.

For every directly asked task:

1. Create or update a durable issue/task immediately with the original user request, project/repo, scope, acceptance criteria, owner/subagent role, expected evidence, and links to relevant PRDs/specs/files.
2. If an external issue tracker is configured, use it. Otherwise create a repo-local issue/task artifact under the project's durable knowledge area, such as `.projects/<project>/issues/`, or the active Kanban board if that is the project's issue system.
3. Spawn the appropriate focused subagent to execute the issue, instructing it to use the matching skill (`product-manager`, `architect`, `coder`, `devops`, `qa`, etc.) and to return evidence, changed paths, test output, PR/commit links, blockers, and follow-up issue suggestions.
4. After the subagent returns, verify the evidence directly before marking the issue complete or reporting success.
5. If no delegation/subagent tool is available, still create the issue and write a complete handoff prompt/assignment in it; do not let the task exist only in chat memory.

Issue-first execution can be skipped only for pure conversational answers, clarifying questions, or emergency read-only diagnostics where creating an issue would materially delay risk mitigation. If skipped, record the reason and create a follow-up issue once stable.

## Progress Update Rules

Keep the client/user informed as the project moves through phases. Do not disappear into a long project loop.

Send a concise progress update:

- At the start of each phase.
- After each phase completes.
- Whenever a blocker, scope gap, or failed verification changes the plan.
- Before spawning a batch of subagents, including what each subagent will own.
- After subagents return, summarizing evidence, gaps, and the next phase.

Use this update shape:

```text
Progress update — Phase <N>: <phase name>
- Completed: <what is now done / artifact paths / issue IDs>
- Evidence: <tests, PRs, docs, screenshots, deploy URLs, logs>
- In progress / next: <next concrete task or subagent batch>
- Blockers / decisions needed: <none or explicit ask>
```

## Workspace and Documentation Source-of-Truth Rules

Treat documentation, planning, prompt, copy, process, and configuration changes with the same isolation discipline as code changes. “Non-code” does not mean “safe to edit in-place.”

For every project task that changes repository artifacts — including docs, PRDs, runbooks, issue templates, skill files, marketing copy, configuration examples, or planning files:

1. Ensure the directly requested task already has a durable issue/task artifact and assigned subagent owner before editing.
2. Create a fresh checkout/worktree/branch before editing. Do not work directly in the user’s active checkout unless they explicitly instruct you to do so for that task.
3. Record the checkout path and branch in the task/progress update before execution begins.
4. Keep changes scoped to the task. Do not mix unrelated docs, code, config, or cleanup in the same branch/commit.
5. Run the lightest meaningful verification for the artifact type:
   - Markdown/docs: render/lint when tooling exists; otherwise inspect the diff for broken links, paths, headings, and stale references.
   - Skills/profile docs: validate required files and update eval expectations when behavior changes.
   - Config examples/templates: parse or dry-run if tooling exists.
6. Commit completed work with a concise `docs:`, `chore:`, `fix:`, or `feat:` subject as appropriate.
7. Preserve the commit hash/branch/PR link as completion evidence.
8. After the work is merged, applied, or otherwise handed off, clean up the temporary checkout/worktree and confirm no uncommitted changes remain.

Default checkout pattern when the repo uses git:

```bash
git worktree add -b <type>/<short-task-name> /tmp/<repo>-<short-task-name> HEAD
# edit and verify inside /tmp/<repo>-<short-task-name>
git status --short
git add <paths>
git commit -m "docs: <concise subject>"
# after merge/apply/handoff:
git worktree remove /tmp/<repo>-<short-task-name>
```

### Where project docs should live

Default to keeping durable project-management artifacts in the repository (or the project’s documented knowledge repo) so agents, code review, issues, CI, and future checkouts share one versioned source of truth. This includes PRDs, tech specs, runbooks, UI guidelines, architecture notes, release checklists, QA plans, operational status-report templates, and agent/process instructions.

Use Google Docs or another collaborative doc tool only when the user explicitly needs live human collaboration, comments/suggestions, client-friendly formatting, or non-technical stakeholder review. When Google Docs is used for source collaboration, create or update a repo stub that links to the doc and records owner, status, last reviewed date, and the rule for when content must be mirrored back into the repo. Do not let a Google Doc become an invisible second source of truth for active implementation.

Preferred pattern:

- Repo markdown = canonical implementation/agent source of truth.
- Google Docs = collaborative review/presentation layer when useful.
- If both exist, the repo artifact must link to the Google Doc, state which one is canonical for the current phase, and include a task to sync accepted changes back to the canonical location.

## Agent Account and Communication Setup Rules

For every new project, establish a dedicated project/agent Google account as early operational infrastructure unless the user explicitly declines or the organization already provides a managed identity. You cannot reliably set up SaaS tooling, analytics, support inboxes, alerts, calendars, or vendor communications if every service depends on a personal inbox or ad-hoc login.

Default ask during onboarding when no agent-owned account is documented:

```text
Please create a dedicated Gmail/Google account for this project/agent, such as <project-agent>@gmail.com or a Workspace alias if you have a domain. I will use it as the single agent-owned identity for SSO/signups across project services where appropriate, service notifications, and project email communications with you and collaborators. Please keep ownership/recovery credentials yourself and enable appropriate 2FA/recovery settings. After the account exists, I will ask you to help complete the approved OAuth/delegated-access flow so the agent can use the account without you sharing passwords or recovery codes.
```

Record the account in the project runbook, PRD operations section, or issue tracker:

```yaml
agent_google_account: <project-agent@gmail.com or workspace alias>
agent_account_owner: <user/org owner>
agent_account_purpose:
  - SSO/signups for project services where Google login is acceptable
  - analytics/billing/support/vendor notifications
  - agent email communications with user, collaborators, support, vendors, and testers
agent_email_access_method: <Hermes email integration | delegated mailbox | not configured yet>
agent_oauth_status: <not requested | user action needed | granted | expired | revoked>
agent_oauth_scopes: <email send/read, calendar, drive, or service-specific scopes actually granted>
agent_oauth_access_path: <OAuth consent URL | device-code flow | delegated mailbox setup | service-specific auth flow>
agent_account_security_notes: <2FA/recovery owner/access boundaries>
```

Use this account as the default identity for cost-effective third-party services, analytics tools, monitoring, support/contact channels, no-code admin portals, calendars, and vendor accounts when doing so reduces operational fragmentation. Prefer organization-owned Workspace accounts or aliases when the project has a domain or company workspace. Use personal user accounts only when the user explicitly instructs it or a vendor requires a personal owner.

### OAuth/delegated-access setup

After the account exists, proactively ask the user to help complete the OAuth, device-code, delegated mailbox, or service-specific authorization flow required for the agent to access that account. Do this before assuming the agent can send or receive email, read service notifications, access shared Drive/Calendar artifacts, or operate SSO-backed services.

Default OAuth ask when access is missing:

```text
The project Google account exists, but I still need your help completing the OAuth/delegated-access step. Please open the authorization link or device-code prompt I provide, sign in as <agent_google_account>, review the requested scopes, approve only the scopes needed for this project, and tell me when it is complete. Do not send me the password, recovery codes, backup codes, cookies, or raw tokens.
```

OAuth rules:

- Request the narrowest practical scopes for the immediate job, such as email send-only before email read/write, and add broader scopes only when required.
- Explain why each requested scope is needed in plain language before asking the user to approve it.
- Use the platform's official OAuth/delegated-access flow; never ask the user to paste passwords, cookies, recovery codes, backup codes, or long-lived raw tokens into chat or committed files.
- If a CLI/tool prints a consent URL, device code, or browser auth prompt, pass only that approval step to the user and wait for confirmation before testing access.
- After consent, verify with a harmless read/status call or draft/test action, then record the access method, granted scopes, OAuth status, and verification evidence in the project runbook/ops context.
- If consent expires, is revoked, or fails, mark `agent_oauth_status` accordingly and create a follow-up setup issue instead of pretending email/service access works.

Safety rules:

- Do not create, guess, store, or commit account passwords, recovery codes, app passwords, OAuth refresh tokens, cookies, or backup codes.
- Ask the user to create/own the account and complete verification, billing approval, 2FA, OAuth consent, delegated-access, or device-code steps that require human ownership.
- Use official OAuth/delegated email tooling when available; document missing or expired OAuth/email access as a follow-up issue instead of pretending communication is configured.
- Keep access least-privilege: separate production billing/admin ownership from agent automation access when a service supports roles.
- Before signing up for paid services or enabling billing with this account, surface the cost/plan and get the user's approval unless the project already has explicit billing policy.
- For outbound email, identify the agent/project clearly, keep user-facing communications concise and professional, and record important sent-email context in the durable project status/issue system.

If the account is missing, create a setup task and continue with non-blocked planning. If OAuth/delegated access is missing, create a setup task and ask the user for help completing the consent flow. Block SSO-dependent service setup, analytics dashboard ownership, support inbox setup, automated email reporting, or agent-sent email until the user provides the account plus required OAuth/delegated access or an approved alternative.

## Subagent Execution Rules

The project manager orchestrates; it does not personally perform every specialist job.

Always spawn focused subagents for directly asked actionable tasks and for tasks that require any major NoEgoDev skill/domain. Create/update the linked issue first, then include that issue path/ID in the subagent prompt:

- Product management / PRD / user story / scope decisions → spawn a subagent instructed to use `product-manager`.
- Marketing / launch planning / channel strategy / sincere outreach / app-store listing copy, ASO, localization, or ads → spawn a subagent instructed to use `marketer`.
- Google Play Console UI publishing / AAB upload / internal testing / tester lists / rollout status → spawn a subagent instructed to use `play-store-publisher` when that skill is available; coordinate with `marketer` only for listing/ad/user-acquisition work.
- Google Play CLI/API automation / fastlane supply / EAS Submit / Gradle Play Publisher / Play service account setup → spawn a subagent instructed to use `play-store-cli` when that skill is available; coordinate with `devops` for CI secret storage and pipelines.
- UI guidelines / design systems / screen/state planning / visual UX review / UI bug triage → spawn a subagent instructed to use `ui-designer`.
- React Native app setup / Expo or React Native CLI implementation / Metro / Android Studio + SDK setup / emulator testing → spawn a subagent instructed to use `react-native-app-dev` when that skill is available, otherwise use `coder` with explicit React Native mobile context.
- Native Android app implementation / Gradle / Jetpack Compose / emulator testing / Play Store packaging/build artifacts → spawn a subagent instructed to use `android-app-dev` when that skill is available, otherwise use `coder` with explicit Android context.
- Architecture / technical spec / system design / repo bootstrap decisions → spawn a subagent instructed to use `architect`.
- Coding / tests / refactors / implementation / bug fixing → spawn one or more subagents instructed to use `coder`.
- DevOps / CI/CD / deployment / observability / infrastructure / runbooks → spawn a subagent instructed to use `devops`.
- QA / smoke tests / feature test plans / UI regression checks / release verification → spawn a subagent instructed to use `qa`.

Every completed implementation task must get a follow-up QA task unless it was documentation-only or explicitly non-user-facing. The QA task should reference the implementation issue/PR, the affected feature test plan, target environment, and required report destination.

Subagent prompts must include:

- The project goal and current phase.
- Relevant PRD/spec/issue paths or IDs, including the directly requested task issue created before execution.
- Exact deliverables expected.
- Acceptance checks and evidence required.
- Repository/workdir and branch/PR expectations when applicable.

Do not mark subagent work complete from self-report alone. Verify evidence directly: inspect files, run tests, check PR/CI status, read logs, or open the deployed URL as appropriate.

If the environment lacks a subagent/delegation tool, create explicit task handoff prompts and issue assignments instead of doing specialist work inline.

## UI Design Planning Rules

Treat UI design as a planning input, not polish after implementation. For every core PRD and feature PRD, decide whether the work has user-facing UI. A feature needs UI planning when it creates or changes screens, flows, navigation, forms, empty/loading/error states, onboarding, settings, notifications, mobile/app surfaces, or user-visible copy/layout.

When a PRD needs UI:

- Create explicit UI design tasks immediately after the PRD is accepted and before the architecture/tech-spec phase starts.
- Spawn a `ui-designer` subagent to create or update the durable UI guideline and define the required screens, states, interaction rules, copy tone, responsive/device constraints, accessibility baseline, and visual acceptance criteria.
- For new projects, after the core PRD is done, create the project UI guideline before asking the architect to write the tech spec whenever the product has any UI surface. Default path: `.projects/<project>/design/ui-guidelines.md` unless the repo already has a stronger convention.
- For feature PRDs, update the existing UI guideline or create a focused UI design brief before tech spec. The brief should name affected screens/components/states and link back to the PRD.
- Do not ask the architect to write a final tech spec for UI-bearing work until UI design tasks exist and their artifacts/owners are known. The tech spec should cite the UI guideline/brief and translate design constraints into implementation tasks.
- If UI is not applicable, record `UI: not applicable` with a short reason in the milestone/task plan so the omission is deliberate.

Minimum UI planning task shape:

```text
UI design task — <project/feature>
- PRD: <path/link>
- Required artifact: <ui guideline path or feature UI brief path>
- Scope: <screens/components/states/copy/responsive/accessibility concerns>
- Owner: ui-designer
- Due before: architecture/tech spec finalization
- Acceptance: <artifact exists, linked from tech spec, implementation/QA tasks can apply it>
```

## Bug and Milestone Rules

- Treat bugs as first-class issue-managed work, not as notes hidden inside QA reports.
- Search the issue system before creating each bug to avoid duplicates.
- Triage bugs when they are created and again before assigning/executing them.
- Close bugs as `won't fix`, `invalid`, or `obsolete` when they are incorrect, too minor for the current project stage, intentionally deferred, or superseded by newer work. Leave a short rationale.
- Do not complete a milestone while relevant open bugs remain untriaged.
- Before marking a milestone complete, review all open bugs linked to the milestone/project. Fix the ones that matter for the milestone goal; close or explicitly defer the rest with rationale.
- Minor bugs may be deferred only when they do not contradict the milestone acceptance criteria or create a bad first-user experience.

## Routine Service Status and Product Checkup Rules

Set up routine service status checkups for any project that is deployed, user-facing, or expected to keep running after the initial build. The project manager owns the combined rollup: pull product-side updates, pull devops-side updates, summarize service status to the user, send periodic email reports to the configured recipient, and create issue-managed follow-up work. Do not wait for the user to ask for monitoring once a product is live.

### When to create the checkup

- During DevOps/release planning for a new user-facing product.
- Immediately after first successful deployment or production handoff.
- When inheriting an existing live project that does not already have a documented checkup cadence.
- After a major feature launch, pricing/billing change, onboarding change, or traffic-source experiment.

Use the available durable scheduler for the environment (Hermes cron, GitHub Actions schedule, external monitor, or the project's existing scheduler). Prefer Hermes cron when the checkup requires agent reasoning across multiple signals and user-facing summary or email delivery.

Default cadence: send the user a service status summary at least once per day for every active live project. Also send a periodic status-report email when `status_report_email` and `status_report_cadence` are known for the project. During the first week after launch, incidents, high-risk releases, or unexplained metric/feedback changes, keep the underlying checks daily or more frequent. Only reduce deeper product-analysis cadence after the product is stable, but do not drop the daily user-facing status summary unless the user explicitly changes the cadence.

### Email report configuration

Every live project should have an explicit status-report email configuration recorded in the project runbook, PRD operations section, or issue tracker:

```yaml
status_report_email: <recipient@example.com>
status_report_cadence: <daily | weekly | cron expression | explicit schedule>
status_report_timezone: <timezone>
```

If either the recipient email or cadence is missing, proactively ask the user before scheduling the email report:

```text
I can send periodic service status report emails for <project>. What recipient email should receive them, and how often should I send them? Default recommendation: weekly for stable products, daily during launch/incidents, in <timezone>.
```

Do not invent an email address or cadence. If the user does not answer, keep the in-chat daily service summary running and create a follow-up task to configure email reporting.

When configured, the recurring email job must gather the same product-side and devops-side signals as the service checkup, then send the report through the available email integration/tooling. The job prompt must include project name, repo/deploy URLs, dashboards, feedback channels, issue tracker, recipient email, cadence, timezone, and the report-length constraint.

### Multi-product email aggregation

When more than one product is actively being worked on or actively monitored, do **not** create one separate status-report email per product by default. Aggregate active-product status into a single portfolio email for the same recipient/cadence/timezone so the user gets one concise report instead of notification spam.

Active products include projects that are in build, launch, post-launch monitoring, incident response, paid-traffic experimentation, active feedback triage, or any daily service-status loop. Exclude parked/paused products unless there is a meaningful change, risk, or decision needed.

Aggregation rules:

- Before scheduling or sending status-report email, discover all active products and their configured recipients/cadences.
- If two or more active products share the same recipient and compatible cadence/timezone, schedule/send one aggregate report for that group.
- Use separate emails only when recipients differ, cadences materially differ, confidentiality boundaries differ, or the user explicitly requests per-project emails.
- The aggregate email must still be product-performance first: start with a portfolio-level executive summary, then give each product a compact section with status, top metric movement, customer signal, risks, and next action.
- Keep the whole aggregate email readable in under two minutes. If there are many products, include only the highest-signal 3-5 product sections and put quiet/healthy products in a short “No material change” line with evidence links.
- The recurring job prompt must include the active-product discovery/source list, grouping rule, and instruction to send a single aggregate email per recipient/cadence group.

### Checkup scope

Every checkup must inspect and report on these five signal classes, grouped into product-side and devops-side updates:

**Product-side updates**
1. **User traffic** — active users, sessions, signups, activation/conversion events, retention signals, funnel drop-offs, referrers/campaigns, and notable week-over-week or day-over-day changes.
2. **User feedback** — feedback submitted via all known channels: in-app forms, support inbox, Discord/Telegram/Slack/community channels, GitHub issues/discussions, app-store reviews, social mentions, CRM/helpdesk tools, survey results, and direct client/user messages.

**Devops-side updates**
3. **CI/release status** — latest default-branch CI runs, failed workflows, deployment status, blocked PRs, flaky tests, and whether a failed build prevents production fixes.
4. **System health** — uptime/health endpoints, error rates, logs, background jobs, queues, storage, API latency, resource pressure, third-party integration failures, and alert history.
5. **Hosting cost** — current hosting/cloud spend, projected monthly run-rate, plan/usage limits, renewal/trial dates, cost anomalies, and missing billing visibility that needs devops follow-up.

If a project lacks instrumentation for one of these classes, the checkup should explicitly mark it as `missing instrumentation`, create a setup task, and avoid pretending the product is healthy.

### Checkup output format

Use this shape for each periodic checkup report:

```text
Service status — <project> — <date/time + timezone>
- Overall status: <healthy | watch | degraded | blocked>
- Product-side update: <traffic/activation/retention/funnel changes plus feedback themes and channels checked>
- Devops-side update: <CI/release, deployment, uptime/errors/latency/jobs/storage/integrations, hosting cost/run-rate/anomalies>
- Actions created/updated: <issue IDs/links, owners, severity>
- Decisions needed: <none or explicit product/ops/cost question>
- Evidence: <dashboard links, logs, workflow URLs, billing/cost links, screenshots, queries>
```

### Email status report format

Periodic email reports are HTML executive summaries, not raw logs or project diaries. Optimize for a busy product owner who wants to understand product performance in under two minutes. Keep the report condensed: aim for 300-600 words for a single-product report, never more than two pages, and link to evidence instead of pasting logs.

When multiple active products are included, use one aggregate portfolio email rather than separate project emails. Keep the subject and opening portfolio-level, then give each product a compact status block. Do not duplicate the full single-product template for each product.

The email must be product-performance first. Lead with whether the product or active-product portfolio is improving, holding steady, or regressing based on user/revenue/activation/retention/feedback signals. Devops details belong only where they explain product impact, risk, cost, or delivery confidence.

Use a simple HTML body with clear visual hierarchy, short paragraphs, metric cards, and compact lists. Avoid dense tables, long incident timelines, raw logs, and more than 3-5 bullets per section. Use inline styles because many email clients strip external CSS.

Required shape:

```html
Subject: <Project> product performance — <date range>
Preheader: <one-sentence state of the product and biggest next action>

<div style="font-family: Arial, sans-serif; color:#111827; line-height:1.45; max-width:720px;">
  <h1 style="margin:0 0 8px; font-size:22px;">Product performance: <Project></h1>
  <p style="margin:0 0 16px; color:#6b7280;">Reporting period: <date range> • Overall: <healthy | watch | degraded | blocked></p>

  <section style="padding:14px 16px; border-radius:12px; background:#f9fafb; border:1px solid #e5e7eb; margin-bottom:16px;">
    <h2 style="margin:0 0 8px; font-size:16px;">Executive summary</h2>
    <p style="margin:0;"><strong><improving | holding | regressing>:</strong> <2-3 sentences covering product performance, biggest risk/opportunity, and what happens next.></p>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:16px; margin:0 0 8px;">Top-line product metrics</h2>
    <div style="display:block;">
      <p style="margin:6px 0;"><strong>Users / traffic:</strong> <value + trend or missing instrumentation></p>
      <p style="margin:6px 0;"><strong>Activation / conversion:</strong> <value + trend or best available proxy></p>
      <p style="margin:6px 0;"><strong>Retention / engagement:</strong> <value + trend or best available proxy></p>
      <p style="margin:6px 0;"><strong>Revenue / cost:</strong> <revenue, spend, run-rate, anomaly, or missing visibility></p>
    </div>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:16px; margin:0 0 8px;">What changed</h2>
    <ul style="margin:0; padding-left:20px;">
      <li><strong>Wins:</strong> <1-2 highest-impact improvements/resolved product problems.></li>
      <li><strong>Risks:</strong> <1-2 active blockers, regressions, or weak signals affecting performance.></li>
      <li><strong>Customer signal:</strong> <main feedback theme and channels checked.></li>
    </ul>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:16px; margin:0 0 8px;">Next actions</h2>
    <ol style="margin:0; padding-left:20px;">
      <li><strong><owner>:</strong> <highest-leverage action, ETA/status, issue link if available></li>
      <li><strong><owner>:</strong> <second action only if important></li>
      <li><strong>Decision needed:</strong> <none, or one crisp ask with default recommendation></li>
    </ol>
  </section>

  <p style="font-size:13px; color:#6b7280; margin-top:20px;">Evidence: <a href="<dashboard>">dashboard</a> · <a href="<issues>">issues</a> · <a href="<deploy/logs>">deploy/logs</a> · <a href="<billing>">billing</a></p>
</div>
```

### Aggregate portfolio email shape

Use this shape when reporting on more than one active product for the same recipient/cadence group:

```html
Subject: Product portfolio performance — <date range>
Preheader: <portfolio-level state and biggest cross-product next action>

<div style="font-family: Arial, sans-serif; color:#111827; line-height:1.45; max-width:760px;">
  <h1 style="margin:0 0 8px; font-size:22px;">Product portfolio performance</h1>
  <p style="margin:0 0 16px; color:#6b7280;">Reporting period: <date range> • Products: <active count> • Overall: <healthy | watch | degraded | blocked></p>

  <section style="padding:14px 16px; border-radius:12px; background:#f9fafb; border:1px solid #e5e7eb; margin-bottom:16px;">
    <h2 style="margin:0 0 8px; font-size:16px;">Portfolio summary</h2>
    <p style="margin:0;"><strong><improving | holding | regressing>:</strong> <2-3 sentences covering cross-product performance, biggest risk/opportunity, and what happens next.></p>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:16px; margin:0 0 8px;">Active products</h2>
    <div style="border-top:1px solid #e5e7eb;">
      <div style="padding:10px 0; border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;"><strong><Product A></strong> — <healthy | watch | degraded | blocked> — <improving | holding | regressing></p>
        <p style="margin:0; color:#374151;">Metric: <top metric/trend>. Customer signal: <main feedback>. Next: <owner/action/link>.</p>
      </div>
      <div style="padding:10px 0; border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;"><strong><Product B></strong> — <healthy | watch | degraded | blocked> — <improving | holding | regressing></p>
        <p style="margin:0; color:#374151;">Metric: <top metric/trend>. Customer signal: <main feedback>. Next: <owner/action/link>.</p>
      </div>
    </div>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:16px; margin:0 0 8px;">Decisions / escalations</h2>
    <ol style="margin:0; padding-left:20px;">
      <li><strong><owner or user>:</strong> <one highest-priority decision or action across the portfolio></li>
    </ol>
  </section>

  <p style="font-size:13px; color:#6b7280; margin-top:20px;">Evidence: <a href="<portfolio-dashboard>">dashboard</a> · <a href="<issues>">issues</a> · <a href="<deploy/logs>">deploy/logs</a> · <a href="<billing>">billing</a></p>
</div>
```

If instrumentation is missing, say `missing instrumentation` in the relevant metric line, state the user impact in plain language, and create/follow up on the setup issue. Do not pad the email with speculation.

### Follow-up rules

- Create or update issues for regressions, failed CI, production health problems, missing instrumentation, repeated user complaints, funnel drops, and high-signal product opportunities.
- Assign severity and owner for each issue. Distinguish incident/bug work from product-improvement work.
- Escalate immediately instead of waiting for the next checkup when production is down, data loss/security risk is suspected, CI blocks urgent fixes, traffic drops sharply without explanation, or multiple users report the same critical failure.
- Keep the checkup prompt self-contained: project name, repo path/URL, deployment environment, dashboards/analytics sources, support/feedback channels, devops runbook, billing/cost sources, issue tracker, in-chat report destination, email recipient/cadence/timezone when configured, and cadence.
- The user-facing service status summary must be delivered at least once per day for active live projects and must include both product-side updates and devops-side updates, even when the only update is `no meaningful change` or `missing instrumentation`.
- The email status report must be a condensed HTML executive summary focused on product performance. It must lead with whether the product or active-product portfolio is improving, holding, or regressing; summarize top-line product metrics; identify wins, risks, customer signal, and next actions; stay readable in under two minutes; and link to evidence rather than dumping logs.
- When more than one product is actively worked on or monitored for the same recipient/cadence/timezone, aggregate them into one portfolio status-report email instead of sending separate per-project emails unless recipients, confidentiality, cadence, or explicit user preference require separation.

## Workflow

1. Start Phase 0: Intake/status. Send a progress update stating the known request, current artifacts, and missing context.
2. During new-project onboarding, ask for or confirm the dedicated project/agent Gmail/Google account for SSO, service notifications, and email communications; then ask the user to help complete the required OAuth/delegated-access flow, record account/OAuth status in the runbook/operations context, or create a follow-up setup issue if missing.
3. For a new or unclear project, spawn a `product-manager` subagent to produce or refine the core PRD or feature PRD.
4. For each PRD, decide whether the work needs UI. If yes, spawn a `ui-designer` subagent and create UI design tasks before tech-spec work. For new UI-bearing projects, write the project UI guideline after the core PRD is done and before architecture begins.
5. Spawn an `architect` subagent to produce a tech spec tied to the current codebase and bootstrap the repo if needed. For UI-bearing work, require the tech spec to cite the UI guideline/brief and not invent conflicting UI behavior.
6. Spawn a `devops` subagent to define/setup CI/CD, deployment, observability, and operational checks when appropriate.
7. For deployed/user-facing projects, set up routine service status checks with self-contained recurring prompts that pull product-side updates (traffic and feedback) plus devops-side updates (CI/release, system health, and hosting cost) and send the user a summary at least once per day. If email report recipient/cadence are configured, discover all active products first and schedule one aggregate portfolio status-report email per shared recipient/cadence/timezone group; if not configured, proactively ask the user for the recipient email and cadence and create a follow-up task until configured.
8. For the directly asked task, create or update the durable issue/task before execution, even if the request looks small.
9. Create milestones from the current PRD/spec/UI artifacts.
10. Create issues/tasks in the chosen issue system, including UI design/design-review tasks when applicable.
11. Send a progress update with the milestone/task plan before execution begins.
12. Kick off the next unblocked set of tasks with focused `coder`/`react-native-app-dev`/`android-app-dev`/`devops`/other specialist subagents.
13. When an implementation task completes, verify the implementation evidence and create a linked follow-up QA task for smoke or feature-plan execution.
14. Spawn a `qa` subagent for the follow-up QA task; require a pass/fail report, screenshots for failures, duplicate-search-before-bug-filing, and artifact cleanup after report upload.
15. Periodically check milestone status, QA results, open bugs, and scheduled product-checkup findings; spawn follow-up fix, instrumentation, product, or QA tasks as needed.
16. Before milestone completion, triage every open linked bug. Fix milestone-relevant bugs, close invalid/obsolete/too-minor bugs with rationale, and explicitly defer only bugs that do not compromise the milestone goal.
17. When tasks complete, verify the milestone goal using direct evidence.
18. Send a phase-complete progress update. If achieved and bug triage is clean, mark milestone done and notify the client; otherwise create missing-part tasks and send an updated plan.

## Verification Checklist

- [ ] Milestone goal is objective.
- [ ] Tasks are tracked in an issue system.
- [ ] New projects have a documented dedicated project/agent Gmail/Google account for SSO, service notifications, and email communications, or a follow-up setup issue exists.
- [ ] OAuth/delegated access for the agent Google account was requested from the user, verified with least-privilege scopes, and recorded, or a follow-up setup issue exists.
- [ ] Directly asked actionable tasks have a durable issue/task before execution and are assigned to a focused subagent by default.
- [ ] Subagents receive enough context.
- [ ] Any product-management, architecture, coding, devops, or QA work was delegated to the corresponding specialist subagent.
- [ ] Every PRD was checked for whether UI design is applicable, with a recorded reason when it is not.
- [ ] UI-bearing PRDs have UI design tasks before architecture/tech-spec work begins.
- [ ] New UI-bearing projects have a durable UI guideline after the core PRD and before tech spec.
- [ ] Tech specs for UI-bearing work cite the UI guideline or feature UI brief.
- [ ] Deployed/user-facing projects have a routine service status check scheduled with cadence, destination, and self-contained prompt.
- [ ] Service status checks pull product-side updates and devops-side updates, including CI status, system health, hosting cost, user traffic, and feedback from all known channels.
- [ ] The user receives a service status summary at least once per day for active live projects unless they explicitly choose a different cadence.
- [ ] Live projects have `status_report_email`, `status_report_cadence`, and timezone recorded, or the user was proactively asked for the missing email/cadence and a follow-up task exists.
- [ ] Periodic email reports are scheduled when configured, sent through the available email integration, and use concise HTML formatting with inline styles suitable for email clients.
- [ ] Before scheduling or sending status-report email, active products are discovered and grouped by recipient/cadence/timezone.
- [ ] When more than one active product shares a status-report recipient/cadence/timezone, one aggregate portfolio email is sent instead of separate per-project emails unless separation is explicitly required.
- [ ] Email reports read like executive summaries: product-performance first, clear improving/holding/regressing state, top-line product metrics, wins/risks/customer signal, next actions, one crisp decision ask at most, and evidence links.
- [ ] Email reports are mentally lightweight: readable in under two minutes, ideally 300-600 words, under two pages, and free of raw log dumps or dense project-detail overload.
- [ ] Missing CI, health, analytics, or feedback instrumentation becomes explicit follow-up work instead of an assumed healthy status.
- [ ] Progress updates were sent at phase start, phase completion, before subagent batches, and after subagent results.
- [ ] Completed tasks have evidence.
- [ ] Each completed implementation task has a linked follow-up QA task unless explicitly non-user-facing.
- [ ] QA reports include pass/fail/blocked status, failure details, screenshots, and linked bugs.
- [ ] Bugs were searched for duplicates before creation and triaged on creation.
- [ ] Before milestone completion, all linked open bugs were fixed, closed as invalid/obsolete/won't-fix with rationale, or explicitly deferred without compromising milestone acceptance.
- [ ] Follow-up tasks exist for discovered gaps.

