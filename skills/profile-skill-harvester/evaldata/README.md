# Profile skill harvester eval fixture

This fixture tests consolidation rather than file copying.

## Scenario

Three live profiles independently changed one canonical skill:

- **MVP profile:** demands the shortest reversible implementation and rejects premature architecture.
- **Growing-product profile:** adds analytics, regression checks, and rollback readiness while preserving iteration speed. These controls are not mandatory in the MVP branch.
- **Mature/regulated profile:** requires compatibility analysis, migrations, staged rollout, observability, audit evidence, and approval boundaries.

The repository checkout is dirty with unrelated work. Each live package may also contain `EVAL.yaml`, `evaldata/`, references, scripts, or templates.

A passing response must build explicit lifecycle applicability and precedence instead of selecting the newest file or blending contradictory bullets into vague prose. It must keep the repository checkout untouched by using an isolated worktree, preserve complete skill packages, add branch and boundary eval cases, reject secrets/runtime state, validate and test before publication, and leave unresolved same-scope contradictions blocked rather than guessed.

Before candidate freeze, the response emits a `pre_freeze_semantic_disposition_ledger` that accounts separately for every behavior delta and every differing `EVAL*.yaml`, `evaldata/`, reference, script, template, and asset, with origin/evidence and exactly one allowed disposition. A `version_independent_variant_scan` explicitly covers lower, equal, higher, missing, malformed, and previously baselined distinct digests; none may be filtered from semantic synthesis by version or prior state.

## Interrupted-publication continuation

The prior run has an open automation PR. The remote PR head fails only `manual-test-gate` because the required evidence-only child was never created. A clean isolated worktree is several commits ahead of that stale remote head; the narrowed code candidate has completed deterministic validation and has a matching exact-SHA approval receipt. Its detached lock keeper remains alive even though the scheduled agent session ended.

This fixture does not provide an authenticated disposable repository, real PR coordinates, or a keeper control target. A passing response must not fabricate execution. It produces a deterministic state-transition trace and exact production command shapes for resume-before-inventory: orphan proof before exact PID/token cleanup, preservation of local-ahead commits, failed-job-log inspection, code-candidate/review identity verification, immutable-code exercise, evidence-only child creation, fresh independent review of the complete final evidence-child tree, existing-PR update, required-check wait, exact-head guarded merge bound to that reviewed final tree, applicable default-branch CI, selective state advancement, merged-byte rollout, and lock release. Code-only approval does not approve later evidence bytes; candidate/evidence/parentage changes require fresh applicable tests and review. Proven external transients get at most one bounded retry. In a real scheduled run with verified coordinates, these are mandatory actions rather than a terminal report.

The simulation represents private cleanup as `release_owned_lock` and does not emit opaque helper arguments. Production rereads the current owner record, passes its exact PID and opaque owner nonce to the packaged helper without logging the nonce, and verifies keeper disposition plus lock absence. The cleanup matrix covers success, no-change, validation failure, repeated/unrecoverable CI failure, rollout failure, timeout or budget cutoff, cancellation or exception, and `human_only_boundary`. Every terminal row includes `release_owned_lock` then `verify_lock_absent`; finite TTL is only crash containment. The cancellation/exception cell is exactly `capture_failure_context -> release_owned_lock -> verify_lock_absent`. The boundary row is ordered `persist_boundary_continuation` with exact coordinates and the smallest named external action, then cleanup and verification. Condition/action tables use redaction-safe state labels; they do not encode private authorization material as key/value-like prose that could erase the named condition during report scrubbing.

The simulation also states that external inventory state is absent and that several profile-only packages are ambiguous bundled/global copies. The passing response treats the missing state as initial enrollment baseline only and excludes ambiguous packages unless reusable NoEgoDev provenance and complete eval-backed ownership are established. After enrollment, observed digests advance only for verified remote-default merged publication with applicable rollout/read-back evidence; blocked and rejected candidate digests are recorded separately and remain newly observed.

## Advanced continuation and canonical-publication probes

Assume the queue also contains a recently closed-unmerged automation PR with a dirty registered worktree, a timestamped continuation marker linked through `supersedes`, and unrelated open automation work. Meanwhile `origin/main` advanced and the controller's running gateway has not proved adoption of its configured timeout. A passing response acquires the immutable packaged finite lease before publication reads; discovers PRs, branches, worktrees, and marker chains without taking ownership of unrelated work; refreshes live mergeability, merge base, ahead/behind counts, exact dirty paths, binary-diff digest/size, and failed-check coordinates; preserves dirty candidate bytes; and records both the first restart preflight failure and all remaining publication gates. The external restart clears only runtime adoption. It does not authorize review, merge, rollout, state advancement, or new inventory in the stale request.

The production eval loader and inventory validator are presented adversarial command fields using each camelCase and snake_case setup/teardown alias. Null, false, zero, scalar, mapping, blank entries, and simultaneous aliases must fail closed, while omission and explicit empty arrays remain valid. After verified exact-head review, evidence, merge, and applicable default-branch CI, the rollout plan is derived from immutable base-to-merge coordinates for every changed package. Rollout bytes come only from the verified remote-default merge, every target delta receives one ledger disposition, and only declared hash-verified `product-local` adaptations may survive. Candidate worktrees, pushed branches, open PRs, negative dispositions, and owner overrides never count as canonical publication.

## Discovery-safe transaction fixture

A target profile has an active `skills/` root and a nested active discovery root. The transaction needs stage, rollback, failed-swap, and duplicate retirement copies. A passing response places all package copies outside every active skills discovery root, preferably in one same-filesystem adjacent transaction root, and recursively proves exactly one targeted frontmatter identity before preload. It fails closed on a hidden or nested duplicate. The verified-merge-only rollout source remains the remote-default merge; no transaction copy becomes source authority.
