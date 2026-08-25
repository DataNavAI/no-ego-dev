---
name: mvp-planning
description: "Use when planning a new MVP or cutting an existing product idea down to its minimum viable scope. Selects one key user problem, limits the MVP to one primary and at most two supporting critical user journeys, removes nonessential features, designs the shortest intuitive UX, and defines automated and manual QA gates that prove the core journeys work end to end."
version: 1.1.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, product-management, mvp, scope, ux, cuj, qa]
    related_skills: [product-manager, ui-designer, architect, project-manager, coder, qa]
---

# MVP Planning

## Overview

Plan the smallest real product that solves one important user problem. An MVP is not a compressed wishlist, a shallow collection of features, or a demo with every stakeholder idea represented. It is a narrow, coherent, serviceable product in which a real target user can complete the shortest critical journeys needed to receive the promised value.

The planning rule is strict:

> One key user problem. One primary critical user journey. No more than three critical user journeys total. Everything else must justify its existence by enabling those journeys or be cut.

The same constraint applies to UX and QA. Design the shortest intuitive path to value, then prove that path works end to end with an automated test suite and/or a concrete release QA process.

## When to Use

Use this skill when:

- a user asks to plan, scope, design, or build a new MVP;
- a product idea contains too many personas, features, platforms, screens, or workflows;
- a prototype is being promoted into a real serviceable MVP;
- an existing MVP needs a scope reset around its core value;
- product, design, engineering, and QA need one shared definition of the MVP's critical journeys.

Do not use this skill to call a fragile demo production-ready. If persistence, deployment, support, recovery, or real-world completion of the primary journey is missing, classify the result as a prototype and identify the minimum path to MVP.

## Product Stage Definitions and Persistence Gate

Use these stage definitions in the plan and label the artifact explicitly:

| Stage | What it answers | Data/storage expectation | Exit evidence |
|---|---|---|---|
| **Prototype** | Is the idea, interaction, or workflow understandable and worth exploring? | In-memory state, local files, fixtures, or disposable storage are acceptable | A tested learning/demo, recorded feedback, and documented shortcuts; not production-ready |
| **PoC** | Does a risky technical, integration, performance, or feasibility assumption work? | Temporary or ephemeral storage is acceptable when durable user/product data is not part of the hypothesis | Measured hypothesis result, constraints, teardown path, and productization gaps |
| **MVP** | Can real target users complete the core journey in a small but serviceable product? | **Persist user/business/product data in a database or equivalent managed durable store that survives deployments, restarts, and instance replacement** | End-to-end CUJ evidence in the real environment plus deployment, backup/restore, monitoring, recovery, ownership, and support evidence |

A prototype or PoC may use a local SQLite file, mock API, in-memory store, container filesystem, or deployment-local volume only when its data is disposable and the limitation is explicit. Those choices cannot silently carry into an MVP. For MVP planning, prefer an existing managed or already-operated persistent database after comparing cost, operational burden, backups, recovery point/objectives, access, region, lock-in, and export/migration path. Separate the system of record from caches, derived search indexes, fixtures, and disposable queues.

If promoting a prototype or PoC to MVP, add a persistence-readiness task covering data ownership, schema and migrations, seed/backfill, environment configuration, secret handling, deployment/restart testing, backups, restore testing, retention, access control, monitoring, rollback, and an accountable operator. A polished UI or successful demo does not change the product stage.

## Non-Negotiable MVP Constraints

### 1. Select one key user problem

Write one sentence in this shape:

```text
For <specific target user in a concrete context>, the MVP solves <single painful problem> so they can <valuable outcome>.
```

The problem must be narrow enough that the team can tell when it is solved. Do not combine unrelated jobs with `and`. If two pains can succeed independently, choose one for the MVP and park the other.

Record:

- Target user and context.
- Current painful situation or workaround.
- Desired outcome.
- Evidence known today and assumptions still unvalidated.
- Why this problem deserves the MVP now.
- Explicit non-users and non-problems.

If the key problem cannot be stated clearly, stop feature planning and resolve that ambiguity first.

### 2. Select one to three critical user journeys

An MVP must have:

- **Exactly one primary CUJ** that delivers the core promise.
- **Zero to two supporting CUJs** only when they are necessary for the primary user to reach, repeat, trust, or recover the value.
- **Never more than three total CUJs** without explicit user approval to redefine the product stage or split the release.

Each CUJ must be end to end and written from the user's perspective. A page, component, API endpoint, admin operation, or implementation milestone is not a CUJ.

For each CUJ, define:

