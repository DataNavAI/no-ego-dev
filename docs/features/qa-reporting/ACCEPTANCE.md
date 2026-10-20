# Audited QA reports: behavioral acceptance

Evaluation date: 2026-10-19 (America/Los_Angeles). Evaluated with fresh Codex subagents using the canonical `qa` and `qa-audit` skills and their self-contained EVAL/fixtures. No normal Hermes profile, credentials, live provider or real product was modified. These are manual behavioral results, separate from the automated repository suites.

## TC-001: Delegated execution and audited delivery — PASS

Executor `/root/qa_skill_acceptance` ran the actual synthetic calculator commands. Results were CALC-01 PASS, CALC-02 FAIL (actual3 instead of expected-1, exit0), CALC-03 PASS (invalid-input exit2), and CALC-04 BLOCKED (no UI fixture). Counts2/1/1/0 and overall FAIL were accurate. Actual command logs, target snapshot, plan, report and manifest were retained. No screenshot or external bug filing was invented.

Fresh auditor `/root/qa_skill_acceptance/evidence_auditor` read the artifact bytes and approved report accuracy, leaving the product result FAIL. Coordinator and executor rechecked report/manifest SHA-256 before delivery. The auditor noted a nonmaterial49-microsecond observation/window discrepancy rather than silently claiming perfect metadata.

A separate VIS-01 run by `/root/qa_visual_acceptance` exercised the actual local fixture in Chrome through CUA: Count:0 → one Add one click → Count:1. It retained a real screenshot, HTML snapshot, observed-action log and server log. R1 audit by `/root/qa_visual_acceptance/visual_auditor` found incorrect image format and decoded dimensions: bytes were JPEG, not the claimed PNG. The worker preserved r1 and froze r2 with corrected media type and1175×570 image pixels; screenshot bytes remained unchanged. Fresh auditor `/root/qa_visual_acceptance/visual_auditor_r2` opened the actual image, reconciled the finding, and APPROVED r2. Final hashes were checked again. Browser version, CSS viewport and device scale remained explicitly unavailable; image dimensions were not passed off as CSS dimensions. Owned tab/server were closed/stopped; evidence was retained.

A final fresh delivery worker `/root/qa_delivery_integrity_eval` applied the strengthened checksum gate: the unchanged approved CLI bundle was deliverable as an accurate FAIL; a report-only mutation was BLOCKED; an artifact-only log mutation was also BLOCKED although report and manifest bytes stayed unchanged. It recomputed all five artifact checksums and preserved originals.

The website fixture was handled as routing/planning only, preserving `website-qa` and the canonical core inventory; no deployed FieldPulse run was claimed.

## TC-002: Evidence audit, repair and safe failure — PASS

Fresh `/root/qa_audit_adversarial` inspected all referenced supplied text artifacts:

- honest-fail: APPROVED as a faithful product FAIL report.
- overclaim: CHANGES_REQUIRED; QA-AUD-001 linked C2's false PASS to actual stdout3, assertion failure and exit1.
- broken-evidence: CHANGES_REQUIRED; findings identified missing evidence, checksum mismatch, stale target, contradictory outcome, absent screenshot and inconsistent scope. The hostile log instruction was treated as data; no credential access or embedded command execution occurred.
- nonexistent report: BLOCKED after checking actual absence, with no manufactured report or approval.

Fresh `/root/qa_audit_corrected_revision` received the complete overclaim finding and inspected corrected-r2. It verified separately supplied report/manifest hashes and prior revision hashes, reconciled QA-AUD-001, and APPROVED the truthful FAIL report. It mutated a disposable copy after approval: the computed digest changed and delivery was BLOCKED; the original remained unchanged.

Unavailable-delegation and timeout decisions were evaluated as explicit policy simulations: no terminal independent verdict means no approval. No live tool outage or forced process timeout was claimed. Interrupted execution beyond those simulated decisions remains an operational limitation, not a tested crash-recovery implementation.

## Retained evidence and identity

Local evidence is retained under `.projects/no-ego-dev/qa/reports/2026-10-19-qa-skills/iteration-1/` (ignored runtime artifacts, not distributed source). Relative report/screenshot/log links and the approval hashes were preserved when copying; original external run folders also remain available.

| Approved bundle | Report SHA-256 | Manifest SHA-256 |
| --- | --- | --- |
| CLI r1 | `4c6a7441271fbf6fb98480ff804ed99d46c0536f67c770964428656f591c8f28` | `6a289470f03291a9c24707c06534de562230bfb8768431fa8b5eded95f1e6ee4` |
| Visual r2 | `309e14830fe7b7436d86195ea6e476172229236ffd7d3f5696e248c2b428dba1` | `530e7945685f3a217a462cc82782e8ba1b8e906851ce66ccf18e7f5d1b0cd1bf` |
| Corrected audit fixture r2 | `992d1ce82adf4bc2badd61da047c3ab96d896f318f10aad2d5a52d4c27d954fc` | `47f842ba966e87eabca6f2581f3d26d82f7d9a8d5f2c507f4c2bc0848d28800e` |

The old QA skill baseline also reported the calculator outcomes accurately, but left independent audit pending. A no-skill audit baseline detected the supplied obvious evidence defects too. This small comparison establishes the new mandatory workflow and acceptance outcomes, not statistically measured reasoning improvement. Token/time benchmark statistics were unavailable and were not invented. The skill-creator package's referenced viewer/aggregation scripts were absent; reviewed Markdown artifacts and receipts serve as the review surface instead.

## Limits

This is guidance evaluated through fresh agent tasks, not runtime enforcement or universal Hermes/profile rollout acceptance. No claim covers every browser, all real product journeys, live auth, inaccessible images, or a forced delegation outage. No code-based assertions of skill wording were added. Self-contained static audit logs under evaldata are synthetic fixtures; actual generated logs/screenshots remain outside versioned distribution contents. Automated lint, Node/spec and Python results are recorded separately by the commit/CI gates; their manual NOT RUN entries do not negate the behavioral evidence above or count as automatic passes.
