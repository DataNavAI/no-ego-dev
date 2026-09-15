---
name: ui-designer
description: "Use when creating project UI guidelines and feature designs, preparing visual implementation handoffs, or reviewing implemented UI for material visual, interaction, responsive, accessibility, and copy defects."
version: 0.4.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, ui-design, product-design, qa]
    related_skills: [mvp-planning, product-manager, qa, project-manager, ui-reviewer, english-copywriter, reviewable-artifacts]
---

# UI Designer

## Overview

Own the product's visual and interaction quality bar. Create durable project guidance, concrete feature visuals, and an implementation-ready acceptance contract. Review real rendered UI against the canonical guideline and turn material defects into actionable issue-managed bugs.

Design is not a prose exercise. For material user-visible work, provide viewable pixels, explicit interaction behavior, responsive and accessibility evidence, and independent read-only review. Keep the process proportionate: an internal comment or other provably non-visual trivial edit does not need specialist UI or copy review.

## Durable UI artifact locations

Follow an established project convention when one exists. Otherwise prefer:

- UI guideline: `.projects/<project>/design/ui-guidelines.md`
- Design-system contract: `.projects/<project>/design/design-system.md`
- Runnable specimen: `.projects/<project>/design/design-system-preview/`
- Specimen captures: `.projects/<project>/design/images/design-system/`
- Feature UI brief: `.projects/<project>/features/<feature-slug>/design/ui-brief.md`
- Feature images: `.projects/<project>/features/<feature-slug>/design/images/`
- Visual review deck: `.projects/<project>/features/<feature-slug>/design/DESIGN_REVIEW.md`
- Implemented-UI reviews: `.projects/<project>/design/ui-reviews/<YYYYMMDD-HHMMSS>-<scope>.md`
- Review evidence: `.projects/<project>/design/.artifacts/<review-id>/`

Cross-link the PRD, UI brief, expected tech spec, canonical guideline, design-system contract, images, and acceptance rows so the feature package travels as one traceable handoff.

## Applicability and review scope

Classify the change before choosing gates:

- **Material user-visible work:** new or changed screens, visible or accessible copy, interaction, navigation, responsive behavior, design tokens/components, accessibility, trust/privacy/payment/destructive surfaces, or primary-journey behavior. Apply concrete visual evidence and independent review.
- **Trivial non-visual work:** comments, internal names, test-fixture labels, or equivalent edits proven unable to alter rendered or accessible output, interaction, layout, tokens, trust, or the primary journey. Use proportionate existing checks; do not spawn copy or UI reviewers by default.
- **Uncertain impact:** inspect the changed path and rendered/accessibility surface. If material impact cannot be ruled out, use the material branch.

Legal, privacy, safety, accessibility, and explicit product constraints outrank speed or visual preference. A mechanically tiny copy or focus change can still be material.

## Creating the canonical UI guideline

Create or update the guideline for a new project, before major UI implementation, or when repeated defects prove it ambiguous. The designer owns this authoring work; a reviewer evaluates the frozen guideline and candidate but must not create a governing contract while reviewing it.

Include enough specificity for implementation and QA:

- product context, target user, approved CUJs, product tone, and first-use comprehension goal;
- page/screen shell, hierarchy, density, spacing rhythm, navigation, responsive breakpoints, and mobile rules;
- typography, semantic color roles, contrast, borders/elevation, icons, imagery, and restrained motion;
- required components and default, focus, active, disabled, loading, empty, error, success, permission, offline, and destructive states;
- keyboard, focus, labels, headings/landmarks, target sizing, reduced motion, zoom/reflow, and semantic reading order;
- copy tone, terminology, CTA, error/recovery, trust, and destructive-consequence conventions;
- do/don't examples, open questions, and deliberately deferred choices.

Do not duplicate concrete token values owned by the design-system contract. Link to that source and keep the guideline focused on product-specific usage rules.

## Minimum viable design-system contract

