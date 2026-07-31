# Fail-closed product analytics and retention-state transitions

Use this when adding product-event analytics, local continuity/history, session-scoped completion, or a stable pseudonymous identity. It complements `privacy-safe-retention-identities.md`: that reference governs identity lifetime; this one governs event payloads and UI-state races.

## One event contract at every server boundary

Define one shared schema keyed by event type. Each entry must specify:

- exact `targetType`;
- whether `targetId` is forbidden, a strict opaque ASCII ID, or one of an enumerated set;
- fixed values for filters, reading modes, completion markers, and search-state labels.

Use the same validator at the HTTP boundary, persistence layer, and third-party forwarder. Do not maintain similar-but-different maps.

Validation order matters:

1. Parse event fields.
2. Validate the event/target tuple.
3. Resolve identity and rate-limit/deduplicate.
4. Persist.
5. Revalidate immediately before forwarding.

Invalid requests must fail before deduplication. Otherwise the first malformed request can return `400` while an identical rapid retry returns a false-success `202 deduped`.

The forwarder must return no payload for malformed fields. Never “scrub” an arbitrary value into an allowed category: free-form search text must not become `has-query`, arbitrary suggestion IDs must not become `suggestion`, and invalid filters must not be widened to values accepted by another event.

## Canonical event namespaces and property allowlists

When a small canonical event namespace coexists with permissive legacy analytics, validate from the **raw event name before any sanitization**. A value such as `canonical_event\u0000` must not become canonical after control stripping, truncation, case folding, or other normalization. If normalization would collide with a canonical name, reject it rather than storing it under the canonical metric. Legacy names remain on the generic path and are never aliases.

Use an immutable event-type map with one immutable schema per exact canonical event. At the central request-to-event seam:

1. Determine whether the raw type is an exact own key in the canonical map **before reading `map[type]`**. Every exported/reusable validator must enforce this itself; an HTTP wrapper's earlier check is not sufficient. Otherwise inherited names such as `__proto__`, `constructor`, and `toString` can be mistaken for schemas, and an `Object.prototype` getter can execute. Prefer `Object.hasOwn(map, type)` before lookup (or a frozen null-prototype map), and directly probe inherited names plus a temporary inherited throwing getter with descriptor-safe cleanup.
2. For canonical events, require a standard plain `props` object and validate required own data descriptors without invoking accessors. Bound the required schema and accepted value sizes—not the total number of unknown own keys—when the contract says unknown properties are dropped.
3. Validate shared identity/context fields plus only that event's specific fields.
4. Cross-check entity type and slug against the exact canonical route, including only explicitly approved detail suffixes; reject query strings, fragments, absolute URLs, trailing junk, and entity mismatches.
5. Build a fresh sanitized object by iterating the allowlist, never the caller's keys. Drop unknown PII, free text, raw URLs, symbols, and client-controlled identity fields without reading their values or descriptors. Unknown accessor properties must not execute, and arbitrarily many harmless unknown keys must not turn a valid canonical event into a rejection.
6. Apply the same allowlist principle to the outer event envelope. If canonical privacy forbids client locale or referrer context, set those stored/forwarded fields to the contract's neutral value (for example `''`) while retaining canonical route validation; do not let generic analytics compatibility leak those fields into canonical events.
7. Return a stable typed validation error before persistence and forwarding. Preserve existing generic behavior for noncanonical events.

Prefer enumerated values for stable product taxonomies. Where a later UI task owns the final labels, accept only bounded lowercase machine tokens at this seam rather than guessing premature enums; tighten them when the emitting contract lands.

Export the pure canonical validator/sanitizer and the request-to-event builder when practical. Test the sanitizer directly to prove the returned object contains exactly the approved keys. For unknown-key dropping, combine an HTTP request carrying at least 64 harmless extras with direct hostile-object probes containing unknown string/symbol getters that throw; assert the request is accepted, exactly one event is stored, no getter runs, and only allowlisted keys survive. Keep a separate required-field accessor test that still rejects without invocation.

For outer-envelope privacy, send recognizable secret-like locale/referrer values through a valid canonical HTTP request and require `202`, then inspect the built stored/forwardable event: canonical path remains exact, privacy-forbidden fields are neutral, and serialized event JSON contains none of the sent values. Add a generic-event control proving legacy locale/referrer behavior remains unchanged.

### Hermetic persistence/provider observation

When an HTTP integration test must prove that the **same request** produced both the persisted record and third-party payload, do not reconstruct either result by separately calling the pure request builder. If existing storage/provider seams cannot expose both artifacts, add one minimal test-only sink guarded by the test environment:

- invoke the persistence observer only after the in-memory append or database write succeeds;
- let the provider observer substitute for outbound transport, so it receives the exact provider payload even when no real API key is configured;
- return a cleanup function and always remove the sink in `finally` to prevent cross-test leakage;
- assert exactly one persisted record and one provider payload, their complete key sets and correspondence (`type`, timestamp, server-issued visitor identity, path, sanitized properties), and absence of every recognizable locale/referrer/client-ID/PII/free-text/URL sentinel from serialized output;
- keep the seam unavailable outside tests and preserve production behavior when no sink is installed.

