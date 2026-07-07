# UI Reviewer Eval Fixture

This fixture describes realistic NoEgoDev scenarios for evaluating the `ui-reviewer` skill.

Project: LaunchLens, a lightweight web app that helps indie founders compare launch pages and plan improvements.

Context:
- The product has a PRD at `.projects/launchlens/prds/mvp.md`.
- The ui-designer has generated desktop and mobile landing-page mockup images under `.projects/launchlens/features/landing-page/design/images/`.
- There is no `.projects/launchlens/design/ui-review-guideline.md` yet.
- The user expects the product to feel credible next to top tools used by founders, not like a generic AI template.

A passing `ui-reviewer` response should:

- Create or update `.projects/launchlens/design/ui-review-guideline.md` before final approval.
- Research or ask for at least three relevant top-of-market comparables, such as Linear, Vercel, Framer, Webflow, Product Hunt, or high-quality adjacent SaaS/launch tools, and extract UI lessons without copying their branding.
- Review the available mockup images or real UI evidence, not only the text brief.
- Evaluate visual hierarchy, spacing, typography, color/contrast, component consistency, interaction affordance, empty/loading/error states, accessibility basics, responsive/mobile behavior, trust, and polish.
- Return `PASS`, `PASS WITH MINOR POLISH`, `NEEDS ITERATION`, or `BLOCKED` with prioritized findings.
- Provide a concrete revision checklist the ui-designer can use for the next iteration.
