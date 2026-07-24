---
name: product-manager
description: "Use when clarifying client requests, turning them into core or feature PRDs, defining user-feedback loops, and interpreting feedback into product decisions."
version: 0.2.8
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development, product-management, feedback]
    related_skills: [mvp-planning, project-manager, ui-designer, qa, subagent-driven-development]
---

# Product Manager

## Overview

Turn a client request into a small, coherent product definition. Focus on why the feature matters, who uses it, the critical user journeys (CUJs), conflicts with existing product behavior, and whether the requested outcome is a prototype or a real MVP.

Product management owns the user's defined CUJs as living product artifacts. Each CUJ must satisfy a specific user need or pain point in the simplest and most delightful way the product can support. The goal of every product improvement is to improve one or more CUJs and strengthen the user's satisfaction at the end of those journeys.

Product management also owns the learning loop. Every PRD should include a practical way for users to submit feedback, a daily routine for checking that feedback while the project is active or newly launched, and a concrete product-metrics plan so the team can tell whether the product is working. By default, every new user-facing project should research and recommend a cost-effective analytics tool and make measurement part of the product definition: you cannot improve things unless you measure.

## Core PRD for New Projects

Include:

- Value proposition: the promise in one sentence.
- User-defined CUJ set: the critical user journeys the user/client has defined, with one marked as the primary CUJ for the MVP.
- For each CUJ: target user, need/pain point, simplest delightful journey, desired end-state/satisfaction moment, current gaps/friction, success metric, and owner/artifact link.
- Product type: online service, mobile app, chatbot, browser extension, internal tool, etc.
- Target users and non-goals.
- Product stage definition: prototype, MVP, beta, or production iteration, with explicit rationale.
- Success metrics and launch constraints.
- Product metrics plan: activation, engagement, retention, conversion/revenue, and core-CUJ completion metrics or explicit reasons when a category is not applicable.
- Cost-effective analytics tool recommendation: existing analytics to reuse, or 2-4 researched low-cost/privacy-appropriate options with a recommended default for the project stage.
- User feedback path: where users can submit feedback, who reviews it, and how it is linked to the issue/product planning system.
- Daily feedback check: when feedback is reviewed, which channels are checked, and where findings/actions are recorded.
- MVP deployment and serviceability plan when the requested outcome is an MVP: live environment, release path, ownership, monitoring, support, data/backups, QA gates, rollback, and operational follow-up tasks.

## Critical User Journey Ownership

Maintain the user's defined critical user journeys as first-class product truth, not as one-off PRD paragraphs.

Default artifact location:

- `.projects/<project>/product/critical-user-journeys.md`

Use the project's existing product-document convention instead when one already exists, but still keep the CUJs easy to find and update.

Each CUJ must include:

- CUJ name and stable ID.
- User/persona and context.
- User need or pain point the journey satisfies.
- The simplest delightful path: the minimum steps a user should take to reach value without unnecessary choices, waiting, confusion, or manual support.
- Entry point, major steps, exit/end state, and the satisfaction moment at the end of the journey.
- Current product support: working, degraded, missing, blocked, or unknown.
- Current friction, anxieties, failure states, and support burden.
- Success metric: completion, time-to-value, activation, conversion, retention, satisfaction score, or qualitative signal.
- Related feedback, analytics, QA evidence, PRDs, issues, and design artifacts.
- Product owner/date last reviewed.

CUJ maintenance rules:

1. At the start of product-manager work, read the existing CUJ artifact when present. If absent for a user-facing product, create it or add a task to create it before major implementation planning.
2. When the user defines, corrects, or prioritizes a CUJ, update the CUJ artifact immediately.
3. Every product improvement, PRD, feature request, bug-priority decision, design change, or scope cut must state which CUJ it improves or protects. If it does not improve/protect any CUJ, treat it as suspect scope expansion unless the user explicitly wants it.
4. Prefer the smallest, simplest change that increases end-of-journey satisfaction for the target CUJ. Delight means less confusion/friction, clearer progress, faster value, better trust, or a more satisfying completion state — not more features by default.
5. When interpreting feedback, map the underlying pain point to an existing CUJ or propose a CUJ update/new CUJ. Do not implement surface requests that weaken the primary CUJ.
6. During active development or launch, review CUJs alongside feedback, metrics, QA, and platform parity. Update current gaps, satisfaction evidence, and follow-up tasks.
7. For multi-platform products, compare whether each platform preserves the same CUJ satisfaction moment, even when implementation details differ.

