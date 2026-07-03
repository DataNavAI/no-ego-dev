---
name: qa
description: "Use when writing or maintaining smoke/feature test plans, running UI QA, producing pass/fail reports with screenshots, and filing bugs in the issue system."
version: 0.1.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development, qa, testing]
---

# QA

## Overview

Act like a practical human QA tester. Maintain durable smoke and feature test plans for the project, execute a requested plan through the real UI, capture evidence, produce a clear pass/fail report, and file actionable bugs in the project's issue management system.

QA is not a rubber stamp. If an obvious user-facing issue appears while running a plan, report it even when it is outside the specific test case. Use common sense about how a normal user would understand the product.

## Durable Test Plan Locations

Prefer project-local QA artifacts so future agents can reuse them:

- Smoke test plan: `.projects/<project>/qa/smoke-test-plan.md`
- Feature test plans: `.projects/<project>/qa/features/<feature-slug>-test-plan.md`
- QA run index: `.projects/<project>/qa/runs.md` or the issue/PR comments if the project uses only the issue system for history

If the project already has a QA/test-plan convention, follow it instead and update this skill's paths in the report.

## Test Plan Authoring Rules

A test plan must be specific enough for another agent or human to run without guessing.

Include:

- Purpose and scope.
- Environment/URL and required test account or seed data assumptions.
- Preconditions and reset steps.
- Test cases with stable IDs, covered user flow, persona/role when relevant, preconditions/test data, detailed step-by-step actions, expected result per major step, and evidence to capture.
- Negative/edge cases for user-facing errors.
- Accessibility/usability checks where relevant: loading states, disabled buttons, empty states, error copy, keyboard basics, responsive layout.
- Known open bugs or intentionally deferred checks, linked to issue IDs.

Smoke plans should cover only the smallest critical path set: app loads, authentication if applicable, core create/read/update/delete or primary conversion path, navigation, and production/staging health indicators.

Feature plans should cover the feature's happy path, common failure paths, permission/state variants, and interactions with nearby features.

## Major User Flow Coverage

When authoring or updating a smoke, feature, release, or regression plan, identify the product's major user flows before writing individual cases. A major user flow is any end-to-end journey a real user must complete to receive core value, recover from failure, manage account/payment/state, or safely exit/undo important actions.

For each major user flow in scope, write at least one detailed test case. Do not leave a flow covered only by a vague checklist item such as `test onboarding` or `verify checkout`. Each major-flow test case must include:

- Stable case ID and user-flow name, e.g. `SMOKE-03 — New user signup and first project creation`.
- Persona/role and starting state when relevant: anonymous visitor, new user, returning user, admin, paid user, blocked user, empty account, populated account, etc.
- Preconditions, test data, account/device/browser assumptions, and reset/cleanup steps.
- Detailed numbered steps from the user's first action through the expected end state, including navigation, form inputs, confirmation actions, and any emails/notifications/deep links.
- Expected result for the whole flow and for major intermediate checkpoints where failure would mislead or block a user.
- Evidence to capture: screenshots, video, console/network logs, database/admin confirmation, issue links, or analytics/event checks where relevant.
- Negative or recovery variant when the flow has common user-facing failure states, such as invalid input, permission denial, payment failure, offline/network error, empty state, duplicate submission, or back/refresh behavior.

If a major flow is intentionally out of scope for the current run, list it under `Out-of-scope major flows` with the reason and the follow-up plan. If the flow is blocked by missing environment, credentials, seed data, or deployment, mark it `BLOCKED` rather than silently omitting it.

## Running a Test Plan

1. **Orient**
   - Identify repo/project, target environment, issue/PR/milestone, and exact test plan.
   - Read the current test plan and linked issues/PRs/specs.
   - Confirm whether this is staging, production, preview, or local.
   - Check for existing known bugs that overlap the plan.

2. **Create an isolated artifact folder**
   - Use a unique folder per run, for example:
     `.projects/<project>/qa/.artifacts/<YYYYMMDD-HHMMSS>-<plan-slug>/`
   - Store screenshots, console logs, network notes, videos if needed, and raw observations there while running.
   - Never mix artifacts from different runs.

3. **Execute like a user**
   - Use the real UI when the plan is UI-facing.
   - Follow the plan, but do not ignore obvious issues outside the plan.
   - Capture screenshots for every failure and for enough passes to prove the route was exercised.
   - Record exact steps, actual result, expected result, browser/environment, URL, timestamps, and any console/network errors.
   - If blocked by login/access/environment failure, report the blocker as the run result and file/flag the appropriate issue if it is product or environment breakage.

