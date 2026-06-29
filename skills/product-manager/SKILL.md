---
name: product-manager
description: "Use when clarifying client requests, turning them into core or feature PRDs, defining user-feedback loops, and interpreting feedback into product decisions."
version: 0.2.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development, product-management, feedback]
    related_skills: [project-manager, ui-designer, qa]
---

# Product Manager

## Overview

Turn a client request into a small, coherent product definition. Focus on why the feature matters, who uses it, the critical user journey, and conflicts with existing product behavior.

Product management also owns the learning loop. Every PRD should include a practical way for users to submit feedback, a daily routine for checking that feedback while the project is active or newly launched, and a concrete product-metrics plan so the team can tell whether the product is working.

## Core PRD for New Projects

Include:

- Value proposition: the promise in one sentence.
- Single CUJ: the one critical user journey the MVP must nail.
- Product type: online service, mobile app, chatbot, browser extension, internal tool, etc.
- Target users and non-goals.
- Success metrics and launch constraints.
- Product metrics plan: activation, engagement, retention, conversion/revenue, and core-CUJ completion metrics or explicit reasons when a category is not applicable.
- User feedback path: where users can submit feedback, who reviews it, and how it is linked to the issue/product planning system.
- Daily feedback check: when feedback is reviewed, which channels are checked, and where findings/actions are recorded.

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

## Product Metrics Rules

Always add a way to track product metrics for user-facing products and features. The PRD should define a minimal measurement plan that answers: are users reaching the core value, where are they dropping off, and is the product improving after changes?

The PRD must specify:

- North-star or primary success metric tied to the value proposition and critical user journey.
- Activation metric: the earliest observable moment a user receives or approaches value.
- Funnel/CUJ metrics: key steps from entry → setup/onboarding → core action → desired outcome.
- Engagement/retention metric when repeated use matters; conversion/revenue metric when monetization or signup flow matters.
- Event names/properties or analytics questions the architect/coder must instrument, using privacy-safe identifiers and avoiding sensitive payloads.
- Dashboard/report destination and review cadence, e.g. `.projects/<project>/metrics/dashboard-plan.md`, analytics dashboard URL, or issue tracker report.
- Baseline/current value when available, target/threshold when known, and what action to take when metrics regress.

If metrics instrumentation does not exist yet, create a follow-up architecture/devops/coder task instead of pretending metrics are available. Keep the first metrics plan small; do not block MVPs on heavyweight analytics unless the product depends on it.

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

## Workflow

1. Read existing project knowledge, product docs, feedback logs, analytics dashboards, and relevant metrics.
2. Ask only clarifying questions that materially change scope; otherwise state assumptions.
3. Identify the target user locale/region and, when referencing foreign services, use local-language/local-region settings or record a follow-up task to verify local experience.
4. Draft the smallest useful PRD.
5. Add a product metrics plan with key events/funnels, dashboard/report destination, review cadence, and instrumentation follow-up tasks if needed.
6. Add a feedback collection path and daily feedback check routine.
7. If feedback already exists, classify it as bug report, core-value/product opportunity, repeated pattern, watchlist, or no-action.
8. For non-bug feedback that deserves action, define the underlying user/problem and simplest solution instead of implementing the surface request.
9. Check conflicts against existing features and the core product value.
10. Save the PRD under `.projects/<project>/prds/`.
11. Save or update metrics plan artifacts under `.projects/<project>/metrics/` unless the project has a stronger existing convention.
12. Save or update feedback loop/log artifacts under `.projects/<project>/feedback/` unless the project has a stronger existing convention.

## Verification Checklist

Before finishing, include a brief verification note that states what artifact was created or updated, where it lives, and how the PRD was checked against the request.

- [ ] PRD has value proposition or user problem.
- [ ] PRD has one primary CUJ.
- [ ] Target market language, locale/region, currency/timezone/app-store/payment assumptions are identified when relevant.
- [ ] Foreign services referenced in the PRD/research are checked with local-language/local-region settings, or local verification is recorded as an explicit follow-up task.
- [ ] Degraded foreign-service user experience risks are called out with local/region-appropriate alternatives when they affect the core journey.
- [ ] PRD defines product metrics tied to the value proposition and CUJ.
- [ ] Activation, funnel/CUJ, engagement/retention, and conversion/revenue metrics are included or explicitly marked not applicable.
- [ ] Event names/properties, dashboard/report destination, review cadence, and regression action are specified.
- [ ] Missing analytics/instrumentation becomes explicit follow-up work.
- [ ] Acceptance criteria are objective.
- [ ] Feature conflicts are addressed.
- [ ] Feedback collection path exists for user-facing work.
- [ ] Daily feedback review cadence, owner, channels, and log/issue destination are defined.
- [ ] Non-bug feedback is interpreted by user context, underlying problem, core product value, and simplest solution.
- [ ] Random one-off feedback is logged/watched rather than acted on unless it is a bug/risk or core-value aligned.
- [ ] Repeated feedback patterns become product work only after duplicate/pattern review.
- [ ] Durable artifact paths are named, e.g. `.projects/<project>/prds/<prd>.md` and `.projects/<project>/feedback/daily-log.md`.
- [ ] Verification evidence explains how the artifact satisfies the client request and what assumptions remain.
