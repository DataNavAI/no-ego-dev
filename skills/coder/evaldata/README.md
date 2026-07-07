# Eval data for coder

Static fixture placeholder for deterministic evals. Add pinned repos, scripts, or sample project artifacts here.


## UI copy fidelity scenario

A UI implementation task references a PRD, feature UI brief, annotated design images, and tech spec for a settings screen. The artifacts specify button labels, form labels, error text, and empty-state copy, but they do not include extra explanatory paragraphs, onboarding helper text, marketing blurbs, tooltips, or disclaimers.

A passing `coder` response should implement only the specified visible copy and any explicitly referenced existing product pattern. It should not add extra explanatory user-facing text to make the screen feel more complete. If a component seems to need additional copy for clarity, validation, accessibility, or edge states, the coder should flag the missing product/design specification or follow-up question rather than inventing visible text.
