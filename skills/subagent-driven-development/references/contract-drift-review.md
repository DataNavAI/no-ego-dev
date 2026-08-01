# Contract-drift review for subagent-driven development

Use this check when a task is implemented from a condensed delegation prompt while the project also has a PRD, technical specification, schema, API contract, or rollout plan.

## Why

A task can satisfy its local prompt and still introduce a migration or integration defect. Typical examples:

- field aliases differ from the approved schema;
- a temporary partial production artifact contradicts an exact-cohort contract;
- a predicate accepts legacy and canonical shapes simultaneously;
- tests prove the delegated examples but omit strict-shape, traversal, or unknown-field cases.

## Required composite review coverage

One fresh independent reviewer evaluates these dimensions in a single pass against one immutable candidate:

1. **Local task contract** — compare the implementation with the exact task text and RED/GREEN evidence.
2. **Governing contract** — compare names, shapes, invariants, error codes, timestamps, URLs, and lifecycle rules with the authoritative PRD/tech spec/schema. The governing contract wins when the task prompt was merely condensed or ambiguous.
3. **Integration** — inspect existing and next planned consumers. Reject choices that force dual-schema support or a later migration without an explicit migration requirement.
4. **Code quality and security** — inspect correctness, security, maintainability, regression risk, and test honesty alongside the contract dimensions.

The composite review must use an immutable commit SHA and report exact file/line evidence. If the worktree is shared, the reviewer must be read-only and should distinguish reviewed-commit scope from unrelated later commits.

## Fail-closed patterns

- Reject unknown and legacy keys instead of supporting aliases “temporarily.”
- Test valid canonical shape plus dual-shape, unknown-field, null, duplicate, missing, and malformed cases.
- Test raw and encoded traversal for local asset paths.
- Use test fixtures or injectable paths for partial vertical slices; do not create a partial production registry when the production contract requires an exact complete set.
- Run the canonical project command that prepares generated fixtures before tests; isolated stale-output failures do not override a passing canonical run, but must be explained.

## Review loop

When the composite review finds a contract defect:

1. dispatch a focused TDD fix subagent;
2. freeze the corrected candidate only after every finding is addressed together;
3. rerun one complete composite independent review against the corrected immutable SHA;
4. run the canonical full suite before review readiness and preserve the exact results.
