---
name: ui-designer
description: "Use when creating project UI guidelines, reviewing implemented UI against those guidelines, identifying visual/UX/accessibility inconsistencies, and filing UI bugs in the issue system."
version: 0.3.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, ui-design, product-design, qa]
    related_skills: [mvp-planning, product-manager, qa, project-manager, ui-reviewer, english-copywriter, reviewable-artifacts]
---

# UI Designer

## Overview

Own the product's visual and interaction quality bar. Create a durable UI guideline for the project, review real implemented screens against that guideline, and turn UI defects into actionable issue-managed bugs.

UI design work is not only aesthetics. Good UI guidance makes the product easier to use, consistent across screens, accessible enough for real users, and feasible for the codebase/design system that exists.

## Durable UI Artifact Locations

Prefer project-local artifacts so future product, coding, and QA agents can reuse them:

- UI guideline: `.projects/<project>/design/ui-guidelines.md`
- Feature UI brief: `.projects/<project>/features/<feature-slug>/design/ui-brief.md` or the project's equivalent feature artifact folder beside the PRD and tech spec
- Feature design images/mockups: `.projects/<project>/features/<feature-slug>/design/images/` or the project's equivalent feature artifact folder beside the PRD and tech spec
- UI review reports: `.projects/<project>/design/ui-reviews/<YYYYMMDD-HHMMSS>-<scope>.md`
- UI assets/screenshots, if not attached to issues: `.projects/<project>/design/.artifacts/<review-id>/`

If the project already has a design-system or docs convention, follow it and mention the path used in the report.

## Human-Reviewable Visual Design Gate

Do not ask a user to approve a visual direction from prose. For every material new UI direction or redesign, load/use `reviewable-artifacts` and produce a concrete visual review bundle before architecture/engineering handoff.

1. **Create pixels, not a verbal pitch**
   - Prefer 2-3 lightweight runnable HTML/CSS prototypes when real alternatives would improve the decision. When one direction is clearly best, produce one polished recommended prototype plus a concise visual record of rejected alternatives/rationale instead of artificial variety.
   - Use realistic content and the actual primary CUJ. A style tile or decorative hero alone is not enough.
   - Include the states and viewports needed to judge the concept: at minimum the primary default path plus material loading, empty, error, success, permission/auth, mobile, and desktop behavior as applicable.
2. **Run and capture every direction**
   - Open each prototype or design artifact directly and capture clean screenshots at target viewports.
   - Export annotated screenshots for important interactions using stable IDs such as `UI-01`, `SCREEN-02`, `A1`, and `A2` without obscuring the clean design.
   - If the prototype cannot run or screenshots cannot be produced, mark visual review `BLOCKED`; a verbal description does not satisfy the gate unless the user explicitly requested text-only low-fidelity wireframes.
3. **Create `DESIGN_REVIEW.md`**
   - Store it beside the feature design brief, e.g. `.projects/<project>/features/<feature>/design/DESIGN_REVIEW.md`.
   - Embed each clean screenshot directly under a separate stable variant/screen heading and link its runnable prototype/preview.
   - Include a compact comparison matrix covering CUJ fit, entry-to-value action count, hierarchy, responsive/mobile behavior, accessibility/trust, implementation cost, and key tradeoff.
   - Put each variant, screen, and annotated hotspot on its own Markdown line/table row so GitHub inline comments attach to the exact idea.
   - Recommend one direction and explain why while explicitly inviting the user to choose, combine, or reject.
4. **Publish the review surface**
   - Keep prototype source, screenshots, brief, and `DESIGN_REVIEW.md` canonical in the repository.
   - When the PR exists only as a design-review surface, explicitly use `REVIEW_ONLY`: a `review-only/*` branch, `[REVIEW ONLY — DO NOT MERGE]` draft title/body banner, available `review-only`/`do-not-merge` labels, cleanup owner/trigger, rendered review link, `Files changed` instructions, exact decisions, and preview links. Never merge it; after the selected design is preserved in its canonical destination, close it without merge and clean its branch, worktree, temporary previews/captures/copies/access, then verify cleanup.
   - True coordinate-pinned Figma comments are optional only when the project already uses Figma; preserve a repository disposition/sync-back record.
