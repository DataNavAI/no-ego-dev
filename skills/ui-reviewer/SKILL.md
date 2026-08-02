---
name: ui-reviewer
description: "Use as a fresh read-only reviewer for frozen UI evidence, benchmarking comparable market leaders and giving prioritized design feedback against the canonical project UI guideline."
version: 0.2.2
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

## Risk-weighted review priority

Prioritize UI findings by user consequence and reversibility. Spend the deepest attention on decisions that are **hard to reverse** after implementation or launch: information architecture, core journey structure, navigation model, irreversible or high-consequence actions, accessibility foundations, trust/privacy representations, platform-wide design-system contracts, and patterns whose rollout would force broad migration. Also block severe user harm or inability to complete the primary journey even when the visual fix itself is small.

Ignore reversible nits that can safely be fixed later: one-off spacing, cosmetic alignment, minor copy polish, subjective stylistic preference, or local decoration that does not affect comprehension, accessibility, trust, implementation contract, or the primary journey. **Omit them entirely** from findings and follow-up; do not create another design round for such polish.

## First-round completeness

**Round 1 is the comprehensive UI review.** Present all independently discoverable findings in round one as much as possible. Inspect the full agreed screen/state/device set, trace the primary journey, examine bounded sibling instances of each issue class, and provide one prioritized revision checklist with evidence, user impact, principle, and concrete direction. Do not stop at the first weak screen or reserve obvious feedback for later.

Rounds 2 and 3 are bounded disposition checks. Later-round feedback is limited to unresolved round-1 findings, regressions introduced by the revision, genuinely new UI evidence, or a material issue that could not reasonably have been identified from the first frozen evidence set. Any new later-round blocker must state `Why it was not discoverable in round 1: <cause>`. Do not introduce fresh taste, reversible nits, or an unrelated visual direction after the designer followed the first checklist.

## Prior-round context continuity

For **Round 2 or Round 3**, fail closed unless the neutral packet contains the complete prior-round context:

- the prior candidate identity and every **prior exact review report** with its verified digest;
- a stable-ID **finding disposition ledger** recording each prior finding as `UNRESOLVED`, `RESOLVED`, `SUPERSEDED`, or `OWNER_DECISION`, with evidence and the responsible correction;
- a **remediation change map** from each finding ID to the changed artifact paths/sections and focused verification, plus any explicitly authorized scope change;
- the original governing request/specification and the complete current candidate; and
- a controller-computed **prior-context digest** binding the exact reports, ledger, and change map supplied to this fresh reviewer.

Do not rely on a controller summary instead of the exact prior reports. Missing, unverifiable, mismatched, or internally inconsistent prior context is `BLOCKED_MISSING_PRIOR_CONTEXT`; do not perform a substantive later-round review.

A fresh reviewer remains independent, but must begin with reconciliation rather than a new unconstrained review:

1. Revalidate candidate and packet identities.
2. Disposition every prior finding by stable ID against the current bytes and evidence.
3. Perform a **contradiction check** against prior feedback and accepted dispositions. Do not reopen a resolved finding, reverse a prior required direction, or demand the opposite implementation unless current candidate evidence or newly available authoritative evidence proves the prior feedback invalid. Label such a correction `PRIOR_FEEDBACK_CORRECTION`, cite both statements and the decisive evidence, and explain why following the earlier direction is now unsafe or incorrect.
4. Report **New material findings** only when they are caused by remediation, by an explicitly authorized scope change, by genuinely unavailable evidence, or by a material defect that could not reasonably have been discovered in Round 1. Each must state `Why it was not discoverable in round 1: <cause>` and identify the allowed category. Omit unrelated new findings and reversible preferences rather than extending the lineage.

The later-round report must include `Prior-round reconciliation`, `Contradiction check`, and `New material findings` sections. A material safety/correctness defect is never suppressed merely to preserve consistency; it must use the explicit exception path above so the apparent contradiction is auditable.

## Three-round maximum

- **Round 1:** complete risk-weighted review with one actionable revision checklist.
- **Round 2:** verify the revised frozen UI against round-1 dispositions.
- **Round 3:** final review of unresolved journey/design-system risks and revision-introduced regressions.
- **No round 4** for the same design lineage and stable scope. If round 3 cannot pass, preserve the unresolved hard-to-reverse choices and escalate to the user/owner for scope, direction, or residual-risk disposition. Renaming artifacts or swapping reviewers does not reset the cap.