| Field | Required content |
|---|---|
| ID and name | Stable ID such as `CUJ-01 — Publish a launch page` |
| User/context | Who starts it and from what situation |
| Need | Which part of the key problem it resolves |
| Entry | The clear starting point |
| Shortest happy path | Numbered user-visible actions, with unnecessary steps removed |
| Value moment | The observable state where the user receives the promised value |
| Essential failure/recovery | Only failures that would block, lose, or undermine the journey |
| Acceptance criteria | Objective, testable outcomes |
| Success signal | Completion, time-to-value, error rate, satisfaction, conversion, or another direct signal |

Supporting CUJs are not permission to add broad account management, analytics dashboards, configuration centers, collaboration systems, or admin suites. Include only the slice required to support the primary value loop.

### 3. Ruthlessly cut scope

Every proposed capability must pass the **CUJ necessity test**:

1. Which selected CUJ requires it?
2. What exact step, failure, or trust requirement breaks without it?
3. Can a simpler default, manual internal operation, existing service, or later iteration replace it without breaking user value?
4. Does it improve the key problem now, or merely make the product feel more complete?

If no CUJ requires it, cut it. If the need is speculative, park it. If a simpler implementation keeps the journey coherent, use the simpler implementation.

Maintain three scope buckets:

- **Must ship:** only capabilities required for the one to three CUJs to work end to end in a real environment.
- **Manual/internal for MVP:** operational work the team can safely perform manually without making the user's core journey fake or unreliable.
- **Not in MVP / parking lot:** all other ideas, with a short rejection rationale and the evidence that would justify reconsideration.

Common default cuts unless the primary CUJ truly requires them:

- multiple personas or permission systems;
- multiple platforms or native apps;
- elaborate onboarding tours;
- customizable dashboards and settings;
- social, collaboration, referral, and gamification systems;
- advanced search/filter/reporting;
- multiple integrations or providers;
- broad admin consoles;
- themes, animation, and cosmetic personalization;
- speculative AI features;
- enterprise architecture for hypothetical scale.

Do not quietly reintroduce parked scope in architecture, design, implementation, QA, launch, or marketing work.

## MVP Measurement: Stage-Appropriate Learning

Structured product analytics is not universal MVP infrastructure. First choose and justify one measurement posture:

- **Not required yet:** use primary-CUJ manual evidence, direct user feedback, and an explicit learning decision when instrumentation would not change the first release decision.
- **Minimal measurement:** instrument only the event or outcome needed to evaluate the MVP's named assumption or product contract.
- **Growing-product controls:** add durable analytics, cohort reporting, and broader regression controls when the product enters the growing stage or the governing contract already requires them.

Do not turn analytics into a default dashboard or a prerequisite for every MVP. When structured product-health analytics is actually required, the following groups are a useful default rather than a universal mandate:

1. **Daily active users (DAU):** unique users performing the explicitly defined qualifying value-bearing activity per reporting day.
2. **Daily new and newly churned users:** new users enter once at the explicit activation event; newly churned users cross the documented inactivity threshold that day. Reactivated users are not new.
3. **New-user retention:** cohort-based D1 and D7 retention by default, with W1/W4 added only when the usage cycle and cohort maturity make them meaningful. Exclude incomplete cohort windows from mature-rate comparisons.

For any selected structured analytics, record stable privacy-safe identity, anonymous-to-known merge policy, timezone/day boundary, cohort denominator, late-event handling, churn window, deletion/retention policy, and bot/internal-user exclusions. Keep acquisition, funnel, conversion/revenue, error, and feature metrics as secondary diagnostics unless the product contract requires them. Do not build an end-user analytics UI merely to measure the MVP; use the smallest internal report that answers the named learning decision.

## MVP UX: Shortest Intuitive Path

The MVP UX should expose the shortest understandable path from entry to value. Simplicity means fewer decisions and less friction, not missing feedback, inaccessible controls, or confusing hidden behavior.

### UX rules

1. **Start from the primary CUJ, not a screen inventory.** Design only the screens and states needed to complete the selected journeys.
2. **One primary job per screen or step.** Make the next action obvious.
3. **Minimize path length.** Count user-visible actions from entry to value and remove every avoidable step, confirmation, field, choice, and navigation detour.
4. **Use strong defaults.** Ask only for information required to produce the value or prevent a serious failure.
5. **Prefer progressive disclosure.** Hide advanced and rare choices until they become relevant; do not expose a configuration wall before value.
6. **Avoid onboarding before doing.** Let users begin the core action immediately when possible. Explain in context rather than through tours.
7. **Use the minimum necessary copy.** Prefer clear structure, labels, and state over explanatory paragraphs, while preserving accessibility, trust, privacy, payment, error, recovery, and destructive-action copy.
8. **Preserve critical states.** Loading, empty, error, success, permission/auth, offline/network, and recovery states are required when they can block a selected CUJ.
9. **Use familiar interaction patterns.** Novel UI must earn its complexity by materially shortening or clarifying the journey.
10. **Keep navigation proportional to scope.** One to three CUJs rarely require a dense dashboard, deep sidebar, many tabs, or broad settings area.

