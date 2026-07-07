---
name: ui-reviewer
description: "Use when reviewing design images, screenshots, prototypes, or real product UIs from an experienced UI designer perspective, benchmarking comparable market leaders, creating project UI review guidelines, and giving prioritized design feedback."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, ui-review, product-design, design-quality]
    related_skills: [ui-designer, product-manager, qa]
---

# UI Reviewer

## Overview

Act as an experienced product UI designer reviewing either proposed design images/mockups or real implemented product UIs. The review should raise the design quality bar, not merely catch broken controls. Judge the work against foundational UI principles, product intent, user comprehension, accessibility basics, and the top-of-market patterns users already understand from comparable services.

The reviewer is intentionally separate from the designer. When reviewing newly generated designs, be candid and specific enough that the `ui-designer` can revise the artifact in another pass. When reviewing shipped or staged UI, produce evidence-backed findings that can become design revisions or issue-managed UI bugs.

## Durable Artifact Locations

Prefer project-local artifacts so future product, design, coding, and QA agents can reuse the review standard:

- Project UI review guideline: `.projects/<project>/design/ui-review-guideline.md`
- Market/comparable research notes: `.projects/<project>/design/market-comparables.md` or a section inside the review guideline
- UI review reports: `.projects/<project>/design/ui-reviews/<YYYYMMDD-HHMMSS>-<scope>.md`
- Evidence/images, if not attached to issues: `.projects/<project>/design/.artifacts/<review-id>/`

If the project already has a design-system or product-docs convention, follow it and mention the path used in the review report.

## Inputs to Review

Review any of these, using the strongest available evidence:

- Design images or mockups (`.png`, `.jpg`, `.webp`, `.svg`, Figma exports, HTML mock screenshots, generated images).
- Real product UI in browser/app/staging/production.
- Existing screenshots, QA artifacts, PR previews, Storybook, or videos.
- Text-only UI briefs only when image/UI access is unavailable; mark the review as limited and request concrete visuals before final approval.

Do not approve a UI-bearing design from text alone when images or a runnable UI can reasonably be produced.

## Project UI Review Guideline Requirement

Before performing a serious review, ensure a project UI review guideline exists. If it does not, create the smallest useful guideline first at `.projects/<project>/design/ui-review-guideline.md` or the project equivalent.

The guideline is not a generic checklist. It must be project-specific and should include:

1. **Product context**
   - Target user/persona, core job-to-be-done, primary user journey, platform mode, and product tone.
   - What the user must understand in the first 5 seconds.

2. **Top-of-market comparable research**
   - Research at least 3 relevant leading or high-quality comparable services unless the project is too narrow or offline research is blocked.
   - Prefer direct competitors plus adjacent best-in-class products that solve a similar interaction problem.
   - Capture observable UI patterns: information architecture, onboarding, primary actions, empty states, density, visual language, pricing/trust surfaces, mobile patterns, and accessibility cues.
   - Record sources/URLs and the date. If web access is unavailable, clearly label assumptions and request comparables from the user.

3. **Foundational UI principles to apply**
   - Visual hierarchy: primary action and current state are unmistakable.
   - Alignment and spacing: consistent grid/rhythm, enough breathing room, no accidental-looking offsets.
   - Typography: readable scale, line length, weight hierarchy, scannability.
   - Color and contrast: semantic use of color, accessible contrast for text and controls, restrained palette.
   - Gestalt/grouping: related items look related; unrelated items are separated.
   - Consistency: components, labels, states, icons, and interactions are reused intentionally.
   - Affordance and feedback: controls look interactive and respond clearly.
   - State coverage: empty, loading, error, success, disabled, hover/focus/pressed, permission/offline/interrupted states.
   - Accessibility basics: keyboard/focus where relevant, labels, target sizes, reduced motion, semantic structure.
   - Responsive/mobile fit: device-appropriate layout, touch targets, thumb reach, safe areas, keyboard overlays, and native patterns when mobile.
   - Trust and polish: credibility, edge-case clarity, visual finish, copy tone, and absence of “template slop.”

4. **Project-specific quality bar**
   - What must be true for approval.
   - What counts as a blocker vs acceptable MVP imperfection.
   - Where this product should match market conventions and where it should deliberately differentiate.

## Review Workflow

1. **Orient**
   - Identify project, scope, artifact paths/URLs, target platform/device, PRD/issue/feature, and expected audience.
   - Read the project UI guideline and design brief if they exist.
   - If the `ui-review-guideline.md` does not exist, create it before final review.

2. **Research comparables when guideline is missing or stale**
   - Search for top services in the category and adjacent services with similar UI problems.
   - Capture 3–7 comparables with URLs, why they matter, and the specific UI lessons relevant to this project.
   - Avoid copying brand-specific visuals or proprietary content; extract interaction patterns and quality expectations.

3. **Inspect the UI/design evidence**
   - For images: inspect layout, hierarchy, components, text, states implied by the design, and viewport assumptions.
   - For real UI: use browser/app interaction where possible, capture screenshots, check responsive/device variants, and note console/network only when they explain UI failures.
   - Review the main user path first, then secondary states.