For greenfield UI, define and visually validate the smallest reusable system needed by approved CUJs before feature screens consume it. Use [the minimum design-system checklist](references/mvp-design-system-minimum.md). A mood board, palette, or prose-only style guide is insufficient.

For brownfield UI, audit the established token and component sources first. Adopt, theme, or minimally extend them for demonstrated CUJ gaps. Do not create a parallel token file, component library, or competing contract.

The contract must record:

1. **Context and reuse decision** — users, platforms/viewports, trust needs, existing-library audit, and adopt/theme/extend/create decision.
2. **Concrete semantic foundations** — actual names and values for surface/text/border/action/status/focus colors, typography roles, spacing, container/grid/breakpoints, radius/border/elevation, icon rules, and only necessary motion.
3. **CUJ-derived components** — only the shell, navigation, controls, forms, feedback, and data display required by selected CUJ steps. Park speculative themes, components, and variants.
4. **State and interaction contract** — applicable default, hover, focus-visible, pressed, selected, disabled, loading, validation/error, success, and destructive behavior with keyboard and touch rules.
5. **Accessibility baseline** — contrast, non-color cues, visible focus, semantic names/roles/values, readable/reflowing type, and target size/spacing. Prefer a 44px mobile product target; documented standards exceptions do not become a general design target.
6. **Visual specimen** — a runnable component specimen or equivalent concrete mock showing foundations, components, states, and representative mobile and desktop compositions. Render, capture, and inspect it.
7. **Ownership** — canonical token source, component code paths, naming, supported variants, owner, version/date, and exception/change process.

The gate passes only when concrete values and first-CUJ components/states exist, accessibility checks are recorded, mobile/desktop specimen evidence was inspected, and feature mocks consume that baseline.

## MVP CUJ and action-count discipline

For an MVP or reset, read the approved MVP scope contract before designing:

1. Design exactly one primary and no more than two supporting CUJs unless the approved contract says otherwise.
2. Map every screen and state to a selected CUJ step; remove anything with no mapping.
3. Count user-visible actions from entry to the value moment. Remove avoidable onboarding, confirmations, fields, choices, detours, and repeated entry.
4. Give each screen one primary job and one visually dominant next action.
5. Prefer strong defaults, direct manipulation, familiar controls, progressive disclosure, and in-context help.
6. Keep navigation proportional to selected CUJs; do not turn parked ideas into tabs, settings, cards, or disabled placeholders.
7. Preserve necessary labels, focus, trust/privacy, loading, empty, error, success, auth/permission, offline, and recovery behavior. Simplicity is not missing feedback.
8. Record the screen-to-CUJ map, baseline and proposed action count, removed steps, and parked ideas in the feature brief.

## Feature-local design artifacts

For a UI-bearing feature, complete design artifacts before architecture or tech-spec handoff:

1. Read the PRD, MVP scope when applicable, canonical guideline, and design-system contract.
2. Create the feature-local `ui-brief.md` and cross-link the expected tech spec.
3. Produce concrete clean images or runnable prototypes for affected screens, material states, and required viewports. Text alone does not satisfy a visual handoff; if tooling blocks images, mark `BLOCKED` and name the missing tool/input and follow-up.
4. Export separate annotated images for implementation. Keep clean images free of overlays for visual judgment.
5. Build an image index covering default and every materially distinct loading, empty, error, success, disabled, permission/auth, destructive, mobile, and desktop state.
6. Record responsive rules, copy, accessibility behavior, design-system dependencies, unresolved decisions, and implementation acceptance mapping.

### Stable interaction annotations

Assign stable IDs such as `SCREEN-01`, `A1`, and `A2`; never renumber unaffected IDs during revision. Annotate buttons, links, tabs, navigation, icon buttons, inputs/selects, toggles, tappable cards, modal/sheet controls, destructive actions, and primary empty/error actions.

For each ID, the brief must state:

- component and clean/annotated image path;
- user action and resulting destination or state transition;
- validation and content constraints;
- disabled, loading, optimistic, error, success, cancellation, and retry behavior as applicable;
- keyboard/touch behavior, accessible name, focus movement/restoration, and target-size notes;
- owning token/component and implementation acceptance rows.

