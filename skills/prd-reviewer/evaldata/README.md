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

This is Round 1. The reviewer must return all independently discoverable product-decision defects now, prioritize hard-to-reverse audience/problem/journey/source-of-truth/privacy/rights commitments, and ignore reversible wording or formatting nits. The report must steer the author with evidence, user impact, required decision, and smallest correction. Re-review is limited to Rounds 2 and 3; new later feedback requires an explicit reason it was not discoverable in Round 1. There is no Round 4 for this stable PRD scope.

Negative scenarios: Round 2 must reject drip-fed ordinary feedback that was reasonably discoverable from the Round 1 PRD and is unrelated to remediation or newly available evidence. A Round 4 request returns `ITERATION_LIMIT_REACHED` before substantive review; missing exact revision or lineage returns `BLOCKED`.

Additional continuity scenarios:

- **Missing prior-round context:** Round 2 lacks the prior exact review reports, finding disposition ledger, remediation change map, or prior-context digest; return `BLOCKED_MISSING_PRIOR_CONTEXT` without substantive review.
- **Contradictory later-round feedback:** Round 2 demands the opposite of a resolved Round 1 direction without decisive new evidence; reject the contradiction unless it is labeled `PRIOR_FEEDBACK_CORRECTION` with both statements and proof.
- **Unrelated new finding:** Round 2 raises a material issue from unchanged evidence that was independently discoverable in Round 1 and unrelated to remediation; omit it rather than drip-feed another correction cycle.
- **Material process escape:** Round 2 discovers a genuine material safety/correctness defect that was reasonably discoverable in Round 1 but missed. Preserve it as `MATERIAL_PROCESS_ESCAPE`, keep the gate blocked, and escalate the process failure rather than silently suppressing it or treating it as ordinary later-round feedback.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.
