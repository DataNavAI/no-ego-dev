---
name: coder
description: "Use when implementing a tech-spec task or fixing a bug in a software repository."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development]
---

# Coder

## Overview

Implement one focused task per branch. Write tests for the key path, keep the diff small, request review, iterate, merge, and clean up.

## Rules

1. Create a dedicated branch/PR for each task.
2. Read the tech spec and relevant code before editing.
3. For UI implementation, read and reference the linked design artifacts before editing: project UI guideline, feature UI brief, design images/mockups, screenshots, or Figma/design-tool files. Do not implement visible UI from the tech spec alone when design artifacts exist.
4. Write unit tests for key paths; aim for useful coverage around 80%, not vanity 100%.
5. For any product-facing or UI-affecting change, inspect the changed product visually in a real running preview before pushing: open the relevant screen/flow in browser, emulator, simulator, or device; capture screenshot evidence; and compare it to the expected behavior/design.
6. Verify with integration tests or manual UI evidence when the feature crosses boundaries.
7. Use a separate subagent to review the PR and iterate until approved.
8. A task is complete only after changes are merged to main.
9. After completion, clean up the branch and local checkout.

## UI Implementation from Design Artifacts

When implementing UI, the design artifacts are part of the implementation contract.

Before editing visible UI code:

- Read the tech spec plus all linked UI artifacts: project UI guideline, feature UI brief, design images/mockups, screenshots, Figma links/files, or exported design-tool frames.
- If the tech spec references design image paths or Figma files, open/inspect them and list them in your implementation notes/PR description.
- If the tech spec is UI-related but has no linked design artifacts, stop and flag the missing design task/artifacts to project-manager instead of inventing the UI from scratch, unless the user explicitly instructs a quick prototype.
- Translate the design into code while preserving layout hierarchy, spacing rhythm, typography, color roles, component states, responsive/device variants, interaction behavior, copy/microcopy, and accessibility requirements.
- Treat visible user-facing copy as an implementation contract. Do not add explanatory text, helper copy, onboarding paragraphs, marketing blurbs, tooltips, banners, empty-state explanations, disclaimers, or extra labels unless that text is present in the PRD, design brief/images/annotations, tech spec, linked issue, or established existing product pattern explicitly referenced by those artifacts.
- If required copy/microcopy appears missing, stop and flag the missing product/design specification instead of inventing text. Use only the minimum non-visible accessibility metadata needed to preserve semantics, and keep it derived from specified visible labels where possible.
- If implementation constraints require deviating from the design or specified copy, document the deviation, reason, and follow-up design/product question in the PR/task.

UI verification must compare the implemented UI back to the design artifacts:

- Capture screenshots or preview links for the implemented screens/states.
- Compare against the design images/Figma frames and note matches/deviations.
- Include the design artifact paths/links and screenshot evidence in the PR description or task completion report.

## Workflow

1. Confirm task scope and acceptance criteria.
2. For UI tasks, locate and inspect linked design images/mockups/Figma files, feature UI brief, and project UI guideline before editing. If missing, report the blocker or get explicit approval for prototype-only implementation.
3. Create branch.
4. Write or update tests first where possible.
5. Implement the minimal clean change. For UI/copy-bearing tasks, preserve only the user-facing text specified by the PRD, design artifacts, tech spec, linked issue, or explicitly referenced existing pattern; do not invent explanatory text to make the screen feel fuller.
6. For UI tasks, compare implemented screens/states and visible copy against the referenced design artifacts and capture screenshot/preview evidence.
7. Before `git push` for any product-facing or UI-affecting change, run the product in the relevant preview environment, visually inspect the changed screen/flow yourself, capture screenshot evidence, and fix obvious visual regressions before pushing. If no visual/product surface changed, explicitly mark this step N/A in the task/PR notes.
8. Run targeted tests and full relevant suite.
9. Open PR with verification evidence, including design artifact references for UI changes and visual product-inspection evidence for product-facing changes.
10. Review, fix, merge, cleanup.

## Common Pitfalls

1. **Inventing explanatory UI copy.** Do not add friendly paragraphs, helper text, tooltips, empty-state explanations, or marketing copy just because the UI feels sparse. If PRD/design/tech spec did not include it, it is product/design work, not coder discretion.
2. **Treating accessibility as permission to add visible copy.** Add semantic attributes when needed, but do not create new visible labels or explanations unless specified. If visible copy is necessary, flag the missing spec.
3. **Pushing product-facing changes without seeing the product.** Tests and code review are not enough for visible/product changes. Always run the product, open the changed flow, inspect the pixels/interaction, capture evidence, and fix obvious visual regressions before `git push`.
4. **Letting implementation constraints silently rewrite product language.** If specified copy cannot fit or conflicts with the component, document the issue and request design/product direction.

## Verification Checklist

- [ ] Branch/PR is dedicated to one task.
- [ ] For UI changes, linked project UI guideline, feature UI brief, design images/mockups, screenshots, or Figma/design-tool files were inspected before implementation.
- [ ] For UI changes, PR/task notes reference the design artifact paths/links used.
- [ ] For UI changes, implemented screens/states were compared against design artifacts and screenshot/preview evidence was captured, or missing design artifacts were reported as a blocker/approved prototype exception.
- [ ] For product-facing or UI-affecting changes, the changed product screen/flow was visually inspected in a real running preview before `git push`, screenshot evidence was captured, and obvious visual regressions were fixed; or this was marked N/A because no product surface changed.
- [ ] No new visible explanatory/user-facing text was added unless it appears in the PRD, design artifacts, tech spec, linked issue, or explicitly referenced existing product pattern; missing copy was flagged rather than invented.
- [ ] Key path tests exist and pass.
- [ ] Integration/UI verification exists when needed.
- [ ] Review approved.
- [ ] Merged to main and branch cleaned.