Annotations supplement pixels; they do not replace clean visuals.

## Visual-first design review

For every material new direction or redesign, use `reviewable-artifacts` and [the visual review deck template](templates/visual-review-deck.md).

- Prefer two or three materially different runnable prototypes when alternatives improve the decision. If one direction is clearly justified, show one polished recommendation and concise rejected-alternative evidence rather than artificial variety.
- Use realistic content and the primary CUJ. Capture clean screenshots at named target viewports and include material state strips.
- Open with a contact sheet before rationale. Give each direction or screen one slide-like section with one dominant visual or mobile/desktop pair, at most three short bullets, and one decision prompt.
- Include one compact comparison for CUJ fit, entry-to-value action count, hierarchy, responsive/mobile behavior, accessibility/trust, implementation cost, and key tradeoff.
- Put every variant, screen, and hotspot on its own stable Markdown heading or table row so feedback maps to exact IDs.
- Recommend a direction and ask the decision owner to choose, combine, revise, or reject.
- Keep token tables, annotation legends, research, and implementation detail in the linked brief or appendix. Do not substitute an essay for viewable visuals.
- Store the deck and evidence canonically in the feature package. Use the project's normal artifact/review channel; do not invent a temporary pull-request lifecycle solely to host design feedback.

Human feedback does not edit itself. The designer maps accepted comments to stable IDs, updates canonical source, regenerates and verifies visuals, and records dispositions. Thread resolution, design approval, implementation handoff, and code merge remain separate states.

## Mobile-specific interaction rules

Review mobile and mobile-first work as touch interfaces, not narrow desktop pages:

- one primary job per screen with the current state and next action clear at a glance;
- comfortably tappable targets, generally 44px or larger, spaced to avoid mistaps;
- frequent actions in comfortable thumb reach; top corners reserved for infrequent or platform-standard actions;
- no reliance on hover, keyboard shortcuts, precise pointers, or two-handed reach for routine tasks;
- device-appropriate navigation such as proportional bottom tabs, sheets, clear back behavior, and short staged flows;
- reduced typing through defaults, pickers, saved values, scanning, and staged input;
- explicit safe-area, notch, status/tab bar, virtual-keyboard, scroll-position, and orientation behavior;
- permission denial, poor network, offline, interruption, resume, cancellation, and recovery states;
- large-text wrapping and sticky/fixed control behavior without obscuring content or actions.

Separate mobile interaction defects from general visual findings and specify the mobile behavior needed to resolve them.

## Responsive layout and reading-order verification

For responsive changes, use [responsive layout verification](references/responsive-layout-verification.md):

1. Record intended desktop and mobile compositions and named viewport sizes.
2. Preserve one logical source and semantic document order. Do not duplicate or CSS-hide content to create alternate visual orders.
3. Verify exact track/container geometry, expected collapse, gaps, fixed/sticky elements, and zero unintended horizontal overflow.
4. Verify headings and landmarks, keyboard sequence, focus movement/restoration, and screen-reader order match the intended visual and mobile reading order.
5. Test zoom/reflow and large text where relevant; distinguish browser zoom, CSS zoom, and viewport width.
6. Add focused structure/behavior assertions and inspect real rendered desktop/mobile captures. Tests alone do not prove geometry; screenshots alone do not prove semantics.
7. Run focused UI tests and the production build.

## Specialized use-case controls

Apply these only when the named product/design context exists; they extend rather than replace the canonical safety and independent-review gates:

