# Exact-head ordinary code-quality review

Use this recipe for a final read-only review of a PR or immutable commit after remediation work is complete.

## Freeze identity before inspection

Record the live PR head SHA, base SHA, draft/open state, and expected changed paths. Review from a disposable clone, detached worktree, or archive—not from a dirty shared checkout. Verify:

- `HEAD` equals the recorded PR head;
- `HEAD^{tree}` is recorded;
- merge-base equals the intended base;
- tracked and untracked status is clean;
- the diff contains only expected paths;
- the SHA-256 of `git diff --binary <base> <head>` is recorded so candidate bytes can be compared again at the end.

Treat every earlier review finding as a hypothesis to reproduce at the new head. Never copy an old verdict forward after any commit changes.

## Ordinary quality dimensions

Read each changed production file and test file in full context. Inspect:

- state invariants, identity uniqueness, capacity/backpressure, and retirement/history bounds;
- async sequencing, stale post-await writes, queue poisoning, and promise rejection containment;
- user-action interleavings after a completed/result UI is rendered but before delivery, acknowledgement, or observation awaits finish; explicitly test replay/reset/navigation controls that can replace the state the original continuation still expects;
- retry and idempotency identity across reload/replay;
- hostile accessor/Proxy substitution between validation and use;
- write semantics: distinguish operation commit from later delivery/acknowledgement, avoid false failure after an authoritative commit, and call an authoritative commit operation only once;
- trusted-adapter limits that JavaScript cannot enforce, such as detecting every transparent Proxy or recovering from a dependency that commits while falsely reporting failure;
- browser/runtime compatibility and hidden global dependencies;
- test non-vacuity, including assertions over persisted state and emitted effects rather than return values alone.

For a get/set-only storage boundary, do not demand impossible cross-tab compare-and-swap. Require the limitation to be explicit. Same-realm queue serialization is valid only for instances sharing the exact accepted storage identity; downstream adapters must reuse that identity when they rely on serialization.

## Binary parser and public-artifact remediation

When the remediated boundary parses images, archives, media containers, or other binary formats, supplement repository tests with a disposable independent probe outside the checkout. Exercise both the narrow remediation and the complete parser contract:

- valid baseline plus alternate encodings (for JPEG, include baseline, progressive/multi-scan, and restart-coded fixtures);
- marker fill/stuffing and resynchronization rules;
- marker-looking bytes inside length-delimited payloads;
- repeated legal standalone markers at multiple structural boundaries;
- malformed zero/one lengths, truncation, duplicate starts, missing terminators, trailing payloads, and concatenated valid containers;
- declared metadata versus independently decoded metadata;
- practical byte, pixel, resolution, and memory bounds.

Use a second mature implementation when available (for example `djpeg`, `file`, a platform image decoder, or an archive utility) to separate a genuine compatibility case from one decoder's behavior. Do not broaden acceptance merely because a handcrafted byte fixture looks plausible.

If compatibility requires decoder-only normalization, require this order:

1. Structurally validate the **complete original container** first.
2. Derive decoder bytes only from structurally proven standalone ranges.
3. Never strip marker-looking bytes from length-delimited payloads or entropy/stuffed data.
4. Preserve original bytes for receipt hashes, source identity, and emitted identity.
5. Keep the scan, range collection, and copy linear and bounded.

For rights-bound public media, verify every asset programmatically rather than sampling: reconcile canonical rights/source/hash/dimension fields with frozen receipts; require credits to be an exact manifest projection; prove source/review/public byte parity; independently decode the full cohort; prove excluded review-only composites remain absent; and confirm publication authority remains unavailable when deployment is out of scope.

A useful external probe should print machine-readable counts of positive and negative cases, but manually verify those counts match the cases actually executed. For async controller races, use deferred promises as deterministic gates: pause the first action after the result becomes actionable, invoke replay/reset/navigation, resume the first action, then assert the exact event key, callback count, archive/persistence shape, and final active state. A broad green suite does not negate a separately reproducible blocker. Keep the probe outside the repository and delete it with the disposable worktree after final identity evidence is captured.

For replay/outbox remediation, inspect helper return semantics rather than trusting boolean names. A pending-event loop that breaks on rejected delivery but returns “generation still current” has **not** proved complete delivery; callers must distinguish cancellation, incomplete delivery, and complete delivery. Likewise, an unacknowledged completion must not count as successfully observed. Probe failed completion delivery followed by Replay and later acceptance, then assert the original key is observed exactly once before replacement and cannot be reduced to key-only archive metadata first.

