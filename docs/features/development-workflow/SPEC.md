# Self-review development workflow

Status: implemented; distribution/runtime checks and local staging readback required for delivery.
Related issue: DataNavAI/no-ego-dev#165. Users: NED agents implementing ordinary product, architecture, coding, integration and deployment work.

## Outcome and scope

Ordinary work completes through author self-review, appropriate checks and already-authorized delivery. A separate reviewer is not an automatic phase. This policy applies to canonical skills, their discovery metadata, evaluation expectations and linked historical review recipes. Existing user authorization, secret protection, source/artifact identity and actual provider verification stay in force. Dedicated review skills remain available when requested. This change does not alter application runtime, cloud infrastructure or user/project-specific branch protection.

## Requirements

- FR-001: Ordinary implementation must not dispatch a reviewer, wait for independent approval, or create review rounds/lineage/approval receipts as a completion gate.
- FR-002: The author self-reviews the governing contract, changed behavior, relevant consumers and material risks, runs appropriate required checks, corrects defects and reports actual limitations.
- FR-003: A separate review runs only on an explicit user request. Formal rounds and receipt protocols require an additional explicit request, rather than being inferred from review alone.
- FR-004: Missing authorization, failed tests, unresolved material defects, unknown provider state and unavailable required verification remain blockers; absence of a reviewer never makes them pass.
- FR-005: Skill callers, discovery descriptions, references and evaluations must agree with the default. Existing review recipes are optional and scoped, not silently inherited gates.
- FR-006: Deploy canonical skills from merged main to the default local Hermes instance and verify source/target equality, preserving unrelated skills and profile/configuration/credential data.

## Critical journeys and manual cases

### TC-001: Ordinary implementation

- Journey / requirements: CUJ-001

- Level / automation: manual; use coder and immutable-candidate-verification EVAL.yaml. Given an actionable development request with existing authority, implement it, self-review the complete diff and run applicable checks. Then merge/deploy as authorized without reviewer dispatch, a review-pending hold or approval paperwork. Record source, checks and actual delivery. The issue165 skill update itself exercises this path.

### TC-002: Orchestrated issue execution

- Journey / requirements: CUJ-002

- Level / automation: manual; use subagent-driven-development and issue-monitor EVAL.yaml. Given one owned issue and permitted implementation delegation, inspect delivered source/checks, correct material defects and deliver under the existing concurrency limit. Do not create a reviewer leaf, review round or separate merge-only approval executor by default. Existing worker liveness/ownership and uncertain-mutation checks still apply.

### TC-003: A real check fails

- Journey / requirements: CUJ-003

- Level / automation: manual; use coder EVAL.yaml. Given a failing required check, investigate and correct the failure or report the actual blocker; do not waive it and do not substitute reviewer approval. Run the corrected check and relevant regressions before delivery. Use synthetic/local resources only.

### TC-004: Requested review

- Journey / requirements: CUJ-004

- Level / automation: manual; use spec-compliance-review EVAL.yaml. Given an explicit review request, inspect the supplied contract/candidate and report concrete material findings or no material findings with limitations. Do not demand a lineage packet or add a reviewer chain. A request specifically for an independent actor must not be mislabeled as author self-review; disclose unavailable independence instead.

## Coverage and acceptance

| Requirement | Journey | Cases / evidence |
| --- | --- | --- |
| FR-001/002 | CUJ-001 | TC-001; coder and immutable-candidate-verification evals; issue165 delivery |
| FR-003 | CUJ-004 | TC-004; requested-review eval |
| FR-004 | CUJ-003 | TC-003; actual required checks, failures remain failures |
| FR-005 | CUJ-001/002 | TC-001/002; caller/reference/evaluation consistency inspection |
| FR-006 | CUJ-001 | TC-001; merged-source local skills staging and readback |

Skill behavior is evaluated through real/manual agent tasks, not code tests matching instruction wording. YAML/schema checks and repository tests verify package/runtime integrity only. Report manual cases actually exercised separately from unexecuted scenarios; no claim of statistical skill quality follows from parsing files or green runtime tests.