- **Exact screenshot/Figma reproduction:** build a per-screen geometry ledger, separate visible from accessible hit geometry, verify chart coordinate systems and adjacent target non-overlap, and inspect pixel overlays across supported widths. Follow [exact reproduction geometry](references/exact-reproduction-geometry.md).
- **Browser evidence diagnostics:** force and read back the exact CDP layout viewport, check decoded screenshot dimensions, localize overflow, account for lazy images, disable stale cache, and collect accessibility evidence from the same target. Follow [CDP viewport capture and image diagnostics](references/cdp-viewport-capture-and-image-diagnostics.md).
- **Component-commentable HTML review apps:** use stable semantic component IDs, safe local or authoritative backend comment lifecycles, valid DOM/ARIA wrappers, bounded untrusted import handling, and exact focus restoration. Follow [component-commentable HTML review apps](references/component-commentable-html-review-apps.md).
- **Identity-bearing media fixtures:** separate identity, lineup/representation, copyright, excluded-source, crop, and production approval decisions; preserve evidence and fail closed on uncertainty. Follow [identity-safe media fixtures](references/identity-safe-media-fixtures.md).
- **Photo-first MVPs:** treat meaningful photography/art roles, crop/fallback behavior, rights provenance, released-content breadth, and production-media readiness as design-system primitives. Follow [photo-first MVP design systems](references/photo-first-mvp-design-system.md).
- **Accepted mock implementation:** create a parity matrix, preserve the mock's stable semantics without promoting review-only media, test the real product boundary, and recapture matching viewports. Follow [mock-to-product alignment](references/mock-to-product-alignment.md).
- **Browser-hosted provisioning:** validate billing, OAuth/PKCE, secrets, idempotency, cleanup, typed allowlisted worker requests, and evidence-bound copy before architecture. Follow [browser-hosted provisioning design](references/browser-hosted-provisioning-design.md), then freeze and review the executable state model with [frozen browser provisioning review](references/frozen-browser-provisioning-review.md).
- **Asynchronous mutations:** model desired, last-confirmed, pending, and terminal states separately; never project optimistic success, preserve opt-out and restart recovery, and test stale-response ordering. Follow [truthful asynchronous mutation states](references/truthful-async-mutation-states.md).

Use-case references do not make product-local wording, brand-specific update style, or one product's layout preference canonical. Scope every control to the lifecycle and product class it actually governs.

## Implementation acceptance mapping

A handoff is not ready until each material requirement maps design to implementation and verification. Use a table with:

| Acceptance ID | Design source | Required behavior/visual contract | Token/component owner and target path | Deterministic check | Rendered evidence |
|---|---|---|---|---|---|
| `UI-AC-01` | `SCREEN-01`, `A1` | <exact state/interaction/layout> | <token/component + code owner/path> | <test/assertion> | <mobile/desktop capture> |

Cover primary CUJ steps, action count, responsive breakpoints, interaction states, visible and accessible copy, focus/reading order, and required resilience states. Architecture cites these rows; implementation preserves them; QA verifies both deterministic behavior and pixels at named viewports. An image path without expected behavior is not acceptance criteria.

## Independent review boundary

Apply independent copy and UI review to **material user-visible work**, not automatically to trivial non-visual edits.

1. The designer finishes the canonical guideline, brief, visuals, acceptance map, and evidence, then freezes one candidate identity.
2. Dispatch fresh reviewers that did not author or edit that candidate. Give them the exact PRD/CUJ, frozen canonical guideline, design-system contract, brief, visuals/runtime URL, target viewports, acceptance rows, and candidate/evidence identity.
3. Reviewers are read-only. They must not create, edit, or update the governing guideline, candidate files, screenshots, code, or acceptance criteria. Missing canonical guidance or frozen evidence yields `BLOCKED`, not reviewer-authored replacement policy.
4. The copy specialist reviews only material visible and accessible text: clarity, action naming, state truth, accessibility, trust, recovery, and destructive consequences. It supplies exact findings or replacements but does not grant binding UI approval.
5. The independent UI reviewer checks all material visual, interaction, responsive, accessibility, trust, copy-in-context, CUJ-scope, and implementation-contract concerns in one complete pass. Omit safely reversible taste and cosmetic nits.
6. Binding outcomes use `APPROVED` when no material blocker remains or `REQUEST_CHANGES` with one complete evidence-backed material correction set. `BLOCKED` is reserved for missing or contradictory inputs/evidence.
7. The designer, never the reviewer, remediates findings in a new candidate generation, regenerates evidence, and requests fresh review of the changed candidate.

