---
name: product-reviewer
description: Use when reviewing a website, web app, mobile app, or product experience. Requires an objective product-review subagent seeded with audience personas, CUJ-by-CUJ satisfaction/dissatisfaction evidence, and 0-10 promoter-style scoring.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [product, review, ux, cuj, personas, satisfaction, nps]
    related_skills: [ui-reviewer, dogfood, product-experiment]
---

# Product Reviewer

## Overview

Use this skill to review a website or application as a product experience, not merely as a UI screenshot or bug hunt. The review should evaluate whether the product helps its intended audience complete the critical user journeys (CUJs) that matter for the product's promise.

A product review must include an independent/objective subagent review. The parent agent may inspect, synthesize, and challenge the result, but should not be the only evaluator. The subagent must be seeded with the target audience context and personas so it reviews from user pain points rather than from generic design taste.

The target audience/persona document is a living project artifact. If the project already has target audience information, read and use it. If it does not, research and create a broad but useful audience/persona document before reviewing. Do not overfit to a hyper-specific niche persona; focus on the key pains the product tries to solve and include a few different user types.

A product review must also evaluate each important screen from an **information value** perspective: can the user see the most important information at a glance, and are less-common details still reachable without cluttering the primary view? Good UI creates an information hierarchy that makes the main decision/action obvious while preserving drill-down paths for secondary, advanced, or infrequent needs.

## When to Use

Use when the user asks to:

- Review a product, website, SaaS app, mobile app, landing page, onboarding flow, or prototype.
- Evaluate user experience through product outcomes rather than only visual design.
- Score critical user journeys, product-market clarity, onboarding, activation, or feature usefulness.
- Produce satisfaction/dissatisfaction findings for product iteration.
- Compare current product behavior against target users' needs and pain points.
- Review screen-by-screen information value, including what is visible at a glance versus what is hidden, buried, over-emphasized, or missing.

Do not use as the sole process for:

- Pure visual design critique with no product/journey component; load a UI review skill as well.
- Security, accessibility, or performance audits; use specialized skills/tools in parallel.
- Code review; use code review/testing skills.

## Required Inputs

Gather or infer these before review:

1. **Product target**: URL, local app command, screenshots, repo path, staging link, or app description.
2. **Product promise**: what the product claims to help users do.
3. **Target audience source**: existing docs, product brief, README, landing page, prior notes, analytics, or founder/user-provided context.
4. **CUJs**: existing critical user journeys if documented; otherwise derive them from the product promise and UI.
5. **Review scope**: platform/device, authenticated vs unauthenticated state, depth of exploration, and any constraints.

If the product target or access is missing and cannot be discovered from the project, ask for it. Otherwise act with the best obvious default.

## Audience and Persona Document

Before scoring, establish the audience lens.

### If target audience info exists

- Read the existing audience/persona/product docs.
- Preserve them as the source of truth unless the review reveals contradictions.
- Add review-driven learnings as suggested updates, not silent rewrites, unless the user asked you to maintain the docs directly.

### If target audience info does not exist

Research and create a first-pass living document. Sources may include:

- Product website/landing copy.
- README, app screens, onboarding copy, pricing, docs, and examples.
- Competitor/category expectations.
- Public market/category research when useful.
- The problem the product is visibly trying to solve.

Create 3-5 personas/user types. Keep them broad and pain-point oriented, for example:

- **Primary operator**: the person who feels the recurring pain and needs the fastest path to value.
- **Evaluator/buyer**: the person deciding whether the product is credible, safe, and worth adopting.
- **Power user/admin**: the person who configures, integrates, or scales the workflow.
- **New/uncertain user**: the person who has the problem but does not yet know the category or vocabulary.

Avoid personas that are too narrow, such as a single job title at a specific company size with invented demographic detail. Useful personas should explain:

- Core pain points.
- Desired outcomes.
- Current workaround or competing behavior.
- Success criteria.
- Trust objections and drop-off risks.
- CUJs they care about most.

Treat this artifact as evolving throughout the project. Each product review may reveal new pain points, missing user types, or invalid assumptions.

## Mandatory Objective Subagent Review

Always spawn at least one subagent for objectivity before finalizing the product review.

Use `delegate_task` with a self-contained prompt containing:

- Product target and access instructions.
- Audience/persona summary or path to the audience doc.
- CUJs to evaluate, or instructions to derive CUJs if absent.
- Review scope and constraints.
- Required scoring rubric and output format.
- Instruction to record evidence, satisfaction points, dissatisfaction points, and per-CUJ score.

Suggested subagent prompt shape:

