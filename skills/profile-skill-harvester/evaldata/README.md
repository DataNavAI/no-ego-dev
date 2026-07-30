# Profile skill harvester eval fixture

This fixture tests consolidation rather than file copying.

## Scenario

Three live profiles independently changed one canonical skill:

- **MVP profile:** demands the shortest reversible implementation and rejects premature architecture.
- **Growing-product profile:** adds analytics, regression checks, and rollback readiness while preserving iteration speed.
- **Mature/regulated profile:** requires compatibility analysis, migrations, staged rollout, observability, audit evidence, and approval boundaries.

The repository checkout is dirty with unrelated work. Each live package may also contain `EVAL.yaml`, `evaldata/`, references, scripts, or templates.

A passing response must build explicit lifecycle applicability and precedence instead of selecting the newest file or blending contradictory bullets into vague prose. It must keep the repository checkout untouched by using an isolated worktree, preserve complete skill packages, add branch and boundary eval cases, reject secrets/runtime state, validate and test before publication, and leave unresolved same-scope contradictions blocked rather than guessed.