## Mandatory review lineage gate

**Before substantive review**, require an authenticated controller receipt containing `lineage`, requested round (`1`–`3`), `candidate_identity` (commit SHA or frozen UI-evidence digest), `review_kind`, and `required_review_kinds`. If any field is **missing or ambiguous**, return `BLOCKED_INVALID_LINEAGE` without reviewing. A requested **Round 4** returns `ITERATION_LIMIT_REACHED` without substantive review. Every report must bind those fields, the evidence-generation identity, and the verdict; all required review kinds for one candidate share its round number.

## Independent read-only boundary

Run this skill in a **fresh review-only leaf** that did not author the guideline, design, implementation, or evidence. The reviewer **must not create, edit, or update** candidate artifacts, project guidance, screenshots, or code. Use only the frozen canonical guideline and exact evidence identity supplied by the orchestrator; authoring and remediation belong to `ui-designer` or `coder` in a later candidate generation.

## Durable Artifact Locations

Prefer project-local artifacts so future product, design, coding, and QA agents can reuse the review standard:

- Project UI review guideline: `.projects/<project>/design/ui-guidelines.md`
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

Before review, require the frozen canonical project UI guideline at `.projects/<project>/design/ui-guidelines.md` or the repository's already-established equivalent. If it is missing, return `BLOCKED_MISSING_UI_GUIDELINE`; do not create a competing review contract while judging the candidate.

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

For a frozen candidate reviewed against a finite set of authoritative comments, follow `references/authoritative-comment-compliance-audit.md`. It requires binary comment-by-comment acceptance statements, independent code/pixel/runtime receipts, selected-context continuity checks, stable-ID comparison, deterministic viewport probes, and strict blocker/high-only verdict discipline.

1. **Orient**
   - Identify project, scope, artifact paths/URLs, target platform/device, PRD/issue/feature, and expected audience.
   - Read the project UI guideline and design brief if they exist.
   - If the canonical `ui-guidelines.md` does not exist, return `BLOCKED_MISSING_UI_GUIDELINE` before final review.

2. **Research comparables when the frozen guideline calls for it or appears stale**
   - Search for top services in the category and adjacent services with similar UI problems.
   - Capture 3–7 comparables with URLs, why they matter, and the specific UI lessons relevant to this project.
   - Avoid copying brand-specific visuals or proprietary content; extract interaction patterns and quality expectations.