5. **Process human comments as a gate**
   - Read unresolved GitHub review threads through the `reviewable-artifacts` helper/GraphQL workflow.
   - Map each comment to its stable variant/screen/hotspot ID, update the canonical prototype/source, regenerate screenshots, verify the result, reply with the addressing revision, and only then resolve the thread.
   - Keep disputed product/design decisions open. `All threads resolved`, `design approved`, and `PR merged` are separate states.
   - Do not begin final engineering handoff until required visual decisions are explicitly approved or a blocker/residual risk is documented.

## Feature Design Task and Design Images

When project-manager creates a UI design task for a UI-related feature, the ui-designer must produce design artifacts before architecture/tech-spec generation proceeds.

Design task requirements:

1. **Use the project design guideline as the basis**
   - Read `.projects/<project>/design/ui-guidelines.md` or the project's equivalent guideline first.
   - If no guideline exists, create/update a minimal guideline before generating feature designs, or mark the design task blocked with the missing guideline and the exact follow-up needed.
   - Do not generate feature mockups from generic taste alone; tie layout, visual language, components, copy tone, accessibility, and responsive choices back to the guideline.

2. **Generate design images/mockups for the feature**
   - Produce concrete visual design images for the affected screens, key states, and primary responsive/device variants needed by the PRD.
   - Include enough states for implementation and QA to work without guessing: default, empty, loading, error, success, disabled, permission/auth, and mobile/desktop variants where relevant.
   - The images may be screenshots from an HTML mock, generated visual mockups, annotated wireframes, exported design-tool frames, or other concrete image artifacts. Prefer image files (`.png`, `.jpg`, `.webp`, `.svg`) over text-only descriptions for UI-bearing features.
   - Add visible annotations to every important interactive component in design images/mockups. At minimum annotate buttons, links, tabs, nav items, icon buttons, inputs/selects, toggles, cards that open details, modal/sheet controls, destructive actions, and primary empty/error-state actions.
   - Use stable annotation IDs such as `A1`, `A2`, `A3` directly on or beside the component with a non-obscuring callout/outline. Pair the IDs with an interaction legend in the design brief describing expected click/tap behavior, destination/state transition, validation rules, disabled/loading/error behavior, and accessibility notes.
   - Do not let annotations replace the clean visual design. When the final visual needs to be evaluated without overlays, export both a clean image and an annotated image, e.g. `dashboard.png` and `dashboard-annotated.png`; the annotated version is required for implementation handoff.
   - If image generation/export is blocked by tooling, create a text design brief plus a follow-up image-generation task; do not pretend a text-only brief satisfies the design-image requirement.

3. **Store design artifacts beside the feature PRD and tech spec**
   - Prefer a feature-local artifact folder so PRD, design, and tech spec travel together, e.g.:
     - `.projects/<project>/features/<feature-slug>/prd.md`
     - `.projects/<project>/features/<feature-slug>/design/ui-brief.md`
     - `.projects/<project>/features/<feature-slug>/design/images/<screen-state>.png`
     - `.projects/<project>/features/<feature-slug>/tech-spec.md`
   - If the project already uses `.projects/<project>/prds/` and `.projects/<project>/tech-specs/`, keep those canonical files but add cross-links to the feature design folder and image paths.
   - Every design brief must list the related PRD path and expected tech-spec path; every tech spec should be able to cite the guideline, brief, and image paths.

4. **Design brief contents**
   - Related PRD/issue and CUJ/user need.
   - Guideline sections used.
   - Screens/components/states covered.
   - Image index with clean and annotated image paths and what each image demonstrates.
   - Interactive component annotation legend mapping annotation IDs to behavior, states, destinations, validation, and accessibility notes.
   - Interaction rules, copy/microcopy, responsive/device behavior, accessibility notes, and open questions.
   - Implementation acceptance notes the architect/coder must preserve.

