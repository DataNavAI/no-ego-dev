# Analytics validation adversarial probes

Use these recipes when reviewing a canonical event allowlist layered on an older generic analytics pipeline. Keep probes outside an immutable checkout.

## Audit the entire stored and forwarded envelope

Do not stop after proving that `props` is sanitized. Trace every client-controlled field from request body to:

1. the in-house event record;
2. third-party forwarding properties;
3. logs, summaries, or exports.

Common bypass fields include generic `locale`, `referrerHost`, `path`, `url`, `source_url`, `distinct_id`, and top-level free-text fields. A canonical `props` object can be clean while generic envelope metadata still forwards raw URLs, queries, fragments, email addresses, or free text.

To prove forwarding behavior without external network access:

1. Start a temporary loopback HTTP server on an ephemeral port.
2. Set the analytics provider host to that loopback URL and use a dummy project key before importing the application module.
3. Post one otherwise-valid canonical event containing sentinel secrets in every legacy envelope field.
4. Capture and print the exact forwarded JSON body.
5. Verify only contract-approved fields survive.

The probe must use a valid baseline first so “nothing captured” cannot be mistaken for successful filtering. Ensure the configured environment-variable names are read from source rather than guessed.

## Unknown-property semantics

Distinguish these contracts explicitly:

- **drop unknowns:** every valid required schema remains accepted after adding unknown fields, and output contains none of them;
- **reject unknowns:** any unknown own key causes a stable validation error;
- **bounded input:** a documented total-own-key limit may reject otherwise droppable unknowns.

If the spec says unknown properties are dropped, test both one unknown property and enough unknown string/symbol properties to cross any generic key-count cap. A hidden total-key cap changes drop semantics into conditional rejection.

## Hostile JavaScript shapes

Probe direct exported validators with:

- arrays and null;
- null and custom prototypes separately;
- required accessors and non-enumerable required fields;
- unknown accessors that throw (they must not execute when unknowns are dropped);
- symbol keys;
- `__proto__` as a parsed own property;
- throwing prototype/descriptor proxies when the public helper promises stable errors for arbitrary JavaScript inputs;
- input non-mutation and output independence.

Separate HTTP-reachable JSON behavior from direct-helper behavior. Proxy traps are not remotely representable through normal JSON, but they matter if the exported validator itself is a supported public boundary.

Treat `Object.entries`, object spread, destructuring, and ordinary property reads as accessor execution sites. A value validator that runs only after `Object.entries(props)` is not accessor-safe: an enumerable getter has already executed and can return an otherwise-valid value. Assert both that the getter call count remains zero and that the property is absent.

When source inference is not enough to demonstrate the downstream consequence, an immutable Express review can use a process-local middleware injection without editing files: register a middleware that replaces `req.body.props` with an accessor-backed object, remove its newly appended router layer, and splice that layer immediately before the target analytics route but after the JSON parser. Then post a normal request through Supertest while capturing the real persistence/provider test sinks. This proves whether the accessor is invoked and whether its returned value reaches both envelopes. Perform this only in a disposable test process because it mutates the imported app's in-memory router.

## Status and persistence probes

For every malformed canonical request:

- assert the stable 400 response body;
- compare event counts before and after to prove no persistence;
- verify sanitized aliases cannot reach canonical storage;
- verify Unicode lookalikes remain non-canonical rather than being normalized into canonical names.

For the legacy storage-failure contract, point the storage SDK at a refused loopback port with dummy credentials, post one valid event, and assert the documented non-validation response (for example, legacy `202 {ok:false}`). This exercises the real catch path without external I/O.

## Retention identity and generic-event hardening

When analytics mixes authenticated retention with anonymous daily identities, verify identity at the server boundary rather than trusting browser flags:

1. Create one real account and two independently verified sessions.
2. Build events on different UTC days with different IP and user-agent values; the authenticated HMAC subject must remain stable.
3. Create a second account; its subject must differ.
4. Verify anonymous, fake-session, and expired-session requests remain daily-HMAC subjects and rotate across UTC days.
5. Inject `signed_in`, `distinct_id`, user/account IDs, session tokens, cookies, email, name, IP, and user-agent aliases at both top-level and property-bag locations. None may select the subject or survive into persistence/provider payloads.
6. Force session lookup failure. Prefer zero persistence/forwarding over silently classifying a potentially authenticated request as anonymous.
7. If event construction becomes asynchronous, inspect every route caller and prove each awaits construction before storage.
8. Confirm provider `distinct_id` exactly matches the persisted server-derived subject, while the privacy/scope label truthfully distinguishes authenticated stable HMAC from anonymous daily HMAC.

For generic analytics, a denylist is not a durable privacy boundary. Use and review an exact server-side property allowlist with key-specific value schemas:

- Check raw key membership **before** normalization. Probe punctuation, case, Unicode punctuation, and whitespace collisions such as `source!` or `query_length!`; unknown keys must not normalize into allowed keys.
- Count accepted keys rather than the first N input keys so an unknown-key flood cannot suppress legitimate telemetry.
- Validate values per key: bounded nonnegative integers, exact booleans/enums, canonical slugs, safe local paths without query/fragment, or narrowly bounded tokens. Never stringify arbitrary objects or arbitrary strings under a trusted key.
- Probe PII values under allowed keys (for example, an email in `label`, `source`, or `query_length`) as well as identity-looking keys.
- Inventory every current production emitter before freezing the allowlist. Exercise each emitted key/value pair end to end; otherwise legitimate telemetry such as search `result_type` or `rank` can be silently discarded while privacy tests pass.
- Derive realistic emitter values from the full producer state machine, not only nearby literals. Trace values copied from server responses, persisted account state, migrations, and provider-link transitions into the browser emitter. For example, an enum that accepts the initial `password` state may still discard a reachable linked-account state such as `password+provider` when the client emits `user.provider` verbatim. Pair the source trace with a direct sanitizer probe of the reachable transformed value.
- Audit the generic **outer envelope** under a real authenticated session, not only canonical events and `props`. Inject sentinel PII into event type, path, locale, and referrer; inspect both persisted and provider payloads. Require an exact current-emitter event-type set, local pathname without query/fragment/credentials, supported-locale enum, and hostname-only normalized referrer with email-like values and IP literals rejected. Unknown event types should become a fixed neutral token or fail with no write—never persist the caller's string.
- Probe body-envelope descriptors as well as property descriptors. Ordinary `body.type`, destructuring, spread, and `Object.entries` can invoke accessors before later validation. Require own enumerable data-descriptor reads from an explicitly accepted record shape, and verify getter call counts stay zero.
- After any remediation commit, rerun the composite independent review against the same new immutable SHA; a prior verdict does not carry forward across code changes.

## Reporting

A privacy leak in a forwarded payload is stronger evidence than source inference: include the captured field names and sentinel values. Cite both the request-to-event construction lines and provider-forwarding lines because contamination may affect both stores.