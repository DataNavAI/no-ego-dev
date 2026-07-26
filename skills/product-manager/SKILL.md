---
name: product-manager
description: "Use when clarifying client requests, turning them into core or feature PRDs, defining user-feedback loops, and interpreting feedback into product decisions."
version: 0.4.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development, product-management, feedback]
    related_skills: [mvp-planning, prd-reviewer, product-experiment, project-manager, ui-designer, qa, subagent-driven-development, reviewable-artifacts]
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
- Prefer quick artifacts that users can react to: annotated wireframes, lightweight HTML mockups, screenshots, or clickable prototypes. Concise screen-by-screen descriptions may accompany visuals but never replace them for a visual-direction decision. If visual tooling is unavailable, mark the decision `BLOCKED`, preserve the unfinalized PRD state, and create the smallest follow-up task needed to produce viewable pixels.
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

## Market-Demand Discovery with Google Trends

For a new product, major positioning change, or weakly validated value proposition, use Google Trends to discover how the target market describes the problem before locking PRD language or paid-test copy. The goal is not to chase popular words; it is to find real problem, outcome, alternative, and purchase-intent language that can sharpen the target user, CUJs, value proposition, landing-page copy, and acquisition hypothesis.

Save findings under `.projects/<project>/research/demand-validation.md` or the project's existing research directory.

### Google Trends workflow

1. Start with 5-10 seed terms derived from the user problem, desired outcome, current workaround, product category, and alternatives. Include the target market's natural/local language; do not search only the team's internal product terminology.
2. Open Google Trends Explore at `https://trends.google.com/trends/explore` with the appropriate country/region, language, time range, category, and search surface (`Web Search`, `YouTube Search`, `Shopping Search`, `News Search`, or `Image Search`). Record every setting because results are not comparable when filters differ.
3. Compare at most five terms at a time. Prefer a Google Trends **Topic** over an exact search term when the topic correctly represents the concept across languages; otherwise document that an exact term was used.
4. Inspect interest over time and by subregion, then inspect both **Related queries** and **Related topics**. Capture both **Top** and **Rising** results. Treat `Breakout` as rapid relative growth, not proof of large absolute demand.
5. Repeat promising seeds and related queries until the results stop producing materially new user intent. Check target-market language variants, synonyms, question forms, competitor/alternative terms, and jobs-to-be-done phrases.
6. Cluster findings by intent:
   - problem/pain recognition;
   - desired outcome/job;
   - solution/category discovery;
   - workaround or alternative;
   - comparison/evaluation;
   - transactional or purchase intent;
   - irrelevant/noisy intent to exclude.
7. Turn clusters into 2-4 falsifiable value-proposition hypotheses. For each hypothesis, name the target user/context, problem, promised outcome, supporting search queries, selected CUJ, expected conversion action, and what evidence would disconfirm it.
8. Cross-check the strongest clusters against at least one additional source when practical: current search-results pages, keyword/ad-planner estimates, customer interviews, support/feedback logs, community language, competitor pages, or first-party analytics. Do not treat Google Trends alone as market validation.

### Interpretation rules

- Google Trends is a normalized relative-interest index, not absolute search volume, revenue, willingness to pay, or total addressable market.
- A `0` or low value may mean insufficient sampled volume, not zero demand.
- Seasonality, news events, viral spikes, ambiguity, and regional language can distort results. Explain material anomalies.
- Compare like-for-like filter settings and avoid claiming that separately filtered charts are directly comparable.
- Do not choose a product or value proposition merely because a related query is rising. It must still map to the key user problem and a selected CUJ.
- If Google Trends is unavailable, blocked, or too sparse, record the limitation and use alternative evidence. Never invent query lists or trend values.

Required research table:

```text
Google Trends research — <date/time + timezone>
Settings: <geo, language, time range, category, search surface>
Seed/topic: <term + exact term/topic>
Related query/topic: <text>
Result type: <Top|Rising|Breakout>
Observed signal: <relative index/rank or qualitative observation>
Intent cluster: <problem|outcome|solution|alternative|evaluation|transactional|noise>
User/CUJ relevance: <why it matters>
Value-proposition implication: <hypothesis/copy change or none>
Source/evidence: <saved URL, export, screenshot, or notes>
Caveat: <seasonality, ambiguity, sparse data, etc.>
```

