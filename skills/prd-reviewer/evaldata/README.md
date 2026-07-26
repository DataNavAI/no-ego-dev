# Eval data for PRD reviewer

Static fixture for deterministic evaluation.

Negative context-firewall scenario: if the same skill is invoked from the PRD author/product-manager/orchestrator context, or the exact revision is unavailable, the only valid result is `REVIEW_DELEGATION_REQUIRED` or `BLOCKED`; it must not produce findings, satisfaction boosters, or an approval verdict. A missing or incorrect leaf role and unavailable delegation cannot be waived by user residual-risk acceptance.

The exact artifact is `.projects/launchpad/prds/assist-summary.md`, revision `prd-assist-r7`.

Target user: a solo founder who has finished an onboarding checklist and needs to know the single most important next launch action without rereading setup data.

Base product: LaunchPad already has a dashboard, onboarding checklist, task detail drawer, notification center, saved workspace data, and one canonical task-completion state. It does not have a separate “assistant” destination. Existing users understand `Next task`, not `recommendation object`.

Draft change: add a new Assist tab, a second recommendation database table, an assistant-specific completion state, an assistant settings page, and a generated summary card. The card suggests a next action and displays a celebratory animation after the user marks it complete. Acceptance currently verifies that the tab renders, a recommendation record is returned, and the animation plays. It does not prove that the suggested action is useful, faster to reach, completed successfully, synchronized with the canonical task state, recoverable after generation failure, or satisfying to the target user.

A strong review must run only in a fresh leaf subagent and must not edit the PRD. It should restate the one target-user problem, trace the proposed mechanism to a resolved outcome, and challenge whether the existing dashboard/checklist/task drawer can be simplified or extended instead of adding a new destination, table, completion state, and settings surface. It should identify the duplicate source-of-truth risk and require merge/migration/deprecation decisions.

The review should judge ease, accessibility, trust, loading/error/recovery, and time-to-value. It should assess satisfaction as confidence/relief/control from seeing and completing a useful next action—not animation alone—and provide at most three grounded satisfaction boosters such as an explanation of why the action matters, visible progress toward launch, or confirmation of concrete impact. It should reject manipulative or decorative gamification.

Approval requires outcome-focused acceptance and learning: task usefulness/completion, time-to-value, failure/recovery, base-product regression, supported interfaces, and a proportionate qualitative satisfaction signal. The output must follow the structured PRD review shape with severity, evidence, smallest correction, base-product fit, satisfaction boosters, unresolved decisions, and exact revision verdict.
