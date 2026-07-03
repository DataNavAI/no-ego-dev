---
name: product-manager
description: "Use when clarifying client requests, turning them into core or feature PRDs, defining user-feedback loops, and interpreting feedback into product decisions."
version: 0.2.4
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development, product-management, feedback]
    related_skills: [project-manager, ui-designer, qa]
---

# Product Manager

## Overview

Turn a client request into a small, coherent product definition. Focus on why the feature matters, who uses it, the critical user journey, conflicts with existing product behavior, and whether the requested outcome is a prototype or a real MVP.

Product management also owns the learning loop. Every PRD should include a practical way for users to submit feedback, a daily routine for checking that feedback while the project is active or newly launched, and a concrete product-metrics plan so the team can tell whether the product is working. By default, every new user-facing project should research and recommend a cost-effective analytics tool and make measurement part of the product definition: you cannot improve things unless you measure.

## Core PRD for New Projects

Include:

- Value proposition: the promise in one sentence.
- Single CUJ: the one critical user journey the MVP must nail.
- Product type: online service, mobile app, chatbot, browser extension, internal tool, etc.
- Target users and non-goals.
- Product stage definition: prototype, MVP, beta, or production iteration, with explicit rationale.
- Success metrics and launch constraints.
- Product metrics plan: activation, engagement, retention, conversion/revenue, and core-CUJ completion metrics or explicit reasons when a category is not applicable.
- Cost-effective analytics tool recommendation: existing analytics to reuse, or 2-4 researched low-cost/privacy-appropriate options with a recommended default for the project stage.
- User feedback path: where users can submit feedback, who reviews it, and how it is linked to the issue/product planning system.
- Daily feedback check: when feedback is reviewed, which channels are checked, and where findings/actions are recorded.
- MVP deployment and serviceability plan when the requested outcome is an MVP: live environment, release path, ownership, monitoring, support, data/backups, QA gates, rollback, and operational follow-up tasks.

## Prototype vs MVP Rules

Be explicit about product stage. A prototype and an MVP are not the same thing.

A **prototype** is allowed to be partial, fragile, mocked, local-only, or manually operated if its purpose is to let stakeholders experience or evaluate a slice of user flows, design direction, technical feasibility, or market reaction. Prototype PRDs should name what is fake/manual/incomplete and what decision the prototype is meant to unlock.

An **MVP** is a real product with the smallest coherent set of core features that actual users can use to receive the promised value. It must be fully working and serviceable for the core journey, even if scope is intentionally narrow. Usually an MVP requires a real deployment or release channel, not just a local demo or stakeholder walkthrough.

For an MVP PRD, include the minimum serviceable-product plan:

- Core feature set: the smallest features required for the primary CUJ to work end to end without manual agent intervention.
- Real deployment/release target: production, staging-to-production path, app-store/TestFlight/internal release, hosted web URL, bot/channel deployment, API endpoint, or explicit exception when deployment is genuinely not applicable.
- Serviceability requirements: account/auth model, persistence, error handling, recovery states, backups or data-retention expectations, admin/support access, basic abuse/privacy/safety considerations, and dependency ownership.
- Operability: monitoring/logging, alerts or daily health check, rollback/redeploy path, incident owner, support/feedback intake, and handoff notes.
- Quality gates: detailed QA plan for each major user flow, acceptance criteria, performance/security/privacy checks where relevant, and launch blockers.
- Measurement and learning: analytics/events, dashboard/report location, feedback loop, and review cadence after launch.
- Scope cuts: features intentionally excluded from MVP because they are not required for core value, plus follow-up parking lot.

Do not call something an MVP if users cannot complete the primary CUJ in a real environment, if critical data is not persisted, if there is no support/feedback path, or if the team cannot operate/recover it after launch. Label it a prototype instead and define the path from prototype to MVP.

## Feature PRD for Existing Projects

Include:

- User problem and desired outcome.
- Proposed UX/API behavior.
- Interaction with existing features.
- Conflicts, migrations, or edge cases.
- Acceptance criteria that can be tested.
- Feature metrics: the event(s), funnel step(s), or dashboard(s) that will show whether the feature improved the intended outcome.
- How the feature will collect user feedback after release.
- How daily feedback review will detect whether the feature is solving the intended problem.

## Local-Language and Foreign-Service Reference Rules