For in-memory integration tests, snapshot the event count before a valid request and assert an exact `+1`; for invalid matrices, snapshot before the loop and assert no increase afterward.

## Hostile browser sender and delegated-DOM boundaries

Generated browser analytics needs a second fail-closed boundary before the HTTP validator. Test the **generated browser artifact**, not a hand-copied approximation: generate into an isolated temporary output directory, extract the sender/state functions from that artifact, and invoke them directly with counters for `fetch` and the delegated `send` callback.

Use strict vertical TDD for the final hardening pass:

1. Establish one exact valid canonical baseline and prove it fetches/emits once.
2. Add one hostile case and capture the expected RED from the real generated function (for example, `RegExp.test` coercing a `Symbol`).
3. Add only the narrow guard needed for GREEN, then expand the hostile matrix one boundary at a time.
4. Finish with a valid delegated-init and delegated-click control so fail-closed hardening cannot silently suppress real events.

The hostile matrix should include:

- `Symbol` in every value that reaches string coercion or a regular expression, especially entity slugs and content types; require `typeof value === 'string'` before regex validation rather than relying on `value || ''`;
- property bags proxied with throwing `getPrototypeOf` and `getOwnPropertyDescriptor` traps; contain each reflective probe and return no event;
- `root.querySelector`, `target.closest`, `passport.dataset`, `link.dataset`, identity fields, action fields, and action-specific values implemented as throwing methods or accessors;
- malformed/incomplete canonical records and inherited event-name sentinels; all must produce zero fetches/sends.

For record-shaped analytics props, keep descriptor-only own-data reads so accessors are never invoked. Wrap only the individual reflective operations that hostile proxies can trap; do not place a broad `try/catch` around validation or `fetch`.

For real DOM-shaped objects, use a descriptor-aware safe read:

- if an **own** descriptor exists and is an accessor, reject it without invocation;
- if no own descriptor exists, permit the normal inherited DOM getter/method path inside a narrow containment boundary;
- retrieve methods safely and call them with `Reflect.apply(method, receiver, args)` inside a separate narrow containment boundary;
- type-check action/event objects before `WeakSet` operations and preserve identity-based event deduplication.

Assert descriptor-preflightable getters were called zero times. For hostile methods that must be called to discover failure, assert exactly one attempted call and that the exception was contained. Every hostile case must leave fetch/send counters at zero.

When the canonical package commands regenerate tracked browser output, baseline the worktree first, run the bare commands unchanged, then restore and remove only the known generated output subtree. Stage only generator source and focused tests.

## Generated IDs and privacy-safe analytics IDs

A product’s canonical IDs may contain Unicode or semantic slugs. If the server accepts only opaque ASCII analytics IDs, do not silently drop normal events and do not relax the server to accept title-like text.

Instead:

- convert canonical IDs client-side to deterministic opaque ASCII analytics IDs;
- preserve already-safe opaque IDs when practical;
- apply conversion in the central product-event sender and any direct/manual event POST path;
- never include the raw Unicode/semantic ID alongside the opaque value;
- add a regression using an ID produced by the real generator or an exact representative output, not only `story-123` fixtures.

Hashing here prevents raw-copy leakage; it is not an authentication primitive. Use a collision-resistant-enough representation for analytics cardinality and keep security decisions server-side.

## Demographic acquisition labels

Do not bind age-band or demographic campaign labels to a stable pseudonym. Reject semantic variants at all layers, not only strings containing `age`. Cover ordinary spellings such as:

- `45_54`, `45to54`, `45-and-54`;
- `65plus`, `65_and_up`, `65-and-up`;
- equivalent bands used by the acquisition platform.

Keep cohort analysis aggregate in the ad platform rather than visitor-level stitched analytics.

## Payload-transition and route tests

Bootstrap/fallback data creates races that ordinary click tests miss. Add controlled deferred-promise tests for:

- fallback story `id=X, updatedAt=A` becoming live story `id=X, updatedAt=B`: local history ends at `B`, while activation emits only once;
- a detail route absent from fallback but present in live data: show a loading detail state, then the story, never the home page under `/stories/:id`;
- missing and failed direct routes: render explicit recovery/not-found state without home-page leakage;
- browser `popstate`, reload, and direct load once the valid detail is visible.

Deduplicate local viewed-state writes by `id + visible content version`, not ID alone. Deduplicate activation independently by story ID when one visible journey should emit once.

## Async ownership must cover downstream rejection UX

Last-intent checks inside an async operation are incomplete if a superseded rejection is rethrown into a shared caller-level `.catch(...)`. That outer handler can still overwrite a newer success with stale status text, toast, redirect, or analytics readiness.

