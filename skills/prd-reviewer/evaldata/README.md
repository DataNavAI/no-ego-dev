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



Additional continuity scenarios:

- **Missing prior-round context:** Round 2 lacks the prior exact review reports, finding disposition ledger, remediation change map, or prior-context digest; return `BLOCKED_MISSING_PRIOR_CONTEXT` without substantive review.
- **Contradictory later-round feedback:** Round 2 demands the opposite of a resolved Round 1 direction without decisive new evidence; reject the contradiction unless it is labeled `PRIOR_FEEDBACK_CORRECTION` with both statements and proof.
- **Unrelated new finding:** Round 2 raises a material issue from unchanged evidence that was independently discoverable in Round 1 and unrelated to remediation; omit it rather than drip-feed another correction cycle.
- **Material process escape:** Round 2 discovers a genuine material safety/correctness defect that was reasonably discoverable in Round 1 but missed. Preserve it as `MATERIAL_PROCESS_ESCAPE`, keep the gate blocked, and escalate the process failure rather than silently suppressing it or treating it as ordinary later-round feedback.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.

Negative scenario: Round 2 and later must omit ordinary product feedback that was reasonably discoverable in Round 1 and unrelated to remediation or new evidence. Missing exact revision, lineage, or cumulative report history returns `BLOCKED` rather than a verdict.
