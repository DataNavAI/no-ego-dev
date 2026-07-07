# UI Designer Eval Fixture

This fixture describes typical NoEgoDev project scenarios for evaluating the `ui-designer` skill.

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
- Existing implementation uses inconsistent button styles, weak empty states, and unclear error copy.
- The project uses GitHub issues for bugs and follow-up work.

A good response should create or update a durable UI guideline path, describe how to review staging screens against it, identify UI findings with screenshot/evidence expectations, and file/search issue-managed UI bugs rather than giving vague aesthetic feedback.


Feature design iteration scenario:
- The product manager asks ui-designer to create design images for a new onboarding flow before architecture/tech-spec work begins.
- A passing `ui-designer` response should generate or update concrete design images and a feature UI brief, then spawn an independent subagent using the `ui-reviewer` skill.
- The reviewer must create/update `.projects/<project>/design/ui-review-guideline.md` if missing, using foundational UI principles and top-of-market comparable services.
- The ui-designer should iterate the design artifacts until the reviewer returns `PASS` or `PASS WITH MINOR POLISH`, or record a real blocker with the missing input/tooling.
- The final design brief should link the UI review guideline, review report, status, and implementation guardrails.
