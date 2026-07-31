# Fail-Closed Deterministic Local State Machines

Use this pattern for browser-local journeys, quizzes, onboarding, wizards, carts, or resumable workflows whose state is persisted in untrusted client storage.

## Core boundary

Treat restored state, constructor content, dependency outputs, and every public transition input as hostile. Deterministic ordering and happy-path tests do not establish state-machine integrity.

## Normalize immutable content once

At engine construction:

1. Require exact own-data record/array shapes; use `Reflect.ownKeys` and property descriptors so symbols, non-enumerables, accessors, custom prototypes, sparse arrays, and named array properties fail closed without invoking getters.
2. Validate finite cardinality before allocating or iterating.
3. Enforce unique IDs and semantic keys, one-to-one references, option cardinality/uniqueness, answer bounds, bounded strings, and URL policy.
4. Clone only validated own data, then deeply freeze the normalized graph.
5. Build one private lookup from the normalized graph. All ordering, scoring, feedback, and evidence projections must use it.
6. Return copied/frozen arrays so callers cannot mutate engine behavior through projections.

## Normalize persisted state centrally

Use one validator/normalizer for `start()` and every public method:

- exact identity tuple and valid local-day key;
- order equals the deterministic permutation recomputed from the persisted identity seed;
- answers are an exact prefix of order;
- selected indexes are bounded and `correct` plus score are recomputed from canonical content;
- status, phase, answer count, completion timestamp, and completion event form a legal state combination;
- completion event properties agree with identity and recomputed result band;
- notices and archive reasons come from finite enums;
- history records have exact keys and are sanitized before use.

On corrupt active state, start a clean attempt with explicit recovery notice; do not archive untrusted score/result data. Other public methods should return a safe no-op/null or a documented boundary error, never consume forged state.

## Bounded history and hostile arrays

- Cap retained history in every path, including identity-compatible resume.
- Sanitize from newest to oldest and retain at most the fixed bound.
- Bound how many hostile entries are inspected; a sparse array with a billion-length header must not trigger a billion-step loop or allocation.
- Reject array accessors and extra own properties.
- **Never read recovery history through ordinary property access or optional chaining after root validation fails.** Obtain root `history` only from an own data-property descriptor. While scanning an array, inspect each numeric index descriptor first and consume only its data `value`; `value[index]` invokes a hostile getter. Apply the same descriptor-first rule before nested history records and identities. Test root-field, index, record, and nested accessors separately and assert zero getter calls across `start()` plus every public state method.
- Treat exact array shape and sanitized cardinality as separate checks: an array can retain the same element count while carrying named properties, symbols, holes, or accessor indices. Return a clean reconstructed array whenever either shape or content was sanitized.
- Drop malformed records and duplicate retained idempotency keys.
- Archive only exact bounded result metadata.

## Injected dependency outputs

Eagerly require dependency functions, then validate every output at the point of use:

- local day: real `YYYY-MM-DD` calendar date;
- clock: real UTC ISO timestamp;
- event key: lowercase UUIDv4 or the project’s exact idempotency contract.

A missing dependency should fail at construction, not after the fifth transition.

## Retry-stable completion events

Create the completion key exactly once when the logical completion commits. Persist the **full bounded event envelope**—key, canonical event name, and exact validated properties—until acknowledgement. A retained key alone is collision evidence, not enough information to retry delivery. Reject malformed or reused keys before returning completed state, and seed collision detection from valid active plus retained events.

Use one shared fresh-key allocator for journey-start, per-step, and completion events so separate event classes cannot collide. Let it retry a small bounded number of malformed/colliding generator outputs; if it still fails, leave the state at the last valid transition rather than partially committing completion. Delivery failure must retain the exact logical event for retry; successful acknowledgement must be persisted before cleanup and must prevent later reloads from resending it.

Replay, reload, and day/version rollover must preserve every unresolved envelope. Prefer retrying retained envelopes before a rollover/replay transition. When history/outbox storage reaches its bound, remove acknowledged or nonpending metadata first; if every slot plus the active event is unresolved, apply explicit backpressure rather than evicting the oldest pending event. Test the saturation boundary (`limit` pending history records plus one pending active completion), then acknowledge one historical event and prove the blocked transition proceeds without losing any remaining key.

## Multi-entity completion evidence and retained-key ownership

When one persisted store can retain concurrent or historical journeys for several artists, accounts, documents, or other entities, never target completion by array position (for example, “the newest activation”). Treat the validated completion evidence as the selector:

1. Read the candidate entity identity descriptor-safely, locate the retained activation with that exact identity, then validate the complete closed evidence envelope against that activation.
2. Before mutation, reject an incoming external completion/idempotency key if it collides with any key already retained by another activation. Include activation, completion, and external-evidence keys in collision detection so a write cannot create a store that its own normalizer rejects on the next read.
3. If the selected activation is already completed, accept retry delivery only when the incoming evidence key exactly equals its retained external key. A different valid key is a different logical completion and must return false without persistence, delivery, or snapshot changes.
4. On every rejection, preserve the last valid serialized store byte-for-byte and emit nothing. Then prove recovery by completing with a fresh valid key.

Use three focused regressions: cross-entity key reuse is rejected and recoverable; an older/non-last retained entity completes correctly while the newest remains active; and same-key retry reuses the retained logical event while different-key retry is a mutation-free no-op. Capture storage bytes, public snapshot, and sink calls before the rejected transition rather than checking only its boolean result.