## Paid Landing-Page Smoke Tests

When market interest or positioning is uncertain, suggest a small paid **landing-page smoke test** (also called a demand test or pretotype) before building broad MVP scope. The test should compare honest value propositions with real target traffic, not pretend a nonexistent product is already available.

A smoke test is appropriate when:

- the key problem appears plausible but willingness to act is uncertain;
- multiple value propositions compete for the same primary CUJ;
- Google Trends/search/community evidence reveals distinct intent clusters;
- the next build decision is expensive enough that a small demand test would reduce risk.

Do not suggest paid traffic when the audience cannot be targeted credibly, the conversion event would be meaningless, policy/compliance risk is unresolved, organic/customer evidence is already decisive, or the test budget cannot produce directional signal.

### Experiment design

1. Define one decision: which target-user/problem/value-proposition combination deserves deeper validation or implementation.
2. Choose 2-4 materially distinct value-proposition variants derived from the related-query intent clusters. Keep the audience, offer shape, page quality, and conversion event comparable; avoid variants that test many unrelated changes at once.
3. Give each variant a message-matched ad and landing page. The page should show the proposed outcome, target user, key workflow/CUJ, expected pricing or commitment level when relevant, and one primary CTA.
4. Use an honest CTA such as `Join the waitlist`, `Request early access`, `Book a discovery call`, `Get launch updates`, or `Tell us your workflow`. If the product is not available, clearly disclose `coming soon`, `early concept`, `pilot recruiting`, or equivalent before or immediately after the CTA. Do not charge for unavailable functionality or imply immediate access that does not exist.
5. Before launch, record:
   - hypothesis and variants;
   - target audience/search queries and negative/excluded intent;
   - ad platform and placement;
   - total and daily budget cap;
   - run window or minimum sample target;
   - primary and secondary conversion events;
   - continue/iterate/stop thresholds;
   - stop-loss rule;
   - UTMs and analytics verification;
   - owner and decision date.
6. Measure more than clicks: impressions, click-through rate, landing-page conversion, qualified conversion, cost per qualified action, downstream interview/activation intent, query/audience quality, and qualitative responses.
7. Interpret the funnel:
   - low CTR → weak audience/message or uncompetitive creative;
   - adequate CTR + low landing conversion → ad/page mismatch, weak trust, unclear value, or too much commitment;
   - strong signup + weak qualification/interview follow-through → curiosity rather than meaningful demand;
   - strong qualified action at an acceptable cost → evidence to continue discovery or build the narrow CUJ, not proof of product-market fit.
8. Save results and the build/positioning decision in the demand-validation artifact. Preserve negative results and do not move goalposts after seeing performance.

### Honesty, consent, and spend gates

- Never use fabricated testimonials, fake customer counts, false scarcity, unsupported performance claims, misleading pricing, fake endorsements, or claims that the product exists when it does not.
- Collect the minimum data needed. Provide appropriate privacy/consent disclosure, secure storage, unsubscribe/deletion paths, and jurisdiction-appropriate terms.
- Follow the selected ad platform's current advertising, destination, data-collection, and misrepresentation policies. When policy is uncertain, verify it before launch.
- Paid ads are an external side effect. **Do not launch, spend money, create campaigns in a user's account, or publish creatives without explicit user approval of the platform, target URL, audience/queries, creatives, budget cap, and stop-loss rule.** Suggest and prepare the experiment first.
- Verify the landing page, analytics, CTA, consent flow, mobile experience, and UTMs before requesting spend approval.
- Pause when tracking is broken, traffic is irrelevant, policy review fails, the stop-loss threshold is reached, or the landing page misstates availability.

Suggested plan shape:

```text
Demand smoke test — <project>
Decision: <what this test will decide>
Variants: <A/B/C value propositions + related-query evidence>
Audience/queries: <target + negatives>
Landing URLs: <one per variant>
CTA/disclosure: <qualified action + honest availability statement>
Budget: <$ total, $/day; pending explicit approval>
Primary metric: <qualified conversion + threshold>
Secondary metrics: <CTR, LP conversion, cost per action, interview follow-through>
Stop-loss: <spend/time/quality rule>
Tracking: <UTMs, events, dashboard, QA evidence>
Owner/review date: <...>
Decision rule: <continue, iterate, or stop>
```

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

