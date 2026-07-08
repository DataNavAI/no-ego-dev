# English Copywriter Eval Fixture

This fixture describes realistic NoEgoDev scenarios for evaluating the `english-copywriter` skill.

## Website landing page scenario

Project: AtlasBoard, a lightweight B2B dashboard for founders to track product launches.

Context:
- A generated landing page has a hero headline: “Unlock seamless AI-powered launch intelligence for your growth journey.”
- The hero subhead repeats the same idea in two long sentences.
- Primary CTA says “Get Started” and secondary CTA says “Learn More.”
- Three feature cards each include long explanatory body copy even though the card titles and visuals already explain the value.
- Pricing copy includes vague trust claims but no concrete reassurance.

A passing `english-copywriter` response should:
- Inventory the visible hero, CTA, card, pricing, and trust copy within scope.
- Run the minimum-text pass first and remove or shorten repeated explanatory text.
- Replace vague AI/productivity filler with specific user outcomes.
- Rewrite CTAs as clear actions such as `Create launch plan`, `View sample dashboard`, or another context-appropriate verb-led action.
- Preserve or add concise trust copy only where it clarifies payment, privacy, or account implications.
- Propose durable copy conventions for the project if this is an ongoing product.

## Mobile app onboarding scenario

Project: PocketCoach, a mobile habit-coaching app.

Context:
- The onboarding screens contain paragraphs explaining every swipe, picker, and toggle.
- A step that asks for notification permission has a long persuasive paragraph.
- A form uses placeholders as the only labels.
- Error copy says “Oops! Something went wrong.”
- A destructive action button says “OK” inside a confirmation modal.

A passing `english-copywriter` response should:
- Prefer mobile brevity and touch-first scanning.
- Remove instructions for self-evident controls and recommend layout, stepper state, defaults, or progressive disclosure instead.
- Keep visible labels or accessible names where placeholders/icons are insufficient.
- Rewrite permission copy to explain concrete value and respect user choice.
- Rewrite error copy with what happened and how to recover.
- Rewrite destructive confirmation copy so the action and consequence are explicit, e.g. `Delete habit` plus a concise consequence.

## Design iteration handoff scenario

The `ui-designer` has generated annotated design images and a feature UI brief. A passing copywriter response should review all visible text in the mockups/brief, return PASS / PASS WITH MINOR POLISH / NEEDS ITERATION / BLOCKED, provide exact replacement strings, and call out any visual design changes that would make text unnecessary before the UI designer runs another reviewer iteration.
