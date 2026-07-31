# Concurrent Review Snapshot Discipline

Use this pattern when an independent reviewer will inspect generated UI, build output, screenshots, traces, or a repository while the parent may continue working.

## Freeze the review input

1. Finish generation, evidence capture, contact-sheet creation, and restoration before dispatch. A screenshot or report generated after freezing creates a new candidate.
2. Record the exact commit SHA plus staged/unstaged status. When no Git repository exists, construct a self-excluding SHA-256 manifest over the complete candidate file set, then separately pin the manifest digest and expected file count.
3. Copy only the review inputs to a uniquely named snapshot directory outside the repository (contracts, runnable site, assets, screenshots, machine evidence, and manifest). Do not point reviewers at the mutable source checkout merely because they promise not to edit it.
4. Verify every listed hash in the isolated snapshot, serve any runtime review URL from that snapshot, and make the snapshot recursively read-only where the platform permits. The live server and screenshots must resolve the same frozen bytes.
5. Keep reviewer reports outside the candidate manifest. Parallel reviewers may each write one uniquely named report into a separate review-output directory; their writes must not alter candidate identity or another reviewer’s evidence inventory.
6. Give every reviewer the isolated path, runtime URL, pinned manifest digest, expected file count, requirements, exact verdict vocabulary, explicit no-edit instructions, and a required before/after manifest replay.
7. Do not regenerate, build, restore, clean, stage, or otherwise mutate the shared checkout while a reviewer is reading it. If parallel work must continue, use a separate worktree or isolated clone.
8. Aggregate only verdicts bound to the same manifest. A timeout, missing after-check, wrong path, or stale manifest is an absent gate; retain useful findings as hypotheses and re-dispatch against the stable snapshot.

### Non-Git immutable snapshot receipt

For a file-based candidate, preserve this identity tuple together:

- absolute isolated snapshot path;
- manifest SHA-256;
- expected listed-file count;
- runtime URL served from the snapshot, when applicable;
- reviewer report destination outside the candidate;
- before-review and after-review exact hash closure.

Do not regenerate a missing manifest from the mutable source tree and call it the same candidate. Rebuild a fresh isolated snapshot with a new identity after all remediation is complete.

## Invalid review conditions

Treat repository/file observations as stale and re-run the review when:

- a build or generator ran concurrently in the same checkout;
- generated files were restored or cleaned while the reviewer was active;
- the review references a different SHA or dirty state than the intended candidate;
- screenshot state and inspected HTML came from different generations.

A reviewer can still supply useful design hypotheses in these cases, but the verdict is not candidate-bound evidence.

## Dynamic UI state matrix

Separate two evidence classes:

- **Production-truthful snapshot:** current reviewed inventory, including honest empty states.
- **Deterministic state fixtures:** populated, empty, error, fallback-image, and interactive states needed to prove component behavior.

Never fabricate a production item merely to satisfy a visual review. Demonstrate populated behavior with a fixed, source-valid fixture and keep production fail-closed. Label every screenshot as production-truthful or fixture-driven so reviewers do not infer catalog coverage from a component test.

### Fixture provenance and runtime fidelity

A visual fixture is credible only when it exercises the real publication boundary rather than hand-authored lookalike markup:

1. Select an existing source-backed moderation/fixture record; do not invent a headline, timestamp, source, or rights receipt.
2. Bind it to the intended entity through the production model and renderer at a fixed clock.
3. Record a small non-secret provenance manifest beside the screenshots: source record identifier/title, source URL, source timestamp, fixed clock, source SHA, route, and whether the state is production-truthful or fixture-only.
4. Load the production stylesheet **and production browser runtime** in standalone fixture pages. Otherwise placeholders such as local-time labels, Follow hydration, and delegated handlers can look broken even when production is correct.
5. Capture paired supported viewports plus machine evidence for HTTP status, horizontal overflow, minimum target size, focus visibility, image mode, current/empty state, and cross-origin requests.
6. Prefer intercepting or stubbing expected same-origin auth/analytics API calls in a static screenshot harness. If the harness cannot serve them, classify the resulting local 404/501 console messages explicitly as harness limitations; do not silently treat arbitrary console errors as acceptable.
7. Freeze rendered HTML, screenshots, and the manifest together before dispatching visual and copy reviewers. The server may be stopped afterward because reviewers should consume the frozen snapshot, not mutable live state.