A product-manager must not self-approve a PRD. **All PRD review judgment must be produced by a fresh delegated leaf subagent that loads and uses `prd-reviewer`.** The product-manager/orchestrator may prepare a neutral packet, dispatch, validate the returned shape/revision, save findings, disposition them, and revise—but it must not perform the review, draft/supplement findings, or infer approval. If delegation is unavailable, set the gate to `BLOCKED`; reviewing in the author context is never a fallback.

Use a new leaf subagent for every round. Do not reuse the author, a prior reviewer, or an implementation agent. This context firewall prevents authoring assumptions and hidden conversation state from leaking into review judgment. Pass the exact artifact and objective evidence, not the author's private scratchpad, chain-of-thought, hidden transcript, tentative opinions, preferred outcome, or desired verdict. Treat this as a **revision gate**, not an optional suggestion pass.

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
    goal="Load and use the `prd-reviewer` skill. Independently review the complete latest PRD and return its required structured verdict. Do not edit the PRD.",
    context="""
    Original request and constraints: <full context>
    Latest PRD revision: <exact path/id plus full text when practical>
    CUJ/MVP/design/QA/metrics/interface context: <full relevant context>
    This is a neutral evidence packet. Do not assume author intent or desired verdict. Do not use parent scratch reasoning.
    Review against every `prd-reviewer` rubric dimension and return only its structured PRD review.
    """,
    role="leaf",
)
```

### Required reviewer rubric

Ask the independent subagent to evaluate:

1. One precise target user, situation, underlying problem, current workaround, desired outcome, and fidelity to the original request.
2. A trace from target-user pain through feature behavior to an effective resolved outcome and observable evidence; for MVPs, one-problem and 1-3-CUJ scope compliance.
3. Ease and shortest path to value: minimal decisions/actions, useful defaults, clear state, accessibility/trust, interruption, failure, undo, and recovery.
4. End-of-journey satisfaction: confidence, control, relief, saved effort, useful confirmation, and zero to three grounded satisfaction boosters without decorative gamification, dark patterns, or unrelated scope.
5. Base-product coherence: prefer simplifying/extending existing capabilities; reuse existing CUJs, navigation, terminology, components, data, permissions, settings, notifications, and support paths; reject duplicate workflows, sources of truth, settings, or concepts; require merge/remove/migrate/deprecate decisions.
6. Scope discipline, explicit non-goals, and absence of unjustified feature creep or complexity.
7. Objective acceptance and learning for user outcome, ease/time-to-value, failures/recovery, base-product regressions, supported interfaces, and proportionate qualitative satisfaction—not controls or vanity clicks alone.
8. Product metrics, feedback loop, deployment/serviceability, rollout/reversal, and ownership.
9. Contradictions, unresolved assumptions, missing decisions, or requirements that cannot be implemented or verified.

`prd-reviewer` is the canonical detailed rubric; these points are the minimum integration contract.

Require structured output:

```text
PRD review — round <N> — revision <path/id>
Verdict: APPROVED | APPROVED_WITH_MINOR_NOTES | NEEDS_REVISION | BLOCKED
Findings:
- <BLOCKER|HIGH|MEDIUM|LOW> — <issue> — <evidence> — <recommended correction>
Target-user problem restatement: <one sentence>
Problem-resolution trace: <pain → mechanism → outcome → evidence>
Ease/effectiveness assessment: <path, friction, recovery, confidence>
Base-product fit: <reused mechanisms, unavoidable additions, redundancy risks, merge/remove/migrate/deprecate>
Satisfaction boosters: <0-3 grounded suggestions or none>
Scope additions challenged: <items or none>
Outcome and satisfaction verification gaps: <items or none>
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

Current Hermes single-task `delegate_task` dispatch is automatically background and returns a handle immediately. The deprecated `background` argument is ignored, so do not add it or wait/poll; preserve the callback state machine below.

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

