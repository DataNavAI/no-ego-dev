# Deployment smoke and mutable-feed preflight

Use this before triggering any workflow that is intended to build an immutable candidate exactly once.

## Preflight the deployment path before the build step

1. Read the called workflow and every smoke/rollback script it invokes. List all gates, including freshness windows, expected revision checks, database/readiness requirements, public markers, environment protection, and branch restrictions.
2. Query the live deployment environment's branch/tag policy. Confirm the reviewed ref is eligible before dispatch. A job rejected before steps is not a candidate build, but it is avoidable noise.
3. If the reviewed SHA must remain unchanged and the environment allows custom branch policies, prefer a temporary policy for the exact reviewed branch over merging/rebasing a large divergent branch. Record the policy ID, remove it after the run in success or failure cleanup, and verify the original policy set is restored.
4. Reproduce the workflow's complete artifact-assembly sequence, not only its final container command. Read the Dockerfile together with every preceding workflow step. If the image copies generated assets, run the exact generator/build first and keep those outputs present through Docker construction; restoring tracked generated output before `docker build` silently packages stale files even though source tests and the image build pass. Record the generated-output identity/counts, then restore the checkout only after the digest is built.
5. Run the workflow's equivalent smoke assertions against locally generated output before dispatch. For time-sensitive content, calculate age with a trusted current clock and the exact threshold used by CI—not merely `health.ok`.
6. Confirm the immutable image tag/digest does not already exist before the one-time build. Dispatch with the exact reviewed SHA and record the run ID immediately.

## Mutable feed gate

Transport safety is not editorial safety. HTTPS, trusted outlet, source receipt, freshness, and unique links can all pass while a record is still unsuitable for an artist current card.

Require an independent editorial/provenance review of the exact refreshed inventory. Fail closed for:

- headlines naming multiple unrelated groups or artists but assigned to only one entity;
- group inference that checks group aliases but ignores named solo artists or members;
- clickbait variants (`truth`/`truths`, `revealed`/`exposed`, question framing, `shocking`, `surprise`);
- dating/romance gossip or speculation presented as current artist utility;
- cross-artist leakage even when the article itself and outlet are real.

Regression probes must generalize beyond the one observed title. Test singular/plural, prefix/infix wording, group-plus-individual combinations, unknown-but-proper coordinated names, and multiple curated groups. A short secondary-name denylist is not a general multi-artist boundary; combine the reviewed identity set with conservative syntax such as coordinated proper names where false negatives would leak content. Re-run the real refresh after hardening so rejected rows disappear from the durable inventory; do not hand-delete rows while leaving ingestion able to restore them.

The final publication gate must independently enforce the same title/entity policy. Parser-only filtering is bypassable by direct database writes, fixtures, migrations, or future ingestion paths. At the final gate, also bind provenance as a tuple: source type + allowlisted outlet label + exact approved receipt hostname/path. Never let an allowlisted label make an arbitrary HTTPS URL trustworthy.

Keep volatile inventory tests invariant-based. Deterministic fixtures prove each taxonomy and renderer behavior. Live inventory tests prove bounds, source policy, freshness, uniqueness, and nonempty/minimum inventory—not that today's feed contains every content type or an exact historical count. When a generated-output test needs a meaningful current-item minimum, derive its test clock from the reviewed inventory `updatedAt` and retain the real threshold; do not weaken `> 5` to `>= 1` merely because a hard-coded historical clock aged out.

### Diagnose a live refresh that misses its publication minimum

Do not lower the minimum, merely re-verify stale rows, or retry the same feed matrix blindly. Copy the durable inventory to a non-repo scratch file and run the unchanged parser/final gate with a diagnostic minimum of zero so fetched-versus-accepted behavior is visible without mutating production data. Record each query, parser count, accepted count, publisher, entity assignment, and publication time.

When search transport is healthy but accepted inventory is sparse, probe a bounded deterministic query matrix such as base artist terms plus product-relevant topic terms (`album`, `tour`, `comeback`). Query targeting must match the parser's identity model: if the parser authorizes group slugs, passing an individual slug as `targetArtist` can deterministically filter every result even when the search feed contains that individual. Validate query construction and target identity with a positive control before expanding the matrix.

Encode a successful expansion as a deterministic feed-plan helper with tests for exact bounded membership; then run the real refresh using the original fail-closed minimum. Only the source-backed accepted candidate may update freshness. Preserve the scratch probe as diagnostic evidence outside the repository, not as production inventory.

### Exercise the complete parser-to-refresh contract

