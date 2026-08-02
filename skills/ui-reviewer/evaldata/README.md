# UI Reviewer Eval Fixture

This fixture describes realistic NoEgoDev scenarios for evaluating the `ui-reviewer` skill.

Project: LaunchLens, a lightweight web app that helps indie founders compare launch pages and plan improvements.

Context:
- The product has a PRD at `.projects/launchlens/prds/mvp.md`.
- The ui-designer has generated desktop and mobile landing-page mockup images under `.projects/launchlens/features/landing-page/design/images/`.
- The ui-designer has authored and frozen `.projects/launchlens/design/ui-guidelines.md`.
- The user expects the product to feel credible next to top tools used by founders, not like a generic AI template.

A passing `ui-reviewer` response should:

- Run in a fresh review-only leaf, read `.projects/launchlens/design/ui-guidelines.md`, and leave the guideline and evidence unchanged.
- Research or ask for at least three relevant top-of-market comparables, such as Linear, Vercel, Framer, Webflow, Product Hunt, or high-quality adjacent SaaS/launch tools, and extract UI lessons without copying their branding.
- Review the available mockup images or real UI evidence, not only the text brief.
- Evaluate visual hierarchy, spacing, typography, color/contrast, component consistency, interaction affordance, empty/loading/error states, accessibility basics, responsive/mobile behavior, trust, and polish.
- Return `PASS`, `NEEDS ITERATION`, or `BLOCKED` with prioritized material findings; omit safely reversible nits rather than attaching minor-polish notes.
- Provide a concrete revision checklist the ui-designer can use for the next iteration.

This is Round 1. The reviewer must inspect the complete agreed desktop/mobile screen and state set and provide all independently discoverable findings in one prioritized revision checklist. It should focus on hard-to-reverse journey, navigation, accessibility-foundation, trust, and design-system decisions while ignoring safely reversible spacing/copy/style nits that can be fixed later. Rounds 2 and 3 verify dispositions and revision-introduced regressions; any new blocker explains why it was not discoverable in Round 1. The same design lineage receives no Round 4.

Negative scenarios: if the canonical guideline is missing, return `BLOCKED_MISSING_UI_GUIDELINE` without creating one. Round 2 must reject ordinary visual feedback that was discoverable in Round 1 and is unrelated to revisions or new evidence. A Round 4 request returns `ITERATION_LIMIT_REACHED` before substantive review.

Additional continuity scenarios:

- **Missing prior-round context:** Round 2 lacks the prior exact review reports, finding disposition ledger, remediation change map, or prior-context digest; return `BLOCKED_MISSING_PRIOR_CONTEXT` without substantive review.
- **Contradictory later-round feedback:** Round 2 demands the opposite of a resolved Round 1 direction without decisive new evidence; reject the contradiction unless it is labeled `PRIOR_FEEDBACK_CORRECTION` with both statements and proof.
- **Unrelated new finding:** Round 2 raises a material issue from unchanged evidence that was independently discoverable in Round 1 and unrelated to remediation; omit it rather than drip-feed another correction cycle.
- **Material process escape:** Round 2 discovers a genuine material safety/correctness defect that was reasonably discoverable in Round 1 but missed. Preserve it as `MATERIAL_PROCESS_ESCAPE`, keep the gate blocked, and escalate the process failure rather than silently suppressing it or treating it as ordinary later-round feedback.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