## Shared-storage serialization and async acknowledgement reconciliation

When multiple controller instances can share one injected storage object, serialize every mutating operation per storage-object identity in the same module realm (for example, a module-level `WeakMap` promise queue). Include sink awaits inside the serialized operation, swallow prior queue rejection before starting later work, and remove settled queue entries without creating an unhandled rejected cleanup promise. Keep snapshots read-only and safe during an in-flight delivery.

After an awaited sink response, never persist a pre-await whole-store snapshot. Reread and normalize current storage, locate the exact still-pending logical event by owner/key/name/properties, and change only its acknowledgement bit against that latest store. If the store is missing, malformed, changed, or already acknowledged, fail without writing. Test both shared-instance API overlap and a valid out-of-band storage update during the sink await.

Treat sink success as a closed trust boundary: only an exact ordinary data record with sole own key `ok` and value `true` acknowledges. Reject extra/symbol/non-enumerable keys, accessors without invoking them, null/custom prototypes, non-booleans, null, throws, and descriptor-fabricating Proxies; retain the same retry key in every rejection case. **Order validation boolean-first:** capture the sole own data descriptor once, immediately return unless the captured value is primitive `true`, and only then run any structured-clone/Proxy probe. Never clone or otherwise traverse a malformed `ok` graph: a direct/deep getter can run or block the serialized queue even when the response is ultimately rejected. Test direct and deeply nested getters, nested Proxies, and non-cloneable values (for example functions and `WeakMap`) with zero getter/trap calls; then return exact `{ok:true}` and prove the same pending key is retried and the queue remains usable. A standards structured-clone probe performed only after this boolean-first descriptor-safe validation can reject otherwise transparent top-level Proxies without invoking plain-object accessors.

## Authoritative storage write receipts

Never infer commit success by writing and then reading the value back. A synchronous write can commit and a subsequent read can throw or become unavailable, producing a false failure after an irreversible commit. That ambiguity can cause duplicate logical operations, suppressed delivery, or a caller retrying state that already exists.

Define the trusted storage adapter's write callable as an authoritative commit boundary:

- It performs the serialized write exactly once.
- It returns an exact ordinary data record `{ok: true}` only after the write commits.
- Every other return or throw contractually guarantees no commit.
- The state machine snapshots and validates the receipt once and performs no verification read inside the write path.
- Apply the same boolean-first inert-validation order as sink acknowledgements: after exact descriptor capture, require primitive `ok === true` before any clone/graph/Proxy probe. A malformed nested receipt must be rejected without traversing getters, Proxies, functions, or other non-cloneable values.
- Reject undefined, primitive false, `{ok:false}`, extra/symbol/non-enumerable keys, accessors without invocation, null/custom prototypes, and Proxy/stateful-Proxy receipts. Do not deliver events or claim a successful transition for any rejected receipt.
- A contradictory adapter that commits and reports failure is outside the trusted factory contract; document and reject it at the adapter-owner boundary because the state machine cannot infer rollback.

For a browser adapter, wrap synchronous `localStorage.setItem`: return a fresh exact `{ok:true}` only after `setItem` returns normally; if it throws, propagate or return no successful receipt. This contract is process-local commit acknowledgement, not cross-tab compare-and-swap, and must not be described as CAS.

TDD must cover both activation and completion writes. After the trusted commit, make every later read throw: the operation still returns success, persisted bytes contain the transition, and any optional pending-delivery pass may fail without retroactively erasing commit truth. Separately prove denied/throwing writes and every malformed receipt produce no persisted state claim and no sink call. Keep fakes contract-truthful: non-success receipt fixtures must not secretly commit; test contradictory adapters only as explicitly out-of-contract boundary cases.

## Replay and explicit restart transitions

Do not implement same-day replay in the controller with `start(null)` or a hand-built state object. That erases retained completion-key history and bypasses the engine's state authority.

- Add an explicit engine replay/restart transition available only from a valid completed state.
- Archive the completed attempt through the same bounded canonical history path with a finite `replay` reason, retained completion key, and the full event envelope whenever it is still unacknowledged.
- Recompute deterministic order from the unchanged identity/day; reset answers, score, and status atomically; preserve collision detection and retryability across reloads.
- At the controller boundary, call ordinary `start(store)` first so a day/version change takes the canonical rollover path; call replay only when the completed store remains identity-compatible.
- Reject double replay and replay from active/corrupt state as safe no-ops.
- Test same-day deterministic order, fresh activation event, no duplicate completion, retained prior completion key, reload collision safety, and day rollover while a result screen is open.

## Required hostile matrix

Prove RED then GREEN for:

- reordered/missing order entries;
- forged score, correctness, answer IDs, status, phase, notice, and completed-with-zero-answers;
- malformed/non-array/oversized/sparse/history-with-extra-properties;
- accessor-backed records with zero getter calls;
- duplicate IDs, concepts, references, options, and extra/unbound records;
- null/short options and out-of-range answer indexes;
- post-construction source mutation and projected-array mutation;
- missing dependencies and invalid day/time/key outputs;
- empty, malformed, and colliding completion keys after rollover;
- every result band and legitimate current/result state.

Run focused tests, the repository’s canonical suite, diff checks, and secret scanning. Independent review should replay attacks against the exact pushed commit, not trust test names or implementer claims.
