# Eval data for workflow-training

This directory is reserved for deterministic fixtures used by the `workflow-training` skill eval.

The current eval is self-contained and uses an inline representative failure summary. Future fixtures can include frozen `report.md`, `result.json`, and session-log excerpts from workflow eval runs, with secrets removed and paths normalized.


## Target-workflow skill anti-pattern

When a workflow eval fails, a passing workflow-training response should not jump to creating a dedicated skill named after the target workflow, project, product, fixture, or eval. The trainer should first patch existing specialist or orchestrator skills that naturally own the behavior. New skills are appropriate only for genuinely recurring workflow classes not covered by existing roles.
