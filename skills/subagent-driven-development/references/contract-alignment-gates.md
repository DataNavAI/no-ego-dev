# Contract-alignment gates for delegated implementation

Use this when a feature has layered artifacts such as a PRD, UI brief, technical specification, implementation plan, schema examples, and task excerpts.

## Why

A delegated task can satisfy its local excerpt while drifting from the governing contract. Typical drift appears in schema vocabulary (`entities` vs `artists`, `qid` vs `wikidataQid`), state names, field shapes, error codes, UI terminology, or timestamp formats. Passing local tests then entrenches a migration before the real feature exists.

## Pre-flight gate

Before the first production task:

1. Extract a compact canonical-contract table from the highest-authority artifacts:

   | Area | Canonical contract | Authority |
   |---|---|---|
   | top-level collection | exact field name and cardinality | tech spec/schema |
   | entity identity | exact field names and types | tech spec/schema |
   | status/state values | exact enum vocabulary | PRD + tech spec |
   | source representation | object/array shape and URL rules | tech spec |
   | timestamps | date vs full ISO-8601 | tech spec |
   | user-facing copy | accepted labels and forbidden internal terms | reviewed UI brief |
   | stable errors | exact codes and result shape | tech spec |

2. Compare every task excerpt and planned test fixture against that table.
3. Resolve discrepancies before RED. Prefer changing the stale task/plan, not creating compatibility aliases without a migration requirement.
4. Give the implementer the canonical table alongside the task excerpt.

## Revision gate after implementation

The spec-compliance reviewer checks all three layers:

- task acceptance criteria;
- governing PRD/tech-spec/UI contract;
- neighboring future tasks that consume the new interface.

A local PASS is a FAIL when it creates names or shapes that the next task must immediately replace.

Require the reviewer to report:

- exact mismatched field/state/error names;
- file and line evidence;
- whether tests encode the drift;
- smallest correction before quality review.

Only start code-quality review after contract compliance passes.

## Gate verdict decomposition

Do not collapse partial verdicts. Record each separately, for example:

- direction selection: PASS;
- prototype copy: FAIL;
- responsive geometry: PASS;
- production accessibility: NOT RUN;
- implementation acceptance: BLOCKED.

A winning option is not automatically implementation-ready. Feed every blocking review finding back into the governing UI brief/plan before implementation acceptance.

## TDD and revision evidence

For each slice retain the exact focused command, intended RED reason, GREEN result, affected/full-suite result, generated-output cleanup evidence, commit, and changed paths. When canonical vocabulary matters, tests should explicitly reject obsolete aliases and weak formats; otherwise a temporary compatibility shape can survive unnoticed.

## Shared-worktree discipline

- Allow only one writer at a time for overlapping files. A read-only reviewer may overlap only while its snapshot stays unchanged.
- After an asynchronous worker runs, inspect both worktree status and recent commits before editing; its commits can land before the completion notification.
- Re-read every file the worker changed before patching it.
- Stage exact paths so concurrent documentation, generated output, or another worker’s changes cannot leak into the commit.
- If reviewed files changed during review, rerun the review against the final revision.

## Candidate evidence versus approved product data

For source-backed features, keep raw API responses and reproducible research candidates outside git. Produce bounded coverage/error reports, then promote only reviewed claims and complete rights receipts into the approved registry. Production builds consume that approved artifact and must not fetch live source data.

## Pitfalls

- Reviewing only the task excerpt that the implementer received.
- Treating example code in a tech spec as optional vocabulary while tests invent a different schema.
- Preserving both old and new names “for flexibility” before any compatibility need exists.
- Letting passing unit tests overrule a conflicting source-of-truth contract.
- Marking a design task complete when only direction selection passed.