3. **Inspect the UI/design evidence**
   - For images: inspect layout, hierarchy, components, text, states implied by the design, and viewport assumptions.
   - For real UI: use browser/app interaction where possible, capture screenshots, check responsive/device variants, and note console/network only when they explain UI failures.
   - Bind the review to one frozen evidence generation. Screenshot pixels, rendered HTML, CSS/JS assets, and stated commit/status must come from the same immutable snapshot; do not inspect a shared checkout while another process is generating, building, restoring, or cleaning it. If concurrent mutation occurred, keep observations as hypotheses but withhold the candidate verdict and re-review a frozen snapshot or isolated worktree.
   - For content-driven UIs, review both a production-truthful snapshot and labeled deterministic fixtures for required populated, empty, fallback, error, and interaction states. Do not demand fabricated production content to demonstrate a component state; fail production only when it misrepresents its real inventory or the fixture-driven state itself is inadequate.
   - When comparing multiple visual directions for an existing product, follow `references/multi-direction-responsive-selection.md`: inspect the production baseline, score product-contract criteria, verify exact viewport geometry, separate direction selection from implementation readiness, and permit hybridization only for narrowly evidenced elements.
   - For an immutable multi-direction bundle with many screenshots and runnable prototypes, also follow `references/frozen-multi-direction-ui-review-receipt.md`: verify manifest closure before and immediately before verdict, inventory every pixel class with temporary outside-repo contact sheets, fresh-run the viewport/transition matrix, distinguish fixed-nav screenshot stitching from runtime obstruction, and keep page-scale, genuine zoom, and large-text claims separate.
   - Validate responsive geometry, not screenshots alone: confirm document scroll width does not exceed the viewport and inspect out-of-bounds elements. Ensure headless-browser minimum widths have not produced a cropped wider layout masquerading as the requested mobile viewport.
   - When full-page screenshots contain fixed or sticky navigation, do not classify the one-time composite overlap by pixels alone. Reproduce at the exact viewport and verify: the fixed element's live rect; content bottom padding plus safe-area inset; whether obscured content can scroll fully above the navigation; focus/keyboard reachability; and whether the overlap affects the primary task or only the screenshot composite. Record capture artifact and runtime defect separately.
   - Treat `pageScaleFactor`, CSS `zoom`, and a narrower viewport as different evidence. For a 200% requirement, record the mechanism used and pair visual capture with runtime geometry/text-reflow checks; never label CSS `zoom` as browser zoom.
   - Repeat mobile review with the product's large-text/dynamic-type setting. Check sticky-header growth, control wrapping, navigation crowding, CTA legibility, and card density even when there is no horizontal overflow.
   - For SPA card-to-detail flows, test keyboard activation, focus placement after open, announcement/semantic context, and focus restoration after close. Visible focus styles by themselves are not sufficient.
   - Treat typecheck/export as build evidence only. If native UI was not exercised on an emulator/device, label native findings as code-level and require real-device visual QA before release approval.
   - Review the main user path first, then secondary states.
   - See `references/implemented-ui-responsive-a11y-probes.md` for concrete responsive, large-text, SPA-focus, and cross-platform evidence probes.
   - For dated market/comparable research, use `references/live-comparable-mobile-capture.md`: capture exact first/later mobile viewports, record final URL and geometry, inspect pixels plus DOM evidence, separate observation from transfer risk, and verify any scratch capture utility before reporting completion.

4. **Score against the bar**
   - Use `PASS`, `NEEDS ITERATION`, or `BLOCKED`.
   - Only pass when the design is clear, coherent, implementable, accessible enough for the target, and competitive for the product's market tier.
   - `NEEDS ITERATION` if a competent designer would revise before handing to engineering or shipping.
   - `BLOCKED` if required artifacts, access, screenshots, or product context are missing.

5. **Give actionable feedback**
   - Prioritize material findings by impact: blocker, high, or medium. Omit reversible nits entirely rather than assigning them a low severity.
   - Obey an explicit severity/output boundary. If the requester asks for “blockers/high findings only,” return only those findings plus the requested acceptance-criterion receipts.
   - Tie each finding to a principle, guideline section, comparable pattern, or user-journey impact.
   - For each non-trivial issue, include a concrete fix direction, not only criticism.
   - Return one deduplicated material correction set; do not attach a polish backlog.

6. **Write the report**
   - Save a review report when the review is part of a project workflow or design iteration.
   - Include image/UI evidence paths, comparables used, decision status, prioritized findings, and the exact revision checklist.

## Iteration Bar for Generated Designs

When invoked by `ui-designer` to review a newly generated UI design:

- Be stricter than a casual QA pass. The target is “credible experienced product designer handoff,” not “technically has UI elements.”
- Fail designs that look generic, visually incoherent, hard to scan, under-specified for states, inaccessible, weak compared with market norms, or disconnected from the PRD/CUJ.
- Return a compact revision checklist the designer can act on in the next iteration.
- Approve when no material issue remains; omit safely reversible polish rather than reporting it.
- If the design passes, state the exact approval rationale and any implementation guardrails the coder must preserve.

## Visual Category-Fit Gate

For image-led consumer categories—fandom, entertainment, travel, fashion, food, media, sports, collecting, and similar products—responsive correctness and task clarity are not enough for a passing visual direction.

- Inspect current direct evidence from products the audience actually uses; stale comparable notes may inform the review but cannot establish the current visual bar.
- Explicitly score first-viewport image-to-text balance, whether visuals carry product meaning, identity/media treatment, emotional energy, card rhythm, and progressive disclosure.
- If the user says the concepts are too text-centric or category-generic, reopen direction selection even if prior copy, responsive, and accessibility checks passed.
- Require the designer to follow the `ui-designer` category-native visual reset: broad source sampling, attributable screenshots, a visual inspiration board, materially new media-led directions, and a rights-safe asset strategy.
- Fail a redesign that only shortens copy or changes colors while retaining the rejected text-card structure.
- The review surface must attach clean mocks directly; a scorecard, document, or runnable ZIP alone is insufficient for visual approval.

