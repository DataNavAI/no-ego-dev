# Audit-discovered secret-scan exception children

Use when a milestone/parent closure audit finds a clean current tree but a red full-history secret scan caused by suspected synthetic fixtures or detector false positives. This is a security-gate child, not an audit waiver.

## Project-management rules

- Keep the parent audit and milestone open while the historical command is red.
- Create one small security/config child under the audit or affected epic. Its outcome is a green full-history gate with no weakened detection for unclassified findings.
- Separate scanner remediation from product implementation. Do not mix ignore config into an unrelated feature PR.
- Record the controlled backlog delta immediately: native hierarchy, milestone/type counts, current unblocked task, and `STATUS.md` if the snapshot materially changed.
- Require exact immutable fingerprint suppression only. Forbid wildcard, path-wide, rule-wide, regex, entropy-threshold, or global detector allowances.
- Treat the ignore/config change as security-sensitive even if it changes no product code: RED→GREEN test, independent exact-snapshot review, merge readback, and post-merge current/history scans are mandatory.

## Evidence procedure

1. Freeze default-branch SHA and scanner commands.
2. Run current-tree and full-history scopes separately with redaction.
3. Classify each finding from immutable historical source. Record only safe metadata: commit, file, rule, line/fingerprint, and why the source is synthetic. Never print matched values.
4. Put raw reports only in profile-local scratch; never commit them or create verifier scratch inside the repository.
5. Add a fail-closed contract test before the ignore file. The test requires the exact ordered fingerprint set and rejects extra/missing/reordered entries plus broad forms.
6. Add only exact scanner fingerprints with short non-secret comments.
7. Run focused/full tests and both scanner scopes.
8. Prove the exception is narrow with a temporary deterministic high-entropy synthetic probe at a different fingerprint. Require nonzero scan exit and the expected rule/count, then remove probe/report with a trap/finally block and verify final scope.
9. Stage exact paths, record the staged tree/hash, and dispatch an independent reviewer that reproduces classification and the adversarial probe against that immutable snapshot.
10. After merge, rerun both scans on default branch and verify issue/PR closure.

## Pitfalls

- Redacted scanner output can obscure part of a fingerprint. Recover only from safe report metadata and documented fingerprint structure, then validate the reconstructed fingerprint in scratch; never reveal the matched value.
- Repeated-character probes may be too low-entropy to trigger. Derive a deterministic high-entropy alphanumeric payload and never report it.
- `set -e` can skip cleanup after an expected failing scan. Install cleanup before the scan and assert scratch/probe absence afterward.
- A green current-tree scan does not make a red history scan acceptable, and exact exceptions do not prove the underlying finding classification by themselves.

## Closure packet

Include immutable base/head/tree, classified count and safe metadata, RED reason, focused/full test counts, current/history scan results, adversarial probe exit/rule/count, exact changed paths, independent verdict, merge SHA, post-merge readback, and updated milestone counts/status.