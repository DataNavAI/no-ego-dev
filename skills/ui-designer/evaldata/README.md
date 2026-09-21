# UI Designer Eval Fixture

Use all scenarios to evaluate the `ui-designer` workflow.

## Material feature design

AtlasBoard needs a new launch-creation flow before architecture and implementation. The project has a PRD, an approved UI guideline, and one primary CUJ. A passing response creates a feature-local `ui-brief.md`, runnable or concrete clean visuals, annotated handoff images, and a visual-first `DESIGN_REVIEW.md`. Stable IDs must connect every important control to its action, destination or transition, loading/disabled/error behavior, validation, and accessibility behavior. The deck opens with a contact sheet, lets screenshots dominate, compares CUJ fit, action count, hierarchy, responsive behavior, accessibility/trust, cost, and tradeoffs, then asks the decision owner to choose, combine, revise, or reject.

The brief must turn design intent into implementation acceptance rows. Each row names the originating screen or annotation ID, exact expected behavior or token/component contract, target implementation owner/path, deterministic check, and rendered mobile/desktop evidence. Architecture, coding, and QA should not need to infer acceptance from pixels.

## Greenfield and brownfield design-system boundary

Greenfield project: no reusable system exists. Define concrete semantic color, type, spacing, layout/breakpoint, shape/elevation, icon, focus, and only necessary motion values. Select only components and states required by approved CUJs, record canonical token and component paths and ownership, and render an inspected mobile/desktop specimen before feature screens consume the baseline. Do not build an enterprise catalog.

Brownfield project: production already has semantic tokens and an owned component library. Audit coverage and accessibility, then adopt, theme, or minimally extend the canonical sources only for demonstrated CUJ gaps. Creating a parallel token file, component library, or competing design-system contract fails this boundary.

## MVP scope and action count

The approved MVP has one primary create-and-share CUJ and one recovery CUJ. Stakeholders request a tour, dense dashboard, five tabs, themes, settings, social features, and analytics cards. Map every screen and state to a selected CUJ step, count user-visible actions from entry to value, remove avoidable setup and repeated entry, and exclude parked ideas. Preserve labels, focus, privacy/trust, loading, empty, error, success, offline, and recovery states.

## Mobile interaction

Review a phone onboarding flow. Check one primary job per screen, comfortably tappable targets, spacing, thumb reach, safe areas, bottom navigation or sheets where appropriate, clear back behavior, keyboard overlays, reduced typing, permission denial, poor network, interruption, and resume. Do not rely on hover, precise pointers, desktop sidebars, or top-heavy routine actions.

## Responsive layout and reading-order regression

A request moves a full-width summary above two equal desktop columns while retaining a one-column mobile composition. Verify exact desktop and mobile geometry and no horizontal overflow. Preserve one semantic DOM order rather than duplicating or CSS-hiding content; ensure headings, landmarks, keyboard sequence, and screen-reader order match the intended mobile reading order. Require focused assertions plus rendered captures at named viewports.

## Independent review authority

For the material feature, the designer owns and freezes the canonical guideline, brief, visuals, and evidence. Fresh reviewers that did not author the candidate inspect it read-only. A specialist copy review may identify material visible-copy defects, but cannot edit or grant binding approval. The independent UI reviewer uses `APPROVED` or `REQUEST_CHANGES`; missing frozen inputs are `BLOCKED`. Reviewers must not create or update the governing guideline, candidate, screenshots, or code. The designer remediates in a new candidate generation and obtains fresh review.

Do not accept alternate minor-polish approval vocabulary, reviewer-authored governing guidelines, or a temporary PR lifecycle created solely to host design review.

## Trivial-edit boundary

A separate task changes only an internal comment and test fixture name; rendered UI, visible or accessible copy, interaction, layout, tokens, accessibility, trust, and the primary journey cannot change. A passing response does not spawn copy or UI reviewers merely because the repository contains UI. It verifies the edit with the proportionate existing checks. If evidence shows a user-visible or accessibility effect, reclassify it as material and apply the independent gates.

## Implemented UI review

For staging UI, inspect the real rendered screens against the frozen canonical guideline at relevant viewports. Capture evidence with environment/build identity, distinguish objective violations from taste, search existing issues, and file only actionable material defects with severity, expected versus actual, evidence, and guideline/acceptance references.

## Scoped specialized scenarios

- **Exact reproduction:** a Figma-derived mobile analytics screen includes charts and dense repeated controls. A passing response creates a per-screen geometry ledger, preserves exact visible geometry without overlapping accessible targets, treats chart marks as coordinates, verifies all range cardinalities, and compares rendered pixels across supported widths.
- **CDP evidence:** a 320px PNG may have been cropped from a wider layout viewport. A passing response uses CDP viewport override and `innerWidth`/`scrollWidth` readback, decoded image dimensions, cache controls, overflow localization, visible-image diagnostics, and same-target accessibility checks.
- **Component-commentable review app:** GitHub/Figma is not the review surface. Stable semantic component IDs back a safe HTML review app. Local-only storage states its limits; shared feedback uses the paginated authoritative backend. Imports are bounded and escaped, DOM/ARIA wrappers remain valid, and modal focus is trapped/restored.
- **Identity-safe, photo-first MVP:** a visual-recognition product needs named-subject photos. Identity, lineup/representation, copyright, crop, and production approval are separate evidence rows. Meaningful media roles and released-content breadth are tested; review fixtures never imply production rights or unavailable profile breadth.
- **Mock alignment:** an accepted runnable mock is the visual source of truth. A passing response builds a parity matrix, preserves stable IDs and review-only media boundaries, adds focused regressions, and recaptures the real product at the mock's viewports before claiming parity.
- **Browser-hosted provisioning:** a CLI setup moves into a paid, credentialed browser flow. Validate provider-supported OAuth/PKCE, billing ownership, secret boundaries, typed allowlisted requests, idempotent create/resume/delete and verified cleanup. The frozen candidate manifest must bind runnable states and screenshots before independent review.
- **Truthful asynchronous mutation:** consent/token state can diverge across local intent, OS/provider state, and server confirmation. Model desired, last-confirmed, pending, and terminal outcomes separately; exercise retry→pending→success and retry→pending→failure, restart recovery, opt-out, and stale-response ordering without optimistic success.

## Concise user review update

The detailed design evidence and review process already live in `DESIGN_REVIEW.md`. A passing chat update states the user-facing capability/decision, one action needed (or none), and at most one material constraint that changes the decision. It omits CI, prototype plumbing, reviewer orchestration, and monitoring narration.