## Severity Rubric

- **Blocker**: user cannot understand or complete the primary journey; major mismatch with PRD/CUJ; missing required design artifact; severe accessibility/responsive failure; design is below credible handoff quality.
- **High**: core hierarchy, navigation, CTA, state, or trust issue likely to confuse many users or lead to wrong implementation.
- **Medium**: inconsistent component/state/copy or visual system issue that degrades comprehension, polish, or competitive quality but does not block the core path.
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

Status: PASS | NEEDS ITERATION | BLOCKED
Lineage:
Round: 1 | 2 | 3
Candidate identity:
Review kind: ui
Required review kinds:
Evidence-generation identity:
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
Severity: blocker | high | medium
Principle/guideline/comparable reference:
Observed:
Impact:
Recommended fix:

## Revision Checklist
- [ ] <specific design change>

## Implementation Guardrails if Approved
- <what coder must preserve>
```

## Comparable Visual-Pattern Research

When the deliverable is a live comparable-product pattern/anti-pattern synthesis rather than a single-UI verdict, follow `references/comparable-visual-pattern-research.md`. It extends the capture mechanics in `references/live-comparable-mobile-capture.md` with category/job coverage, blocked-versus-clean overlay evidence, identity and image/text analysis, access-failure handling, transfer-risk rules, and the required durable synthesis. Finish the written evidence index and synthesis before giving the chat summary; screenshots alone are not a completed research deliverable.

## Implemented UI Cleanup Pattern

When the request is to make an existing website/app cleaner, more photo-rich, or more obviously clickable, use the focused pattern in `references/photo-rich-clickable-ui-cleanup.md`. In short: review the live/staged UI visually first, remove low-value explanatory copy, prioritize real imagery over placeholders, make clickable annotations look like polished CTA affordances rather than debug overlays, re-check for layout artifacts after CSS changes, and repeat production visual smoke after deployment.

For a full photo-heavy design-system specimen and rights-safe fixture review, follow `references/photo-heavy-design-system-frozen-review.md`. It covers media-as-data manifests, photo-density evidence, hidden clipping despite `overflow-x:hidden`, dynamic-text/fixed-nav reachability, strict zoom-label separation, and the rule that any post-dispatch mutation supersedes the old frozen review generation.

## Common Pitfalls

1. **Reviewing only from personal taste.** Critique must connect to foundational UI principles, project guideline, comparable market patterns, accessibility, or user-journey impact.
2. **Skipping the canonical-guideline gate.** If no frozen project UI guideline exists, return `BLOCKED_MISSING_UI_GUIDELINE`; do not research or author a replacement within the review.
3. **Approving generic mockups.** A design that looks like a placeholder template, ignores states, or lacks hierarchy should return `NEEDS ITERATION` even if it is visually tidy.
4. **Overfitting to competitors.** Use comparables to understand expected patterns and quality bars; do not copy brand-specific visuals, copy, assets, or proprietary flows.
5. **Mixing QA and design review.** QA verifies behavior. UI review judges hierarchy, affordance, visual coherence, accessibility basics, state design, and market-quality polish.
6. **No concrete revision path.** Every blocker/high/medium finding should include an actionable fix direction.

## Verification Checklist

- [ ] Frozen canonical project UI guideline exists at the durable path and the reviewer did not modify it.
- [ ] Guideline includes project context, top comparable services, foundational UI principles, and an explicit approval bar.
- [ ] Review used design images, screenshots, or real UI evidence; text-only limitations are marked.
- [ ] Findings are tied to principles, guideline sections, comparable patterns, accessibility, or user-journey impact.
- [ ] Report assigns `PASS`, `NEEDS ITERATION`, or `BLOCKED` and omits reversible nits.
- [ ] Revision checklist is concrete enough for `ui-designer` or a coder to act on.
- [ ] Approval, if given, includes rationale and implementation guardrails.