A feed row can pass acquisition and the final publication predicate yet disappear inside refresh because refresh assumes a different representation. Before trusting `lastSuccessfulRunAt`, test the exact shape emitted by the real parser through the complete refresh candidate builder:

1. Parse a deterministic trusted-feed fixture in the same compact shape used by production acquisition.
2. Feed that result directly to the refresh builder with a later trusted verification clock.
3. Require a nonzero/minimum accepted result, the advanced `lastVerifiedAt`/`lastSuccessfulRunAt`, and a final publication-gate PASS on every emitted row.
4. Cover both supported receipt representations: canonical typed `sourceUrls[]` and compact parser `sourceUrl`. If canonical receipts exist, rewrite every bound receipt timestamp. If only the compact receipt exists, preserve it byte-for-byte and reject missing/empty receipt data. Always re-run the final publication predicate after cloning and timestamp updates.
5. Run the real bounded refresh before candidate construction and record query successes, fetched count, accepted count, errors, and the freshness anchor. A transport-success count is not an accepted-inventory count.

If a concurrent feed fan-out yields an empty candidate while an individual trusted query succeeds, diagnose the full parser→dedupe→refresh pipeline before changing thresholds or fabricating freshness. A bounded sequential/retried acquisition can validate rate-limit sensitivity, but only commit real source-backed output after the unchanged publication minimum passes. Never advance freshness metadata without accepted rows.

## Candidate and rollback evidence

After the workflow builds:

- resolve the registry digest from the immutable source-SHA tag;
- pull by digest and verify the OCI revision label equals the source SHA;
- start the exact digest locally and probe `/healthz` plus product readiness;
- run an acceptance-specific semantic route matrix against that local digest before any staging mutation (for example, every canonical path plus expected `Person`/`MusicGroup` schema), rather than relying on HTTP 200 or a generic marker;
- when production startup requires secrets, use an explicit non-secret local-only placeholder for the mandatory secret and leave external table/service variables unset unless the test requires them;
- extract the trusted release manifest/report from the image or deployed endpoint and bind it to the digest.

A local readiness failure caused only by intentionally absent external services may be documented as local-environment scope, but a wrong route, schema, generated payload, revision label, or packaged asset is an artifact rejection. Preserve the rejected digest and evidence, do not stage it, rotate to a new immutable candidate identity, regenerate assets in the correct order, and repeat immutable SHA review before constructing the replacement. Never delete and rebuild an immutable tag to hide a failed artifact.

If post-deploy smoke fails and rollback also reports failure, inspect infrastructure state separately. The previous image may have been restored successfully while its own freshness smoke fails. Verify stack status, stack image parameter, deployment revision, service operation, and live endpoint revision before deciding whether rollback actually failed.

Preserve failed candidate digests and workflow IDs as evidence. Build a replacement only after the source/data correction receives fresh immutable reviews; never overwrite or relabel the failed digest.

## Completion evidence closure

A successful workflow badge is not the complete immutable deployment record. Close the task with independently cross-checked evidence:

1. Download the workflow's staging-manifest artifact, hash its exact bytes, and verify its source ref and registry digest against the reviewed candidate. Treat this hash as the trusted manifest anchor; do not copy values from the workflow summary without checking the artifact.
2. Query the registry by the immutable source-SHA tag and record its digest/push timestamp. Query CloudFormation (or the deployment controller) for the configured image and revision, then query the runtime service operation for `SUCCEEDED`. A tag in infrastructure is acceptable only when tag immutability is enforced and the separately recorded registry digest resolves that exact tag.
3. Probe liveness and product readiness from the deployed service. Require the readiness payload's revision to equal the candidate source SHA, verify its freshness/database fields, and retain only credential-safe fields in the evidence record.
4. Read the actual smoke script. If it checks only health plus one public marker, run the acceptance-specific route matrix separately (for example, every canonical route with expected entity marker and schema type). Do not infer all-route acceptance from a generic smoke pass.
5. Record the previous image tag, previous digest, and prior revision before deployment; record the new operation/revision afterward. Preserve earlier rejected candidate identities and the exact rollback reason rather than replacing them with the successful attempt.
6. Publish one durable QA record and one issue/deployment comment that both name the candidate source SHA, immutable digest, manifest anchor, health evidence, route result, previous revision, and production-mutation status. A later documentation-only commit must not be presented as the candidate source SHA.
7. Remove any temporary environment branch policy and verify the original policy set. Remove disposable local containers/worktrees/artifacts after final immutable reviews finish.

When the local production container requires a secret merely to start, generate a throwaway shell-local value, never print or persist it, and still verify the pulled image by digest plus OCI revision label before probing health.