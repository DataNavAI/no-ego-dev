---
name: website-qa
description: "Use when creating or maintaining a website's canonical core QA inventory, defining critical user journeys and executable cases, or running website smoke, focused regression, or full QA with real browser evidence."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, qa, website, browser-testing, regression-testing]
    related_skills: [qa, ui-reviewer, coder, devops]
---

# Website QA

## Overview

Maintain useful, evidence-backed website QA guidance around critical user journeys (CUJs). Recommend one durable inventory, stable journey and test-case IDs, risk-aware release scope, and honest evidence from the exact build under test.

This is a guidance-only workflow. The template is a starting point that teams may adapt to their product and existing conventions. It does not define an executable check, a required document shape, or an automated pull-request gate.

Use the general `qa` skill for shared QA policy, bug triage, reports, and artifacts. Use this skill for website core-QA authoring or maintenance and website smoke, focused regression, and full QA runs.

## When to Use

Use this skill when:

- A website needs its first core QA inventory or an existing inventory needs maintenance.
- A PRD, product contract, supported browser/interface list, release scope, bug, incident, analytics signal, or user feedback changes website coverage.
- A release candidate needs a website smoke, focused non-smoke regression, or full QA run.
- A team needs to determine whether a critical user journey is blocked in a real browser.

For non-website QA, use `qa`. For source-level unit/integration testing, use `coder`. For design-system critique without executing the product contract, use `ui-reviewer`.

## Canonical Core QA Recommendation

Prefer one canonical document per product at:

`.projects/<project>/qa/core-qa.md`

If the product has a stronger existing convention, follow it and record that canonical path rather than creating a competing copy. `templates/core-qa.md` is an adaptable starting point, not a required schema.

A useful inventory usually captures:

- Product and exact-build scope, environments, supported browsers, viewports, devices, and interfaces.
- A CUJ index describing personas, value, observable end states, and lifecycle state.
- Executable cases with setup, actions, expected checkpoints, cleanup, evidence needs, priority, and applicability.
- Coverage, recent evidence, known gaps, blocked or unsupported coverage, and follow-ups.
- Maintenance history explaining additions, retirement, supersession, reprioritization, and release-scope decisions.

Choose the amount and organization of detail that makes the inventory usable. Review the substance with the team rather than treating Markdown layout as proof of QA quality.

## Stable CUJ and Test Case IDs

Give each end-to-end value journey a stable identifier in the `CUJ-<n>` family, such as `CUJ-1` or `CUJ-2`, and a descriptive name.

- Give active CUJs one or more executable cases when practical.
- A case under `CUJ-<n>` uses `TC-<n>.<case number>`; for example, `CUJ-1` owns `TC-1.1` and `TC-1.2`.
- Never renumber an existing CUJ or test case merely to close a gap or reorder a document.
- Retire or supersede obsolete coverage while retaining its ID and rationale; do not reuse historical IDs.
- Allocate the next unused identifier for genuinely new coverage.
- Deduplicate by comparing journey, persona/state, setup, actions, assertions, and risk. Extend existing coverage or add a meaningful variant instead of creating an alias.

Lifecycle labels such as `Active`, `Retired`, and `Superseded by <ID>` are recommended because they make history legible, but teams may express equivalent lifecycle information through an established convention.

## Criticality Guidance

Classify current cases by test criticality:

- **P0:** failure blocks completion of the CUJ.
- **P1:** failure affects a major feature but does not fully block the CUJ under the current product contract.
- **P2:** failure affects a minor feature.

Test criticality is distinct from bug/issue priority and defect severity. A failed P2 can reveal an urgent bug, while a P0 case does not dictate the issue tracker's label. Reassess criticality when a CUJ or product contract changes and preserve the reasoning.

## Authoring and Maintenance Workflow

1. **Orient to the current contract**
   - Read accepted requirements and designs, release notes, supported-interface declarations, analytics/feedback, incidents, known bugs, and the current QA inventory.
   - Identify the exact product/build scope and supported browsers, viewports, devices, accessibility modes, and interfaces such as responsive UI, PWA, embedded surface, or admin UI.
2. **Inventory critical value paths**
   - Describe each CUJ from persona and starting state through value and observable end state.
   - Consider onboarding, authentication/recovery, primary value, persistence/edit/delete where contractual, payments, permissions/privacy, and safe failure/recovery where applicable.
3. **Reconcile rather than rewrite**
   - Preserve IDs and history, deduplicate existing coverage, and explain meaningful changes.
