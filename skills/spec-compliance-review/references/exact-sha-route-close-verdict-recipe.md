# Exact-SHA route-close merge-gate recipe

Use this when a PR's final fix claims to cancel stale asynchronous controller work after route close, especially around durable event delivery.

## Frozen candidate layout

Keep the shared checkout untouched. Retrieve the authoritative exact-SHA and base archives into a reviewer-owned temporary root and use separate copies:

- `head/`: pristine source snapshot for inspection and identity checks;
- `base/`: exact PR base for cumulative comparison;
- `run/`: disposable copy for canonical build/verification commands;
- `focused/`: disposable copy for appended adversarial tests.

Verify the archive identity rather than trusting its filename:

1. Query host metadata for commit SHA, parent SHA, and tree SHA.
2. Initialize a temporary Git object database around a copy of `head/`, stage every archived path, and require `git write-tree` to equal the host-reported tree SHA.
3. Bind revision-sensitive builds explicitly, for example `BUILD_REVISION=<exact-sha>`.
4. After verification, compare a deterministic hash of all source files in `head/` with `run/` excluding generated output. This proves canonical commands changed only disposable generated artifacts.
5. Query the PR head again before verdict. If it moved, keep the exact-SHA result separate from any current-head verdict.

## Cancellation probe harness

A useful deterministic harness has:

- a deferred transport promise with explicit `started`, `resolve`, and `reject` controls;
- instrumented storage that records raw key/value bytes and write count;
- a fake document/root whose replacement-route markup is a byte-exact sentinel;
- a robots/noindex call log;
- an operation result assertion (`cancelled` or the contract's false/closed result).

At each targeted await boundary:

1. Start the operation and wait until the transport has definitely been entered.
2. Capture raw persisted entries, storage write count, robots-call count, and current sent-event list.
3. Call `close()` synchronously.
4. Install exact replacement-route markup.
5. Resolve **and separately reject** the blocked promise in different cases.
6. Await the stale operation and one additional microtask turn.
7. Require closed state, byte-identical replacement markup, byte-identical persisted entries, unchanged write count, unchanged robots-call count, no blocked-event acknowledgement, and no subsequent send.

Do not test only the first loader await. Cover:

- **direct reopen without an explicit prior `close()`**: complete route A, block route B's loader, call `open(B)`, and immediately invoke every completion-only action. The controller must synchronously invalidate route A's `state`, entity, engine/store, controls, and operation eligibility before the first await. Incrementing a generation counter alone is insufficient when a new action can capture that new generation while still reading route A's completed state. Require no stale share/copy/download, no old-entity analytics, and no mutation while B is loading;
- restored pending-event delivery before `start()`;
- newly created activation delivery after `start()`;
- transient per-answer event delivery before durable completion retry;
- replay's pre-transition retained-event delivery;
- replay's post-transition activation delivery;
- every position in a multi-pending outbox, not only its first item;
- late fulfillment and late rejection/catch paths.

For a multi-pending outbox, construct a valid persisted state with several unresolved durable envelopes. Repeat the probe while blocking index 0, 1, ... N-1, allowing earlier sends to acknowledge before the blocked boundary. Capture the preservation baseline only after the selected send blocks; earlier permitted acknowledgements are not post-close mutations.

## Evidence and verdict

Report separately:

- immutable identity: reviewed SHA, computed/expected tree, base SHA, and final PR-head recheck;
- fresh canonical results and focused/adversarial counts;
- technical blockers;
- administrative gates such as draft state, absent CI, or review policy;
- publication/launch gates that are intentionally out of scope for code merge.

A technically passing exact SHA can still be administratively unmergeable or intentionally non-publishable. Do not collapse those into a false implementation failure, and do not hide them behind a bare PASS.

Remove all archives, temporary Git databases, generated copies, and appended probe files after recording results.