# Final-answer / Replay serialization remediation rereview

Use this when a browser journey renders a completed result and enables Replay before final-answer analytics and completion observation have settled.

## Contract to prove

A remediation must preserve this ordering for the original attempt:

`final question_answered` → `challenge_completed` acknowledged → downstream completion observed/accepted → replay `challenge_started`

Replay must not replace or archive the completed active record before downstream observation accepts the exact original completion key.

## Source audit

1. Identify the final-answer settlement from the first asynchronous delivery through completion observation.
2. Confirm only the completed/final answer publishes that settlement to Replay coordination; ordinary non-final answers must retain their direct path.
3. Require Replay single-flight protection before its first await.
4. Require Replay to await any active final-answer settlement, then revalidate generation, controller/engine/store existence, and completed status.
5. Before replacement, require pending shared delivery and downstream completion observation to succeed, with generation checks after every await.
6. Only after those checks may Replay call the existing engine's start/replay authority, persist, render, and send the new activation.
7. A downstream observer result other than primitive `true`, or a throw, must leave the completed record unchanged and retryable with the same completion key.
8. Closing or replacing the route must synchronously invalidate both the answer settlement and Replay; stale continuations must not persist, render, acknowledge, or start a replay.

## Minimal deterministic probe matrix

Run one focused integration file or equivalent external harness that proves:

- **Gated final answer:** block the fifth `question_answered`, invoke Replay after result markup appears, and verify the original store remains completed until the gate opens.
- **Exact order and identity:** after opening the gate, require fifth answer → shared completion → downstream completion → replay start, and require exactly one observation of the captured original completion key before replacement.
- **Observer retry:** use outcomes `false`, throw, then `true`; require unchanged persisted completed bytes after each failure, the same key on every attempt, one accepted shared completion, and replacement only after success.
- **Concurrent Replay:** invoke Replay twice while observation is blocked; require one operation to proceed, one to fail/defer, and one replay activation.
- **Close and replacement:** close the controller and separately open a replacement route while final-answer delivery is blocked; after settlement, require false/cancelled results, unchanged old-route storage bytes, no stale replay activation, and intact replacement DOM/state.
- **Close during observation:** block downstream completion observation, invoke Replay, close, then release; require no replay start and no post-close persistence/render.
- **Non-final regression:** complete ordinary answer/advance cycles and compatible reload to prove the coordination slot does not deadlock or suppress non-final progress.

Always inspect raw persisted bytes at the blocked boundaries, not only eventual state. A final state that looks correct after all promises settle can hide a crash-visible stale write.

## Evidence and reporting

Report:

- exact head/tree/parent/base identity;
- prior report digest verification;
- source line ranges for settlement publication, Replay waiting, post-await generation checks, and observer acceptance;
- accepted event names in order and the captured original completion key;
- false/throw/concurrency/close outcomes;
- focused test counts separately from reused broad-suite evidence;
- initial/final candidate diff digest and clean status;
- moving PR head/base at both start and end;
- final immutable report digest plus verified sidecar.

Do not claim the race resolved merely because Replay awaits one Promise. The proof requires key identity, retry liveness, single-flight behavior, cancellation at every await-to-side-effect edge, and an ordinary non-final regression.