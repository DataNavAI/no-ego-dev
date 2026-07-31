# Server-authoritative browser account state

Use this when a browser client mirrors authenticated user, follow/save/subscription state, or other account-scoped data in `localStorage` or an in-memory cache.

## Authority model

- The server session and successful mutation response are authoritative. Browser storage is only a best-effort cache.
- Do not render account-scoped cached data before the active server identity is known unless the cache is cryptographically or explicitly bound to that exact user and still revalidated.
- On session hydration, set the validated server user, clear account-scoped active state, then install only a validated successful hydration response. If hydration fails, preserve truthful authentication state but render an empty/error state—not stale data.
- On account change or sign-out, clear account-scoped state before fallible storage, rendering, or secondary fetches.

## Validation and transitions

- Validate response records through own data descriptors. Reject inherited fields, accessors, symbols, hostile proxies, sparse/custom-prototype arrays, noncanonical keys, and oversized collections without invoking caller code.
- Bound arrays to the server limit and return defensive copies so callers cannot mutate internal state by alias.
- A successful mutation response must prove the requested transition: PUT/add requires the entity to be present; DELETE/remove requires it to be absent. An HTTP 2xx plus `ok: true` is insufficient.
- Update in-memory authoritative state before best-effort persistence. A storage quota/security failure must not reverse a successful server mutation or prevent truthful rendering.
- If the server mutation fails, restore the prior in-memory/UI state and emit no completion analytics or success toast.

## Direct-auth hydration ordering

A successful login/signup response identifies the user but does not by itself hydrate returning-user account state. Treat direct authentication like session boot:

1. Validate the auth response user.
2. Set authoritative signed-in/user state immediately.
3. Clear active follows/saves before any fallible work.
4. Run the same validated, bounded `GET` hydration helper used by session boot.
5. Install the hydrated collection before pending-intent handling and rendering.

The shared helper must require HTTP success, application success, and a canonical own-data collection response. On hydration failure, keep the user signed in, leave the collection empty, render the truthful unowned state, and show explicit partial-success/error UX rather than plain “Signed in.”

In the browser harness, distinguish session-time and post-auth collection reads and record their HTTP methods. This catches regressions where direct auth clears account state but never performs the returning-user hydration request.

## Concurrent async ownership domains

Boot hydration, direct login/signup, sign-out, direct follow toggles, personalized-home loading, and SPA navigation can overlap on slow networks. They must not independently commit to shared browser state.

### Auth/session owner

- Use one monotonic operation epoch/generation for the whole auth/session domain. Increment it **when an operation starts**, before its first request, so a user-initiated login or sign-out immediately invalidates older boot/auth work.
- Capture the token and check ownership after every `await` and immediately before state, render, error, toast, persistence, or analytics commits. A stale completion is a no-op.
- Include sign-out in the sequence. A failed newest sign-out preserves authenticated truth but still invalidates older operations.

### Direct follow owner

Duplicate follow controls represent one global collection, so per-button busy state is insufficient.

- Use a shared follow-mutation epoch and capture the auth/session epoch when each direct add/remove starts.
- A completion owns global state only while both tokens match. This gives latest-start-wins across duplicate controls and makes newer auth/sign-out invalidate pending mutations.
- Check ownership after the mutation await and before collection assignment, render, success analytics/toast, home refresh, rollback, or error UI.
- A stale operation's `finally` may clear only its own control's busy state. It must not mutate, render, persist, emit, toast, roll back, or refresh shared state.

### Home/feed owner

- Give home loading its own monotonic epoch, including boot/auth/sign-out/follow-triggered loads and direct retries.
- Auth-scoped calls also capture the auth owner; direct calls may omit it but must still own the newest home epoch.
- Check after fetch/JSON awaits and before card visibility, empty/error/personalized state, or analytics. A stale failure must not replace the winning view with an error.

### SPA navigation owner

- Give every navigation intent, including popstate, a navigation epoch.
- Check after fetch, text read, and document parse, then before metadata/canonical/body/app DOM, history, scroll, page initialization, page-view/completion analytics, redirect fallback, and loading cleanup.
- Only the winner may clear the shared loading class. A stale failure is silent and must never redirect to its destination.

### Failed-auth analytics readiness

Analytics readiness is a liveness contract, not only a success-path concern.

- Initialize from the winning successful boot/auth operation using authoritative `signed_in` truth.
- If direct auth supersedes boot and its POST or response validation fails while still owning the auth epoch, release readiness exactly once using current authoritative truth (normally signed out, or a preserved prior authenticated session).
- Superseded failures, stale boot completions, and stale secondary hydration must not release readiness.
- Keep initialization idempotent so later completions cannot duplicate the first canonical profile view.

