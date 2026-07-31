# Browser loader snapshot and retry-state audit

Use this for browser controllers that accept asynchronously loaded, schema-validated releases and persist idempotent analytics events.

## 1. Validated snapshot closure

A validation call is not sufficient if production rereads the loader envelope afterward. Stateful accessors or proxies can return canonical bytes during validation and substituted bytes during selection/rendering.

Audit the complete sequence:

1. Anchor the validation contract independently from the loaded release. If release bytes and schema bytes come from the same origin, verify the schema against a build-pinned digest or embed the closed validator; fetching both without an external anchor lets one bad deployment loosen both together.
2. Bound response bytes while streaming, before `Response.text()`/JSON parsing; reject redirects, wrong media type, declared oversize, and actual streamed oversize.
3. Prefer a primitive handoff across trust layers: after the browser loader verifies the anchored schema and validates the response, pass bounded canonical JSON text to the controller rather than a caller-owned object graph.
4. In the controller, require a string, parse exactly once, deeply freeze the JSON graph, validate that same immutable graph, and use it exclusively for selection, state construction, and rendering.
5. If an object envelope is unavoidable, read it through own-data descriptors, require a closed shape/plain prototype, reconstruct one immutable snapshot, and never reread the original envelope.
6. Convert every malformed/throwing loader shape into the specified unavailable/noindex state; do not leave an unhandled rejection or stale indexable shell.
7. Exercise the outermost boot/catch path separately from controller-local failure paths. A generic recovery renderer can show “Content unavailable” yet omit the robots update performed by the controller. Force an early dependency failure (for example, a throwing storage getter), inspect the document head, and require `meta[name="robots"][content="noindex"]` whenever unavailable recovery is rendered.

The primitive JSON-text boundary is usually simpler and stronger than attempting to safely reflect over an arbitrary Proxy. It also makes explicit which layer owns authorization/schema trust and which layer owns journey behavior.

**Async Proxy nuance:** Promise resolution performs thenable assimilation. If an `async` loader returns a Proxy, the runtime may invoke `get("then")` before the caller's `await` receives the value. Do not misclassify that unavoidable boundary read as a controller domain-field read, and do not assert zero total Proxy traps across an async handoff. Instead record trap keys and require that only `then` may be touched before fail-closed rejection; require zero reads of release/authorization/domain fields, unavailable/noindex output, and no attacker bytes rendered. Use a non-thenable accessor-backed object or a synchronous snapshot helper when the contract genuinely promises zero getter calls.

Adversarial probes:

- `ok`, authorization, and release as throwing getters; require zero getter calls where descriptor rejection is promised.
- A release accessor that returns valid bytes on the validation read and different bytes on later reads; assert the sentinel is never rendered.
- Stateful proxies whose descriptors/read results change; require rejection or one coherent immutable snapshot.
- For every async dependency result used as an acknowledgement (for example `{ ok: true }`), enforce the documented result contract rather than testing only one property. Probe extra own keys, symbols, accessors, null/custom prototypes, and a Proxy that fabricates an `ok` data descriptor. A malformed response must retain the full pending envelope; accepting it can permanently suppress retry after a response the dependency never contractually produced.
- A valid baseline first, so harness failure cannot masquerade as fail-closed behavior.

A common vulnerable shape is:

```js
validateRelease(loaded.release);
if (loaded.ok && loaded.release.releaseId === expected) {
  render(loaded.release.artists);
}
```

The correction is not merely storing one more local variable if that variable still contains a hostile mutable graph. Freeze or reconstruct one strict descriptor-validated snapshot and use it exclusively.

## 2. Retry closure across lifecycle transitions

Exactly-once logical events need both a stable idempotency key and a retryable payload until acknowledgement. Retaining only the key prevents collision but does not permit recovery after a failed delivery.

Build a transition matrix for every pending event:

| Transition | Required pending-event behavior |
|---|---|
| Reload/resume | retry same envelope and key |
| Replay/reset | archive or queue the full unacknowledged envelope; do not discard it |
| Day/version rollover | preserve retryability independently of the new active attempt |
| Successful acknowledgement | persist acknowledgement before later cleanup |
| Storage failure | retain in memory; server-side key dedupe must tolerate a later resend |
| Bounded-history eviction | never evict an unresolved envelope; drop acknowledged/nonpending metadata first, or apply explicit backpressure when every retained slot is pending |

Distinguish **delivery-pending** from **journey-unresolved**. An acknowledged activation can still be awaiting a valid future completion, so `activation acknowledged && completion absent` is not automatically disposable metadata. For bounded activation stores, fill the store with acknowledged-but-incomplete activations, add one more, then submit valid completion evidence for the oldest activation. Require either explicit backpressure before eviction or successful completion of that retained activation; silently evicting it loses a legitimate journey even though no network event was pending.

Retry retained envelopes before replay/day/version rollover when possible, then run the canonical transition against the acknowledged store. If delivery still fails and the bounded outbox is full, fail or defer the transition rather than silently discarding the oldest logical event. Add a saturation probe with `historyLimit` pending records plus one pending active completion: the transition must preserve every key; after acknowledging one historical envelope, the same transition should proceed and remove only nonpending metadata.

Probe with a transport that returns failure for each contractually durable event class, not only completion:

