# Cross-authority projection and recoverable release state

Use this when a technical design projects approved product/editorial states into a runtime schema or uses independently movable deployment pointers.

## Product authority before runtime projection

A technical spec cannot resolve contradictory approved product meanings by inventing a runtime field or private review object.

1. Locate the exact approved product state table and the closed signed-review schema.
2. For every projected state, name the authoritative private record class, record ID, substantive digest, lifecycle value, reviewer envelopes, and release binding.
3. Verify that the approved enum actually permits that record class. A plausible new class is still unauthorized.
4. Make similar states mutually exclusive through an objective producer invariant independent of display count. Example: `not_connected` means no production-enabled, doubly reviewed mapping authority; `empty` means that authority exists and a bounded valid import explicitly yielded zero records.
5. If the approved contract is ambiguous or contradictory, revise and independently approve the product candidate first. Never let architecture prose silently amend immutable product authority.
6. Label old hash-bound schema/compiler evidence baseline-only when the target projection is future. Land target private schema, public schema, compiler, golden/hostile fixtures, and new digest as one atomic gate.

## Durable release-state authority

Independent API/static pointers make phased deployment representable but do not make it recoverable. The rollback authority must define:

- one private durable location and exact key;
- closed schema/version, phases, generation and operation ID;
- **exact nested** current/prior/candidate tuple keys, scalar formats, first-deploy null/absence rules, and phase-specific required/forbidden combinations—not only prose saying each tuple “contains all digests”;
- owner/ACL and explicit denial to app/runtime/public delivery;
- executable retention/versioning: name the mechanism (for example Object Lock, lifecycle/noncurrent-version retention, deletion denial, and/or stack retention), duration, and every principal—including bootstrap owners—that can delete history; “versioning and retention preserve generations” is not an exact policy;
- conditional create and ETag/generation CAS updates;
- intent persisted before every external mutation;
- actual-state readback after every mutation;
- deterministic reconciliation against stack parameters, Lambda alias/version, CDN origin/config ETag, health, and public revision;
- an exhaustive phase × recorded pointers × actual pointers × health transition table defining resume, finalize, rollback, or fail-stop; “only documented combinations may resume” is insufficient when the combinations are not enumerated;
- idempotent handling of failures before mutation, after mutation, after public convergence, and before state persistence;
- unknown-state fail-stop and concurrent-deploy rejection;
- no-rebuild rollback and post-rollback convergence proof.

A stale state record must never blindly roll back a healthy converged candidate. Triangulate actual pointers and health, then resume finalization or perform an evidence-backed rollback.

## External side-effect cardinality across crashes

Treat claims such as “issue exactly one delete/update/create request” as distributed-systems contracts, not descriptive prose.

1. Identify the crash window after the provider accepts the request but before local persistence or provider status readback changes.
2. Restart from the exact durable record plus the still-old provider observation. If the same transition issues the request again, the design is not exactly-once.
3. A local pre-request marker merely moves the ambiguity: a crash after writing the marker but before sending cannot distinguish “not sent” from “accepted but not yet observable.” Status alone is insufficient when provider state can lag request acceptance.
4. Accept exactly-once issuance only when the provider exposes a durable idempotency token, command ID, request record, or equivalent acceptance identity that reconciliation can read back. Persist and bind that identity before or with the request.
5. Otherwise require **idempotent at-least-once issuance**, prove duplicate provider calls are safe, and test eventual convergence. Distinguish request cardinality from the actual safety outcome, such as eventual stack absence with no DNS creation and no restoration of an unrelated pointer.
6. Derive fixtures for crash before send, after acceptance while status remains unchanged, during propagation, and after terminal convergence.

Do not approve “exactly once using resource ID/status” unless those values uniquely prove request acceptance; an assertion in an action cell does not create atomicity across the provider boundary.

## Monitoring-path independence

A cloud missing-heartbeat alarm detects watchdog absence, but cannot detect failure of its own metric/evaluator/notification path. If independence is claimed:

- route watchdog process absence through the cloud alarm channel;
- route metric publication, alarm readback, and notification-config readback failures through a separate external channel;
- deduplicate bounded failure/recovery transitions;
- inject failures while public probes remain healthy;
- prove configured-state and return-to-healthy readback;
- state the irreducible simultaneous failure of both delivery platforms as an accepted external dependency rather than claiming impossible self-reporting.
