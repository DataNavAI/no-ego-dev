# Fail-closed optional-write APIs and immutable Lambda artifacts

Use this reference for small analytics/feedback APIs backed by DynamoDB where static product journeys must remain available when optional writes fail.

## Request/privacy boundary

- Normalize header names once.
- Reject out-of-contract cookies and non-empty query strings before route handling, body parsing, or storage.
- Restrict CloudFront forwarding independently; handler rejection protects direct API invocation.
- Enforce origin, content type, body byte limit, closed JSON keys, and privacy-safe properties before idempotency or rate limiting.

## Canonical idempotency

- Hash a recursively key-sorted JSON value, not ordinary `JSON.stringify`, so key-reordered equivalent objects do not conflict.
- Hash client idempotency keys before persistence; never store the raw key.
- Analytics marker + aggregate increment should be one DynamoDB transaction.
- On transaction cancellation, perform bounded strongly consistent readback. Existing matching digest means retry success; differing digest means conflict; missing after bounded reads is ambiguous and returns temporary failure—not success.
- Apply the same fail-closed rule to feedback conditional writes: a failed condition followed by missing readback is not a valid retry.
- Inject DynamoDB client, wait, and jitter seams. Unit-test transaction success, cancellation with matching readback, cancellation with repeated missing readback, conditional race, TTL decode, and GSI pagination by asserting real AWS command classes.

## Retention and status

- Persist numeric `expiresAt` and decode it on reads.
- A feedback-status record at or beyond expiry returns `unavailable` even before asynchronous DynamoDB TTL deletion.
- Optional-write kill switches must block only write routes; static SPA journeys, health reads, and allowed receipt-status reads stay operational.

## Portable evidence and static artifacts

- Never make CI depend on a profile-local or `/tmp` evidence path. Keep the minimum rights-approved, digest-pinned build evidence as a durable private input or fetch it from an authenticated immutable store.
- Validate evidence paths lexically, then resolve both the evidence root and file with `realpath` and enforce containment; reject absolute paths, empty/`.`/`..` segments and escaping symlinks.
- Compare a fresh compiler result byte-for-byte with the checked-in public release. Public-boundary checks must prove raw evidence, editorial receipts and governance data never enter the static artifact.
- Bundle JavaScript modules and content-hash JavaScript/CSS filenames. Emit a closed `asset-manifest.json` binding the revision and release identity to every public asset digest; do not claim immutable static assets while shipping only stable un-hashed filenames.

## Content health and scheduled isolation

- Decode every contract field, not just counts: release and schema/source hashes, policy, validation/import outcomes, counts, validation time, age limit, and per-entity ready/partial/empty state when the product promises it.
- Derive artist/question/change counts from the validated release and pass them into infrastructure; do not hard-code release totals in Lambda environment configuration.
- Status is healthy only when all fields match and the record is fresh.
- Provide a conditional operator writer that validates the public release, computes hashes from actual files, assumes a scoped role, derives STS identity, and writes the canonical record before promotion where an existing stack permits it.
- Give scheduled SLA/content-health invocations explicit event kinds. If a scheduled function has a different role or environment dependency set, give it a separate entrypoint and bundle smoke-import; reusing the public API entrypoint can fail during module initialization before dispatch reaches the schedule branch.
- Emit explicit heartbeat metrics and alarm on missing data. Create deterministic Lambda names and matching explicit log groups with adequate retention; scope each role’s log permission to its own group.

## Deterministic Lambda and static deployment

1. Bundle to each exact handler path, e.g. archive roots `api/runtime.js` and `api/sla-runtime.js` for separate handlers.
2. Normalize file and directory timestamps before ZIP creation; exclude host-specific extra metadata.
3. Emit archive SHA-256 in hex and base64 CodeSha256.
4. Inspect the ZIP listing and smoke-import every exported handler with only its required environment identity.
5. Upload under an immutable revision/digest key, publish Lambda Versions, and route through Aliases.
6. Keep scheduled enumeration on a separate query-only function/role when the public request Lambda needs only point reads/writes.
7. Upload immutable static bytes before changing CloudFront’s origin path. Existing deployments should persist candidate health before promotion, accept only the explicitly declared previous compatible release during cache overlap, then invalidate and verify live full-SHA/release/hash identity.
8. Deploy only from a clean checkout whose full 40-character SHA exactly equals the expected current `origin/main`. GitHub workflow/environment selection, checkout ref, OIDC subject, deploy role, CloudFormation execution role and narrowly scoped `iam:PassRole` must all agree on the same environment.

## Browser analytics acceptance

- Test the complete authoritative event taxonomy through real browser journeys, including activation and primary completion, not only server schema acceptance.
- For links rendered in aggregate feeds, bind analytics identity on the element itself; deriving it from the current route can silently drop or misattribute events.
- Persist completion-delivery acknowledgement only after the API returns accepted or duplicate for the same idempotency key. On reload after acknowledged delivery, do not resend; before acknowledgement, same-key retry is safe.
- Hash aggregate dimensions from recursively canonical JSON and persist that same canonical representation so object-key ordering cannot split one metric.

## Verification discipline

- Use fail-fast command chaining and preserve per-command output.
- A passing suite before later edits is historical evidence only. After any schema/runtime/infra/CI change, rerun every affected unit, integration, bundle, public-boundary, build, provider-template, and browser gate before reporting verified status.
- A timed-out or stale asynchronous review cannot approve later dirty-tree changes; bind reviews to `git write-tree`/commit SHA and re-review the final snapshot.
