# UI Designer Eval Fixture

This fixture describes typical NoEgoDev project scenarios for evaluating the `ui-designer` skill.

Client also asks NED to design a new MVP whose approved scope contract contains one primary CUJ and one supporting recovery CUJ. Stakeholders have suggested onboarding tours, a dense dashboard, five navigation tabs, settings, social sharing, themes, and analytics cards. A passing `ui-designer` response should read the MVP plan, map every screen/state to the two selected CUJs, minimize entry-to-value actions, give each screen one primary job, and exclude the suggested extras unless the scope contract proves they are necessary. It should preserve required accessibility, trust, privacy, loading, empty, error, success, and recovery states.

Client also asks NED to review a mobile app onboarding and dashboard flow. A passing `ui-designer` response should:

- State that mobile app UX must be reviewed differently from web app UX.
- Check that each phone screen is simple and focused around one primary job.
- Evaluate touch target size, spacing, thumb reach, safe areas, and keyboard/OS chrome interactions.
- Prefer one-finger navigation and native mobile patterns such as bottom tabs, bottom sheets, clear back behavior, and step-by-step flows.
- Flag dense web-style layouts, sidebars, hover menus, and top-heavy navigation as mobile-specific UX issues when they harm use.
- Separate mobile-specific findings from general visual polish findings.


Project: AtlasBoard, a lightweight B2B dashboard for founders to track product launches.

Context:
- The product has a PRD under `.projects/atlasboard/prds/core-mvp.md`.
- There is no durable UI guideline yet.
- A staging build exists with screens for login, dashboard, launch-detail, and settings.
- Existing implementation uses inconsistent button styles, weak empty states, unclear error copy, vague CTAs, and long helper text that explains controls users can already understand from layout/state.
- The project uses GitHub issues for bugs and follow-up work.

A good response should create or update a durable UI guideline path, describe how to review staging screens against it, identify UI findings with screenshot/evidence expectations, and file/search issue-managed UI bugs rather than giving vague aesthetic feedback.

When visible UI text is in scope, a good response should spawn an `english-copywriter` subagent or run the same copy workflow. The copy review should inventory visible strings, run the minimum-text pass before rewrites, remove or replace unnecessary explanatory text with clearer UI structure, preserve necessary labels/accessibility/trust/recovery/consequence copy, and provide exact replacement strings for vague CTAs, errors, empty states, and destructive confirmations.


Feature design iteration scenario:
- The product manager asks ui-designer to create design images for a new onboarding flow before architecture/tech-spec work begins.
- A passing `ui-designer` response should generate or update concrete design images and a feature UI brief, then spawn an independent subagent using the `english-copywriter` skill to review all visible UI text before final UI approval.
- The copywriter must run a minimum-text pass first: remove, shorten, or replace explanatory text when the UI can explain itself through layout, control choice, state, iconography, defaults, or progressive disclosure.
- The ui-designer should revise design and copy until the copywriter returns `PASS` or `PASS WITH MINOR POLISH`, or record a real blocker with the missing input/tooling.
- The feature UI brief should record copywriter status, key removals/rewrites, and copy guideline path or notes.
- After copy review, the designer should spawn an independent subagent using the `ui-reviewer` skill.
- The reviewer must create/update `.projects/<project>/design/ui-review-guideline.md` if missing, using foundational UI principles and top-of-market comparable services.
- The ui-designer should iterate the design artifacts until the reviewer returns `PASS` or `PASS WITH MINOR POLISH`, or record a real blocker with the missing input/tooling.
- The final design brief should link the copywriter review, UI review guideline, review report, status, and implementation guardrails.

Interactive annotation requirement:
- When generating UI design images/mockups for implementation handoff, a passing `ui-designer` response should add visible stable annotation IDs such as `A1`, `A2`, and `A3` to important interactive components.
- Annotated components should include buttons, links, tabs, nav items, icon buttons, inputs/selects, toggles, tappable cards, modal/sheet controls, destructive actions, and key empty/error-state actions.
- The feature UI brief should include an annotation legend mapping each ID to expected behavior, destination or state transition, validation rules, disabled/loading/error behavior, and accessibility notes.
- If clean visual images are also needed for design review, the designer should export both clean and annotated versions, with the annotated version required for implementation handoff.

Human visual-review scenario:
- The user asks to compare onboarding directions and explicitly does not want a verbal explanation. A passing `ui-designer` response must create runnable HTML/CSS prototypes or equivalent concrete visual mockups, run them, capture clean mobile/desktop screenshots, and publish a rendered `DESIGN_REVIEW.md` with each variant/screen/hotspot on a stable `UI-*`/`A*` anchor.
- The index should embed screenshots, link runnable previews, compare CUJ fit/action count/hierarchy/responsiveness/accessibility/implementation cost, recommend a direction, and use a draft GitHub PR so the user can comment beside the exact visual item.
- NED must read unresolved review threads, update canonical prototype source, regenerate screenshots, verify, reply with the addressing revision, and resolve only addressed/agreed comments. Disputed design decisions remain open; thread resolution, design approval, engineering handoff, and merge are separate states.
