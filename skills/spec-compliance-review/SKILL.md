---
name: spec-compliance-review
description: Review a software change against its contract when the user requests a review; report concrete material findings.
version: 1.8.10
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [code-review, spec-compliance, immutable-review, deterministic-gates, verification]
    related_skills: [requesting-code-review, github-code-review]
---

# Spec Compliance Review

## Default verification policy

Self-review and appropriate automated checks are the default. Use a separate reviewer only when the user explicitly requests one. Do not add review rounds, lineage packets or approval receipts unless the user also requests that formal process. Historical separate-review procedures in linked references are optional, not completion gates. Preserve user authorization, real test/provider verification, secret protection and truthful delivery evidence.

Use for a requested code/specification review. Do not invoke this skill automatically as an implementation completion gate or dispatch another reviewer from inside a review.

## Establish the scope

Read the user request, applicable spec, current diff and relevant consumers. Identify the actual revision/snapshot inspected. Preserve the author's files and unrelated work; use an isolated snapshot when concurrent mutation would make the result ambiguous.

Do not require a lineage ID, round counter, receipt schema or pre-review summary before inspecting a normal change. Ask only for genuinely missing context that affects the review.

## Inspect material behavior

- Trace requirements through implementation, data/authentication boundaries, public consumers, error handling and tests.
- Check ownership, revocation, credentials, migrations, isolation, retries, concurrency and cleanup when those boundaries exist.
- Use the smallest meaningful probe for an uncertain material claim. Reuse trustworthy current-candidate CI rather than rerunning broad suites without cause.
- Distinguish actual provider/runtime results from mocks, fixtures, plans and source inspection. Never infer deployment, security or compatibility from a successful local model alone.
- Examine the full requested scope and related instances of a confirmed defect class. Give one complete, deduplicated correction set; omit taste, reversible polish and unrelated refactors.

## Report

Lead with material findings, with the concrete trigger, consequence, affected path/line and supporting evidence. State what was inspected and any checks or environments unavailable. If no material finding remains, say so without inventing extra approval machinery.

For a follow-up, verify the correction and relevant regressions. Carry useful prior findings forward without demanding cumulative review packets or a fixed sequence of rounds. Report newly discovered material defects honestly, including corrections to prior conclusions.

Do not claim independence if you authored the change. When the user explicitly requested an independent review, use a separate qualified actor if available and authorized, or disclose that it was unavailable. A review never supplies missing user permission for external actions.

Use technical references only when their actual boundary is in scope. Historical formal review/receipt procedures are not required for ordinary requested reviews.