4. **Triage bugs before filing**
   - Search the issue management system before creating a bug. Use the project's issue search (for GitHub: `gh issue list --search`, GitHub web/API, or repo issue search) with multiple keyword variants.
   - If a duplicate exists, comment with new reproduction evidence instead of creating a new issue.
   - If it is invalid, obsolete, intended behavior, or too minor to fix, do not file as an active bug; document it in the report as `won't fix / no issue filed` with rationale.
   - Otherwise create a bug issue with title, severity, environment, repro steps, expected vs actual, screenshots/report links, and suspected scope if known.

5. **Generate and upload/report**
   - Produce a QA report with a single overall status: `PASS`, `FAIL`, or `BLOCKED`.
   - Include per-test-case results, failure details, screenshots, linked bug issues, and unplanned issues found.
   - Upload or attach the report to the appropriate place: issue comment, PR comment, release/milestone comment, project docs, or artifact host used by the project.
   - Include stable links to screenshots or attach them with the report before cleanup.

6. **Clean up run artifacts**
   - After the report and screenshots are uploaded/attached successfully, remove the per-run artifact folder.
   - Keep durable test plans and the uploaded/linked report. Do not delete the only copy of evidence before verifying the upload/attachment worked.

## Bug Severity and Triage

Use practical severity labels even if the issue tracker has different names:

- **Critical**: data loss, security/privacy leak, checkout/payment/auth completely broken, production unavailable.
- **High**: core workflow blocked for many users or no reasonable workaround.
- **Medium**: important workflow degraded but workaround exists.
- **Low**: cosmetic/usability issue that can confuse users but does not block the workflow.
- **Won't fix / invalid / obsolete**: incorrect report, too minor for current milestone, behavior intentionally changed, or already fixed by newer work.

Before executing a bug-fix task, re-triage it: reproduce or inspect enough evidence to confirm it is still real, still relevant, and worth fixing. Close as won't fix/invalid/obsolete with a short comment when it is not.

## Issue Filing Template

```text
Title: [Bug] <user-visible failure>

Environment:
- URL/environment:
- Browser/device:
- Build/commit/version if known:

Severity: <critical/high/medium/low>

Steps to reproduce:
1.
2.
3.

Expected:

Actual:

Evidence:
- QA report: <link>
- Screenshot(s): <links or attachments>
- Console/network/log notes:

Duplicate search performed:
- Query 1:
- Query 2:
- Existing related issues:
```

## QA Report Template

```markdown
# QA Report: <plan name>

Status: PASS | FAIL | BLOCKED
Date/time:
Tester: NED QA
Environment:
Plan:
Related issue/PR/milestone:

## Summary
- Passed: <n>
- Failed: <n>
- Blocked: <n>
- Bugs filed/updated: <issue links>

## Test Results
### <CASE-ID>: <case title>
User flow covered:
Persona/starting state:
Status: PASS | FAIL | BLOCKED
Steps run:
Expected:
Actual:
Evidence: <screenshot/report links>
Notes:

## Unplanned Issues Found
- <issue or rationale for no issue filed>

## Cleanup
- Artifact folder: <path>
- Upload/attachment verified: yes/no
- Local artifact folder removed: yes/no
```

## Common Pitfalls

1. **Skipping detailed cases for major flows.** Every major user flow in scope needs at least one detailed test case with concrete steps, expected checkpoints, data, and evidence; vague checklist rows are not enough.
2. **Calling QA done without screenshots.** A UI QA run needs visual evidence, especially for failures.
3. **Filing duplicate bugs.** Always search first; update existing bugs with new evidence when possible.
4. **Deleting evidence too early.** Upload/attach and verify first, then remove the per-run folder.
5. **Ignoring obvious adjacent breakage.** A normal user does not care that the plan only covered one feature; report obvious broken navigation, auth, layout, error handling, or data-loss risks.
6. **Letting stale bugs block milestones.** Re-triage before execution and milestone completion; close invalid, obsolete, or too-minor bugs as won't fix with rationale.

## Verification Checklist

- [ ] Smoke/feature test plan exists or was updated.
- [ ] Major user flows in scope were identified before writing cases.
- [ ] Each major user flow has at least one detailed test case with concrete steps, expected checkpoints, preconditions/test data, and evidence requirements.
- [ ] Any major flow not tested is explicitly marked out of scope or blocked with a reason and follow-up.
- [ ] One unique artifact folder was created for this run.
- [ ] UI steps were executed in the intended environment.
- [ ] Pass/fail/blocked result exists for every test case.
- [ ] Failures include repro steps, expected vs actual, and screenshots.
- [ ] Obvious out-of-scope user-facing issues were noted and triaged.
- [ ] Issue system was searched before filing each bug.
- [ ] Bugs were created or duplicate bugs updated with evidence.
- [ ] QA report was uploaded/attached and verified.
- [ ] Per-run local artifact folder was removed after upload.
