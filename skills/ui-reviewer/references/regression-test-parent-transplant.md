# Parent-transplant regression proof

Use when exact-candidate review must prove that a new regression test detects the parent defect rather than merely passing on the fixed candidate.

1. Record exact candidate and parent identities; leave the shared checkout unchanged.
2. Run the candidate's focused regression test against the candidate and require pass.
3. Materialize the parent in a reviewer-owned temporary directory with `git archive`.
4. Transplant only the candidate regression-test file into that parent snapshot. Do not copy implementation fixes.
5. Reuse compatible dependencies read-only or install them inside the temporary snapshot.
6. Run the focused test and require the specific new assertion to fail on the expected old behavior.
7. Record the assertion and invalid old state/value.
8. Remove temporary residue and recheck shared HEAD/status.

Report separately:

- **Candidate positive control:** fixed implementation plus candidate assertion passes.
- **Parent negative control:** parent implementation plus candidate assertion fails on the expected defect.

An unrelated import, dependency, or harness failure is inconclusive. A passing parent-native suite proves only its historical tests, not the transplanted assertion.
