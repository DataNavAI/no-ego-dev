# API-to-Consumer Contract Audit

Use this audit when an API response must survive consumer state, presentation, caching, and a later action. Bind every result to the immutable candidate and authoritative current contract.

## Journey ledger

Trace each journey as `request → response → retained caller state → next action`. Record raw canonical identifiers and opaque continuation values separately from display labels. Verify which catalog or allowlist authorizes each selectable value and when membership is revalidated.

## Adversarial probes

1. **Continuation integrity:** replace, truncate, replay, and stale an opaque continuation. The consumer must preserve valid bytes exactly and fail closed on malformed or expired values rather than inventing a cursor.
2. **Stale cache:** change catalog membership after cache fill. Revalidate every read and immediately before a dependent write; stale cached selection cannot authorize the mutation.
3. **Display-as-ID:** make two records share a label and make one label resemble an ID. Assert the raw canonical ID—not presentation text—is submitted.
4. **Consumer state loss:** navigate, rerender, paginate, retry a read, or restore a session between response and next action. Assert required raw state remains bound to the selected record or the consumer forces reselection.
5. **Catalog membership:** remove, disable, or replace the selected item between read and write. The write must reject stale membership deterministically.
6. **Double submit:** trigger keyboard/click concurrency and replay the same request. Require one idempotency identity and one durable outcome.
7. **Ambiguous write/readback:** simulate timeout, malformed success, connection loss, and 5xx after server acceptance. Require authoritative readback before retry; never blind-retry an irreversible write.

## Verdict rules

A green server unit test does not close a consumer contract. Fail when the consumer loses canonical state, presents future design as current behavior, trusts stale cache for a write, or cannot distinguish a rejected write from an accepted-but-ambiguous write. Report the smallest reproducible false-success path and the missing current-contract evidence.