```text
You are an objective product reviewer. Review <product target> for the following broad target audience/personas:
<audience/persona summary>

Evaluate these CUJs:
<CUJ list or "derive the likely CUJs from the product promise and UI">

For each CUJ:
1. Attempt the journey as a realistic user from the relevant persona.
2. Record satisfaction points: moments that reduce pain, create clarity, build trust, or produce value.
3. Record dissatisfaction points: friction, confusion, missing information, broken flow, weak trust, unclear value, or dead ends.
4. Review each important screen's information value: what the user can understand at a glance, whether the highest-priority information is prominent, and whether detailed/less-common information is reachable without overwhelming the screen.
5. Assign a 0-10 promoter-style score using the product-reviewer rubric.
6. Cite concrete evidence from the product experience.

Return concise findings per CUJ, a screen-by-screen information-value review, and top cross-cutting recommendations.
```

If the review is high-stakes or subjective, run multiple subagents seeded with different persona emphasis, then compare disagreements.

## CUJ Review Procedure

1. **List CUJs**
   - Prefer existing project CUJs if available.
   - If absent, derive 3-7 CUJs from the product promise, primary navigation, onboarding, pricing/conversion path, and core feature loop.
   - Each CUJ should be stated as a user goal, e.g. "A first-time visitor understands the product and decides whether to try it" or "A user completes setup and reaches first useful output."

2. **Walk each CUJ**
   - Use the product as a real user would.
   - Capture concrete evidence: screen names, page sections, copy, interactions, success/failure states, loading states, empty states, and blockers.
   - Separate product dissatisfaction from incidental local/tooling issues.

3. **Review each important screen for information value**
   For every screen or state encountered during a CUJ, evaluate whether the screen helps the user understand and act quickly:
   - **At-a-glance value:** what can the relevant persona understand within a few seconds?
   - **Primary information:** is the most important status, result, decision input, next action, or value proof visually and semantically prominent?
   - **Secondary information:** are supporting details available through progressive disclosure, tabs, filters, expandable sections, drill-downs, links, or contextual help rather than crowding the main view?
   - **Information priority:** does the hierarchy match the user's current job, or are low-value metrics, decorative elements, navigation, or rare settings competing with essentials?
   - **Actionability:** does the screen convert information into an obvious next step?
   - **Missing information:** what question would the target user still need answered before continuing, trusting, buying, or recommending?

   A strong product screen lets users see the most important information at a glance and gives clear paths to deeper or less commonly used information. Penalize screens that either hide the critical facts or expose every detail at once with no hierarchy.

4. **Record satisfaction points**
   Satisfaction points are moments that would make the target user more likely to continue, recommend, trust, or pay. Examples:
   - The value proposition is immediately clear.
   - The product removes a known pain or saves effort.
   - The next action is obvious.
   - The product produces a useful result quickly.
   - Trust, safety, pricing, or data-use concerns are answered.
   - The flow supports different user types without clutter.

5. **Record dissatisfaction points**
   Dissatisfaction points are moments that would make the user hesitate, abandon, distrust, or avoid recommending. Examples:
   - Unclear product promise or audience fit.
   - Missing or confusing call to action.
   - Required setup before any value is visible.
   - Broken flow, error, dead end, or missing state.
   - Too much generic copy and not enough concrete outcome proof.
   - Persona-specific pain is not addressed.
   - The user cannot tell whether the product is safe, credible, or worth the cost.
   - A screen buries the most important information, over-emphasizes low-value information, or lacks a path to more detailed information when users need it.

6. **Score each CUJ from 0 to 10**
   Use a net-promoter-like question: "After this CUJ, how likely would the target user be to recommend, continue using, or advocate for this product experience for this job-to-be-done?"

## 0-10 CUJ Scoring Rubric

Score the experience, not the team effort.

- **0-2: Detractor / failed journey**
  - CUJ cannot be completed, or the user is likely to abandon.
  - Core promise is unclear or contradicted.
  - Major trust, usability, or value failure.

- **3-4: Detractor / high friction**
  - CUJ is technically possible but confusing, fragile, or unrewarding.
  - More dissatisfaction than satisfaction.
  - User would not recommend and may warn others away.

- **5-6: Passive / mixed**
  - CUJ partially works and value is plausible.
  - Satisfaction and dissatisfaction are balanced.
  - User may continue only if motivated or already convinced.

- **7-8: Promoter / solid**
  - CUJ works, value is clear, and most pain points are addressed.
  - Some fixable friction remains.
  - User is likely to continue and may recommend to peers with similar needs.

- **9-10: Strong promoter / excellent**
  - CUJ creates fast, clear, differentiated value.
  - Friction is minimal and trust is high.
  - User would likely recommend without prompting.