A superseded direct-auth failure must also be **consumed inside the owned auth operation**, not merely prevented from mutating state. If stale work rethrows, a delegated form handler's outer `.catch(...)` can still overwrite the winning operation's status text or toast even though identity and account state remain correct. At the auth boundary:

1. Catch the request or response-validation failure.
2. Recheck auth-operation ownership before any liveness or error action.
3. If stale, return a fulfilled no-op result without rethrowing.
4. If current, release readiness as required and rethrow (or render the established current-operation error) so the delegated handler may show failure UX.

Regression-test this through the real delegated submit listener with two deferred direct-auth requests: start A, start B, resolve B successfully, then reject A. Assert B's user, account state, rendered controls, success status/toast, and signed-in canonical analytics remain unchanged; assert no stale failure toast/status and no duplicate or wrongly classified canonical event. Testing `authForm()` directly is insufficient because it bypasses the outer delegated `.catch(...)` where the visible regression occurs.

Test with deferred promises, not sleeps:

1. Hold boot, complete direct auth/hydration, then resolve stale boot and prove no overwrite or duplicate analytics.
2. Start duplicate direct follow mutations, resolve the newer first, and prove the older cannot roll back, render, emit, toast, error, or refresh home.
3. Start direct follow, complete sign-out, then resolve follow; signed-out global state wins while the stale control alone may leave busy state.
4. Start two home requests, resolve newer first, and prove older success/failure cannot alter cards, state, error, or event count.
5. Start SPA A then B, resolve B then A, and prove B remains URL/DOM/event winner; stale A failure cannot redirect or alter loading.
6. Hold boot, let owning direct auth fail POST/validation, assert exactly one canonical profile view with current truth, then resolve boot and assert no duplicate.

### Deferred-harness pitfall

An event dispatcher may finish before intentionally unreturned async listener work. After resolving a deferred response, explicitly drain microtasks/macrotasks or await an exposed operation promise **before assertions**. Otherwise a stale redirect or DOM commit can happen after a false GREEN. Confirm RED fails on the intended ownership assertion rather than fixture plumbing.

## One-shot URL and storage intents

A post-auth intent can come from both `?follow=...` and local storage. Treat it as a one-shot navigation intent:

- Resolve URL intent before stored fallback, but consume **both** only after a successful mutation or hydration proving the item is already owned.
- On consumption, remove only the intent query parameter using a same-origin `URL` plus `history.replaceState`; preserve path, unrelated query parameters, and hash. Remove the stored key best-effort.
- On hydration or mutation failure, keep the intent for retry.
- Do not leave a consumed query parameter in `location.search`: otherwise a later unfollow followed by sign-out/sign-in on the same page can silently re-add the item.

Test the full sequence: authenticate from a query intent, consume it, unfollow, sign out, authenticate again without navigation, and assert there is no new add request or completion event. Separately prove unrelated query/hash state survives consumption.

## Referrer classification

Classify internal versus external referrers by parsed `URL.origin` equality. Never use string-prefix matching: `https://product.example.evil.invalid/` is external even though it begins with the product origin string. Treat absent/malformed referrers according to the established direct/unknown taxonomy and test exact-origin, lookalike-origin, and malformed cases.

## Canonical completion events at persistence boundaries

Follow/save activation analytics must describe a proven server transition, not an optimistic click or a merely successful HTTP envelope.

- Emit the canonical completion event only after the mutation response passes HTTP/application validation, bounded canonical collection validation, requested-transition validation, and async ownership checks.
- Commit the authoritative in-memory collection before emitting. A stale, malformed, contradictory, rolled-back, already-owned, remove/unfollow, or failed operation emits no activation completion.
- Route direct toggles and post-auth pending adds through one completion helper so both boundaries use the same event name and exact property schema. Keep click/start analytics separate from completion analytics.
- For fixed-cohort analytics, derive cohort membership from the reviewed generated identity registry/index—not from the broad discovery catalog and not from a client-supplied boolean. Convert persistence keys to the canonical entity vocabulary explicitly (for example, `idol:` to `individual`) and generate the canonical entity path from that validated identity.
- Include only the canonical common properties plus the exact event-specific proof, such as `persistence_mode: 'server'` and `taxonomy_version: 1`. Never include account IDs, raw URLs/queries, labels, or mutation payloads.
- Do not dual-emit legacy and canonical completion names for one action. If non-cohort surfaces retain a legacy event during migration, make the namespaces mutually exclusive by validated cohort identity and test both branches.
- Extend both the hardened client sender schema and server allowlist before relying on the new name. A generic event helper that omits canonical common properties is not a valid migration even if its fetch returns successfully.

