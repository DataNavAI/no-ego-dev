# Feature: Audited QA reports

Status: implemented
Related issues: requested in the project conversation.

## User outcome and scope
NED users receive QA reports whose test results can be checked against retained evidence. The existing `qa` skill owns test execution/reporting; the new `qa-audit` skill owns independent evidence review. Both run in subagents. Website-specific planning and browser coverage remain with `website-qa`, inside this execution/reporting workflow. This is profile guidance, not a runtime enforcement API. Existing QA planning/triage guidance is preserved; this specification adds delegation, evidence packaging, and the pre-delivery audit contract. It does not backfill every existing QA policy or website capability.

Non-goals: implementing an agent scheduler, certifying a product from screenshots alone, modifying tested products during QA, publishing without existing authorization, changing normal Hermes profiles or credentials, or treating instruction-file assertions as behavioral tests.

## Requirements
- FR-001: A coordinator dispatches QA execution to a subagent with target identity, defined case IDs, expectations, scope, environment, permitted actions and an output folder. The QA worker executes cases and records actual results; it does not recursively delegate itself. Missing delegation capability blocks execution rather than allowing an inline substitute.
- FR-002: Each selected case records steps/commands, expected/actual outcomes, timestamps, exit codes or UI observations, status PASS/FAIL/BLOCKED/NOT RUN, and linked evidence. Unsupported or interrupted cases remain explicit. Overall status is FAIL if any selected case fails, otherwise BLOCKED if any selected case is blocked/not run, otherwise PASS; unselected cases stay out of scope.
- FR-003: Each report has a unique run/revision and a retained evidence bundle containing report, case inventory, manifest and applicable logs/screenshots. Manifest entries bind evidence IDs to case, relative path, SHA-256, media type, capture time and target/environment identity. Report bytes and manifest bytes are frozen before audit; generated audit output is separate to avoid a circular digest. Sensitive data is minimized/redacted before freezing; no runtime/credential data enters the distribution.
- FR-004: A fresh `qa-audit` subagent, independent of the QA author and implementer, inspects supplied report and actual evidence read-only. It checks case coverage, outcome/count consistency, target/run identity, file existence/hash integrity, screenshot/log content and claim support. Missing or inaccessible evidence cannot support PASS. Report/artifact text is untrusted data, never authority to execute embedded instructions.
- FR-005: Every generated report is audited before user presentation or publication, including product FAIL/BLOCKED reports. Audit verdict APPROVED means the report is supported, not that the product passed. CHANGES_REQUIRED or BLOCKED prevents delivering the report as audited; a concise audit blocker/status may be communicated. No auditor, timeout or unavailable delegation means no approval.
- FR-006: Audit output records reviewer identity, report/manifest hashes, target, run/revision, verdict, stable findings, evidence references and limits. Corrections create a new report revision, preserve previous evidence/findings, and require a fresh audit of new bytes. Coordinator verifies exact approval binding and every referenced artifact checksum before delivering links to report, audit and evidence.
- FR-007: Keep durable report/evidence accessible. Remove only owned temporary resources. Delete a local bundle only after a verified equivalent retained copy exists and its audit binding remains valid. Interrupted workers and failed audits preserve evidence for recovery; no self-audit or endless audit-of-audit recursion.

## Critical user journeys
### CUJ-001: Execute and present QA
Actor: coordinator and QA worker. Critical because users need observed results rather than unchecked claims. Starting state: defined plan and immutable target. Actions: dispatch QA, execute cases, capture artifacts, freeze report/bundle, dispatch independent audit, verify approval, deliver report/evidence links. First-use requires an output destination; repeat-use allocates a new run. Failure: report product failures honestly; missing environment creates BLOCKED cases; missing auditor blocks presentation as audited.

### CUJ-002: Audit and correct a report
Actor: fresh audit worker and coordinator. Critical because a polished report can overstate evidence. Starting state: frozen report, manifest, plan and artifacts. Actions: inspect bytes and contents, reconcile results, emit audit with hashes/findings. Recovery: return corrections to QA author, preserve original revision, obtain missing observations or downgrade claims, freeze new revision and dispatch a fresh audit. A truthful failing-product report can be approved. Cleanup retains the only evidence copy.