Generation checks inside an old async task do not detach its promise from new work. On open/close/route replacement, verify stale operation references are cleared synchronously while the orphaned task retains post-await generation guards. Pre-complete a successor route, block the predecessor's final sink indefinitely, replace routes, and prove Replay of the restored completed successor neither awaits nor inherits the predecessor outcome.

## Repository discovery without disturbing user work

The supplied workspace root may contain several repositories or worktrees rather than being a repository itself. Discover candidate `.git` roots, inspect their identities and status, and fetch exact PR objects from the matching repository. If the matching checkout is dirty or stale, leave it untouched and create a separate detached worktree at the live PR head. Never reset, stash, clean, or switch the contributor's checkout merely to make review commands convenient.

## Verification

Run focused tests, focused coverage where practical, the bare canonical suite, build/public/architecture checks, syntax/static checks, `git diff --check`, and current/history secret scans. A dependency audit without a dependency manifest or lockfile is not applicable, not a code failure.

Supplement committed tests with a small independent semantic probe when remediation depends on markup continuity, delegated DOM events, fallback allowlists, or responsive duplicate controls. Exercise both the positive path and adjacent negatives (for example: eligible ready-state media, ineligible fallback, canonical failure handled once, foreign/noncanonical failures ignored). Parse or isolate each repeated component before asserting its semantics; a greedy whole-document regex can cross from a broken desktop control into a correct mobile duplicate and produce a vacuous pass. If the implementation passes but the committed regression has this weakness, report it as test-hardening rather than a logic failure unless the required behavior itself is unproven.

Builds may create ignored output inside the disposable checkout. Confirm no tracked changes afterward and remove the isolated checkout.

## Re-freeze before verdict

Immediately before reporting, query the live PR again and compare its head/base to the frozen identity. Recheck local HEAD, tree, merge-base, and clean status. If the PR moved, discard the verdict and restart.

## Side effects and report format

Review authorization does not imply permission to edit, comment, approve, commit, push, mutate refs, or otherwise write to GitHub. Do none of those unless explicitly requested. Put generated diffs, deterministic probes, and reports outside the repository; after dependency installation or generation-heavy checks, require final tracked/untracked status to remain clean.

When the caller supplies verdict vocabulary, use it exactly; for approval-gate reports, the first line should commonly be exactly `APPROVED` or `CHANGES_REQUIRED`, not a nearby synonym such as PASS/FAIL. Write the complete report before optional broad checks so a long check cannot erase the review result. If later checks run, update the evidence section before checksumming.

For each blocker include severity, file/line, deterministic reproducer or concrete interleaving, consequence, and required direction. Separate blockers from non-blocking suggestions. Distinguish checks actually run from handoff evidence reused but not rerun. Include start/end PR identity, complete changed-file list, candidate-preservation digest, final staged/unstaged empty-diff digests, repository/GitHub mutation audit, and files created outside the repository. On approval, avoid speculative style padding.

Finalize report integrity only after the report bytes stop changing: compute SHA-256, write an adjacent `.sha256` sidecar, and verify it with `shasum -a 256 -c`. If verification is requested after report finalization, run the canonical suite, the external probe itself, and sidecar verification; update the report and regenerate the sidecar only when its factual evidence section changes.

When the host treats outside-repository probe scripts, reports, or checksum sidecars as changed code, verification evidence must postdate the **last** edit among those paths. Use this terminal sequence to avoid a stale-verification loop: finish probe scripts → run each probe → run canonical tests → finalize/update report → regenerate and verify sidecar → run the host-required canonical command once more without editing any listed artifact afterward. If that last run changes factual counts, update the report/sidecar and repeat the final command. Report the fresh process exit and counts; do not claim a pre-edit green run as current evidence.

Map every host-reported changed path to fresh evidence rather than treating the repository suite as universal coverage: executable probe → run that exact file; checksum sidecar → run the checker against that exact sidecar and target; repository behavior → run the named canonical suite in the exact candidate checkout. Prefer one final parallel batch after all writes, record exit zero for every member, and make no subsequent writes. If the host still reports `unverified`, repeat the same evidence batch without modifying artifacts; do not rewrite a correct report or sidecar merely to refresh status, because that creates another stale-verification cycle.

Make the final host-required canonical suite a **standalone tool invocation** whose overall process exits zero. Do not append checksum, identity, cleanup, or reporting checks to that invocation: a later unrelated failure can make the combined command nonzero and prevent the host from recording otherwise-green verification. Run ancillary checks separately. For a checksum sidecar containing a relative target filename, change to the sidecar/report directory before `shasum -a 256 -c <sidecar>` (or generate an absolute-target sidecar); checking it from the candidate checkout otherwise fails despite correct report bytes.