### Optional calculation aid

When useful, compute a score from observed points, then adjust with judgment:

```text
base = 5
+ 0.5 to 1.5 for each strong satisfaction point
- 0.5 to 2.0 for each serious dissatisfaction point
cap to 0..10
then sanity-check against the rubric above
```

Do not let point counting override a severe blocker. A single journey-breaking defect usually caps the score at 4, and a trust/safety failure may cap it at 3 even if the UI is polished.

## Required Output Format

Return a concise product review with these sections:

```markdown
## Product Review Summary
- Product target:
- Audience lens:
- Overall read:
- Biggest opportunity:
- Biggest risk:

## Audience / Persona Notes
- Existing audience doc used: <path/source or "created first-pass">
- Key pain points:
- Personas/user types considered:
- Suggested audience-doc updates:

## CUJ Scores
### CUJ 1: <user goal>
- Score: <0-10>
- Persona lens:
- Satisfaction points:
  - ...
- Dissatisfaction points:
  - ...
- Evidence:
  - ...
- Recommendation:
  - ...

### CUJ 2: <user goal>
...

## Screen Information-Value Review
### Screen: <name/state>
- At-a-glance information:
- Most important information visible?: <yes/no/mixed>
- Detail/drill-down path:
- Information hierarchy issues:
- Recommended change:

## Cross-CUJ Themes
- Satisfaction themes:
- Dissatisfaction themes:
- Information-value themes:
- Highest-leverage fixes:

## Subagent Objectivity Check
- Subagent used: yes
- Agreement/disagreement with parent review:
- Notable subagent-only findings:
```

Avoid pipe tables when the final result will be sent over Telegram; use headings and bullets instead.

## Updating Project Artifacts

When working inside a project repo or product workspace:

- Look for existing docs such as `docs/audience.md`, `docs/personas.md`, `docs/product.md`, `docs/CUJ.md`, `docs/cujs.md`, `README.md`, `PRD.md`, or similar.
- If no audience artifact exists and the user asked for durable project work, create one in the project's docs area, using the project's existing documentation conventions.
- If no CUJ artifact exists and the review reveals stable CUJs, propose or create a living CUJ document.
- Keep these docs broad, evolving, and tied to pain points. Do not invent excessive demographic detail.
- Mark uncertain assumptions clearly.
- Do not write transient review scratch files into git repositories. Temporary notes belong in a non-repo scratch folder; durable audience/CUJ docs may go into the repo only when intended as project artifacts.

## Common Pitfalls

1. **Skipping the subagent.** The product review must include an independent subagent for objectivity. If delegation is unavailable, state that limitation and avoid presenting the review as fully complete.

2. **Reviewing as yourself instead of the audience.** Every score should be anchored in target pain points and persona/user type needs.

3. **Over-narrow personas.** Avoid fake precision. A few broad user types with clear pains beat a made-up persona like "34-year-old fintech PM at a 75-person startup."

4. **Only listing bugs.** Product review includes value clarity, motivation, trust, onboarding, and whether the CUJ solves the user's job.

5. **Only praising polish.** A beautiful flow that does not solve the pain or make value obvious can still score low.

6. **Averaging away blockers.** If a CUJ dead-ends, score the journey as a likely detractor even if earlier steps were pleasant.

7. **Letting subagent findings pass unchallenged.** Reconcile the subagent's evidence with your own inspection. Call out disagreements rather than hiding them.

8. **Treating audience docs as final.** Audience and persona notes should evolve as the product and evidence evolve.

9. **Ignoring information hierarchy.** A screen can technically contain all required information and still fail if the user cannot see the important facts at a glance, or if advanced/rare details crowd out the primary decision/action.

## Verification Checklist

- [ ] Product target and review scope are clear.
- [ ] Existing audience/CUJ docs were searched for or the absence was noted.
- [ ] Audience/persona lens includes several broad user types and key pain points.
- [ ] At least one objective product-review subagent was run with the audience/persona context.
- [ ] CUJs are stated as user goals.
- [ ] Important screens/states encountered in each CUJ were reviewed for information value.
- [ ] Each important screen identifies at-a-glance information, primary information, drill-down/detail access, hierarchy issues, and recommended changes.
- [ ] Each CUJ has satisfaction points, dissatisfaction points, evidence, recommendation, and 0-10 score.
- [ ] Scores follow the promoter-style rubric and are not inflated past blockers.
- [ ] Cross-CUJ themes and highest-leverage fixes are summarized.
- [ ] Any created/updated audience or CUJ artifact is durable and intentionally placed, not a transient scratch file in a repo.