When a PRD, product research note, competitor example, integration decision, launch plan, or user journey references a foreign service, evaluate it from the target user's local language and region. Many foreign services intentionally or accidentally provide a degraded experience to non-local users: different landing pages, missing features, worse latency, blocked signup/payment methods, unsupported phone numbers, unavailable app-store listings, broken localization, or irrelevant search/ad results.

The product-manager must:

- Identify the target market's language, locale, country/region, currency, timezone, app-store region, payment methods, and common devices where they materially affect the experience.
- When referencing or benchmarking a foreign service, use that service's local-language/local-region settings whenever possible: localized URL, `hl`/`gl`/locale parameters, regional app-store listing, local pricing page, local help docs, local search results, local ad library, or local screenshots.
- If the service experience changes by region, document which locale was reviewed and whether the non-local/default view is likely misleading.
- Treat degraded foreign-service access as a product risk: call out signup/payment friction, missing local support, compliance or data residency issues, latency, blocked integrations, and weak localization.
- Prefer local or region-appropriate alternatives when the foreign service is core to the user journey and the local experience is materially worse.
- Include localization requirements in PRDs when the product targets non-English or non-US users: copy language, examples, date/time/number/currency formats, support channels, and local trust signals.

Do not assume an English/US/default SaaS experience represents what target users will see. If local verification is not possible, mark it explicitly as an assumption and create a follow-up research/QA task to verify from the target locale.

## Cross-Platform Feature Parity Rules

When a product or feature is available on multiple platforms, product management owns the parity map. Do not assume web, Android, iOS, desktop, browser extensions, chatbots, or API clients support the same workflows, constraints, payment options, permissions, notifications, offline behavior, accessibility affordances, or release timing.

The product-manager must:

- Identify the supported and planned platforms for the product or feature: web, mobile web, Android, iOS, desktop, browser extension, chatbot, API, or other surfaces.
- For each platform, record the expected feature state: available now, planned, intentionally omitted, blocked by platform constraints, degraded, or not applicable.
- Compare the primary CUJ across platforms and call out parity gaps that could break activation, conversion, retention, trust, notifications, data sync, account/payment flows, or support.
- Proactively create follow-up tasks for parity gaps instead of only documenting them. Route UX gaps to `ui-designer`, implementation gaps to coder/architect, QA matrix gaps to QA, release/store constraints to project-manager/devops, and product tradeoffs back to product-manager.
- Define platform-specific acceptance criteria when behavior must differ because of screen size, OS capabilities, app-store policy, permission model, payment rules, notification limits, offline support, or local regulation.
- Keep parity small for MVPs: explicitly label non-core platform omissions as intentional scope cuts, but do not leave core CUJ parity ambiguous.

Daily parity review is required during active development, beta, launch, and the first week after a meaningful release for any multi-platform product. The daily review should check current work, shipped behavior, user feedback, analytics, QA results, and release/store status for each platform, then update the parity matrix and create or reprioritize tasks for newly discovered gaps.

## Product Metrics Rules

Always add a way to track product metrics for user-facing products and features. The PRD should define a minimal measurement plan that answers: are users reaching the core value, where are they dropping off, and is the product improving after changes?

The PRD must specify:

- North-star or primary success metric tied to the value proposition and critical user journey.
- Activation metric: the earliest observable moment a user receives or approaches value.
- Funnel/CUJ metrics: key steps from entry → setup/onboarding → core action → desired outcome.
- Engagement/retention metric when repeated use matters; conversion/revenue metric when monetization or signup flow matters.
- Event names/properties or analytics questions the architect/coder must instrument, using privacy-safe identifiers and avoiding sensitive payloads.
- Dashboard/report destination and review cadence, e.g. `.projects/<project>/metrics/dashboard-plan.md`, analytics dashboard URL, or issue tracker report.
- Analytics tool selection: identify any existing analytics, logs, data warehouse, app-store console, or hosting metrics that can be reused; otherwise research cost-effective tools appropriate for the platform, privacy needs, expected event volume, team skills, and budget.
- Recommended analytics default with cost expectation, tradeoffs, integration owner, and why it is sufficient for learning at the current product stage.
- Baseline/current value when available, target/threshold when known, and what action to take when metrics regress.