For every latest-intent operation:

1. Capture an operation/identity owner before starting network work.
2. Recheck ownership before every state, DOM, history, event, toast, redirect, and loading-state effect in success, failure, and `finally` paths.
3. If a failure is superseded, **resolve/return silently** rather than rejecting into a global UI error handler.
4. Only the owning failure may release analytics readiness and propagate to the current error UX.
5. Add a deferred A→B regression: B succeeds first, A rejects afterward, and B's identity, status, toast, event set, and loading state remain unchanged.

Apply the same rule independently to navigation, authentication, mutations, and feed loads. Separate ownership domains when one operation class should not invalidate another; capture identity ownership as an additional guard for mutations that must not survive sign-out or account changes.

## Bounded sessionStorage journey state

For an exact same-session journey sequence, keep state browser-session scoped and fail closed:

- generate one cryptographically random session identifier (for example UUIDv4 via `crypto.randomUUID()`), store it only in `sessionStorage`, and never send it in canonical event properties;
- store a versioned, bounded plain-data record with a strict byte limit and bounded entity count;
- validate prototypes, own data descriptors, key patterns, enums, and the random identifier before accepting saved state;
- contain `getItem`/`setItem`, parse, stringify, reflection, and randomness failures without suppressing the base product event;
- key progress by canonical entity identity so SPA route changes cannot combine steps from different entities;
- persist completion so remounts and revisits remain deduplicated, and emit only after the final state transition is durably written;
- test missing/out-of-order steps, wrong entity, repeated final actions, remount/revisit, storage `SecurityError`, malformed/oversized/proxy state, and event serialization proving the session identifier is absent.

## Server-derived signed-in retention identities

When analytics needs cross-day retention for authenticated users while anonymous visitors remain daily-scoped:

1. Resolve authentication from the verified server session at event-construction time. Never trust browser `signed_in`, `distinct_id`, visitor, subject, account, device, cookie, or session-token fields to establish analytics identity.
2. Derive the signed-in subject with HMAC-SHA256 over a domain-separated input containing only the internal immutable user ID, for example `product-retention-v1|<internal-id>`. Keep the raw ID, email, name, session token, IP, and user agent out of persisted and forwarded envelopes.
3. Preserve anonymous daily HMAC behavior as a separate branch. Invalid, expired, or forged sessions stay anonymous; a session lookup failure should fail closed before persistence/forwarding rather than silently misclassifying an authenticated event.
4. If event construction becomes asynchronous, update every HTTP caller to await construction before storage. Keep explicit test-clock injection as a function argument only—never read a time override from request body, query, or headers.
5. Store only a non-sensitive identity-scope label when downstream payloads need a truthful privacy annotation. Provider `distinct_id` must exactly match the persisted derived subject.
6. Filter identity-shaped fields from permissive legacy property bags; canonical events should continue rebuilding properties from their allowlist.

Verification must use real auth/session seams rather than fabricated `req.user` objects:

- create one account and two separate valid sessions;
- vary UTC day, IP, and user agent and require one stable opaque subject;
- require different accounts to produce different subjects;
- prove anonymous same-day stability and next-day rotation;
- probe forged and expired cookies plus client identity claims;
- observe persistence and provider forwarding from the same HTTP request and assert raw identity sentinels are absent from serialized output;
- inject an auth-session lookup failure and require zero persistence and zero forwarding.

Avoid tests that recompute the expected HMAC using a hard-coded development salt: they become environment-dependent and encode assumptions about configured secrets. Prove account-basis through separate sessions and changed network context, then assert stability, shape, separation, and raw-sentinel absence.

## Stable exact-N session completion

If completion means opening the exact N items selected for a session:

1. Wait until the authoritative payload settles on first selection.
2. Snapshot exactly N distinct IDs in session storage.
3. Track opened IDs and completion against that snapshot.
4. On remount or ranking changes, retain the snapshot while every saved ID remains anywhere in the available feed—not only in the newly ranked top N.
5. Display only when all N snapshotted items are resolvable.
6. Reset progress only when a saved item is genuinely unavailable.
7. Emit completion once.

Test a saved rank-three item moving to rank four while remaining available.

## Verification gates

- Submit each hostile HTTP payload twice rapidly; both responses must reject and persistence must remain empty.
- Directly call the forwarding payload builder with unknown events, wrong target types, arbitrary search/suggestion/load-more values, and cross-event filter values; every malformed case must return `null`.
- Verify normal generated IDs persist and forward only as opaque IDs.
- Run focused RED→GREEN tests, the bare full-suite command from a clean-checkout-compatible tree, production build, and diff check.
- Do not rely on machine-specific dependency symlinks as release evidence. If test transforms need a package-owned base config, check in an equivalent repository-local testable base or otherwise make the clean checkout self-contained, then verify the real package typecheck against installed dependencies.
- After any remediation commit or worktree change, obtain a new current-head independent review before shipping.