## New MVP Scoping Gate

When the requested product stage is MVP, load and apply `mvp-planning` before finalizing the PRD, visual direction, architecture handoff, or milestone backlog.

The MVP plan must:

1. State one key user problem for one specific target user and context.
2. Select exactly one primary CUJ and no more than two necessary supporting CUJs. More than three total CUJs requires explicit user approval to redefine or split the release.
3. Define the shortest end-to-end path and observable value moment for every selected CUJ.
4. Run every requested feature, screen, platform, integration, and service through the CUJ necessity test. If no selected journey breaks without it, cut or park it.
5. Separate `must ship`, `manual/internal for MVP`, and `not in MVP / parking lot` scope with rejection rationale and evidence needed to reconsider.
6. Create `.projects/<project>/product/mvp-plan.md` from the `mvp-planning` template; cross-link existing PRD/CUJ/UI/tech/task/QA artifacts and name planned durable paths/owners for missing artifacts without creating empty documents.
7. Require `ui-designer` to minimize screens, choices, fields, navigation, and user-visible actions while preserving accessibility, trust, privacy, error, and recovery states.
8. Require `qa` to define a CUJ traceability matrix with automated coverage, zero-context manual smoke cases, supported-interface evidence, and launch blockers before implementation begins.

For visual concept clarification, any 2-3 mock directions must all solve the same approved key problem and selected CUJs. Compare materially different ways to shorten or clarify the core path; do not use mock exploration to introduce extra personas, features, dashboards, or navigation. When one conventional direction is obviously simplest and alternatives would be artificial, present one recommended direction plus the rejected alternatives and rationale instead of generating design theater.

Treat the MVP scope contract as a change-control boundary. New ideas enter the parking lot unless they map to a selected CUJ step/failure/trust need and the user approves the scope change.

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
- CUJ impact: which user-defined CUJ(s) this feature improves or protects, the need/pain point addressed, and how the end-of-journey satisfaction should become stronger.
- How the feature will collect user feedback after release.
- How daily feedback review will detect whether the feature is solving the intended problem.

## Visual Concept Clarification Rules

When a user asks for a new product idea, a vague product direction, or a meaningful UI/UX feature request, do not rely on words alone. Product ideas are hard to evaluate abstractly; users choose better when they can compare what the product could actually look and feel like.

Before locking the PRD or routing implementation work, create or request multiple concrete design mock options and ask the user to choose a direction. Treat this as a required product-discovery step for user-facing products unless the user explicitly says to skip visual exploration or the request is purely backend/API/non-visual.

The product-manager must:

- Produce 2-3 distinct design mock directions, or spawn/route to `ui-designer` to produce them when visual design work is substantial.
- Make each option concrete enough to compare: target user, primary screen or flow, layout concept, tone/visual style, interaction model, and the product tradeoff it represents.
- Prefer quick artifacts that users can react to: annotated wireframes, lightweight HTML mockups, screenshots, clickable prototypes, or concise screen-by-screen descriptions when tooling is unavailable.
- Present the options in user-facing language and ask the user to choose one, combine parts, or reject all before finalizing the PRD/design direction.
- Record the selected option and rationale in the PRD under `.projects/<project>/prds/` and link to the mock artifacts under `.projects/<project>/design/` or the project's existing design location.
- If the user cannot choose yet, define the smallest follow-up needed to decide, such as a quick mock iteration, benchmark screenshot review, or user preference question.

Do not let the team implement a visually meaningful product or feature from a text-only PRD when the user has not seen alternative concepts. The mock choice is part of clarifying scope, not decoration after planning.

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

## Supported Device Interface Registry

For every user-facing product, create and maintain one canonical supported device interface registry at `.projects/<project>/product/supported-device-interfaces.yaml`. Start from `templates/supported-device-interfaces.yaml`. This registry is the release source of truth for which interfaces the team promises to support; a parity matrix supplements it but does not replace it.

Interface means a separately testable user surface or form factor, not merely a technology label. Typical IDs include `web-desktop`, `mobile-web`, `android`, `ios`, desktop applications, tablet-specific applications, browser extensions, TV/wearable clients, chat surfaces, API clients, or other product-specific interfaces. Do not assume responsive desktop web proves mobile-web support, or that one mobile OS proves another.

For every candidate interface:

1. Record `support_status` as `supported`, `planned`, `intentionally-unsupported`, `not-applicable`, `deprecated`, or `undecided`.
2. Record the user/CUJ scope, implementation or release channel, minimum browser/OS/device constraints, form factors, owner, and intentional differences.
3. For every `supported` interface, require QA before deployment and reference at least one executable test case ID. One shared test case may cover multiple interfaces only when it is explicitly parameterized and produces separate result/evidence rows for each interface.
4. Update the registry whenever the PRD, CUJs, implementation, support policy, minimum versions, release channels, or platform scope changes. Never let a code build silently expand support.
5. Treat `undecided` interfaces and supported interfaces with zero test cases as release blockers until product scope is resolved.
6. Require the latest QA result, tested release candidate, evidence links, and blockers to be refreshed for the exact build/commit/tag being released. A previous-release pass is stale evidence.

Product management owns the support decision and registry accuracy. QA owns per-interface case coverage and results. DevOps enforces the registry as a deployment gate. Project management ensures updates and missing coverage become tracked tasks.

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

## Independent PRD Review and Revision Gate

A product-manager must not self-approve a PRD. After saving a complete draft, spawn a fresh independent reviewer subagent that did not author the PRD. Treat this as a **revision gate**, not an optional suggestion pass.

### Reviewer context

Provide the reviewer with the latest PRD revision, not a stale excerpt, plus:

- Original user/client request and explicit constraints.
- Product stage and target user/problem.
- Selected CUJs and MVP scope contract when applicable.
- Selected design direction and linked artifacts.
- Existing-product constraints, supported interfaces, metrics, feedback, QA, deployment, and open decisions.
- Exact PRD path and revision identifier or timestamp.

Include the full artifact text in the delegation context when practical. Otherwise provide its durable path and require the reviewer to read that exact revision before returning a verdict.

Dispatch the review with `delegate_task` directly. Adapt paths/context, but preserve independence and the exact-revision requirement:

```python
delegate_task(
    goal="Independently review the complete latest PRD and return the required structured verdict. Do not edit the PRD.",
    context="""
    Original request and constraints: <full context>
    Latest PRD revision: <exact path/id plus full text when practical>
    CUJ/MVP/design/QA/metrics/interface context: <full relevant context>
    Review against every rubric dimension below. Return only the structured PRD review; do not assume author intent.
    """,
    toolsets=["file"],
)
```

### Required reviewer rubric

Ask the independent subagent to evaluate:

1. Fidelity to the user's actual problem and requested outcome.
2. One coherent target user/problem and CUJ alignment; for MVPs, compliance with the one-problem and 1-3-CUJ scope contract.
3. Scope discipline, explicit non-goals, and absence of unjustified feature creep.
4. UX clarity and shortest path to value, including failure/recovery/accessibility/trust states.
5. Objective, testable acceptance criteria and CUJ-level QA/release evidence.
6. Product metrics, feedback loop, supported-interface parity, deployment/serviceability, and ownership.
7. Contradictions, unresolved assumptions, missing decisions, or requirements that cannot be implemented or verified.

Require structured output:

```text
PRD review — round <N> — revision <path/id>
Verdict: APPROVED | APPROVED_WITH_MINOR_NOTES | NEEDS_REVISION | BLOCKED
Findings:
- <BLOCKER|HIGH|MEDIUM|LOW> — <issue> — <evidence> — <recommended correction>
Scope additions challenged: <items or none>
Unresolved decisions/assumptions: <items or none>
Approval rationale: <why the latest revision is or is not ready>
```

### Revision loop

1. Save review output under `.projects/<project>/reviews/<prd-name>-prd-review-round-<N>.md` or the project's equivalent review directory.
2. Classify every finding as accepted, rejected with evidence/rationale, deferred with owner, or blocked on a user decision.
3. Revise the PRD to address every `BLOCKER` and `HIGH` finding and every accepted `MEDIUM` finding. Do not blindly add reviewer suggestions that expand scope or weaken the chosen CUJ.
4. Record a concise disposition table in the PRD or linked review artifact: finding, disposition, change/rationale, owner, and revision.
5. Spawn a **fresh independent reviewer subagent** for the latest revision. Explicitly provide prior findings/dispositions and require the reviewer to verify the actual changes; approval of an older revision does not count.
6. Repeat until the latest revision is `APPROVED` or `APPROVED_WITH_MINOR_NOTES`, has zero unresolved `BLOCKER`/`HIGH` findings, and any remaining `MEDIUM` findings have an accepted disposition the reviewer agrees is non-blocking.

