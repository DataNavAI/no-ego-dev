# Time-sensitive generated inventory before staging

Use this when a candidate has already passed immutable gates but staging happens later, or when tests generate pages from reviewed/live content with freshness and moderation rules.

## Failure pattern

A canonical test may have passed earlier yet fail before staging without any source-code change because:

- current time crossed a publication/freshness boundary;
- reviewed content moved from publishable to stale or unpublishable;
- generation now emits fewer current items;
- a test assumed every supported content taxonomy had a currently publishable example;
- checked-in generated output and newly generated output represent different inventory snapshots.

The old green result remains truthful for its time, but it is not current staging evidence.

## Required pre-stage sequence

1. Confirm the exact candidate SHA and clean worktree.
2. Run the project's canonical test command **bare**, including its normal generation presteps. Do not inject a historical clock unless the production pipeline itself is fixed-clock.
3. Run the canonical build separately and record generated/publishable counts.
4. If either command changes tracked generated output, restore it immediately after capturing results unless publication is explicitly required.
5. If a test fails, reproduce the narrow test and inspect both the source inventory and generated inventory at the timestamp used by the test.
6. Distinguish:
   - a product failure (required inventory unexpectedly absent), from
   - a brittle test (test requires a volatile sample that the contract does not promise).
7. For a brittle test, preserve coverage by:
   - fixed fixtures for positive type/renderer behavior;
   - explicit assertions that reviewed but unpublishable rows fail the publication gate;
   - actual current inventory checks that assert only promised minimums, not one row per taxonomy.
8. Observe RED, apply the smallest test-boundary correction, then rerun the full generation-plus-test pipeline and build.
9. Any correction creates a new candidate SHA. Repeat pre-commit review and every immutable gate required by the plan.

## Reviewer clock and restored generated output

Generated-output restoration creates two legitimate but different snapshots: the tracked baseline and the disposable candidate build. Do not let a reviewer combine the baseline's old `generatedAt` with newer source rows.

Before restoring disposable output:

1. Record the evaluation clock, source revision/tree, source-inventory timestamp, generated counts, and hashes of the generated manifest/report in a uniquely named non-repo evidence snapshot.
2. Record that the tracked generated tree will be restored and is **not** candidate inventory evidence.
3. Give reviewers the frozen disposable evidence path and authoritative clock explicitly.
4. Require the evaluation clock to be valid for the source rows: it must not predate their publication timestamps beyond the defined future-skew allowance, and freshness must still be measured against a trusted current clock.
5. If a reviewer evaluates July 22 source rows at a restored July 20 `generatedAt`, classify the verdict as methodologically invalid and rerun the unchanged snapshot with the correct clock; do not modify source code to satisfy an impossible pre-publication clock.

Prefer trusted current UTC for mutable current-inventory review. A source `updatedAt` may be used only when the contract explicitly treats it as authoritative and it is independently validated. Never silently substitute a caller-controlled clock for production freshness evidence.

## Anti-patterns

- Deploying because “this SHA passed yesterday.”
- Refreshing production-like data merely to make a test fixture exist.
- Weakening the publication gate so stale or unreviewed content satisfies a test.
- Silently skipping the missing type while losing all positive coverage for that contract.
- Debugging against stale checked-in generated output when the canonical command regenerates first.
- Leaving thousands of generated-file changes in the worktree after a failed test or build.

## Preflight before a build-once deployment

When the deployment workflow is supposed to build the candidate exactly once and then deploy that same digest, validate every post-build smoke input **before** dispatch:

1. Read the smoke script and identify freshness clocks, expected revision, database-readiness checks, public markers, and target URL selection.
2. Evaluate those checks against the candidate's committed/generated inputs. A live database refresh does not help when `/health` reports freshness from a static file baked into the image.
3. Inspect repository-environment branch policies before dispatch. A workflow may be callable from a feature branch while the target environment still permits only `main`. Prefer an exact temporary custom-branch policy when the frozen candidate cannot safely merge/rebase; record its ID and remove it after the deployment attempt.
4. Confirm the immutable registry tag does not already exist. A rejected workflow that failed before any steps did not build a candidate; a workflow that reached image push did, even if later smoke or deployment failed.
5. After image push, resolve and record the registry digest immediately, then pull/run the image **by digest** with safe local-only placeholder configuration and verify the embedded source-revision label plus health/readiness endpoints. Do not rebuild merely to perform container verification.

## Failed smoke and rollback interpretation

- If post-deploy smoke fails, preserve the failed image digest and logs as evidence; do not overwrite or reuse its immutable tag.
- Separate workflow conclusion from infrastructure state. A rollback step can restore the previous image successfully and still end `failure` because its follow-up smoke also rejects stale previous data.
- Verify rollback independently through the provider control plane and live endpoint: stack status, configured image/revision, service operation, live reported revision, and readiness payload. Never infer rollback success or failure from the Actions badge alone.
- If the blocker requires refreshed committed inventory or a test-boundary correction, create a **new SHA**, rerun canonical/build/browser checks and immutable reviews, and build one replacement candidate for that new SHA. Do not rerun the image build for the old SHA.
- Remove any temporary environment branch policy after the final attempt reaches a terminal state, whether deployment succeeds or fails.

## Evidence to record

- current UTC timestamp;
- candidate SHA and clean status;
- exact bare commands;
- test totals;
- generated artifact and publishable-item counts;
- the source-vs-generated inventory distinction;
- restoration/cleanup confirmation;
- workflow run ID and whether failure occurred before or after image push;
- immutable registry digest and embedded source revision;
- environment branch-policy change and restoration;
- provider control-plane state plus live revision after deploy or rollback;
- smoke failure reason, including the exact freshness source/age when applicable;
- new SHA and fresh review verdicts if a correction was necessary.