Reviewer independence, read-only authority, and immutable candidate identity are not replaced by designer self-approval, thread resolution, tests, or stakeholder preference.

## Reviewing implemented UI

Review the real UI, not code alone:

1. **Orient** — identify project, environment, scope, build/commit, related PRD/issue, canonical guideline, design-system source, and acceptance rows.
2. **Collect evidence** — capture each reviewed screen/state at relevant viewports with URL, browser/device, timestamp, and evidence generation. Inspect interaction, responsive geometry, semantic order, focus, and accessibility surfaces.
3. **Compare** — check hierarchy, spacing, typography, semantic color, component/state use, visible and accessible copy, CUJ/action count, responsive behavior, and acceptance mapping. Separate objective violations from taste.
4. **Prioritize material findings** — critical/high/medium based on user consequence. Omit cosmetic reversible nits rather than extending review.
5. **File actionable bugs** — search for duplicates, then file or update issues with environment, severity, steps, expected versus actual, evidence, affected stable/acceptance IDs, and guideline reference.

If the guideline is missing or ambiguous, the designer creates a follow-up correction outside the read-only review. Do not let a reviewer silently establish a new governing standard.

## UI bug template

```text
Title: [UI] <screen/component> <specific material problem>
Environment: <URL, browser/device/viewport, build/commit>
Severity: critical | high | medium
Guideline / acceptance reference: <path + section or IDs>
Steps to observe:
1.
2.
Expected:
Actual:
Evidence: <screenshots/runtime/semantic checks>
Duplicate search: <queries and related issues>
```

## Common pitfalls

1. Reviewing from personal taste instead of the canonical guideline, CUJ, acceptance rows, or user consequence.
2. Producing text-only guidance for a material visual decision.
3. Letting unstable annotation IDs or image-only handoffs force implementation guesswork.
4. Building a speculative component catalog instead of a CUJ-sized system.
5. Creating a competing brownfield token/component source.
6. Dropping errors, recovery, labels, trust, or accessibility in the name of MVP simplicity.
7. Proving desktop pixels while breaking mobile semantic or keyboard reading order.
8. Letting a reviewer author the contract or mutate the candidate it judges.
9. Spawning expensive review for a proven non-visual trivial edit—or skipping it when impact is uncertain or material.
10. Treating tests, screenshots, resolved comments, or stakeholder choice as independent binding approval.

## Verification checklist

- [ ] Canonical guideline and design-system sources were identified; the reviewer did not author them.
- [ ] Greenfield work has concrete tokens, CUJ-required components/states, ownership paths, and an inspected specimen; brownfield work reuses the established system.
- [ ] MVP screens/states map to approved CUJs and entry-to-value actions were counted and minimized.
- [ ] Feature brief, clean visuals, annotated visuals, and expected tech spec are feature-local or cross-linked.
- [ ] Stable interaction IDs map behavior, states, validation, accessibility, component ownership, and acceptance rows.
- [ ] The visual-first deck opens with pixels, compares material criteria, and asks explicit decisions.
- [ ] Mobile touch, reach, navigation, keyboard/safe-area, large-text, interruption, and recovery rules were covered.
- [ ] Responsive verification covers geometry, overflow, semantic DOM order, keyboard order, screen-reader order, and rendered named viewports.
- [ ] Every material implementation requirement maps to a design ID, target owner/path, deterministic check, and rendered evidence.
- [ ] Material user-visible work received fresh independent read-only copy/UI review; a trivial non-visual edit was not over-gated.
- [ ] The exact frozen candidate received `APPROVED`, or material findings remain `REQUEST_CHANGES`/`BLOCKED` with no handoff claim.
- [ ] Implemented-UI findings are material, evidence-backed, deduplicated, and tied to guideline/acceptance references.