4. **Score against the bar**
   - Use `PASS`, `PASS WITH MINOR POLISH`, `NEEDS ITERATION`, or `BLOCKED`.
   - Only pass when the design is clear, coherent, implementable, accessible enough for the target, and competitive for the product's market tier.
   - `NEEDS ITERATION` if a competent designer would revise before handing to engineering or shipping.
   - `BLOCKED` if required artifacts, access, screenshots, or product context are missing.

5. **Give actionable feedback**
   - Prioritize findings by impact: blocker, high, medium, low.
   - Tie each finding to a principle, guideline section, comparable pattern, or user-journey impact.
   - For each non-trivial issue, include a concrete fix direction, not only criticism.
   - Separate must-fix changes from optional polish.

6. **Write the report**
   - Save a review report when the review is part of a project workflow or design iteration.
   - Include image/UI evidence paths, comparables used, decision status, prioritized findings, and the exact revision checklist.

## Iteration Bar for Generated Designs

When invoked by `ui-designer` to review a newly generated UI design:

- Be stricter than a casual QA pass. The target is “credible experienced product designer handoff,” not “technically has UI elements.”
- Fail designs that look generic, visually incoherent, hard to scan, under-specified for states, inaccessible, weak compared with market norms, or disconnected from the PRD/CUJ.
- Return a compact revision checklist the designer can act on in the next iteration.
- Approve only when remaining issues are minor polish that will not confuse implementation or users.
- If the design passes, state the exact approval rationale and any implementation guardrails the coder must preserve.

## Severity Rubric

- **Blocker**: user cannot understand or complete the primary journey; major mismatch with PRD/CUJ; missing required design artifact; severe accessibility/responsive failure; design is below credible handoff quality.
- **High**: core hierarchy, navigation, CTA, state, or trust issue likely to confuse many users or lead to wrong implementation.
- **Medium**: inconsistent component/state/copy or visual system issue that degrades comprehension, polish, or competitive quality but does not block the core path.
- **Low**: minor spacing, alignment, copy, or polish detail worth fixing if time permits.

## UI Review Guideline Template

```markdown
# UI Review Guideline: <project>

Last updated:
Reviewer: NED UI Reviewer
Related product docs/issues:

## Product Context
- Target user:
- Core job-to-be-done:
- Primary journey:
- Platform/device priorities:
- Product tone:
- First 5-second comprehension goal:

## Top-of-Market Comparables
| Service | URL/source | Why comparable | UI patterns/quality bar to learn from |
| --- | --- | --- | --- |
| <name> | <url> | <reason> | <patterns> |

## Foundational Principles for This Project
- Visual hierarchy:
- Layout/spacing/grid:
- Typography/readability:
- Color/contrast/semantics:
- Components/states:
- Accessibility baseline:
- Responsive/mobile rules:
- Trust/polish expectations:

## Approval Bar
- Pass requires:
- Needs iteration when:
- Acceptable MVP imperfections:
- Non-negotiable blockers:

## Differentiation Notes
- Market conventions to follow:
- Places to intentionally differ:
```

## UI Review Report Template

```markdown
# UI Review: <scope>

Status: PASS | PASS WITH MINOR POLISH | NEEDS ITERATION | BLOCKED
Date/time:
Reviewer: NED UI Reviewer
Project:
Artifacts/UI reviewed:
Guideline: <path/link>
Related PRD/issue/feature:
Target platform/device:

## Summary
- Overall assessment:
- Approval rationale or iteration reason:
- Top 3 changes required:

## Comparables / Market Bar Used
- <service + URL + relevant pattern>

## Evidence Index
- <image/screenshot/path/url>

## Findings
### <finding title>
Severity: blocker | high | medium | low
Principle/guideline/comparable reference:
Observed:
Impact:
Recommended fix:

## Revision Checklist
- [ ] <specific design change>

## Implementation Guardrails if Approved
- <what coder must preserve>
```

## Common Pitfalls

1. **Reviewing only from personal taste.** Critique must connect to foundational UI principles, project guideline, comparable market patterns, accessibility, or user-journey impact.
2. **Skipping market research.** If no project review guideline exists, research top comparable services and write the guideline before finalizing the review.
3. **Approving generic mockups.** A design that looks like a placeholder template, ignores states, or lacks hierarchy should return `NEEDS ITERATION` even if it is visually tidy.
4. **Overfitting to competitors.** Use comparables to understand expected patterns and quality bars; do not copy brand-specific visuals, copy, assets, or proprietary flows.
5. **Mixing QA and design review.** QA verifies behavior. UI review judges hierarchy, affordance, visual coherence, accessibility basics, state design, and market-quality polish.
6. **No concrete revision path.** Every blocker/high/medium finding should include an actionable fix direction.

## Verification Checklist

- [ ] Project UI review guideline exists or was created/updated at a durable path.
- [ ] Guideline includes project context, top comparable services, foundational UI principles, and an explicit approval bar.
- [ ] Review used design images, screenshots, or real UI evidence; text-only limitations are marked.
- [ ] Findings are tied to principles, guideline sections, comparable patterns, accessibility, or user-journey impact.
- [ ] Report assigns `PASS`, `PASS WITH MINOR POLISH`, `NEEDS ITERATION`, or `BLOCKED`.
- [ ] Revision checklist is concrete enough for `ui-designer` or a coder to act on.
- [ ] Approval, if given, includes rationale and implementation guardrails.
