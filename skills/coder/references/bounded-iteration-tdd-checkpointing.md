# Interruption-safe TDD checkpointing

Use this when a coding session has a hard tool-call/iteration budget, the user requires a pushed artifact, or several RED→GREEN slices remain.

## Rule

A verified GREEN state is a recovery boundary. Do not spend the remaining budget on a broad refactor while that state exists only in the working tree.

## Workflow

1. Establish and push the exact baseline branch before editing.
2. For each vertical slice:
   - add one behavioral test;
   - run it and record the intended RED failure;
   - implement the smallest production change;
   - run the focused GREEN test;
   - run the relevant package suite.
3. After a coherent GREEN slice, inspect scope, commit exact files, and push immediately. **Do this before starting an adjacent cross-cutting slice** such as browser adapters, build-graph integration, packaging, screenshots, or PR narration; those optional/later slices must not consume the budget needed to preserve already-green behavior.
4. **Complete the checkpoint before expanding scope:** when the user requested a draft PR or early checkpoint, open/update the draft PR immediately after that push. PR creation is part of the checkpoint, not an end-of-session cleanup task. Record the remotely recoverable SHA and concise RED/GREEN evidence in the PR.
5. Confirm the remote branch and draft PR are both recoverable, then continue to the next slice.
6. Only begin a contract-shape or build-graph refactor when enough budget remains to finish it, rerun focused plus canonical verification, commit, push, and refresh the PR. If behavior is green but build integration remains RED, preserve the behavior commit first and report build integration as the next incomplete slice.
7. If budget becomes tight, stop at the pushed GREEN boundary. Revert or finish any unverified post-checkpoint edits before stopping; do not leave a half-migrated API/fixture shape as the apparent deliverable.
8. A runtime may label the worker `completed` after it reaches a hard tool-call ceiling and emits a summary. That label does not make isolated uncommitted files durable. The authoritative deliverable is the remote branch/PR; classify any self-reported post-checkpoint work that cannot be recovered from a shared workspace as unverified and missing, then resume from the last pushed SHA.

## Tool-call budget discipline

- Reserve calls up front for canonical verification, final commit/push, draft-PR update, and remote-state confirmation.
- Batch independent reads and verification commands. Use one well-contextualized multi-file patch for a coherent edit when practical instead of spending one call per tiny replacement.
- Treat a failed fuzzy/multi-hunk patch as a signal to re-read the exact region and submit one corrected contextual patch; avoid a long sequence of speculative micro-patches.
- If the remaining budget cannot cover implementation **and** verification **and** remote publication, publish the current verified slice and update the draft PR before starting more work.

## Contract-aligned fixture design

Before the first test commit, map the test seam to the committed executable schema. Synthetic values belong under tests, but their container shape should mirror the production contract (for example, artist identity + challenge pack + claims) unless the test intentionally exercises an adapter. This avoids a late fixture/API reshaping refactor after behavior is already green.

## Verification and reporting

- Treat only pushed SHAs as remotely recoverable.
- Distinguish pushed/verified behavior from uncommitted local work.
- Run the canonical repository command verbatim before finalizing; focused tests are RED→GREEN evidence, not full verification.
- If interrupted mid-refactor, report the last pushed GREEN SHA and explicitly mark the local tree unverified. Resume by either completing or reverting the refactor before adding behavior.