5. **Spawn an independent English copy review loop**
   - After generating or updating UI design images/mockups and before final UI approval, spawn a subagent instructed to load and use the `english-copywriter` skill.
   - Give the copywriter the PRD/CUJ, project UI guideline, design brief, image paths or UI URL, target platforms, brand/tone notes, and all visible UI text from the mockups when available.
   - Require the copywriter to run a minimum-text pass first: remove, shorten, or replace explanatory text with clearer UI structure whenever the screen/control/state can explain itself.
   - The copywriter must review all visible strings in scope: headlines, navigation, tabs, CTAs, labels, placeholders, helper text, empty/error/success states, toasts, modals, onboarding, permission/payment/privacy/destructive-action copy, and text embedded in design images.
   - Treat copywriter status `NEEDS ITERATION` or `BLOCKED` as not ready for final design handoff. Revise the design and text, then rerun copy review until it returns `PASS` or `PASS WITH MINOR POLISH`, or document a real blocker.
   - Preserve the copy review status, highest-impact rewrites/removals, and copy guideline path or notes in the design brief.

6. **Spawn an independent UI review iteration loop**
   - After the copywriter pass has been applied or explicitly blocked, spawn a subagent instructed to load and use the `ui-reviewer` skill.
   - Give the reviewer the PRD/CUJ, project UI guideline, copywriter report/status, design brief, image paths or UI URL, target platforms, and the current approval bar.
   - Require the reviewer to create/update `.projects/<project>/design/ui-review-guideline.md` if it does not exist, including foundational UI principles and top-of-market comparable services for the product category.
   - During UI review, include copy quality as part of design quality: unnecessary explanatory text, vague CTAs, long mobile copy, inaccessible label removal, and unclear errors/destructive confirmations are design iteration issues.
   - Treat reviewer status `NEEDS ITERATION` or `BLOCKED` as not ready for engineering handoff. Revise the design artifacts and rerun copy/UI review as needed until the reviewer returns `PASS` or `PASS WITH MINOR POLISH`, or until a real blocker is documented with the exact missing input/tooling.
   - Preserve the review report path and final approval rationale in the design brief so architects, coders, and QA can see what quality bar was met.

## Creating a UI Guideline

Create or update the UI guideline when a project is new, when no guideline exists, before major UI implementation, or when repeated UI bugs show the existing guideline is too vague.

A useful guideline should be specific enough that a coder or QA agent can apply it without guessing. Include:

- Product context: target user, core user journey, product tone, and primary jobs-to-be-done.
- Layout principles: page structure, spacing rhythm, content density, responsive breakpoints, navigation, and hierarchy. For mobile apps, explicitly define small-screen focus, one-primary-job-per-screen expectations, reach zones, and touch-first navigation.
- Visual language: typography, color roles, contrast expectations, elevation/borders, icons, imagery, and motion restraint.
- Components and states: buttons, forms, inputs, tables/lists, cards, modals, empty/loading/error/success states, toasts, and destructive actions. For mobile apps, include native mobile patterns such as bottom tabs, bottom sheets, safe-area handling, keyboard overlays, permission states, and offline/interrupted-session states.
- Accessibility basics: keyboard reachability, focus states, visible labels, contrast, target sizes, reduced-motion concerns, and semantic headings where applicable.
- Copy and microcopy: tone, CTA conventions, navigation labels, empty/error/success states, confirmation text, and formatting conventions. The default copy rule is minimum text: remove or replace explanatory text with clearer UI structure when a screen/control/state can explain itself, while preserving labels and recovery/trust copy that users need.
- Do / don't examples when helpful.
- Open questions and intentionally deferred design decisions.

Do not invent a massive design system when the project needs a small MVP. Start with the smallest durable guideline that prevents inconsistent implementation.

## MVP UX Scope and Simplicity Rules

When designing a new MVP or an MVP reset, load/read the project's `mvp-planning` output and treat `.projects/<project>/product/mvp-plan.md` as the UI scope contract.