### UX scope table

For every proposed screen/state, record:

| Screen/state | CUJ and step | User decision/action | Why required | Simpler alternative considered | Keep/cut |
|---|---|---|---|---|---|

A screen with no CUJ/step mapping is out of MVP scope. A screen that exists only to explain another confusing screen should trigger redesign before adding copy.

### Design review gate

Before engineering handoff, `ui-designer` and a fresh `ui-reviewer` must verify:

- the primary CUJ is visually dominant;
- the path has no avoidable steps or screens;
- each screen has one clear primary job/action;
- secondary features do not compete with core value;
- copy has undergone a minimum-text pass;
- required states, accessibility, responsive/device behavior, and recovery remain intact;
- design artifacts do not imply features outside the scope contract.

## Architecture and Implementation Simplicity

Choose the simplest sustainable technical solution that supports the selected CUJs in a real environment.

Prefer:

- the existing stack and conventions;
- one deployable service before distributed systems;
- one data model that directly supports the journeys;
- managed services or simple integrations when they reduce operational burden;
- boring, reversible choices;
- explicit manual internal operations when safe and invisible to users;
- implementation slices organized by end-to-end CUJ value, not horizontal infrastructure layers alone.

Do not cut requirements that make the primary journey real: necessary persistence, error handling, security/privacy, data integrity, basic accessibility, deployment, monitoring, recovery, feedback, or support. Those are minimum viability, not optional polish.

Architecture and project plans must preserve the MVP scope contract. Any new feature, service, abstraction, screen, platform, or integration needs a named CUJ dependency or explicit user approval.

## CUJ-First QA and Automated Tests

The QA strategy is part of MVP planning, not an afterthought.

### Required traceability

Create a traceability matrix before implementation:

| CUJ | Acceptance criteria | Automated coverage | Manual/release QA | Supported interfaces | Evidence |
|---|---|---|---|---|---|

Every selected CUJ must have:

- at least one executable end-to-end or integration-level test that proves the user can reach the value moment when technically feasible;
- focused unit/integration tests for critical business rules, persistence, validation, permissions, and recovery logic;
- a manual smoke case written from zero context for the real release environment;
- a separate result for every supported device interface relevant to that CUJ;
- test data, account/environment prerequisites, reset/cleanup steps, and evidence expectations;
- a clear release-blocking result when the journey is missing, stale, failed, or blocked.

### Automation priority

Automate in this order:

1. Primary CUJ happy path.
2. Failures that cause data loss, security/privacy risk, payment/auth failure, or inability to recover.
3. Supporting CUJs required to repeat or trust the core value.
4. High-risk integration seams.

Do not spend MVP time automating low-value cosmetic permutations while the primary journey lacks reliable coverage.

If end-to-end automation is genuinely infeasible, document why, create the smallest reliable manual release gate, name the owner and evidence, and create a follow-up automation task. `No tests yet` is not a launch strategy.

### MVP release gate

The MVP is not ready to launch unless:

- all selected CUJs work end to end in the intended real environment;
- the primary CUJ has current executable automated coverage or an explicitly justified/manual blocking gate;
- each supported interface has current PASS evidence for its mapped CUJs;
- failures and recovery states that can block value are tested;
- no open critical/high defect blocks a selected CUJ;
- the release candidate, deployment, monitoring, rollback, support, feedback, and ownership are defined;
- the scope contract and parking lot remain intact.

## Planning Workflow

1. Read the user's request, existing project artifacts, research, feedback, and constraints.
2. State the single key user problem and target user/context.
3. List candidate journeys, then select exactly one primary and at most two necessary supporting CUJs.
4. Write the shortest end-to-end path and value moment for each selected CUJ.
5. Inventory requested/proposed capabilities and run the CUJ necessity test on each.
6. Produce must-ship, manual/internal, and parking-lot scope buckets.
7. Define the smallest serviceable product requirements: real environment, persistence, security/privacy, error/recovery, monitoring, support, feedback, and rollback as applicable.
8. Ask `ui-designer` to map only required screens/states to CUJ steps and minimize the action count.
9. Ask `architect` to choose the simplest sustainable system that preserves the scope contract.
10. Ask `qa` to define the CUJ traceability matrix, automated test strategy, manual smoke plan, supported-interface matrix, and release blockers before coding starts.
11. Ask `project-manager` to create vertical tasks ordered by primary-CUJ value; prevent unrelated feature tasks from entering the MVP milestone.
12. Save the plan to `.projects/<project>/product/mvp-plan.md` using `templates/mvp-plan.md`. Cross-link PRD, CUJ, UI, tech, task, and QA artifacts that already exist. For artifacts that do not exist yet, name their planned durable paths and owners in the MVP plan; do not create empty documents solely to satisfy linkage.
13. Present the scope contract and cuts to the user. Ask only about decisions that materially change the key problem, selected CUJs, supported interfaces, or viability.
14. During implementation, treat new ideas as parking-lot candidates unless the user approves a scope change with a CUJ rationale.
15. Before launch, verify the traceability matrix and real release evidence rather than trusting task completion summaries.