Bound the revision gate to **three review rounds**. Escalate earlier if issue severity/count does not decrease, reviewers identify conflicting product assumptions, or a missing user decision prevents convergence. After round three, do not self-approve: present the unresolved findings and dispositions to the user and wait for direction. Low/minor notes may remain only when they do not affect user value, scope, feasibility, safety, testability, or launch readiness.

### Asynchronous continuation state

`delegate_task` returns before the reviewer finishes. Immediately after dispatch, checkpoint the review state in the PRD or review index:

```text
review_status: REVIEW_PENDING
round: <N>
prd_revision: <exact path/id/hash or timestamp>
reviewer_handle: <delegate handle when available>
resume_at: disposition_and_revision
handoff_blocked: true
```

Do not fabricate a verdict, mark the gate complete, or end with "approved" while the reviewer is still running. When the reviewer result re-enters the session, resume from the checkpoint: validate the response shape, save the review artifact, disposition findings, revise, and dispatch the next fresh review if needed. A response that only reports `REVIEW_PENDING` is an honest checkpoint, not completion of the product workflow. The pending response must still name the exact revision/round, reviewer handle when available, review-artifact destination, rubric dimensions sent to the reviewer, handoff block, and callback transition: validate structured findings → save review → disposition → revise → fresh re-review until approval or three-round escalation.

Do not route the PRD to architecture or implementation until this gate passes or the user explicitly accepts documented residual risk.

## Workflow

1. Read existing project knowledge, product docs, CUJ artifacts, feedback logs, analytics dashboards, and relevant metrics.
2. Ask only clarifying questions that materially change scope; otherwise state assumptions.
3. Identify the user's defined CUJs. Read or create/update `.projects/<project>/product/critical-user-journeys.md` or the project's equivalent CUJ artifact.
4. For the requested product improvement, state which CUJ(s) it improves or protects and how it strengthens satisfaction at the end of the journey. If no CUJ is improved/protected, flag the work as suspect scope expansion unless the user explicitly wants it.
5. For new product ideas, vague product directions, or visually meaningful feature requests, create/request 2-3 design mock options and ask the user to choose, combine, or reject a direction before finalizing the PRD. Route substantial mock work to `ui-designer`.
6. Classify the requested artifact as prototype, MVP, beta, or production iteration. If MVP, load `mvp-planning`, define one key user problem, select exactly one primary and at most two necessary supporting CUJs, create `.projects/<project>/product/mvp-plan.md`, and enforce its scope/UX/QA contract before finalizing the PRD. If prototype, name the intentionally partial/mocked/manual parts and the decision it should unlock.
7. Identify the target user locale/region and, when referencing foreign services, use local-language/local-region settings or record a follow-up task to verify local experience.
8. Identify supported/planned interfaces and create or update `.projects/<project>/product/supported-device-interfaces.yaml` from the bundled template, plus a feature parity matrix for web, Android, iOS, and any other relevant surfaces.
9. Draft the smallest useful PRD, including the selected visual concept and rationale when visual mock clarification was required.
10. Add platform-specific behavior and acceptance criteria where parity differs or platform constraints apply.
11. For MVPs, add deployment, serviceability, operability, support, rollback, and QA-gate requirements; route follow-up tasks to project-manager/devops/architect/coder/qa as needed.
12. Add a product metrics plan with key events/funnels, researched cost-effective analytics tool recommendation, dashboard/report destination, review cadence, and instrumentation follow-up tasks if needed.
13. Add a feedback collection path, daily feedback check routine, and daily cross-platform parity review routine when multiple platforms are in scope.
14. If feedback already exists, classify it as bug report, core-value/product opportunity, repeated pattern, watchlist, or no-action.
15. For non-bug feedback that deserves action, define the underlying user/problem and simplest solution instead of implementing the surface request.
16. Check conflicts against existing features, the core product value, user-defined CUJs, and platform parity expectations.
17. Save the PRD under `.projects/<project>/prds/`.
18. Spawn a fresh independent PRD reviewer subagent, save its structured findings, revise the PRD, and repeat review against the latest revision until the revision gate passes or escalates after at most three rounds.
19. Save/update the CUJ artifact under `.projects/<project>/product/critical-user-journeys.md` unless the project has a stronger existing convention.
20. Save visual mock artifacts or links under `.projects/<project>/design/` unless the project has a stronger existing convention.
21. Save or update metrics plan artifacts under `.projects/<project>/metrics/` unless the project has a stronger existing convention.
22. Save or update feedback loop/log artifacts under `.projects/<project>/feedback/` unless the project has a stronger existing convention.
23. Save or update platform parity artifacts under `.projects/<project>/platform-parity/` unless the project has a stronger existing convention.