TDD should cover: canonical direct-add success; canonical pending-add success; failure and contradictory success responses; stale/superseded success; already-owned pending state; unfollow; exact one-event cardinality; absence of the legacy duplicate; and a non-cohort control. Verify the generated runtime, not only a helper string, because generated code can still call the wrong analytics path.

## Partial-success UX

Authentication and a post-auth pending action are separate outcomes. If sign-in succeeds but the pending follow/save fails:

- keep the user signed in;
- retain the pending intent for retry;
- show explicit partial-success copy;
- do not overwrite it with an unqualified “Signed in” message;
- emit no completion event for the failed secondary action.

Reconcile pending intent only after post-auth hydration:

- If hydration proves the item is already owned, clear the persisted pending intent without issuing a duplicate mutation or completion event.
- If hydration fails, a successful pending add may recover the full authoritative collection from its validated mutation response; install it and clear the hydration warning.
- If both hydration and the pending mutation fail, preserve signed-in truth and the pending intent, and keep the existing explicit partial-success message.

A failed server sign-out must preserve signed-in truth and must not emit sign-out analytics or success UI.

## Whole-system review discipline

Do not review only the async path named in the latest finding. Before the first immutable quality verdict, inventory every operation that can write shared identity, account state, DOM, history, loading state, error UX, toast, or analytics. For each operation, record its ownership token, invalidators, commit points, catch behavior, and finally behavior. Then review every realistic overlap as one matrix: boot/auth/sign-out, direct mutation/auth, duplicate mutations, feed reads, and SPA navigations. This prevents serial approval loops where each remediation exposes the next unreviewed race.

A final reviewer should explicitly answer all of these in one pass:

- Which operation is last-intent owner for identity, mutation, feed hydration, and navigation?
- Does every post-`await` success, `catch`, and shared `finally` recheck ownership?
- Can stale work emit analytics, toast, error, redirect, history, DOM, render, rollback, or secondary fetch side effects?
- Does a winning failure release any liveness gate, such as initial analytics readiness, exactly once?
- Do extracted/generated-runtime compatibility tests still execute after ownership state is added, rather than failing because a helper now depends on an unavailable lexical global?

Only issue immutable approval after the full matrix is reviewed at the final SHA. Any code change— including a test-compatibility repair after a canonical-suite failure—invalidates both earlier specification and quality verdicts.

## TDD matrix

Test through the real browser/runtime harness:

1. Seed user A plus account-scoped cache; resolve session as user B; fail hydration. Assert no cached state renders before or after resolution, active state is empty/error, and the next mutation uses the correct verb.
2. Resolve a signed-out session, then authenticate directly as a returning user. Assert exactly one post-auth `GET`, hydrated ownership renders before interaction, and the next toggle uses remove rather than add.
3. Fail the post-auth `GET`. Assert signed-in truth survives, active ownership stays empty, and explicit partial-success/error UX replaces plain auth success.
4. Hydrate a pending item as already owned. Assert intent cleanup with no duplicate mutation/event; separately fail hydration and prove a successful pending add can recover the authoritative collection and clear the hydration warning.
5. Valid user, null session, missing/extra/string user, accessor user, and proxy user; assert no trap invocation and no false authentication.
6. Valid add/remove responses plus missing, object, symbol, accessor, proxy, oversized, malformed-key, and contradictory state responses.
7. Successful mutation with throwing `localStorage.setItem` still updates memory/UI exactly once.
8. Failed mutation rolls back, clears busy state, and produces no completion event/success toast.
9. Successful and failed sign-out with throwing storage removal.
10. Pending post-auth action failure retains intent and exact partial-success messaging.
11. Deferred boot session resolving after completed direct auth cannot overwrite user, collection, UI, readiness, or analytics; a newer sign-out likewise supersedes older pending hydration/mutation work.
12. Successful/already-owned URL intent is removed while unrelated query/hash state survives; failure retains it; unfollow plus re-authentication on the same page does not silently add it again.
13. Exact-origin referrer is internal, a prefix-lookalike origin is external, and malformed/absent referrers follow the established direct/unknown rule.

Run focused RED→GREEN, the complete feature file, the canonical suite, and the build. Restore only known generated output, commit exact authorized files, then repeat immutable specification and quality reviews at the final SHA.
