# Exact Gitleaks Fingerprint Suppressions

Use this when the current repository is clean but full-history Gitleaks remains red on independently verified synthetic test fixtures or deterministic non-secret identifiers.

The goal is not “make the scanner green.” The goal is to suppress only immutable known false-positive findings while proving every new finding still fails closed.

## Preconditions

Do not suppress until all are true:

1. Current-tree scan is clean.
2. Each historical finding is classified from redacted metadata: rule, file, line, and commit.
3. The exact historical source context proves a synthetic security fixture or non-secret deterministic identifier.
4. No runtime/config/secret-bearing file is involved.
5. Rotation/history rewrite is not required.

If the history scan reports VCS object/promisor errors, treat the result as invalid evidence. Refresh the repository object view and rerun before classifying findings.

## Safe evidence inspection

Prefer:

```bash
gitleaks dir --no-banner --redact=100 .
gitleaks git --no-banner --redact=100 --report-format json \
  --report-path <profile-local-scratch>/report.json --log-opts='--all' .
```

Read only rule/file/line/commit/fingerprint metadata. Do not print matched values.

If redaction masks part of a fingerprint, reconstruct only from the report's metadata fields using Gitleaks' fingerprint shape:

```text
<40-char commit>:<path>:<rule-id>:<start-line>
```

If a temporary unredacted report is unavoidable, keep it outside the repository, extract metadata without printing matches, and delete it immediately with verified cleanup.

## RED→GREEN contract

### RED

Add a focused test before `.gitleaksignore` exists. The test should require:

- exactly the approved fingerprints in deterministic order;
- exact 40-character commit IDs, paths, rule IDs, and numeric line suffixes;
- no duplicates;
- no wildcard, regex, path-wide, rule-wide, or extra entries.

Run the focused test and require failure for the absent ignore file—not syntax/test-construction error.

### GREEN

Add `.gitleaksignore` with comments plus only the exact fingerprints. Never use broad config allowlists merely because they are easier to maintain.

Rerun:

```bash
node --test <focused-test>
gitleaks dir --no-banner --redact=100 .
gitleaks git --no-banner --redact=100 --log-opts='--all' .
```

Both Gitleaks commands must exit zero.

## Prove the gate remains active

Temporarily create one new high-entropy synthetic credential-shaped value at a different fingerprint, run a redacted current-tree scan, and require:

- nonzero scanner exit;
- exactly one expected rule/file finding;
- no printed matched value.

Then remove the probe and report, verify cleanup, and rerun clean scans.

A repeated-character fake token may not trigger entropy-based rules. Use deterministic high-entropy synthetic bytes instead; the test is detector activation, not possession of a real credential.

## Review and landing

1. Stage only `.gitleaksignore` and its contract test.
2. Record the exact staged tree hash.
3. Require an independent reviewer to verify exact-tree identity, narrow fingerprints, clean scans, and the unsuppressed hostile probe.
4. Any edit after review invalidates the verdict.
5. After merge, rerun both Gitleaks modes on immutable main and verify issue/PR/main readback.
6. Update milestone counts and `STATUS.md` if the scanner gap was discovered during a parent-closure audit.

## Reject these shortcuts

- path-, commit-, rule-, regex-, or wildcard-wide suppression;
- disabling VCS/history scanning;
- lowering entropy or globally disabling a detector;
- altering hostile fixtures merely to evade Gitleaks;
- treating a redacted current-tree scan as proof that history is clean;
- accepting scanner output that also contains Git/object traversal errors;
- printing raw matches in issues, PRs, logs, or chat;
- closing the parent before the exact-fingerprint PR merges and immutable-main readback passes.
