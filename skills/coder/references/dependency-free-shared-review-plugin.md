# Dependency-free shared review plugin integration

Use this pattern when many static mocks need one authenticated, centrally hosted component-comment system without adopting a frontend framework.

## Product and trust boundaries

- Keep `project/mock`, immutable source revision, and allowed legacy storage keys in a same-origin, hub-generated configuration file. Do not accept page globals as provenance.
- Load the dependency-free host adapter before the shared plugin. The adapter may expose route read/navigation callbacks, but it must not supply identity or revision.
- Reviewer UI may create/list/show/refresh/export. Keep response, resolve, reopen, and soft-delete behind a separately authenticated agent CLI/API path.
- Route values must remain inside the exact mock prefix and may contain only a safe pathname plus optional hash. Pass validated routes to the host callback; never navigate directly to stored arbitrary URLs.

## Static host integration

1. Preserve semantic `data-review-id` and human-readable `data-review-label` attributes through every dynamic render.
2. Call the plugin's idempotent `decorate()` after each host rerender. Do not pass a route string or view token where the plugin expects no argument or a DOM root.
3. Prefer a host-owned comments control (`data-ned-review-trigger`) in existing navigation. The plugin must not impose floating-trigger classes/styles on a host-provided control.
4. Keep plugin pins visually smaller than their 44×44 hit targets. Put decorative count content in a pseudo-element/data attribute, and keep pin z-index below fixed host navigation while panel/backdrop remain above the app.
5. In DOM-property helpers, set boolean properties with booleans. `node.hidden = ''` coerces to `false`; use `hidden: true` for initially closed panel, backdrop, and retry controls.
6. Listen for Escape at document scope while the modal is open, because focus can temporarily fall outside the panel after async rerenders. Keep Tab containment, background `inert`, scroll lock, close-button behavior, and focus restoration independently tested.

## Legacy browser-data migration

- Never clear or overwrite the original browser-local key during migration.
- Separate **batch-fatal** failures from **record-recoverable** failures before POST. Malformed JSON, an oversized/over-limit payload, or any duplicate/canonical-ID collision rejects the whole batch with zero POST and no receipt. Individually invalid non-colliding records are counted and skipped while every recoverable record migrates.
- Canonicalize unsafe IDs deterministically from exact UTF-8 bytes. Compute canonical IDs for every string-ID record—including otherwise-invalid records—before deciding collisions, so an invalid duplicate cannot evade the batch collision gate.
- Persist a versioned pending envelope **before the first POST**, bound to the exact raw-value hash, source revision, original ID set, and complete immutable request payload (including fallback timestamp and viewport). A committed-but-lost response followed by reload or viewport change must replay byte-identical request bytes.
- Treat present-but-malformed, tampered, duplicate-item, raw-hash-mismatched, or stale-revision pending state as uncertain history: fail closed with zero POST and keep recovery export available. Never silently rebuild it because the original payload may already have committed. If the pending envelope cannot be stored, do not POST.
- Write the per-key migration receipt only after every accepted record is confirmed by 200/201. Remove valid pending state only after the receipt is safely stored; if receipt storage fails, retain pending state for idempotent retry/readback.
- Build receipt mappings with a null-prototype dictionary or `Map` converted to own JSON properties. Assert allowed prototype-shaped IDs such as `__proto__` survive as exact own old→new entries; a plain `{}` accumulator can silently serialize an empty mapping while claiming migration complete.
- Export reviewer-visible shared comments **plus the exact raw configured legacy value** in a structured recovery field, so rejected records remain recoverable after the bespoke local exporter is removed. Preserve the raw string byte-for-byte when the export JSON is parsed.
- Treat legacy disposition as untrusted browser provenance, not current authorization. A browser-supplied `legacyStatus: resolved` may be returned/displayed as “previously resolved locally,” but every reviewer-created server record starts `open`; only the separately authenticated agent path may resolve it. Record the provenance in audit activity without claiming a NED disposition.
- Render imported bodies and provenance notices with `textContent`, not HTML.

## Shared API and agent recovery boundaries