## Definition of a Good MVP Plan

A good MVP plan lets a new teammate answer, without guessing:

- Who has the problem?
- What single problem are we solving?
- What is the one primary CUJ?
- Which zero to two supporting CUJs are truly necessary?
- What exact moment proves users received value?
- What did we cut, and why?
- What is the shortest UX path and action count?
- Which screens/states and technical components are essential?
- How does each selected CUJ get tested automatically and manually?
- What blocks launch?
- Where are feedback and success signals reviewed after launch?
- Is this a prototype, PoC, or MVP, and what evidence supports that stage?
- For an MVP, what deployment-persistent database stores user/business/product data, and how are backup, restore, migration, monitoring, and rollback handled?

If the plan cannot answer those questions, it is not ready for architecture or implementation.

## Common Pitfalls

1. **Starting with features instead of the user problem.** Reframe before selecting scope.
2. **Calling every workflow critical.** Choose one primary and at most two supporting CUJs.
3. **Keeping stakeholder ideas to avoid saying no.** Put them in the parking lot with evidence thresholds.
4. **Mistaking missing fundamentals for simplicity.** Persistence, recovery, security, accessibility, deployment, and support may be essential to real value.
5. **Designing a dashboard before the value flow.** Start at entry and value moment; add navigation only as required.
6. **Adding explanatory copy instead of simplifying UI.** Redesign structure and defaults first.
7. **Testing components but not journeys.** CUJ-level executable coverage is the release truth.
8. **Manual QA with no stable plan or evidence.** Define exact steps, environment, expected checkpoints, and blocking outcomes.
9. **Automating everything except the primary journey.** Prioritize the value path and high-risk failures.
10. **Letting new ideas leak into implementation.** Require CUJ mapping and explicit scope approval.
11. **Supporting too many platforms.** Support only the interfaces needed to validate the problem; mark others intentionally unsupported or planned.
12. **Calling a prototype an MVP.** Real users must complete the primary CUJ in a serviceable environment.

## Verification Checklist

- [ ] One key user problem is stated for a specific user/context and outcome.
- [ ] Exactly one primary CUJ is selected.
- [ ] No more than two supporting CUJs are selected, each necessary to reach, repeat, trust, or recover core value.
- [ ] Every selected CUJ has a shortest path, value moment, acceptance criteria, and success signal.
- [ ] Every must-ship capability maps to a selected CUJ step, failure, or trust requirement.
- [ ] Manual/internal operations and parking-lot ideas are explicit.
- [ ] Nonessential personas, features, platforms, screens, integrations, settings, and infrastructure were cut.
- [ ] Each proposed screen/state maps to a selected CUJ and has one primary job.
- [ ] User-visible action count was recorded and avoidable steps were removed.
- [ ] UX preserves required states, accessibility, trust, privacy, error, and recovery behavior.
- [ ] Architecture is the simplest sustainable option for the selected journeys.
- [ ] Product stage is explicit as prototype, PoC, or MVP, with purpose and exit evidence appropriate to that stage.
- [ ] For MVP, user/business/product data uses a deployment-persistent database or equivalent durable store surviving redeployments, restarts, and instance replacement.
- [ ] For MVP, persistence includes schema/migrations, backup/restore, retention, access control, monitoring, rollback, ownership, and cost.
- [ ] Prototype/PoC local or ephemeral storage is explicitly disposable and has a persistence-readiness migration path before MVP.
- [ ] CUJ traceability matrix maps acceptance criteria to automated and manual coverage.
- [ ] Primary CUJ has executable automated coverage or a justified blocking manual gate plus automation follow-up.
- [ ] Every supported interface has a CUJ case and requires current release-candidate evidence.
- [ ] Launch blockers include missing, stale, failed, or blocked CUJ coverage.
- [ ] MVP plan is saved at `.projects/<project>/product/mvp-plan.md` or the project's documented equivalent.
- [ ] Existing PRD, CUJ, UI, tech, task, and QA artifacts cross-link the same scope contract; missing artifacts have explicit planned paths and owners without empty-document ceremony.
- [ ] New ideas require explicit CUJ justification and scope approval.