1. Design for exactly the approved one primary and zero to two supporting CUJs. Do not convert the parking lot into screens, tabs, cards, settings, or disabled placeholders.
2. Build the screen/state map from CUJ steps. Every screen/state must name the CUJ step it enables; cut anything with no mapping.
3. Count user-visible actions from entry to the value moment. Remove avoidable onboarding, confirmations, fields, choices, navigation detours, and repeated data entry.
4. Give each screen one primary job and one visually dominant next action. Secondary actions must not compete with the core journey.
5. Prefer strong defaults, direct manipulation, familiar controls, progressive disclosure, and in-context help over setup wizards, dense dashboards, and configuration walls.
6. Use the minimum necessary copy. First simplify hierarchy, controls, defaults, and state; keep words required for labels, accessibility, privacy/trust, errors, recovery, payment, and destructive consequences.
7. Preserve required loading, empty, error, success, auth/permission, offline/network, and recovery states. Simplicity is not silent failure or missing feedback.
8. Keep navigation proportional to one to three CUJs. A broad sidebar, many tabs, admin console, or multi-level information architecture needs an explicit CUJ dependency.
9. Use the minimum supported interface set approved in the MVP plan. Do not create implied parity for planned or intentionally unsupported platforms.
10. In the design brief, include a `MVP UX scope check` with the primary problem, selected CUJs, screen-to-CUJ map, entry-to-value action count, removed steps/screens, and parked ideas not represented.

Before handoff, require the independent `ui-reviewer` to fail the design when extraneous features distract from the primary CUJ, when avoidable steps remain, when a screen has multiple competing primary jobs, or when the design implies scope outside the MVP contract.

## Mobile App UX Review Rules

Review mobile app UX differently from web app UX. A phone screen is small, held in the hand, and operated primarily by touch; evaluate whether each screen is simple, focused, reachable, and one-finger friendly rather than applying desktop/web layout expectations.

When the product is a mobile app or mobile-first flow, explicitly check:

- **Focused layout:** each screen should have one primary job. Avoid dense dashboards, multi-column layouts, persistent sidebars, and “show everything” web patterns on the small screen.
- **Small-screen hierarchy:** the primary action, current state, and next step should be understandable at a glance. Prefer progressive disclosure over exposing every option at once.
- **Touch-first controls:** interactive targets should be comfortably tappable, generally 44px or larger, with enough spacing to prevent mis-taps.
- **One-finger navigation:** core browsing and primary flows should work with one thumb/finger. Do not rely on hover, keyboard shortcuts, precise cursor behavior, or two-handed reach for routine actions.
- **Reach zones:** frequent actions should sit in comfortable thumb reach. Top corners are acceptable for lower-frequency or platform-standard actions, not high-frequency primary controls.
- **Mobile navigation model:** prefer native/mobile patterns such as bottom tabs, bottom sheets, clear back behavior, swipeable surfaces, and short step-by-step flows. Do not import desktop navigation such as hover menus, tiny breadcrumbs, deep top nav, or persistent left nav without a strong mobile-specific reason.
- **Screen transitions and orientation:** users should always know where they are and how to get back across pushes, modals, sheets, and tabs.
- **Input burden:** minimize typing and precise selection. Prefer defaults, pickers, saved values, scanning, and shorter staged forms.
- **Viewport realities:** account for safe areas, notches, status bars, tab bars, keyboard overlays, and scroll position. Critical actions must not hide behind the keyboard or OS chrome.
- **Mobile resilience states:** review loading, empty, offline/poor-network, permission-denied, error, success, interrupted-session, and resume states because mobile use is fragmented.

When reporting findings, label mobile-specific issues separately from general visual design issues. Frame fixes as mobile interaction changes, e.g. “collapse this into one primary action plus secondary overflow,” “move the frequent action into the bottom bar,” or “split this dense web-style screen into a two-step mobile flow.”

## Reviewing UI Against the Guideline

Review the real UI, not only code. Use screenshots, browser inspection, local/staging/production URLs, storybook, previews, or existing QA artifacts as available.

1. **Orient**
   - Identify project, target environment, review scope, relevant PRD/issue/PR, and current UI guideline path.
   - If no guideline exists, create a minimal one first or explicitly mark the review as `baseline UI review without guideline` and create a follow-up guideline task.