- After a conditional-create failure, use a **strongly consistent** point read before deciding idempotent success versus `ID_CONFLICT`. An eventually consistent miss can turn a legal lost-response retry into a false conflict.
- Validate stored routes after percent-decoding and reject decoded `.`/`..` segments, repeated slashes, controls, backslashes, schemes, queries, protocol-relative forms, and paths outside the exact mock prefix. Prefix checks alone accept traversal aliases.
- Mutation readback must be strongly consistent for the agent's exact per-mock query. Reviewer browsing may remain eventually consistent, but an uncertain write cannot be verified from a potentially stale read.
- Classify network loss, timeout, malformed successful JSON/contract, and 5xx after PATCH transmission as uncertain. Read back even when response parsing fails. If unchanged, retry the exact immutable PATCH once; **regardless of whether that retry succeeds, reports stale, is malformed, or is uncertain**, perform one final strongly consistent readback and accept only the exact action-specific postcondition with a strictly newer concurrency token.
- Bind production workflow dispatch to the reviewed release branch/ref in workflow logic before checkout or credentials. Environment approval alone does not prevent an approved dispatch from an arbitrary branch.
- Separate owner topology authority from routine CI release authority. An owner bootstraps IAM boundaries, API Gateway, CloudFront, DynamoDB, logs, buckets, edge-auth/token changes, and teardown. The CI CloudFormation role gets read-only discovery plus mutation only for exact already-existing deployable functions/artifacts; it has no API Gateway/CloudFront/IAM/DynamoDB/log-group/bucket topology mutations, even when those APIs require `Resource: '*'`.
- Keep a fixed runtime-role permissions boundary for exact table/config/log access so replaceable application code cannot escalate.
- For a retained first-created DynamoDB table, prefer `DeletionPolicy: RetainExceptOnCreate` plus `UpdateReplacePolicy: Retain`: failed first rollout cleans up for a retry, while every successfully established table remains protected. Owner-run teardown records and recovers retained tables; routine CI does not receive table-delete authority.

### Required API/CLI/infrastructure regressions

- conditional create failure verifies `ConsistentRead=True` before returning idempotent 200 or conflict;
- percent-encoded and literal dot-segment routes reject before storage;
- agent per-mock readback is strongly consistent;
- malformed 2xx and 5xx PATCH responses classify as uncertain and still trigger authoritative readback;
- uncertain PATCH + stale unchanged read + retry `STALE_RECORD` still performs final readback and recognizes the first commit;
- production manual dispatch from a non-release ref is skipped before cloud credentials;
- deployment-role templates contain no broad service wildcard and no API Gateway/CloudFront/IAM/DynamoDB/log-group/bucket topology mutation in routine CI;
- runtime roles carry the fixed permissions boundary, while routine CI cannot create/remove/replace the boundary or role policy;
- first-create rollback uses `RetainExceptOnCreate`/`Retain`, with destructive retained-table recovery reserved for owner operations.

### Required migration regressions

- mixed valid + invalid records: valid POSTs occur, invalid count is retained, raw export remains exact;
- duplicate/collision batch, including valid + otherwise-invalid duplicate ID: zero POST, zero receipt, zero pending state;
- malformed, >1 MiB, and >500-record inputs: zero POST and exact raw recovery export;
- server commit + lost response + reload at a different viewport with a fallback timestamp: second POST body is byte-identical;
- corrupted/stale pending envelope: zero POST, explicit recoverable status, raw export intact;
- malformed/mismatched 2xx create response: no receipt, pending payload and exact raw recovery remain;
- prototype-shaped allowed original ID such as `__proto__`: receipt contains an exact own old→new mapping entry before pending state is removed;
- `legacyStatus=resolved` without agent credentials: public historical claim retained, current status remains `open`, `resolvedAt` remains null;
- original legacy source stays byte-for-byte unchanged in every path.

## Verification recipe

- Unit-test initial hidden state, host-provided trigger styling, all cursor pages, hostile literal text, route validation, deterministic ID mapping, uncertain-create retry, migration receipt timing, and source-revision refresh.
- Build a temporary outside-repo overlay containing the real static mock plus shared assets/config and an in-memory API implementing the wire contract.
- Seed the real legacy local-storage schema, then verify migration count, source preservation, receipt creation, shared create/readback, reviewer permission boundaries, route-aware Show, focus restoration, and no console/page errors.
- Visit every host route and assert one visible `h1`, unique review IDs, loaded images, no horizontal overflow, and zero axe violations.
- Recheck required viewports (for example 320×844, 390×844, 1440×900) and visually inspect screenshots. Full-page screenshots repeat fixed navigation at the viewport boundary; use geometry and an ordinary viewport screenshot to distinguish capture artifacts from real overlap.
- Restart the in-memory server between migration runs so idempotent fixed IDs and retained comments do not create false count failures.

## Release sequencing

1. Commit, independently review, and merge the product-host migration.
2. Pin the canonical merge SHA and every legacy storage key in the hub manifest; update the hub's immutable source checkout.
3. Regenerate the **tracked** release snapshot. Require shared JS/CSS/config in the build manifest, no deleted bespoke assets, exact revision/key binding, and clean-archive execution of the deployment verifier. A scratch build is not deployable evidence.
4. Freeze and independently review the resulting hub tree. Any generated file/digest or manifest change invalidates earlier hub approval.
5. Owner-bootstrap shared API/topology and boundaries before routine CI; infrastructure failure must stop before static publication.
6. Verify staging reviewer and agent paths before production.