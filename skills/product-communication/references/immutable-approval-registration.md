# Immutable one-comment approval registration

Use this procedure when an approval, review, or readiness decision must be registered with exactly one GitHub issue comment while all issue fields remain unchanged. Registration records an existing decision; it does not enlarge the decision-maker's authority or substitute for other release gates.

## Procedure

1. Read the live issue, all comments, and the exact source comment or artifact through the API.
2. Hash exact UTF-8 bodies from API readback, not rendered Markdown or copied terminal text.
3. Freeze a unique HTML marker such as `<!-- CLASS-DECISION-YYYY-MM-DD -->`.
4. Capture protected issue fields: title, body, state/reason, labels, milestone, assignees, and lock status.
5. Build the outbound body with immutable input hashes, decision/state, and an explicit authority disclaimer; freeze its exact UTF-8 hash before mutation.
6. Scan the exact body for secrets, private paths or usernames, `file://` URLs, and credential prefixes.
7. Immediately before posting, re-fetch the source decision, the issue, and the complete comment collection with explicit pagination. Recompute every frozen body hash, compare every protected field, and fail closed on any drift or if the marker exists anywhere in the fully paginated set.
8. Perform the single comment POST.
9. Read back by comment ID, hash the exact API body, and require equality with the frozen outbound-body hash.
10. Re-fetch the complete comment collection with explicit pagination. Require exactly one global marker occurrence and the baseline comment count plus one.
11. Re-fetch the issue and compare protected fields to baseline. Only comment count and `updated_at` should change.
12. Write any local registration report through a same-directory temporary file and atomic rename.

## Focused verification without a canonical suite

Create the verifier directly with `tempfile.NamedTemporaryFile(prefix="hermes-verify-", dir=<required-temp-root>, delete=False)`. Avoid creating or editing an intermediate verifier elsewhere because changed-path tracking may retain that path after cleanup. Verify final-report presence, staging-file absence, exact hashes, unique marker, authority disclaimer, and unchanged protected issue fields. Run it, remove it in `finally`, and report it as **ad-hoc verification**, never “suite green.”

## Fail closed

- **Existing marker:** do not post or edit; return its URL.
- **Input or body hash drift:** stop before mutation.
- **Posted-body mismatch or duplicate marker:** report it; do not add a corrective second comment without authority.
- **Protected issue-field drift:** report it; do not silently restore fields because that exceeds the one-comment mutation boundary.