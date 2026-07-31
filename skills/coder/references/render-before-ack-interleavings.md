# Render-Before-Acknowledgement Interaction Races

Use this pattern when an async UI/state machine renders Replay, Reset, Retry, Navigate, or another replacement action before final transport, acknowledgement, persistence, or downstream observation settles. It applies to quizzes, uploads, payments, publication, onboarding, and similar resumable workflows.

## Failure shape

Sequential tests miss this interleaving:

1. The final action persists and renders `completed`.
2. Final transport is still awaiting one or more sinks.
3. The visible competing control starts immediately.
4. It acknowledges or archives the old completion and replaces the active record.
5. The original finalizer resumes and reads the *new* active record, so the original completion is never observed.

An “already observed” key set cannot repair this because the original key was never inserted. Archiving only the key is also insufficient when no later observer path reads archived completions.

During immutable review, keep the deterministic probe outside the repository. During remediation, convert the smallest reproducer into a repository regression and capture genuine RED before production edits.

## Ownership model

Use two independent ownership seams when Replay/Restart can replace a completed record:

- **Completion settlement promise:** the final action publishes one promise covering final-action delivery, retained completion delivery/acknowledgement, and downstream observation. The competing action awaits that exact promise before replacement.
- **Replacement single-flight token:** only one Replay/Reset operation may wait, observe, archive, and start a successor. Reject duplicates immediately rather than allowing parallel observation of one key.

Publish ownership synchronously before the first externally re-entrant `await`. Clear it in `finally`, and only when the token/promise is still the active one. Do not rely on disabling a button alone; programmatic calls, delegated handlers, and stale DOM events can overlap.

## Required replacement gate

After every relevant await and before replacement, re-check:

1. route/generation ownership is current;
2. controller, engine, and store still exist;
3. the same active attempt remains completed;
4. retained completion delivery is authoritatively acknowledged;
5. downstream observation of the exact original key returned primitive `true`.

Only then archive/replace and emit the successor activation.

If observation returns false, a malformed value, or throws:

- return non-success;
- retain completed storage byte-for-byte;
- emit no successor activation;
- do not mark the key observed;
- retry later with the same original completion key.

Once observation returns primitive `true`, suppress later observer calls for that key while still allowing replacement to proceed.

An acknowledgement guard alone is insufficient when the competing action can deliver completion before an earlier required event settles. Validate the full accepted-order chain.

## Delivery outcome and generation cancellation

Do not let a pending-event sender collapse transport truth and ownership truth into one boolean. Return or preserve three distinct outcomes:

- `delivered`: every retained predecessor was accepted and acknowledged;
- `pending`: ownership is still current, but at least one retained event was not accepted;
- `cancelled`: route/generation ownership changed while work was in flight.

Ordinary answer/open flows may remain usable after `pending`; they must not misreport that as cancellation. Replacement actions are stricter: Replay/Reset may replace a completion only after `delivered`, followed by primitive-`true` observation of that exact acknowledged completion. An unacknowledged or absent completion is not already observed and must return non-success without changing persisted bytes.

Checks before an await are not enough. Check again after final-action delivery, retained-event delivery, downstream observation, and every wait before persistence, render, archive, or activation.

Close and route replacement must invalidate operation ownership. They must also detach the obsolete completion-settlement reference synchronously, before any route-loading await, so Replay on a restored completed successor never waits for predecessor-route I/O. Keep generation guards inside the stale task, and use identity-checked `finally` cleanup so stale settlement cannot clear a newer route's ownership. Cancelled work must not persist, render, archive, observe, or start retained-event sends after ownership changes.

## Deterministic RED→GREEN tests

Use deferred promises, not timers.

### Final-action/Replay race

1. Complete all but the final step normally.
2. Gate the final action's transport response after the completed result renders.
3. Start finalization, wait one event-loop turn, then invoke Replay without awaiting it.
4. Before releasing the gate, assert the active record remains completed and no completion or successor activation has been accepted.
5. Release the gate and assert exact **accepted** order, for example:
   `final_action` → `upstream_completed` → `downstream_completed` → `replay_started`.
6. Assert the observer received the original retained key exactly once and history archived that same key.

Do not await Replay before releasing the gate: a correct implementation intentionally blocks it and the test will deadlock.

### Retryability

Drive observer outcomes `[false, throw, true]` across finalization and retries. Assert every attempt uses the same original key, upstream logical completion is accepted once, failed attempts preserve completed storage byte-for-byte, and only success starts the successor.

### Pending delivery versus cancellation

Reject the retained completion on the final action and again on the first Replay attempt, then accept it on the next Replay. Assert the final answer remains a usable success, the first Replay returns non-success without replacing or observing, storage remains byte-identical, and the successful retry accepts and observes the original completion exactly once before one successor activation. This catches boolean helpers that report only “generation is current” after delivery failed.

### Cross-route settlement detachment

Pre-complete route B, gate route A's final-action sink indefinitely, then open the restored completed route B and invoke Replay. Race Replay against one event-loop turn: it must settle successfully before route A's gate is released. After releasing stale route A, assert its finalizer reports cancellation and route B's persisted bytes, rendered output, observer calls, and attempted sends do not change. Record attempted sends before awaiting the gate so the test distinguishes an already-started request from forbidden new post-cancellation work.

### Concurrent replacement

After an initial retryable observation failure, gate the next observation and invoke Replay/Reset twice. Release it and assert one succeeds, the duplicate fails, only one observer was in flight, and exactly one activation was accepted.

### Cancellation matrix

Gate both representative boundaries:

- final-action delivery;
- downstream observation.

While replacement waits, close the controller or open another route. Release the gate and assert finalization/replacement report cancellation, completed storage is not replaced, no stale activation is accepted, and replacement UI/state remains authoritative.

## Verification checklist

- Exact accepted order is asserted separately from attempted calls.
- Delivery distinguishes `delivered`, `pending`, and `cancelled`; only `delivered` permits replacement.
- Observation uses the original immutable key, not whichever record is active later.
- Unacknowledged or absent completion is non-success, never implicit observation success.
- False/throw is retryable and non-writing.
- Primitive `true` is exactly-once within the controller.
- Concurrent Replay/Reset yields one observer and one successor.
- Open/close detach stale completion settlement synchronously while stale tasks retain generation guards.
- Close and route replacement cancel stale work after every await boundary.
- The real controller/state/analytics integration is used where practical.
- Focused RED failures are reported, then focused, canonical test, bare build, diff, and secret-scan evidence is refreshed.
