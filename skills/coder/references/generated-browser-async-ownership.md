# Generated browser runtime: async ownership and persistence analytics

Use this reference when a generated client module combines session hydration, direct authentication, sign-out, Follow/save mutations, personalized home loading, SPA navigation, one-shot URL intents, and canonical analytics.

## 1. Inventory every asynchronous writer before implementation

List each operation that can write shared state or visible UI:

| Operation class | Typical commits |
|---|---|
| boot/session | signed-in truth, user, follows, render, analytics readiness |
| direct auth/sign-out | identity, follows, status/toast, home refresh, analytics |
| follow/save mutation | server-authoritative list, button/render state, completion event |
| personalized home | cards, empty/error state, render event |
| SPA navigation | DOM, metadata, history, URL, loading state, page-view event |

Do not harden only the reported race. Review the complete inventory once and assign ownership semantics to every writer.

## 2. Use explicit last-started ownership

- Use one shared monotonic epoch for identity-changing operations: boot session, login/signup, and sign-out.
- A new identity operation invalidates all older identity/hydration work immediately, before its first network request.
- Use separate monotonic owners for independent classes such as navigation, direct follow mutation, and home loading.
- A follow operation captures both its own operation ID and the current identity epoch. It may commit only while both still match.
- A home request owns a home epoch and, when launched for an auth/follow flow, optionally captures the identity epoch too.
- SPA navigation captures a navigation epoch. Only the current navigation may replace DOM/metadata/history, emit navigation analytics, clear shared loading state, or fall back to `location.href`.

Check ownership after every `await` and immediately before every shared-state, DOM, history, toast/status, or analytics commit. Validation and JSON parsing are asynchronous boundaries too.

### Invalidate old callable state before the first await

An epoch checked only after the loader resolves does not stop the previous entity/result/session from remaining actionable while the replacement load is pending. For every direct route/entity/account/session reopen:

1. Increment the generation and invalidate the active action token synchronously.
2. Clear old identity-bearing controller state (current entity, model/engine/store, persistence key, result, recovery notice) before calling the loader.
3. Enter an explicit non-actionable `loading` state and replace stale controls/content with a neutral loading surface.
4. Install the new identity and re-enable actions only after current-generation validation succeeds.

Add a deferred-loader regression: complete entity A, start direct open of entity B, then invoke every old share/save/copy/download/submit action before resolving B. Require a false/no-op result, no A action or analytics, null current result, and neutral loading UI; after B resolves, prove only B is active. Repeat reopen/close while event, native action, download, copy, and completion awaits are blocked. An old operation's `finally` must compare its operation token before releasing a lock so it cannot clear a newer operation's lock.

## 3. Stale success, failure, and cleanup are all silent

A stale result must be a complete no-op:

- no state rollback or replacement;
- no error status/toast;
- no success event;
- no stale home refresh;
- no redirect fallback;
- no shared loading-state cleanup.

A common bug is checking ownership in the success path but still rethrowing a stale error into a delegated `.catch(...)`. In operation-local `catch`, return silently when ownership is lost. Only the current owner may rethrow or publish failure UX.

Button-local cleanup can clear that button's own busy state, but must not re-render global state from a stale snapshot.

## 4. Analytics readiness must follow the winning identity operation

Canonical first-view analytics often waits for session truth. If direct auth or sign-out supersedes boot hydration:

- the winning successful operation releases readiness with its authoritative `signed_in` value;
- an owning failed auth/sign-out also releases readiness with the current truthful state before propagating its error;
- superseded success/failure never releases readiness;
- the readiness initializer remains idempotent so one page/navigation emits once.

Test the failure case explicitly: deferred boot, current login fails, then stale boot resolves. Exactly one truthful profile view should still be emitted.

## 5. Treat server state as authoritative and cache as best effort

- Start active auth/follow state as signed out with an empty collection; do not render unbound account data from local storage.
- After server authentication, clear active account-scoped state before hydration can fail.
- Install only bounded, canonical, validated server responses.
- Successful mutation responses must prove the requested transition: PUT includes the entity; DELETE excludes it.
- Update authoritative in-memory state first. Local persistence follows in a contained best-effort block.
- A hydration failure may preserve signed-in truth, but must show empty/known-safe account-scoped state and explicit partial-success UX.

## 6. Consume one-shot intents only after fulfillment

For query/local-storage intents such as `?follow=`:

- consume only after a validated successful mutation or when authoritative hydration proves it is already satisfied;
- retain intent after failure;
- remove only the relevant query parameter with same-origin `history.replaceState`, preserving path, unrelated parameters, and hash;
- ensure a later unfollow plus reauthentication on the same page cannot replay the old intent.

## 7. Emit persistence analytics at the authoritative boundary

For activation/completion events:

- emit only after the server response is validated and the operation still owns state;
- no event on optimistic click, failed/malformed/contradictory response, DELETE, already-satisfied intent, or superseded completion;
- use the canonical sender so required common properties, exact event-specific properties, taxonomy version, and canonical path are enforced;
- gate cohort-only events with a deterministic key set derived from the validated production registry, not the broad catalog;
- never emit legacy and canonical names for one action. If non-cohort surfaces retain a legacy event, route through one helper that chooses exactly one namespace.

## 7a. Retain resource creators and cleanup methods

Do not acquire through a mutable browser global/adapter and reread that global in `finally`. Before creation, retain the exact owner object plus its create and cleanup functions; invoke both functions with that retained owner. If creation succeeds, call the retained cleanup exactly once even when use, click, element removal, or cleanup throws. A replacement global—or methods swapped on the same owner during use—must never receive cleanup for a resource it did not create.

Apply this acquire/use/release rule to object URLs, subscriptions, observers, timers, sockets, AbortControllers, file handles, transactions, temporary files, and similar resources. Add hostile tests that replace the global owner during use, mutate methods on the same owner, throw from every use/cleanup stage, and return malformed handles. Verify: successful creation routes one cleanup to the retained creator owner/method; replacement owners receive zero; failed creation produces no cleanup.

## 8. Deterministic race test matrix

Use deferred promises and resolve them deliberately out of order:

1. boot A pending → auth B succeeds → A returns signed-out/old user;
2. auth A pending → auth B succeeds → A fails;
3. follow A starts → follow B starts → B resolves → A resolves/fails;
4. follow starts → sign-out/auth starts → follow resolves;
5. home A starts → home B starts → B resolves → A resolves/fails;
6. navigation A starts → navigation B starts → B resolves → A resolves/fails.

Assert the winner's state, DOM, history, status/toast, analytics count/body, and downstream requests remain unchanged after the stale operation completes.

Also test successful, failed, malformed, already-satisfied, DELETE, pending-intent, cache-failure, and non-cohort controls.

## 9. Generated-runtime and extracted-function pitfalls

- Exercise the generated browser module, not only helper source strings.
- If an established test extracts a generated function with `Function(...)`, new module-scoped ownership state can break that test even when production is correct. Prefer an injected state seam or runtime-private state attached to an injected object with a non-colliding symbol; keep the generated function's standalone contract intentional.
- Run generation before tests that inspect generated browser output; stale checked-in output can produce false failures.
- Run the repository's bare canonical test/build commands, then restore only known generated output and verify exact source/test scope.
- A failed generated/server test can leave a listener or temporary override in an odd state. Verify process/fixture cleanup and rerun the complete owning test file before classifying a one-off result as a product failure.