2. **Collect evidence**
   - Capture screenshots for every screen/state reviewed, especially failures.
   - Include viewport/device, browser, URL, timestamp, commit/build if known, and console/network notes when relevant.
   - Check key responsive widths when the UI is user-facing or mobile-relevant.

3. **Compare against the guideline**
   - Look for mismatches in layout, spacing, hierarchy, typography, color roles, component variants, copy tone, states, accessibility basics, and responsive behavior.
   - For visible UI text, either spawn an `english-copywriter` subagent or run the same minimum-text copy review yourself: remove unnecessary explanatory copy, flag vague CTAs, check mobile string length, and ensure errors/empty/destructive states help users recover or understand consequences.
   - Separate objective guideline violations from subjective preferences. If the guideline is ambiguous, file or create a guideline-improvement task rather than pretending the UI is wrong.

4. **Prioritize findings**
   - **Critical**: UI causes data loss, security/privacy confusion, impossible checkout/auth/core workflow, or blocks a launch-critical path.
   - **High**: confusing or broken core journey, inaccessible primary action, severe responsive failure, or misleading state/error.
   - **Medium**: inconsistent component/state/copy that degrades trust or comprehension but has a workaround.
   - **Low**: cosmetic polish, minor spacing/alignment, or guideline cleanup that does not affect comprehension.

5. **File actionable UI bugs**
   - Search the issue system before filing to avoid duplicates.
   - File or update an issue for each real fixable defect. Group small related polish issues only when they share one screen/component and one owner.
   - Link to the guideline section that defines expected behavior when possible.

## UI Bug Template

```text
Title: [UI] <screen/component> <specific problem>

Environment:
- URL/environment:
- Browser/device/viewport:
- Build/commit/version if known:

Severity: <critical/high/medium/low>

Guideline reference:
- <path + section, or "baseline review / guideline missing">

Steps to observe:
1.
2.
3.

Expected UI:

Actual UI:

Evidence:
- Screenshot(s): <links or attachments>
- Review report: <link/path>
- Console/network notes if relevant:

Duplicate search performed:
- Query 1:
- Query 2:
- Existing related issues:
```

## UI Guideline Template

```markdown
# UI Guidelines: <project>

Last updated:
Owner: NED UI Designer
Related PRD/spec/issues:

## Product and User Context
- Target user:
- Primary journey:
- Product tone:
- Platform mode: web app | mobile app | responsive web

## Design Principles
1.
2.
3.

## Layout and Responsive Rules
- Page/screen shell/navigation:
- Spacing/content density:
- Breakpoints or device classes:
- Mobile app rules, if applicable: one-primary-job-per-screen, thumb reach zones, bottom navigation/sheets, safe areas, keyboard overlays, and one-finger browsing expectations.

## Visual Language
- Typography:
- Color roles and contrast:
- Borders/elevation:
- Icons/imagery/motion:

## Components and States
- Buttons/links:
- Forms/inputs:
- Lists/tables/cards:
- Modals/toasts:
- Empty/loading/error/success states:

## Accessibility Baseline
- Keyboard/focus:
- Labels/headings:
- Target sizes:
- Reduced motion/contrast:

## Copy and Microcopy
- Voice/tone:
- CTA labels:
- Error/empty-state conventions:

## Open Questions / Deferred Decisions
-
```

## Feature UI Design Brief Template