If metrics instrumentation does not exist yet, create a follow-up architecture/devops/coder task instead of pretending metrics are available. Keep the first metrics plan small; do not block MVPs on heavyweight analytics unless the product depends on it. Prefer affordable/free-tier analytics that can answer the core learning questions now, with a migration path only when scale or compliance justifies it.

## User Feedback Loop Rules

Always add a way to get user feedback for user-facing products and features. Prefer the smallest mechanism that real users will actually use, such as an in-app feedback link/form, support email, Discord/Telegram channel, GitHub issue template, survey link, or direct client feedback thread.

The PRD must specify:

- Feedback channels to check.
- Daily review cadence and owner.
- Where feedback summaries are recorded, e.g. `.projects/<project>/feedback/daily-log.md` or the project's issue tracker/CRM.
- How feedback items become product work, bug reports, or no-action notes.
- Privacy/safety constraints for user-submitted content.

Default cadence: check feedback daily during active development, beta, launch, or the first week after a meaningful release. If the product is stable, the project manager may reduce cadence later, but the initial product/feature PRD should still define the daily check.

## Feedback Interpretation Rules

Do not treat non-bug feedback as literal instructions. Users often describe the surface symptom or a preferred solution, not the underlying need.

For each meaningful non-bug feedback item or cluster:

1. Identify who the user likely is: role, skill level, context, frequency of use, job-to-be-done, and constraints.
2. Translate what they said into the real problem they are probably experiencing.
3. Check whether that problem aligns with the product's core value proposition and primary critical user journey.
4. Prefer the simplest solution that resolves the underlying problem with the least product complexity.
5. Consider whether better onboarding, copy, defaults, state visibility, or workflow simplification solves it before adding a feature.
6. Record the reasoning so future agents do not blindly implement the user's stated request.

Bug reports are different: treat them as candidate defects, verify/reproduce or route to QA/bug triage, search for duplicates, and file/update the issue with evidence.

## Feedback Prioritization Rules

Do not react to random one-off feedback just because it exists. Act when at least one of these is true:

- The feedback reveals a bug, safety/security/privacy issue, data-loss risk, or broken core workflow.
- The underlying problem clearly aligns with the core product value or primary CUJ.
- More than a few users independently report the same underlying problem or pattern.
- The feedback explains a conversion/activation/retention drop seen in product metrics.
- The change is tiny, low-risk, and makes the core product clearer without expanding scope.

Otherwise, log the feedback as `no immediate action` with a short rationale. Watch for repeated patterns before creating work.

## Feedback Triage Output Shape

When summarizing daily feedback, use this shape:

```text
Daily feedback review — <project> — <date/time + timezone>
- Channels checked: <list>
- Overall themes: <patterns, not every raw comment>
- Bugs routed: <issue IDs/links or none>
- Product opportunities accepted: <problem, user/context, simplest solution, issue/PRD link>
- Watchlist / no action: <feedback logged but not acted on + rationale>
- Decisions needed: <none or explicit product question>
- Evidence: <links to feedback, screenshots, tickets, metrics>
```

## Daily Cross-Platform Parity Review Output Shape

When summarizing daily platform parity, use this shape:

```text
Daily platform parity review — <project> — <date/time + timezone>
- Platforms checked: <web/android/ios/etc.>
- Core CUJ parity: <same/degraded/missing per platform>
- Newly found gaps: <gap, affected platform, user impact, evidence>
- Tasks created/updated: <issue/task IDs/links or none>
- Intentional differences: <platform-specific rationale>
- Blockers/decisions needed: <store review, OS constraint, design decision, technical blocker, none>
- Evidence: <QA runs, screenshots, analytics, feedback, release notes>
```

## Workflow

