# Profile skill harvester eval fixture

This fixture tests consolidation rather than file copying.

## Scenario

Three live profiles independently changed one canonical skill. Their frontmatter versions are deliberately misleading: the MVP and mature variants both claim `5.0`, while the growing-product variant claims the lower `2.4` and was already baselined in inventory state.

- **MVP profile:** demands the shortest reversible implementation and rejects premature architecture.
- **Growing-product profile:** despite its lower, previously baselined version, adds analytics, regression checks, and rollback readiness while preserving iteration speed. These controls are not mandatory in the MVP branch.
- **Mature/regulated profile:** requires compatibility analysis, migrations, staged rollout, observability, audit evidence, and approval boundaries.

The active global/default installation also contains an updated `product-communication` package that is absent from the canonical repository. Although the local package validates, copying it directly into sibling profiles would create a live-only update with no durable canonical source. The passing behavior must add the complete package and eval coverage to the isolated NoEgoDev candidate, merge it into the remote default branch, and only then roll the merged bytes out. If publication cannot complete, the package remains undeployed and its state does not advance; the run records durable continuation coordinates or a stable blocked/rejected reason.

The repository checkout is dirty with unrelated work. Each live package may also contain `EVAL.yaml`, `evaldata/`, references, scripts, or templates.

A passing response must inspect every lower, equal, or higher version package and treat version as metadata, not authority. Baselined divergence still participates in synthesis. It must produce a semantic disposition ledger that classifies every distinct behavior/support-file delta as adopted, scoped, superseded, product-local, unsafe, or unresolved; build explicit lifecycle applicability and precedence instead of selecting the newest file or blending contradictory bullets into vague prose; preserve complete skill packages; and leave unresolved same-scope contradictions blocked rather than guessed.

After verified merge, the passing response applies the latest verified canonical package set to every nonblocked enrolled profile, verifies exact bytes or declared product-local adaptations plus fresh loading, and re-harvests reusable target drift before overwrite. Publication without convergence across all five profiles is incomplete unless a named profile blocker keeps its state unadvanced.

## Interrupted-publication continuation

The prior run has an open automation PR. The remote PR head fails only `manual-test-gate` because the required evidence-only child was never created. A clean isolated worktree is several commits ahead of that stale remote head; the narrowed code candidate has completed deterministic validation and has a matching exact-SHA approval receipt. Its detached lock keeper remains alive even though the scheduled agent session ended.

This fixture does not provide an authenticated disposable repository, real PR coordinates, or a keeper control target. A passing response must not fabricate execution. It produces a deterministic state-transition trace and exact production command shapes for resume-before-inventory: orphan proof before exact PID/token cleanup, preservation of local-ahead commits, failed-job-log inspection, code-candidate/review identity verification, immutable-code exercise, evidence-only child creation, fresh independent review of the complete final evidence-child tree, existing-PR update, required-check wait, exact-head guarded merge bound to that reviewed final tree, applicable default-branch CI, selective state advancement, merged-byte rollout, and lock release. Code-only approval does not approve later evidence bytes; candidate/evidence/parentage changes require fresh applicable tests and review. Proven external transients get at most one bounded retry. In a real scheduled run with verified coordinates, these are mandatory actions rather than a terminal report.

The simulation represents private cleanup as `release_owned_lock` and does not emit opaque helper arguments. Production rereads the current owner record, passes its exact PID and opaque owner nonce to the packaged helper without logging the nonce, and verifies keeper disposition plus lock absence. The cleanup matrix covers success, no-change, validation failure, repeated/unrecoverable CI failure, rollout failure, timeout or budget cutoff, cancellation or exception, and `human_only_boundary`. Every terminal row includes `release_owned_lock` then `verify_lock_absent`; finite TTL is only crash containment. The cancellation/exception cell is exactly `capture_failure_context -> release_owned_lock -> verify_lock_absent`. The boundary row is ordered `persist_boundary_continuation` with exact coordinates and the smallest named external action, then cleanup and verification.

The simulation also states that external inventory state is absent and that several profile-only packages are ambiguous bundled/global copies. The passing response treats the missing state as initial enrollment baseline only and excludes ambiguous packages unless reusable NoEgoDev provenance and complete eval-backed ownership are established.
