# Generated-web candidate review and staging lessons

Apply this companion note when source/data contract changes affect generated static output before an immutable candidate is built.

## Pre-candidate gate

1. Record focused RED, apply the smallest fail-closed change, and obtain focused GREEN.
2. Run the complete feature suite, then the canonical project suite. Provenance/schema changes commonly break secondary metadata and reference tests outside the focused file.
3. Run browser/interface verification for rendered semantics, accessibility, navigation order, source actions, or responsive changes.
4. Restore tracked generated output and remove only untracked generated paths before staging.
5. Stage an explicit file allowlist; verify `git diff --cached --check`, exact staged names, and absence of unstaged source changes.
6. Run one composite independent review against that exact cached diff or one immutable SHA. Add a specialist only when predeclared for a non-overlapping high-risk expertise gap. Do not edit source while authorized review is in flight.
7. Pending asynchronous reviews are not approvals. Do not commit, build once, record a digest, or deploy until their verdicts are received and checked.

## Exact-shape migration pitfalls

- Update every direct valid fixture when a receipt becomes mandatory; helper updates alone are insufficient.
- Follow the value through downstream projection gates. Adding a field to an intermediate object may cause a narrower exact-shape publication gate to reject it. Preserve the narrow projection unless migrating that gate intentionally.
- Update secondary metadata/reference tests after reviewed wording or fixture shape changes.
- Accessibility additions such as optional `aria-label` can break brittle exact-tag regexes. Prefer semantic parsers; otherwise allow the safe optional attribute while keeping href/action/type assertions exact.
- Keep screenshot-only populated states outside production data, derive them from reviewed inventory, and bind them to a fixed clock.

## Required evidence

Retain focused RED/GREEN, full feature/canonical/browser totals, exact staged scope, independent verdicts, source SHA, one-time artifact digest, same-digest staging identity, URL, health, and readiness output.