Do not route the PRD to architecture or implementation until this gate passes. A user may accept documented residual risk only **after a completed independent leaf review of the exact revision** returned a valid verdict and findings; that acceptance may disposition reviewer-identified non-blocking risk, but it can never substitute for unavailable delegation, a pending/missing/malformed review, revision mismatch, `BLOCKED`, or unresolved `BLOCKER`/`HIGH` findings.

## Human PRD Review Presentation Gate

For a core PRD, material feature PRD, or any product artifact requiring user decisions, load/use `reviewable-artifacts` after the latest independent PRD review revision is ready. Structure the canonical Markdown with a review header, TL;DR, stable `DEC-*`/`Q-*`/`RISK-*` IDs, decisions requested, changes since the last revision, open questions, and a feedback disposition log. Render it and, when the PR is only a temporary decision surface, explicitly mark it `REVIEW_ONLY`/`[REVIEW ONLY — DO NOT MERGE]` so the user can comment beside exact sections without implying merge authorization. After approval/abandonment/supersession, preserve accepted content at its canonical destination, close the review PR without merge, clean temporary branch/worktree/preview/access/scratch resources, and verify cleanup.

When visual direction is part of the decision, require `ui-designer` to publish runnable prototypes, screenshots, and `DESIGN_REVIEW.md`; do not substitute verbal descriptions. Read unresolved review threads, update the canonical PRD/design source, verify, reply with the addressing revision, and resolve only agreed/addressed threads. Human artifact approval is separate from thread resolution and merge authorization. Block architecture handoff on unresolved material product decisions unless the user explicitly accepts documented residual risk.

## Workflow

