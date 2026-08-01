# Privacy-safe stable identities for retention analytics

Use this when retention is unexpectedly zero or when adding anonymous retention measurement without introducing accounts or raw PII.

## Diagnose before changing engagement features

1. Record the retention report’s cohort-entry event, return event, week boundaries, timezone, denominator, and rounding.
2. Trace the analytics `distinct_id` from browser/app creation through server forwarding into the analytics provider.
3. Check whether any date, session, IP, deploy, or daily salt is included. A daily rotating ID is suitable for DAU but makes cross-day/week retention unmeasurable.
4. Confirm event ingestion independently from query access. Successful capture does not prove dashboard/query access or correct identity continuity.

## Recommended split-identity design

- Keep a rotating daily HMAC for first-party DAU aggregation.
- Generate a random first-party browser/install UUID and retain it for a declared bounded period, such as 90 days.
- Send it only over HTTPS to the server; validate a strict UUID shape and reject invalid or overlong expiry state.
- HMAC it server-side with a dedicated analytics salt and domain-separation prefix such as `retention-v1|`.
- Forward only the HMAC as the provider `distinct_id`; never persist or forward the raw UUID.
- Preserve a rotating-ID fallback for storage-disabled/legacy clients so analytics never breaks the product.
- Disable provider person profiles when event-level retention is sufficient.

## Authenticated retention identity

When the product already has verified server sessions, prefer account-derived continuity over a new browser identifier:

- Resolve identity only from the verified session cookie and server-side user lookup. A client `signed_in` flag, `distinct_id`, visitor/subject field, or cached profile must never establish authenticated continuity.
- HMAC the internal immutable user ID with the existing protected analytics salt and a versioned domain-separation prefix such as `signed-in-retention-v1|<internal-id>`. Forward/store only the bounded digest, never the internal ID, email, name, session token, cookie, IP, or user agent.
- Keep anonymous behavior separate (for example, a UTC-daily HMAC of day + IP + user agent) so fake, expired, and absent sessions cannot gain stable identity.
- If authenticated session lookup fails, fail closed before persistence/forwarding rather than silently recording a genuinely signed-in event as anonymous.
- If analytics envelopes disclose an identity/privacy mode, derive that marker on the server and keep provider labels truthful for both signed-in and anonymous subjects.
- Make event construction asynchronous when session verification requires storage, and update every analytics route/caller to await it.

Test with a real signup and a second login session: vary UTC day, cookie/session, IP, and user agent while proving one stable subject; prove two users differ; prove anonymous/fake/expired sessions rotate; and prove lookup failure has zero persistence or forwarding side effects.

## Property privacy boundary

Do not use a key denylist for permissive/generic analytics properties. Identity and PII aliases are effectively unbounded (`user_id`, `account_id`, `customer_id`, `member_id`, `profile_id`, `username`, `email_address`, `ip_address`, separator/case variants, and arbitrary future names).

Use an exact server-side allowlist of legitimate product property keys instead:

1. Inventory every property currently emitted by production clients.
2. Allow only those exact keys at the HTTP boundary; drop unknown keys before persistence and provider forwarding.
3. Keep canonical event schemas on their own narrower event-specific allowlists.
4. Add an adversarial HTTP test containing many identity/PII aliases plus one legitimate control property. Assert the control survives while no sentinel appears anywhere in the persisted event or provider envelope.
5. Re-run this inventory when adding a legitimate generic property; never weaken the boundary to accept arbitrary keys.

The property bag is only one part of the privacy boundary. Once a stable signed-in subject exists, generic top-level envelope fields can stitch private values to that subject too. Apply fail-closed schemas before persistence and forwarding:

- event type: exact current-emitter allowlist, with unknown types mapped to a fixed neutral token or rejected;
- path: local pathname only, never query, fragment, absolute URL, username, or password;
- locale: exact supported locale enum;
- referrer: hostname-only, normalized, with email-like values and IP literals rejected;
- body fields: own enumerable data descriptors from plain/null-prototype records only—do not use destructuring, ordinary property reads, or `Object.entries` where accessors can execute.

Inventory emitter **values**, not just keys. Follow values copied from server/account state through the browser emitter (for example, linked-account provider states), otherwise an over-tight enum can silently discard legitimate telemetry. Keep per-key schemas typed: bounded nonnegative integers, exact booleans/enums, canonical slugs, safe local paths, and narrow tokens; never stringify arbitrary objects or free-form strings under an allowed key.

A passing test for a few named aliases is insufficient: one fresh composite independent review should probe variants, arbitrary unknown keys, normalization collisions, PII values under allowed keys, hostile descriptors, and every generic envelope field. If that review finds a leak, capture a focused RED through the real persistence/forwarding sink and re-run the complete composite review at the new immutable SHA.

## Privacy requirements

- Update the privacy disclosure before rollout: storage mechanism, purpose, lifetime, provider, and deletion/rotation behavior.
- Enforce the advertised maximum lifetime in code; do not trust a client-provided future expiry without capping it.
- Treat retention as an end-to-end data lifecycle, not only a browser-storage expiry. If the policy claims a maximum analytics lifetime, configure deletion in every persistence layer (for example, DynamoDB TTL on `expires_at`) or explicitly disclose provider-specific retention and asynchronous deletion delays.
- On shared DynamoDB tables, TTL is safe for mixed record kinds only when expiring records carry the TTL attribute; items without it are unaffected. Add a static infrastructure test and validate the CloudFormation template so TTL cannot silently regress.
- Do not claim PostHog event deletion is bounded by the browser-ID lifetime. The identifier may rotate while historical events remain; configure PostHog retention when query/admin access exists, otherwise disclose that event retention follows the PostHog project setting.
- Do not send raw IPs, user agents, searches, article URLs, contacts, or free-form text.
- Treat the stable pseudonym as persistent analytics data even though it is not directly identifying.

## TDD checks

Write focused RED→GREEN tests proving:

- one retained browser ID is attached to page views and product events;
- first-time generation persists and reuses one cryptographically generated ID;
- unavailable browser storage and unavailable UUID generation fail open without breaking analytics;
- malformed/expired/overlong local state is replaced;
- network/IP/user-agent changes still produce one provider `distinct_id`;
- the provider ID exactly equals the expected domain-separated HMAC, and the complete provider payload contains no raw UUID;
- first-party stored daily hashes remain separate from the provider retention ID;
- invalid/missing UUIDs fail safely to the expected rotating identity;
- privacy-policy text matches the enforced browser lifetime and backend/provider retention behavior;
- infrastructure enables and names the backend TTL attribute correctly.

Then run the full suite, production build, and infrastructure-template validation. Use fail-fast shell execution (`set -e` or `&&`) so a later successful check cannot mask an earlier failed build.

## PostHog access distinction

- A PostHog project key (`phc_…`) is an ingestion credential: it can send `/capture/` events but cannot read dashboards, cohorts, retention reports, or project queries. A status-only project API probe typically returns `401` when this key is incorrectly used as Bearer query authorization.
- Query verification needs an authenticated browser session or a PostHog personal API key with the required project read/query scopes.
- A key present in deployed runtime configuration proves only application ingestion capability. Do not extract, print, or repurpose runtime secrets to manufacture dashboard access.
- Never expose either credential. Verify capabilities with status-only probes and report which access class is missing.

## Rollout interpretation

A stable-ID deployment does not repair historical cohorts collected under daily IDs. Build a new report from post-deploy events, label the cutover, and wait for complete cohort windows before judging product retention.