1. Read existing project knowledge, product docs, feedback logs, analytics dashboards, and relevant metrics.
2. Ask only clarifying questions that materially change scope; otherwise state assumptions.
3. Classify the requested artifact as prototype, MVP, beta, or production iteration. If MVP, define the smallest fully working/serviceable core product and the real deployment/release target. If prototype, name the intentionally partial/mocked/manual parts and the decision it should unlock.
4. Identify the target user locale/region and, when referencing foreign services, use local-language/local-region settings or record a follow-up task to verify local experience.
5. Identify supported/planned platforms and create or update a feature parity matrix for web, Android, iOS, and any other relevant surfaces.
6. Draft the smallest useful PRD.
7. Add platform-specific behavior and acceptance criteria where parity differs or platform constraints apply.
8. For MVPs, add deployment, serviceability, operability, support, rollback, and QA-gate requirements; route follow-up tasks to project-manager/devops/architect/coder/qa as needed.
9. Add a product metrics plan with key events/funnels, researched cost-effective analytics tool recommendation, dashboard/report destination, review cadence, and instrumentation follow-up tasks if needed.
10. Add a feedback collection path, daily feedback check routine, and daily cross-platform parity review routine when multiple platforms are in scope.
11. If feedback already exists, classify it as bug report, core-value/product opportunity, repeated pattern, watchlist, or no-action.
12. For non-bug feedback that deserves action, define the underlying user/problem and simplest solution instead of implementing the surface request.
13. Check conflicts against existing features, the core product value, and platform parity expectations.
14. Save the PRD under `.projects/<project>/prds/`.
15. Save or update metrics plan artifacts under `.projects/<project>/metrics/` unless the project has a stronger existing convention.
16. Save or update feedback loop/log artifacts under `.projects/<project>/feedback/` unless the project has a stronger existing convention.
17. Save or update platform parity artifacts under `.projects/<project>/platform-parity/` unless the project has a stronger existing convention.

## Verification Checklist

Before finishing, include a brief verification note that states what artifact was created or updated, where it lives, and how the PRD was checked against the request.

- [ ] PRD has value proposition or user problem.
- [ ] PRD has one primary CUJ.
- [ ] PRD explicitly classifies the work as prototype, MVP, beta, or production iteration with rationale.
- [ ] Prototype plans identify mocked/manual/incomplete pieces and the decision the prototype should unlock.
- [ ] MVP plans define a fully working and serviceable core product, not merely a stakeholder demo.
- [ ] MVP plans include real deployment/release target or an explicit justified exception.
- [ ] MVP plans include serviceability and operability: persistence, error handling, monitoring/logging, support/feedback, ownership, rollback/recovery, and launch handoff.
- [ ] MVP plans include QA gates for each major user flow and launch blockers.
- [ ] Target market language, locale/region, currency/timezone/app-store/payment assumptions are identified when relevant.
- [ ] Foreign services referenced in the PRD/research are checked with local-language/local-region settings, or local verification is recorded as an explicit follow-up task.
- [ ] Degraded foreign-service user experience risks are called out with local/region-appropriate alternatives when they affect the core journey.
- [ ] Supported/planned platforms are identified, including web, Android, iOS, and any other relevant surfaces.
- [ ] Multi-platform work includes a parity matrix with each platform's feature state and core-CUJ behavior.
- [ ] Platform parity gaps are proactively routed into follow-up tasks with owners instead of only noted.
- [ ] Daily cross-platform parity review cadence, owner, evidence sources, and artifact destination are defined when multiple platforms are in scope.
- [ ] Intentional platform differences have explicit product rationale and platform-specific acceptance criteria.
- [ ] PRD defines product metrics tied to the value proposition and CUJ.
- [ ] Activation, funnel/CUJ, engagement/retention, and conversion/revenue metrics are included or explicitly marked not applicable.
- [ ] Event names/properties, dashboard/report destination, review cadence, and regression action are specified.
- [ ] A cost-effective analytics tool/default is researched and recommended, or an existing adequate analytics stack is explicitly reused.
- [ ] Missing analytics/instrumentation becomes explicit follow-up work.
- [ ] Acceptance criteria are objective.
- [ ] Feature conflicts are addressed.
- [ ] Feedback collection path exists for user-facing work.
- [ ] Daily feedback review cadence, owner, channels, and log/issue destination are defined.
- [ ] Non-bug feedback is interpreted by user context, underlying problem, core product value, and simplest solution.
- [ ] Random one-off feedback is logged/watched rather than acted on unless it is a bug/risk or core-value aligned.
- [ ] Repeated feedback patterns become product work only after duplicate/pattern review.
- [ ] Durable artifact paths are named, e.g. `.projects/<project>/prds/<prd>.md`, `.projects/<project>/feedback/daily-log.md`, and `.projects/<project>/platform-parity/parity-matrix.md` when relevant.
- [ ] Verification evidence explains how the artifact satisfies the client request and what assumptions remain.
