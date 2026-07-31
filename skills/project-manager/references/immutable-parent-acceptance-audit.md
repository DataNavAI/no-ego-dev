# Immutable Parent Acceptance Audit

Use this procedure after the apparent final implementation merge, when deciding whether coordination parents/epics can close while later release QA may still be blocked.

## Purpose

Separate three kinds of truth that are often conflated:

1. **Implementation acceptance** — behavior and boundaries exist on immutable default-branch source and are covered by deterministic tests/review.
2. **Release-candidate acceptance** — the exact staged candidate passed every supported interface and production-like gate.
3. **Missing implementation** — a parent criterion names behavior that does not exist, even if neighboring component tests are green.

A blocked release gate does not automatically keep an implementation parent open after that gate has been durably moved to a later release milestone. Conversely, moving release QA must never hide a missing implementation criterion.

## Read-only audit procedure

1. **Pin immutable main**
   - Fetch the remote default branch into a fresh detached checkout.
   - Record both local `HEAD` and live remote-ref readback; they must match.
   - Record the exact full SHA and verify the checkout is clean.

2. **Read authorities before tests**
   - Read the audit issue, every parent/child body and relevant comments, merged PR bodies/commits, canonical CUJ/spec/contracts, supported-interface registry, durable QA runs, and milestone assignments/counts.
   - Re-read issue bodies at the end when concurrent planning may have reparented or retitled work during the audit.

3. **Build a criterion-level matrix**
   - Split compound parent bullets into independently decidable rows.
   - Use exactly:
     - `PASS`: implementation criterion is present and directly evidenced on immutable main.
     - `MISSING`: named behavior/coverage is absent or only asserted indirectly.
     - `MOVED_TO_<milestone>`: candidate/environment/interface gate was durably reparented; name the destination issue and prove it remains open/blocked when applicable.
   - Do not mark a whole criterion moved when only its supported-interface release layer moved. Split implementation coverage from candidate-bound interface coverage.

4. **Rerun current verification**
   - Run the repository's canonical verification command from the clean checkout.
   - Run focused tests for the parent acceptance surfaces.
   - Run diff/secret/public-boundary checks when required.
   - Independently inspect generated/binary evidence semantically (for PNG: safe filename, MIME, signature, chunk order/CRC, dimensions, size and checksum), not only by file existence.

5. **Search for absence, not just presence**
   - For every named CUJ, search runtime source and tests for its activation/completion events, route wiring, controller/reducer, value moment and recovery behavior.
   - A schema fixture containing an event name is not runtime emission.
   - Component-level Challenge/share coverage does not prove a sourced Learn → Challenge journey.
   - If a route still renders an unavailable placeholder and no browser orchestration/test reaches the named value moment, classify the CUJ implementation `MISSING`.

6. **Validate review and history evidence**
   - Confirm merge commits and PR evidence via the issue host/API, not comments alone.
   - Treat PR review claims as durable handles only when bound to exact candidate heads; independently rerun current-main checks.
   - Distinguish a clean PR review from full parent completeness.

7. **Recommend dependency-order closure**
   - Close only the deepest fully passing implementation parent first, then its parent.
   - Stop at the first parent with a `MISSING` row.
   - Draft a small child issue for the gap with outcome, scope, exclusions, dependencies, acceptance tests and closure evidence.
   - Keep the closeout audit and milestone open until the child lands and immutable-main audit is rerun.
   - State current and projected milestone open/closed counts.

8. **Preserve later release truth**
   - Name the later release milestone/epic and open QA issue.
   - Repeat that local or single-browser evidence is not staged supported-interface approval.
   - Do not close, waive or imply passage of the later release gate.

## Evidence packet

Include:

- exact default-branch SHA and commit URL;
- clean-checkout proof and canonical/focused command outputs with case counts;
- public-boundary, diff and secret-scan results;
- generated-artifact semantic inspection and checksum;
- parent-by-parent criterion matrix;
- merged PR/commit and issue/milestone URLs;
- current issue states and milestone counts;
- dependency-order closure recommendation;
- complete child-issue draft for every missing implementation outcome;
- explicit external-write statement.

## Common pitfalls

- **Closing from merged PR status.** Merged children can leave an explicit parent CUJ unimplemented.
- **Letting release QA swallow implementation gaps.** Candidate/browser QA cannot test a route or event that does not exist.
- **Treating contract-schema tests as journey tests.** Event-name parity proves taxonomy, not runtime emission or exactly-once behavior.
- **Treating Chromium viewport checks as all supported interfaces.** Preserve truthful staged candidate and browser/version blockers.
- **Using stale issue hierarchy.** Re-read bodies, milestones and counts immediately before recommendations.
- **Over-broad follow-up child.** Draft the smallest missing journey/integration outcome; do not reopen already-passing compiler, engine, result or share work.
