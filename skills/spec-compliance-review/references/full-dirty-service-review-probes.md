# Full-dirty reusable service review probes

Use this checklist when a dirty pre-commit implementation spans browser UI, an authenticated CLI/API, cloud infrastructure, generated release artifacts, and tests.

## Boundary closure

1. Capture `git status --short --untracked-files=all`.
2. Inspect tracked diffs and every untracked source/test/config/lockfile separately; `git diff` omits untracked files.
3. Read the authoritative PRD, technical spec, UX contract, QA plan, deployment workflow, and current generated release snapshot together.
4. Run the same top-level verifier invoked by CI/release, not only fixture-based unit tests. A test suite can pass while the committed snapshot fails its real verifier or omits generated integration assets.

## High-value cross-layer probes

- **Credential-bearing URL validation:** test HTTPS URLs with userinfo (`https://trusted.example@attacker.example`), arbitrary ports, paths, queries, and fragments. A “clean origin” validator must reject username/password, not merely require HTTPS and a netloc. Trace access tokens in paths and authorization headers across redirects.
- **Mutation readback monotonicity:** a verified write token must be strictly newer, not merely different. Probe an older historical record that has the desired status/response. This matters when reads are eventually consistent and transport outcome is uncertain.
- **Modal inert restoration:** open the dialog twice through every public/host API, close once, and assert all nodes return to their original inert state. Reinitializing the restoration list while already open can permanently disable the host page.
- **Release/deployment closure:** verify that generated assets/config are present, the current product integration actually loads them, source pins/allowlists are updated, and the deployment path provisions infrastructure rather than only uploading static files.
- **Recovery/export closure:** for migration, inject valid, invalid, duplicate, partially uploaded, and lost-response records. Confirm the receipt is delayed, local source is untouched, and every skipped record remains recoverable through the promised UI/export path.

## Static-first cloud MVP closure

For static web + CDN + serverless API candidates, trace the complete build/promotion/rollback transaction rather than reviewing each file in isolation:

- **Candidate identity:** require a clean tree, an explicit full commit SHA, approved-branch ancestry, and workflow checkout pinned to that SHA. `git diff --check` proves whitespace only; it does not prove cleanliness or artifact identity. Manual dispatch from an arbitrary ref is not immutable promotion.
- **Portable provenance:** run CI-sensitive content/compiler tests in a checkout that lacks the developer's private evidence directories. Reject absolute home paths and evidence packages that are neither committed nor fetched through a pinned digest. Validate evidence paths lexically and by realpath containment; do not expose a production-callable receipt/hash bypass merely to simplify mutation tests.
- **Static bundle closure:** require the promised manifest to enumerate every deployed object with hash, bytes, and media type. Verify hashed-asset naming, shell/release cache policy, scanner coverage over HTML/JS/CSS/JSON/binary members, and rejection of unlisted remote objects—not only local path-name checks.
- **Immutable publication:** probe destination-exists-before-start and destination-appears-during-upload races. A list-then-sync sequence is not write-once. Digest-addressed Lambda archives need the same no-overwrite or byte-equality rule as static prefixes.
- **Expand/promote/contract:** verify candidate/prior API compatibility before moving static delivery; require the prior identity rather than accepting an empty optional input; wait for CDN convergence; then contract only in a later release. Rollback must reverse this order without rebuilding.
- **Workflow/IAM isolation:** inspect executable OIDC subject/audience restrictions, environment-specific roles, exact stack/prefix/distribution scopes, and closed `iam:PassRole`. Documentation and secret names do not prove least privilege.
- **Lambda package/version/alias:** inspect the real ZIP member path against the handler, import the bundle with production-shaped environment, verify versions consume the expected code digest, and ensure every invoker targets the alias. Scheduled functions need their own usable log-group permissions.
- **Operational truth:** reconcile runbook claims against actual schedules, alarms, log retention, budget resources/readback, PITR/TTL, notifier-failure metrics, content-health checks, restore automation, and rollback probes. A runtime branch for a scheduled event is dormant if infrastructure never emits that event shape.
- **Browser analytics:** capture exact production network requests from real UI activations. Verify event presence, exact count, stable retry key, and an accepted-state marker across rerender/reload. Schema acceptance tests do not prove emitters exist or derive the right route/entity context.
- **Truthful state coverage:** inspect normalization/compiler cardinalities for assumptions that force every row into `ready`. Exercise honest empty, partial, stale, unavailable, and offline states through the final browser path, plus every required local-state/route migration.

## Disposable-probe cleanup and verification receipts

1. Keep adversarial probes outside the reviewed checkout or in an isolated copy.
2. If a copied checkout omits `.git`, supply every required immutable identity input explicitly (for example `GIT_SHA`) rather than interpreting `git rev-parse` failure as a product defect.
3. Remove the disposable probe before the final canonical run. If verification tooling tracks changed paths outside the repository, delete the complete disposable workspace rather than merely restoring one file.
4. Finish with one relevant canonical command in the actual Git checkout and require process exit zero. Preserve the earlier adversarial failure as bug evidence, but do not let it become the final verification receipt.
5. Recheck the reviewed source identity after any concurrent mutation; rerun only evidence affected by the changed bytes, but do not claim a final candidate-bound verdict until the identity is stable.

## Test adequacy rule

For each discovered bug, identify why green tests missed it and add the absent adversarial shape to the review matrix. Prefer tiny deterministic probes that exercise production functions over restating the implementation in a new harness. A broad green Playwright suite is insufficient when it only checks that POST bodies have an event key; assert canonical event names, semantic properties, exact activation counts, and post-acceptance persistence.