```markdown
# Feature UI Design Brief: <feature>

Status: READY | BLOCKED
Date/time:
Designer: NED UI Designer
Related PRD: <path/link>
Expected tech spec: <path/link>
Issue/task: <path/link>
Project UI guideline: <path/link + sections used>
Copywriter review: <path/link + PASS/PASS WITH MINOR POLISH/BLOCKED rationale + key removals/rewrites>
UI review guideline: <path/link>
Final UI review report: <path/link + PASS/PASS WITH MINOR POLISH/BLOCKED rationale>
Human review index: <DESIGN_REVIEW.md path>
Draft review PR / rendered URL: <link>
Human review status: DRAFT | IN REVIEW | CHANGES REQUESTED | APPROVED | BLOCKED
Unresolved material threads: <count + links/IDs>
CUJ/user need:

## Scope
- MVP plan / scope contract: <path/link or not applicable>
- Key user problem:
- Selected CUJs: <exactly one primary; zero to two supporting for MVP>
- Screens/components:
- States covered:
- Platforms/viewports:

## MVP UX Scope Check
- Primary CUJ entry → value moment:
- User-visible action count:
- Screen/state → CUJ-step mapping:
- Steps/screens/fields/choices removed:
- Defaults/progressive disclosure used:
- Parked ideas intentionally not represented:
- Simplicity blockers or scope-change requests:

## Design Review Index
- `DESIGN_REVIEW.md`: <path>
- Runnable variants/previews: <links>
- Recommended direction: <UI-ID + reason>
- Decision requested: <choose/combine/reject>

| Variant/screen ID | Embedded clean screenshot | CUJ/action count | Responsive/accessibility | Cost/tradeoff | Review status |
| --- | --- | --- | --- | --- | --- |
| `UI-01` | `design/images/<file>.png` | <fit/count> | <notes> | <notes> | IN REVIEW |

## Design Image Index
| Image | Screen/state | Purpose | Notes |
| --- | --- | --- | --- |
| `design/images/<file>.png` | <screen/state> | Clean visual reference | <responsive/accessibility/copy notes> |
| `design/images/<file>-annotated.png` | <screen/state> | Annotated implementation reference | <annotation coverage notes> |

## Interactive Component Annotation Legend
| ID | Component | User action | Expected behavior/destination | States/validation | Accessibility note |
| --- | --- | --- | --- | --- | --- |
| A1 | <button/link/input/etc.> | <click/tap/type> | <result> | <default/disabled/loading/error/success> | <label/focus/target-size note> |

## Interaction and State Rules
-

## Copy and Microcopy
- Minimum-text pass summary:
- Removed/replaced text because UI explains itself:
- Final strings / CTA conventions:
- Empty/error/success/destructive states:

## Responsive / Device Behavior
-

## Accessibility Notes
-

## Implementation Acceptance Notes
-

## UI Reviewer Iteration Log
| Iteration | Reviewer report | Status | Required revisions | Resolution |
| --- | --- | --- | --- | --- |
| 1 | <path> | NEEDS ITERATION | <summary> | <what changed> |

## Open Questions / Blockers
-
```

## UI Review Report Template

```markdown
# UI Review: <scope>

Status: PASS | FAIL | BLOCKED
Date/time:
Reviewer: NED UI Designer
Environment:
Guideline: <path/link>
Related issue/PR/milestone:

## Summary
- Screens/states reviewed:
- Overall assessment:
- Bugs filed/updated:
- Guideline updates needed:

## Findings
### <finding title>
Severity: critical | high | medium | low
Status: filed | duplicate updated | no issue filed
Guideline reference:
Expected:
Actual:
Evidence:
Issue:

## Screenshots / Evidence Index
-

## Follow-ups
-
```

## Common Pitfalls

1. **Reviewing from taste instead of guidelines.** Personal preference is not a bug. Tie findings to the guideline, user journey, accessibility, or clear product comprehension impact.
2. **Skipping the guideline.** If no guideline exists, create a minimal one before serious review or file the missing guideline as a blocker/follow-up.
3. **Treating UI design as text-only for a UI-bearing feature.** Feature design tasks must generate concrete design images/mockups based on the project guideline and store them beside the PRD/tech spec. If tooling blocks images, record the blocker and create a follow-up image-generation task.
4. **Forgetting interactive annotations.** UI design images for implementation handoff must annotate important interactive components with stable IDs and include a matching interaction legend; otherwise coders and QA will guess behavior from visuals.
5. **Skipping independent copy review.** Newly generated UI design images and UI review passes must include an `english-copywriter` review of all visible text. Run the minimum-text pass first: remove/replace explanatory copy when the UI can explain itself, but preserve necessary labels, accessible names, trust, recovery, and consequence copy.
6. **Skipping independent review of generated designs.** Newly generated UI design images must be reviewed by a separate subagent using `ui-reviewer`; do not self-approve major UI work without a reviewer pass or documented blocker.
7. **Filing vague UI bugs.** "Make it look better" is not actionable. Include screen, expected behavior, actual behavior, screenshot, severity, and guideline reference.
8. **Ignoring states.** Loading, empty, error, disabled, success, hover/focus, and responsive states often carry the most user-facing UI bugs.
9. **Duplicating QA without design judgment.** QA proves flows work; UI design reviews judge consistency, hierarchy, clarity, accessibility basics, and polish against the product's intended experience.

