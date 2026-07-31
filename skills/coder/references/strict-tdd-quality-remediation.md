# Strict TDD for Final Quality Remediation

Use this pattern when a nearly complete task has a small number of review findings and the user requires strict RED→GREEN evidence plus an exact-scope commit.

## One vertical cycle per finding

1. Identify the narrow observable contract behind one finding.
2. Extend the existing real runtime/fixture harness only enough to inject the failing boundary; harness changes are test apparatus, not production behavior.
3. Add one focused behavior test.
4. Run that test alone and preserve the expected assertion failure. A syntax error, fixture error, or unrelated failure is not valid RED evidence.
5. Make the smallest production change that satisfies the contract.
6. Re-run the focused test to GREEN before starting the next finding.
7. Repeat for each remaining finding; do not write all tests first and then all implementation.

## Preserve verification headroom

A final-remediation session is incomplete without broad verification and exact staging, so budget work accordingly.

1. Inventory all findings and identify shared valid fixtures before the first edit.
2. After a new exact field becomes mandatory, update the shared valid fixture in the same vertical cycle; otherwise unrelated tests fail for the wrong reason.
3. Run focused GREEN immediately after each production patch. Do not accumulate multiple unexecuted model, renderer, data, and test changes.
4. Batch independent reads and coherent atomic edits, but retain one observable RED→GREEN checkpoint per finding.
5. Reserve enough execution/tool-call budget for the whole feature file, canonical test/build, generated-output restoration, diff review, and exact staging.
6. If budget becomes constrained, stop adding behavior and run the strongest available syntax/focused verification. Report the exact incomplete state; never stage or claim completion after unverified late edits.

## Event-specific taxonomy validation

A shared union allowlist is unsafe when multiple canonical event types reuse a property name with different legal values. Define validation by event type:

- Build an explicit event→allowed-values matrix.
- Test every positive value for each event.
- Feed each event the other event's values and assert fail-closed behavior: no throw, no network request, and no persistence.
- Assert shared fixed fields such as `module` retain their exact required value.
- Keep the valid baseline active so hostile-input tests cannot accidentally disable all sends.

This catches cross-event laundering that a broad union allowlist misses.

A token-shaped value is not necessarily a valid taxonomy value. When the product already defines a closed content/event vocabulary:

- Hoist one immutable exact allowlist and use it at both the delegated DOM boundary and the canonical sender boundary.
- Test every valid value, every cross-event value, and at least one plausible but invented snake-case value such as `invented_taxonomy`.
- Assert invalid values produce no throw, fetch, persistence, or forwarding.
- Avoid rebuilding schema maps/sets on every send when the contract is static.

## Authoritative truth vs downstream hydration

Do not let an outer catch erase authoritative state because optional hydration failed later.

1. Isolate the authoritative request and validation in its own try/catch.
2. Set truth-bearing state immediately after that boundary succeeds.
3. Put cache writes, follows/preferences fetches, rendering, and home/feed hydration in a separate contained block.
4. Only authoritative request/response failure may reset the authoritative state.
5. Downstream failure should preserve the authoritative state, show the existing truthful error UI, and resolve without an unhandled rejection.
6. Keep explicit login/signup/signout transitions responsible for their own state changes.
7. In those explicit transitions, update authoritative in-memory truth **before** localStorage, cache, render, follow, or navigation work. Browser storage is fallible under privacy/security/quota policies.
8. Make cache writes/removals best effort in narrow guards. A storage exception must not leave a successful sign-in reported as signed out or a completed sign-out reported as signed in.

Inject a downstream failure in the real browser harness (for example, a failed follows response) and assert analytics/UI context still reflects the authenticated server session. Retain a stale-cache negative test for invalid session responses. Also inject throwing storage setters/removers around successful sign-in and sign-out and assert subsequent canonical events use the authoritative state.

For storage-failure auth tests, drive the real generated/runtime transition rather than calling a detached state setter: return a successful auth response, make `localStorage.setItem` or `removeItem` throw synchronously, assert the transition promise does not reject, then perform a canonical click and inspect its emitted `signed_in`. Guard user and follow cache operations independently so the first storage exception does not skip later best-effort cleanup.

### Account-bound cache isolation at boot

Treat cached user identity, follows, preferences, and other account-owned state as non-authoritative until the server identifies the current session. This prevents account A's browser cache from briefly rendering or mutating account B's state.