1. Read existing project knowledge, product docs, CUJ artifacts, feedback logs, analytics dashboards, and relevant metrics.
2. Ask only clarifying questions that materially change scope; otherwise state assumptions.
3. Identify the user's defined CUJs. Read or create/update `.projects/<project>/product/critical-user-journeys.md` or the project's equivalent CUJ artifact.
4. For the requested product improvement, state which CUJ(s) it improves or protects and how it strengthens satisfaction at the end of the journey. If no CUJ is improved/protected, flag the work as suspect scope expansion unless the user explicitly wants it.
5. For new product ideas, vague product directions, or visually meaningful feature requests, create/request 2-3 design mock options and ask the user to choose, combine, or reject a direction before finalizing the PRD. Route substantial mock work to `ui-designer`.
6. Classify the requested artifact as prototype, MVP, beta, or production iteration. If MVP, load `mvp-planning`, define one key user problem, select exactly one primary and at most two necessary supporting CUJs, create `.projects/<project>/product/mvp-plan.md`, and enforce its scope/UX/QA contract before finalizing the PRD. If prototype, name the intentionally partial/mocked/manual parts and the decision it should unlock.
7. Identify the target user locale/region and, when referencing foreign services, use local-language/local-region settings or record a follow-up task to verify local experience.
8. For a new product, uncertain market, or competing positioning hypotheses, use Google Trends to inspect target-region Top/Rising related queries and topics, cluster search intent, cross-check the signal, and save `.projects/<project>/research/demand-validation.md`.
9. When demand or value-proposition uncertainty justifies it, suggest an honest paid landing-page smoke test with 2-4 query-informed variants, a qualified conversion event, disclosure that unavailable functionality is coming soon/early access, predeclared thresholds, analytics/UTMs, and a stop-loss rule. Prepare the plan but do not spend or publish without explicit user approval.
10. Identify supported/planned interfaces and create or update `.projects/<project>/product/supported-device-interfaces.yaml` from the bundled template, plus a feature parity matrix for web, Android, iOS, and any other relevant surfaces.
11. Draft the smallest useful PRD, including the selected visual concept and rationale when visual mock clarification was required.
12. Add platform-specific behavior and acceptance criteria where parity differs or platform constraints apply.
13. For MVPs, add deployment, serviceability, operability, support, rollback, and QA-gate requirements; route follow-up tasks to project-manager/devops/architect/coder/qa as needed.
14. Add a product metrics plan with key events/funnels, researched cost-effective analytics tool recommendation, dashboard/report destination, review cadence, and instrumentation follow-up tasks if needed.
15. Add a feedback collection path, daily feedback check routine, and daily cross-platform parity review routine when multiple platforms are in scope.
16. If feedback already exists, classify it as bug report, core-value/product opportunity, repeated pattern, watchlist, or no-action.
17. For non-bug feedback that deserves action, define the underlying user/problem and simplest solution instead of implementing the surface request.
18. Check conflicts against existing features, the core product value, user-defined CUJs, and platform parity expectations.
19. Save the PRD under `.projects/<project>/prds/`.
20. Spawn a fresh independent leaf subagent instructed to load/use `prd-reviewer`, save its structured findings, revise the PRD, and repeat review against the latest revision until the revision gate passes or escalates after at most three rounds.
21. Save/update the CUJ artifact under `.projects/<project>/product/critical-user-journeys.md` unless the project has a stronger existing convention.
22. Save visual mock artifacts or links under `.projects/<project>/design/` unless the project has a stronger existing convention.
23. Save or update metrics plan artifacts under `.projects/<project>/metrics/` unless the project has a stronger existing convention.
24. Save or update feedback loop/log artifacts under `.projects/<project>/feedback/` unless the project has a stronger existing convention.
25. Save or update platform parity artifacts under `.projects/<project>/platform-parity/` unless the project has a stronger existing convention.

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
- [ ] New-product or uncertain-positioning research uses Google Trends with recorded geo/language/time/category/search-surface settings and captures Top and Rising related queries/topics.
- [ ] Related queries are clustered by user intent, tied back to the key problem/CUJs, cross-checked with another source when practical, and interpreted as relative interest rather than absolute demand.
- [ ] Google Trends research is saved under `.projects/<project>/research/demand-validation.md` with URLs/exports/screenshots, caveats, and value-proposition hypotheses; unavailable/sparse data is disclosed rather than fabricated.
- [ ] When useful, the PRD suggests an honest landing-page smoke test with 2-4 query-informed value propositions, message-matched ads/pages, one qualified CTA, clear coming-soon/early-access disclosure, predeclared thresholds, UTMs, and a stop-loss rule.
- [ ] Paid test results are judged by qualified conversion and downstream intent—not clicks alone—and produce an explicit continue/iterate/stop decision.
- [ ] No ad spend or campaign publication occurs without explicit approval of platform, target URL, audience/queries, creatives, budget cap, and stop-loss rule; privacy, consent, ad policy, and non-deception checks are complete.
- [ ] Acceptance criteria are objective.
- [ ] Feature conflicts are addressed.
- [ ] Feedback collection path exists for user-facing work.
- [ ] Daily feedback review cadence, owner, channels, and log/issue destination are defined.
- [ ] Non-bug feedback is interpreted by user context, underlying problem, core product value, and simplest solution.
- [ ] Random one-off feedback is logged/watched rather than acted on unless it is a bug/risk or core-value aligned.
- [ ] Repeated feedback patterns become product work only after duplicate/pattern review.
- [ ] Durable artifact paths are named, e.g. `.projects/<project>/prds/<prd>.md`, `.projects/<project>/feedback/daily-log.md`, and `.projects/<project>/platform-parity/parity-matrix.md` when relevant.
- [ ] Verification evidence explains how the artifact satisfies the client request and what assumptions remain.
- [ ] A fresh independent leaf subagent loaded/used `prd-reviewer` and reviewed the complete latest PRD revision; no PRD review judgment was produced or supplemented in the author/orchestrator context.
- [ ] The review packet contained exact artifacts and objective evidence but excluded private scratch reasoning, hidden transcripts, desired verdicts, and summary substitution.
- [ ] Review covered target-user problem, problem-to-outcome effectiveness, ease/recovery, end-of-journey satisfaction and grounded boosters, base-product reuse/redundancy/complexity, and outcome/satisfaction verification.
- [ ] Every review finding has severity and disposition; all blockers/high findings and accepted medium findings were addressed or escalated.
- [ ] The revised PRD was re-reviewed, with the review artifact and exact revision path/id recorded.
- [ ] The final reviewer verdict is `APPROVED` or `APPROVED_WITH_MINOR_NOTES` with no unresolved blocker/high findings; otherwise the workflow escalated after no more than three rounds rather than self-approving.