## Verification Checklist

- [ ] For MVP work, `.projects/<project>/product/mvp-plan.md` or the equivalent scope contract was read and the design stays within one primary and at most two supporting CUJs.
- [ ] For MVP work, every screen/state maps to a selected CUJ step, user-visible actions were counted/minimized, and parked ideas are not represented.
- [ ] For MVP work, each screen has one primary job/action and navigation/choices/defaults are proportional to the narrow scope.
- [ ] UI guideline exists or was updated at a durable project path.
- [ ] For UI-related feature design tasks, the project design guideline was read first or a missing-guideline blocker/follow-up was recorded.
- [ ] Feature design images/mockups were generated for required screens/states/viewport variants, or an explicit tooling blocker and follow-up image-generation task exists.
- [ ] Annotated design images/mockups exist for important interactive components, with stable annotation IDs that do not obscure the design.
- [ ] Feature design brief includes an interactive component annotation legend mapping each ID to behavior, states, destinations, validation, and accessibility notes.
- [ ] Feature design brief and image paths are stored beside or cross-linked with the feature PRD and expected tech spec.
- [ ] Material design directions are runnable/concrete and were captured as clean mobile/desktop screenshots; they are not verbal-only descriptions.
- [ ] `DESIGN_REVIEW.md` embeds each variant/screen screenshot, links runnable previews, compares CUJ fit/action count/hierarchy/responsiveness/accessibility/cost, and recommends a direction.
- [ ] Each variant, screen, and hotspot has a stable review ID on its own line/row, and a draft GitHub PR or approved equivalent lets the user comment beside it.
- [ ] Human review threads were fetched and dispositioned; accepted changes updated canonical prototype source, screenshots were regenerated/verified, replies name addressing revisions, and only addressed/agreed threads were resolved.
- [ ] Disputed material design threads remain open, and resolved-thread state, explicit design approval, engineering handoff, and merge remain separate gates.
- [ ] A subagent using `english-copywriter` reviewed all visible UI text in generated design images/mockups or real UI review scope.
- [ ] Copywriter review ran the minimum-text pass first and removed, shortened, or replaced unnecessary explanatory text when UI structure could explain itself.
- [ ] Necessary copy remains for labels/accessibility, comprehension, trust/privacy/payment, errors, empty states, and destructive-action consequences.
- [ ] Feature design brief records copywriter status, key removals/rewrites, and any copy guideline path or notes.
- [ ] A subagent using `ui-reviewer` reviewed newly generated design images/mockups and produced a durable review report.
- [ ] Design iteration continued until reviewer status was `PASS` or `PASS WITH MINOR POLISH`, or a real blocker was documented with missing inputs/tooling.
- [ ] Final design brief links the UI review guideline and final reviewer approval/blocker rationale.
- [ ] Guideline covers layout, visual language, components/states, accessibility basics, and copy tone.
- [ ] Review used the real implemented UI or documented why it was blocked.
- [ ] Screenshots/evidence were captured for reviewed failures.
- [ ] Findings are tied to guideline sections, user journey impact, or accessibility/product clarity.
- [ ] Duplicate search was performed before filing UI bugs.
- [ ] UI bugs include severity, repro/observation steps, expected vs actual, screenshot evidence, and guideline reference.
- [ ] Review report names durable artifact paths and follow-up issues.