## Verification Checklist

Before finishing, include a brief verification note that states what artifact was created or updated, where it lives, and how the PRD was checked against the request.

- [ ] PRD has value proposition or user problem.
- [ ] User-defined CUJs were read, created, or updated in `.projects/<project>/product/critical-user-journeys.md` or the project's equivalent artifact.
- [ ] PRD has one primary CUJ and records any additional user-defined CUJs in scope.
- [ ] Each CUJ states the user need/pain point, simplest delightful journey, and end-of-journey satisfaction moment.
- [ ] Every product improvement states which CUJ it improves/protects and how it strengthens satisfaction at the end of the journey.
- [ ] Work that does not improve/protect a CUJ is explicitly justified as user-requested scope or parked as suspect scope expansion.
- [ ] PRD explicitly classifies the work as prototype, MVP, beta, or production iteration with rationale.
- [ ] For new product ideas, vague product directions, or visually meaningful feature requests, 2-3 design mock options are created/requested before PRD finalization unless explicitly skipped or non-visual.
- [ ] Mock options are concrete enough for user choice: primary screen/flow, layout concept, tone/visual style, interaction model, and tradeoff.
- [ ] User is asked to choose, combine, or reject the mock directions before implementation routing.
- [ ] Selected mock direction and rationale are recorded in the PRD, with mock artifacts/links saved under `.projects/<project>/design/` or the existing design location.
- [ ] Prototype plans identify mocked/manual/incomplete pieces and the decision the prototype should unlock.
- [ ] MVP planning used `mvp-planning` and created `.projects/<project>/product/mvp-plan.md` or the project's equivalent.
- [ ] MVP scope states one key user problem, exactly one primary CUJ, and no more than two necessary supporting CUJs.
- [ ] Every must-ship capability maps to a selected CUJ; manual/internal operations and parked ideas are explicit.
- [ ] MVP UX minimizes screens, decisions, fields, navigation, and user-visible actions while preserving required states and accessibility/trust/recovery needs.
- [ ] MVP QA maps every selected CUJ to automated coverage, zero-context manual smoke QA, supported-interface evidence, and launch blockers.
- [ ] MVP plans define a fully working and serviceable core product, not merely a stakeholder demo.
- [ ] MVP plans include real deployment/release target or an explicit justified exception.
- [ ] MVP plans include serviceability and operability: persistence, error handling, monitoring/logging, support/feedback, ownership, rollback/recovery, and launch handoff.
- [ ] MVP plans include QA gates for each major user flow and launch blockers.
- [ ] Target market language, locale/region, currency/timezone/app-store/payment assumptions are identified when relevant.
- [ ] Foreign services referenced in the PRD/research are checked with local-language/local-region settings, or local verification is recorded as an explicit follow-up task.
- [ ] Degraded foreign-service user experience risks are called out with local/region-appropriate alternatives when they affect the core journey.
- [ ] Supported/planned platforms are identified, including web, Android, iOS, and any other relevant surfaces.
- [ ] `.projects/<project>/product/supported-device-interfaces.yaml` exists and is current for every user-facing product.
- [ ] Every supported device interface names its CUJ/user scope, implementation/release channel, minimum environment, owner, and intentional differences.
- [ ] Every supported device interface references at least one executable test case and requires fresh QA evidence for the release candidate before deployment.
- [ ] Undecided interfaces and supported interfaces with missing test coverage are explicit release blockers.
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
- [ ] A fresh independent reviewer subagent reviewed the complete latest PRD revision against the original request, CUJs, scope, UX, acceptance criteria, QA, metrics, interfaces, and serviceability.
- [ ] Every review finding has severity and disposition; all blockers/high findings and accepted medium findings were addressed or escalated.
- [ ] The revised PRD was re-reviewed, with the review artifact and exact revision path/id recorded.
- [ ] The final reviewer verdict is `APPROVED` or `APPROVED_WITH_MINOR_NOTES` with no unresolved blocker/high findings; otherwise the workflow escalated after no more than three rounds rather than self-approving.