4. **Make cases executable for humans**
   - Describe setup/test data, actions, observable checkpoints, cleanup/reset, evidence, criticality, and applicability clearly enough for another person to run.
   - Replace vague checks such as “test checkout” with concrete interactions and outcomes.
5. **Keep decision context current**
   - Update coverage, known gaps, recent evidence, and maintenance notes when product behavior, supported interfaces, incidents, analytics, feedback, or release scope changes.

## Website Execution Preconditions

Before a run, identify:

- Exact build: immutable commit SHA, deployment ID, image digest, or uniquely versioned release candidate.
- Environment and URLs, backend/data dependencies, feature flags, locale, and test accounts/data.
- Supported browsers, browser versions, viewports, devices/emulation, and interfaces selected for the run.
- Case applicability and exclusions with reasons.
- Artifact location, for example `.projects/<project>/qa/.artifacts/<timestamp>-<build>-<scope>/`.

Execute through the real UI. Capture real UI evidence for failures and sufficient pass evidence to establish route, state, browser, viewport, and exact build. Console, network, and accessibility evidence can supplement browser evidence but should not replace UI execution for a website case.

Never invent outcomes, screenshots, URLs, timestamps, logs, or execution details. Use `NOT RUN` when execution did not occur and `BLOCKED` when required execution could not proceed; explain the reason and remaining risk.

## Smoke Run: Only P0

A smoke run contains only P0 cases and covers all applicable active P0 cases for the selected environment and release candidate.

Use this overall-result precedence:

1. **FAIL** when at least one applicable P0 was executed and failed, even if another applicable P0 is blocked, unrunnable, or not run.
2. Otherwise **BLOCKED** when at least one applicable active P0 is blocked, unrunnable, or not run.
3. **PASS** only when every applicable active P0 passed.

If no applicable active P0 exists for the required scope, report **BLOCKED** as a coverage gap rather than PASS. Explain non-applicable P0 exclusions. Run any selected P1/P2 checks as a separately named focused regression, not as smoke.

## Full QA and Risk-Based Cadence

A full QA run covers all active P0, P1, and P2 cases applicable to the selected supported matrix. Full QA is risk-triggered rather than automatic on every release.

Strong triggers include:

- First launch.
- Major CUJ redesign or a new critical journey.
- Auth, payment, privacy, or data migration changes.
- A broad cross-cutting or platform change.
- The documented scheduled regression cadence becoming due.

Otherwise, smoke plus a focused non-smoke regression of affected P1/P2 cases may be proportionate. Select focused coverage from changed surfaces, dependencies, incidents, known bugs, and risk. Never describe a P0+P1 focused run as smoke.

For each release decision, preserve why full QA was or was not run; scope and case IDs; exact build and environment; selected browser/interface matrix; results and evidence; residual risk; known gaps; follow-ups; and the next full-QA due date or trigger. If impact is uncertain or crosses CUJ boundaries, prefer broader QA or explicit risk acceptance by the responsible owner.

## Results and Evidence

Useful per-case outcomes are `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`. Keep the run type (`SMOKE`, `FOCUSED REGRESSION`, or `FULL QA`) explicit and preserve previous evidence instead of overwriting it.

For executed cases, record the actual and expected result, browser/viewport/interface, timestamp, exact build, evidence links, and linked bugs. Follow `qa` for duplicate search, bug filing, severity, report publication, and safe artifact cleanup.

## Common Pitfalls

1. **Renumbering to make the list tidy.** Stable IDs are references; preserve gaps and history.
2. **Treating smoke as “quick tests.”** Smoke is the applicable active P0 set, without P1/P2.
3. **Passing blocked smoke.** An unrunnable applicable P0 makes smoke BLOCKED; an executed P0 failure takes precedence.
4. **Confusing test and bug priority.** Case criticality and issue priority answer different questions.
5. **Claiming website coverage from APIs alone.** Use supported browsers/viewports/interfaces and real UI evidence.
6. **Adding duplicates after every incident.** Reconcile existing coverage and add only new behavior, state, or risk.
7. **Treating a template as a quality gate.** Adapt the document to the product and judge evidence and coverage on their merits.

## Review Checklist

Use these prompts as human review guidance, not as automated acceptance criteria:

- Is there one discoverable canonical inventory or a recorded stronger convention?
- Are critical journeys and cases easy to reference with stable IDs?
- Are criticality, applicability, setup, actions, observable outcomes, and gaps understandable?
- Does smoke cover the applicable active P0 set and apply FAIL > BLOCKED > PASS honestly?
- Is the full-QA decision proportionate to current risk and is the next trigger recorded?
- Do results identify the exact build/environment and link real UI evidence?
