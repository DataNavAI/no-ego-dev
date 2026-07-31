# Contract-drift review for subagent-driven development

Use this check when a task is implemented from a condensed delegation prompt while the project also has a PRD, technical specification, schema, API contract, or rollout plan.

## Why

A task can satisfy its local prompt and still introduce a migration or integration defect. Typical examples:

- field aliases differ from the approved schema;
- a temporary partial production artifact contradicts an exact-cohort contract;
- a predicate accepts legacy and canonical shapes simultaneously;
- tests prove the delegated examples but omit strict-shape, traversal, or unknown-field cases.

## Required review sequence

1. **Local task review** — compare the implementation with the exact task text and RED/GREEN evidence.
2. **Governing-contract review** — compare names, shapes, invariants, error codes, timestamps, URLs, and lifecycle rules with the authoritative PRD/tech spec/schema. The governing contract wins when the task prompt was merely condensed or ambiguous.
3. **Integration review** — inspect existing and next planned consumers. Reject choices that force dual-schema support or a later migration without an explicit migration requirement.
4. **Code-quality/security review** — only after the first three pass.

Every review should use an immutable commit SHA and report exact file/line evidence. If the worktree is shared, reviewers must be read-only and should distinguish reviewed-commit scope from unrelated later commits.

## Fail-closed patterns

- Reject unknown and legacy keys instead of supporting aliases “temporarily.”
- Test valid canonical shape plus dual-shape, unknown-field, null, duplicate, missing, and malformed cases.
- Test raw and encoded traversal for local asset paths.
- Use test fixtures or injectable paths for partial vertical slices; do not create a partial production registry when the production contract requires an exact complete set.
- Run the canonical project command that prepares generated fixtures before tests; isolated stale-output failures do not override a passing canonical run, but must be explained.

## Review loop

When contract review fails:

1. dispatch a focused TDD fix subagent;
2. rerun the same failed contract review against the fix commit;
3. do not advance to quality review until it passes;
4. then run code-quality/security review and the canonical full suite.