1. Begin an activation and capture its pending activation key.
2. Fail or ambiguously lose the activation response, recreate the controller, and require retry of the exact activation envelope and key rather than a fresh key.
3. Complete an activation and capture its pending completion key.
4. Trigger replay, reload, day rollover, and version rollover independently.
5. Recreate the controller from persisted storage.
6. Require one retry using the original key and exact payload.
7. Return success, reload again, and require zero further sends.

Inspect the full persisted representation. A history row containing only `completionEventKey` is collision evidence, not retry evidence. A transient `sendNamed('activation', freshKey())` call with no durable pending envelope similarly does not satisfy lost-response retry semantics.

Probe duplicate normalization as an adversarial ordering problem. Create two retained records with the same logical event key: one full unacknowledged envelope and one newer legacy/key-only row. Normalization must preserve the retryable full envelope or reject the ambiguous store; a newest-first duplicate filter must not let the key-only row shadow and erase retry evidence. Also vary malformed full envelopes versus key-only legacy rows, and never infer acknowledgement merely from an absent payload. Report retained keys, envelope presence, and pending-send keys explicitly.

Probe history bounding as a selection problem, not only a length assertion. Construct `limit + 1` valid rows with the oldest row carrying a full unresolved envelope and every newer row acknowledged or key-only. A newest-first loop that stops after collecting `limit` rows can discard the unresolved oldest row without ever inspecting it. Require normalization to scan the complete accepted input window, retain every unresolved envelope, and evict acknowledged metadata first; if unresolved rows exceed capacity, require explicit backpressure rather than truncation.

### Collision closure after reload

Collision protection must include every retained event key, not only pending events and history metadata. Start and acknowledge an activation, persist the acknowledged active record, recreate the controller with a generator that returns that same key, and emit a different event class such as `question_answered`. Require rejection or retry to a fresh key. Audit controller-level and engine-level key sets separately: an engine may seed acknowledged active keys correctly while a controller's generic sender seeds only pending/history keys. Report the colliding key and both event names to demonstrate the server's same-key/different-body conflict consequence.

### Async acknowledgement versus concurrent state mutation

Any `await transport(envelope)` followed by persistence of an acknowledgement derived from the pre-await store is a stale-write risk, even when the server correctly deduplicates the event key. Probe two overlapping public operations against one injected storage instance:

1. Let operation A persist activation A and block while sending it.
2. Start operation B, let it persist activation B, and block while it retries or sends pending work.
3. Resolve A first and inspect raw storage before resolving B.
4. Require activation B and every newer pending envelope to remain present at every persisted boundary—not merely in the eventual final state.
5. Simulate reload/crash from that intermediate raw value; a later stale operation cannot be relied upon to restore data after process loss.

A final store that becomes correct only after every blocked promise settles still violates durability if an intermediate persisted snapshot drops newer state. Fix with serialized transitions, compare-and-swap/version checks, or reread-and-reconcile before acknowledgement persistence.

### Render-before-ack interleaving

Also probe controller methods whose synchronous prefix mutates and renders state before their first `await`. JavaScript runs that prefix immediately, so a newly rendered Replay/Reset/Next control can be clicked while the prior event send is unresolved.

A deterministic reproducer is:

1. Let the first four answers settle normally.
2. On the fifth answer, block the `question_answered` transport promise.
3. Confirm the controller has synchronously rendered the completed result and enabled Replay.
4. Invoke Replay before resolving the blocked promise.
5. Resolve the blocked send and inspect sent events plus persisted state.
6. Require the completion to have been sent once or remain as a full retryable envelope. A history row retaining only its key is a lost completion.

Repeat the pattern for every control exposed before durable acknowledgement. The robust design captures the pending envelope in a stable outbox/local variable before rendering, and replay/reset transitions preserve unresolved envelopes independently of the active attempt.

### Route-close cancellation after every await

A generation check immediately after release loading does not close the route-race contract. Restored pending-event delivery, replay/reset retry, persistence adapters, or any later asynchronous boundary can suspend the old controller after navigation has closed it. When the promise settles, stale code may persist state, change robots metadata, rewire controls, or overwrite the new route.

Audit cancellation as a property of **every await-to-side-effect edge**:

1. Enumerate all `await` points in open/start, replay/reset, answer/advance, and recovery paths.
2. For each await followed by persistence, rendering, metadata changes, or listener installation, require a generation/abort check after the await and before the first side effect.
3. Ensure `close()` invalidates the generation or abort signal synchronously.
4. Do not accept a check only after the first loader await as proof of complete route-race closure.

Deterministic restored-outbox reproducer:

1. Persist a valid active record with an unacknowledged durable event.
2. Recreate the controller and block the transport promise while startup retries that event.
3. Wait until the transport has been entered, call `close()`, and replace the root with a sentinel representing the new route.
4. Resolve the blocked transport.
5. Require the opening operation to return `cancelled` (or the specified closed result), the controller to remain closed, the sentinel markup to remain byte-identical, and no post-close persistence, robots update, render, or control wiring.
6. Repeat through replay/reset when those methods retry pending events before mutating state.

A passing “close during release load” test covers only one suspension point. It does not cover restored-outbox startup or replay waits, which commonly occur after the sole generation check.

## 3. Reporting

Ground findings with:

- source line ranges for the reread or event-loss transition;
- probe output showing rendered sentinel/unhandled rejection or missing retry;
- the violated contract consequence;
- canonical-suite results separately, since green happy-path tests do not neutralize adversarial failures.