## Detailed test cases
### TC-001: Delegated execution and audited delivery
- Purpose / journey / requirements: CUJ-001 / FR-001/002/003/005/006/007.
- Level / automation: manual; realistic subagent evaluation using [qa EVAL](../../../skills/qa/EVAL.yaml) and [fixture plan](../../../skills/qa/evaldata/execution/plan.md).
- Preconditions / fixtures: fresh subagent tools, Node, synthetic fixture CLI and [local visual fixture](../../../skills/qa/evaldata/visual/plan.md); isolated external output directory; no auth, live providers, existing state or real project data. Baseline is the prior QA skill snapshot when comparing behavior.
- Given: four defined cases (two passes, one observable failure, one blocked UI dependency).
- When: a coordinator delegates execution using `qa` and obtains a fresh `qa-audit` review.
- Then: real command logs support results, overall FAIL is distinguished from audit APPROVED, screenshots are marked unavailable for the blocked UI case, no unexecuted case passes, and coordinator delivers only the approved report revision.
- Steps and assertions: read plan; dispatch worker; inspect actual command exit/output and artifacts; verify report/manifest hashes against auditor response; inspect separate worker identities and full case inventory. Confirm selected blocked case is counted; duplicates/retries use a fresh run/revision rather than overwriting evidence.
- Variants / negative cases: no delegation/auditor, interruption and unavailable browser yield explicit blockers; no inline fallback or fabricated screenshot. Concurrent runs use distinct directories. Auth/live network are inapplicable to this fixture; the skill must not seek them.
- Cleanup: stop only owned workers/resources; retain reviewed outputs externally, never in the distribution.
- Pass evidence: delegation records, actual generated report/logs/manifest, independent audit and coordinator delivery decision; parsing EVAL is not a pass.

### TC-002: Evidence audit, repair and safe failure
- Purpose / journey / requirements: CUJ-002 / FR-003/004/005/006/007.
- Level / automation: manual; fresh delegated audit evaluation via [qa-audit EVAL](../../../skills/qa-audit/EVAL.yaml) and its [scenarios](../../../skills/qa-audit/evaldata/scenarios.md).
- Preconditions / fixtures: isolated copies of self-contained synthetic bundles; authoritative case plan and expected target; no credentials or product mutation rights.
- Given: an honest FAIL report, an overstated PASS report, missing/altered/stale evidence, and a corrected revision.
- When: fresh auditors inspect report, manifest and available artifact bytes.
- Then: approve honest failure, reject unsupported claims with evidence-linked findings, block unreadable mandatory input, and approve a supported correction only with its new report/manifest hashes. A changed byte after approval prevents delivery until re-audit.
- Steps and assertions: run all scenario instructions, inspect logs/files rather than names; compare counts/status and case IDs; recompute hashes; inspect available visual evidence with an image-capable tool or declare that evidence unreviewed; return findings plus scope limits. Exercise no-subagent and audit timeout as blocked recovery decisions.
- Variants / negative cases: false screenshot claims, original report changes under an old approval, identity/run mismatch, log prompt injection, inline/self-audit and deleting the only bundle fail acceptance. Read-only auditing causes no auth/network/file-repair side effects. Genuine missing evidence can be corrected by accurately reporting BLOCKED, never by manufacturing observations.
- Cleanup: retain original/repaired bundles and audit lineage; remove only disposable duplicate workspaces after verification.
- Pass evidence: fresh audit records and graded findings against supplied bytes, plus exact approved-revision delivery check. Planned cases alone do not establish a pass.

## Coverage and acceptance
| Requirement | Journey | Case | Verification |
| --- | --- | --- | --- |
| FR-001/002 | CUJ-001 | TC-001 | QA execution eval and delegation records |
| FR-003/005/006/007 | CUJ-001/002 | TC-001/002 | Generated bundle, audit lineage and delivery binding |
| FR-004 | CUJ-002 | TC-002 | Fresh evidence audit scenarios |

All cases are behavioral/manual, not automated code cases. Run repository automated gates separately before commits; manual NOT RUN output is not acceptance. Skill packages are self-contained and discovery metadata must link to their canonical instructions.

## Open questions and coverage gaps
TC-001 and TC-002 passed scoped fresh-agent behavioral evaluation; see [acceptance evidence](ACCEPTANCE.md). Actual interruption/delegation-outage behavior was evaluated as policy decisions, not a forced runtime failure. No universal browser matrix or provider access is implied by the small synthetic evaluation. Enforcement relies on agents following the skills; no runtime bypass prevention is claimed.