1. Initialize boot-time in-memory auth and account-owned collections to signed-out/empty; do not preload them from `localStorage` for rendering or mutation decisions.
2. After a valid server session identifies the user, install that user immediately, then explicitly clear every account-owned collection **before** awaiting its hydration request.
3. Install hydrated collections only after an HTTP-successful, application-successful, strictly normalized response. Failed or malformed hydration must leave the authenticated user authoritative and the collection empty.
4. Same-session successful mutations may still update in-memory state and persist best-effort cache copies; the prohibition is on trusting those copies across a fresh boot/session boundary.
5. In the real browser harness, seed a complete valid cached user A plus an owned item, resolve the server session as user B, and fail the collection fetch. Assert all of the following:
   - before session resolution, cached identity/ownership is absent from active render state;
   - after resolution, user B remains signed in and the active collection is empty;
   - the relevant control visibly renders unowned/unfollowed;
   - the next mutation uses the create method (`PUT`/`POST`), never a stale-cache-driven delete;
   - successful same-session mutation still renders and persists the server-returned collection.
6. If an older test asserted cache preload behavior, migrate it to exercise the same normalization/copy-isolation contract through the active state setter or successful server hydration. Do not preserve a contradictory cache-preload expectation merely to retain a stale implementation detail.

A state-only assertion is insufficient when the bug is visible or affects mutation direction. Register the real control in the harness before hydration, allow the runtime's actual `render()` to update it, and inspect both its visible/ARIA state and the captured HTTP method.

## Acknowledgement-gated cross-stream ordering

When one event stream may emit a downstream completion only after a shared upstream event is accepted, test **accepted order**, not merely call or attempted-delivery order.

1. Use the real shared controller plus the real downstream analytics/state authority in one integration harness.
2. Record attempted events separately from accepted events. Make the upstream sink return a truthful non-success receipt for only the predecessor event while the downstream sink would accept completion.
3. In RED, assert the retained predecessor remains unacknowledged, the downstream completion observer is not called, downstream state remains active/incomplete, and no downstream completion appears in the accepted stream. The expected failure should expose premature observation, not a fixture or schema error.
4. In GREEN, gate observation on the retained predecessor's authoritative `acknowledged === true` state. Do not infer acknowledgement from route state, completed UI, an attempted send, or a generation guard.
5. Recreate the controller against the same storage to model reload/retry. Accept the retry, then assert:
   - the exact retained predecessor event key is reused;
   - predecessor acknowledgement becomes true before downstream observation;
   - the accepted stream has the exact required predecessor→successor order;
   - the downstream completion is accepted exactly once.
6. Keep generation/stale-route guards independently tested: acknowledgement is an ordering prerequisite, while generation ownership prevents stale effects. Neither substitutes for the other.

This pattern applies to Challenge→learning, upload→publication, payment→fulfillment, durable write→notification, and similar cross-stream handoffs.

### Existing-PR remediation branch safety

For a blocker fix on an existing PR branch, preserve recoverability without overwriting concurrent work:

1. Read the live PR head and `ls-remote` branch head before creating the isolated worktree; both must equal the reviewed blocker SHA.
2. Build the worktree from that exact SHA and keep the blocker review immutable as the RED authority.
3. After focused GREEN, commit only explicit paths and push back to the existing PR branch with an exact `--force-with-lease=<ref>:<old-sha>` (or a normal fast-forward push when policy requires it). Never use an unqualified force push.
4. After broad verification, read back local HEAD, remote branch head, and PR head; require exact equality and a clean worktree.
5. Update the PR body only when evidence became stale (for example, test counts, scan scope, or remediation behavior). Preserve draft/unmerged state unless promotion was explicitly requested.

## Verification and exact scope

Run, in order:

1. Each focused RED→GREEN case.
2. The complete task-specific slice.
3. The whole feature test file/package.
4. The repository's bare canonical test command.
5. The bare canonical build command.

If canonical verification regenerates tracked output, restore only the generator-owned tree after each canonical command. Do not stage generated churn unless it is part of the requested fix. Before committing:

- run `git diff --check`;
- inspect the full diff;
- stage explicit paths only;
- assert the staged path count/names;
- commit;
- verify the final SHA, exact committed paths, and clean worktree.

Report RED failures, GREEN counts, canonical test/build results, exact committed files, SHA, and whether generated churn was restored.