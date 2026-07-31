# Recovered Review Artifact Integrity

Use this when a delegated immutable reviewer times out, returns no summary, or is interrupted after it may have written a requested report.

## Recovery sequence

1. **Keep run state and artifact state separate.** A timeout remains a timeout even when a usable report survives. Never relabel the worker as completed.
2. **Locate the exact requested outputs before retrying.** Check the report, adjacent checksum/manifest, evidence directory, and immutable candidate identity named in the dispatch.
3. **Validate report structure before interpreting its verdict.** Require the requested verdict token, reviewed/base SHA, start/end candidate identity, requirement matrix, concrete findings, commands actually run, preservation proof, and mutation statement.
4. **Compute the report digest from the final bytes yourself.** Do not trust a sidecar or summary checksum. Compare the actual digest with every recorded value and inspect ordering/mtime when they differ.
5. **Treat a stale sidecar as an integrity defect, not automatically as a false finding.** Preserve the original report and sidecar. Write a separate parent-verified sidecar such as `<report>.verified.sha256`; do not silently overwrite historical evidence.
6. **Independently ground consequential findings.** Read the cited exact-SHA source and retained reproducer. Confirm the candidate is still the reviewed head. A structurally complete FAIL report with a stale sidecar may be used only after the blocker is independently confirmed.
7. **Classify precisely.** Use `timed_out_with_recovered_verified_artifact` when the report is structurally complete, the final bytes have a parent-recorded digest, and decisive claims are independently grounded. Use `timed_out_with_recovered_unverified_artifact` when a report exists but identity, integrity, or consequential claims cannot be verified. Use `timed_out_with_partial_artifact` when required sections/evidence are missing, and `timed_out_without_recoverable_artifact` when nothing usable exists.
8. **Route by verdict, not by nominal workflow position.** A recovered FAIL review triggers a narrow remediation worker and a fresh exact-head rereview. It must not advance to quality review, merge, or dependent work. A recovered PASS still requires digest/candidate verification before the next gate.
9. **Keep hook-only continuation single-step.** Launch exactly one dependency-safe successor after recovery. Do not batch remediation and rereview against a moving candidate.
10. **Do not let broad green tests erase a recovered blocker.** Independently reproduce or source-confirm the report's decisive claim; full-suite success cannot negate an uncovered adversarial interleaving or contract violation.

## Reviewer-side digest sequencing

A reviewer producing a durable report must:

1. finish and close the complete report;
2. compute SHA-256 from those final bytes;
3. write the adjacent sidecar;
4. recompute the report SHA-256 and compare it with the sidecar;
5. only then return the verdict, report path, and digest.

Do not place a digest of the report inside the report itself. If later edits occur, repeat the finalization sequence and replace only the reviewer-owned sidecar before completion.

## Evidence checklist

- [ ] Actual digest recomputed from final bytes.
- [ ] Original and verified sidecars preserved distinctly when mismatched.
- [ ] Candidate head/base verified unchanged.
- [ ] Finding independently reproduced or source-confirmed.
- [ ] Run state retains timeout/interruption classification.
- [ ] Successor matches the recovered verdict and gate order.
