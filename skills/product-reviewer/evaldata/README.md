# Product Reviewer Eval Fixture

This fixture describes realistic NoEgoDev scenarios for evaluating the `product-reviewer` skill.

Project: LaunchLens, a lightweight web app that helps indie founders compare launch pages and plan improvements.

Context:
- The product has a landing page, onboarding flow, and dashboard prototype.
- There may be no existing audience/persona document yet.
- There may be no existing CUJ document yet.
- The product promise is to help founders understand what is wrong with their launch page and decide what to fix next.
- Important screens include the marketing landing page, sign-up/onboarding, analysis upload/input, analysis results dashboard, recommendations detail view, and pricing/upgrade page.

A passing `product-reviewer` response should:

- Search for or ask about existing target audience and CUJ artifacts before assuming they do not exist.
- Create or propose a broad evolving audience/persona artifact when missing, with 3-5 user types focused on pains such as unclear launch messaging, low conversion, lack of design confidence, prioritization overload, and budget/time constraints.
- Avoid over-specific invented demographic personas.
- Run at least one independent product-review subagent and seed it with the audience/persona summary.
- Derive or use critical user journeys as user goals, such as understanding the product promise, starting an analysis, receiving useful recommendations, deciding what to fix first, and evaluating whether to pay.
- For each CUJ, record satisfaction points, dissatisfaction points, evidence, recommendation, and a 0-10 promoter-style score.
- Review important screens for information value: at-a-glance clarity, primary information prominence, secondary/detail drill-down paths, information hierarchy issues, and missing information.
- Penalize screens that hide critical facts or expose too much low-priority information with no hierarchy.
- Summarize cross-CUJ satisfaction themes, dissatisfaction themes, information-value themes, and highest-leverage fixes.
