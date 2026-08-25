# Review-policy contradiction scan

Use this when a policy change spans reviewers, orchestrators, immutable gates, evals, fixtures, templates, or nested references.

## Why positive checks are insufficient

A package can contain the new required sentence and still preserve the superseded behavior elsewhere. Tests that only assert the presence of `omit reversible nits`, a canonical path, or a three-round limit will pass while an output template, pitfall, reference, or eval still authorizes the opposite behavior.

## Complete behavior-surface scan

Recursively inspect every changed and related package, including:

- `SKILL.md`;
- `EVAL.yaml` prompts and expectations;
- `evaldata/` fixtures;
- `references/`, `templates/`, and scripts that emit prompts or verdicts;
- orchestrator dispatch examples and output schemas.

Search semantic families rather than one exact spelling. For an “omit reversible nits” policy, inspect lower/upper-case variants and equivalent concepts such as `Minor`, `Low`, `optional polish`, `deferred nits`, minor-note verdicts, and non-blocking observation sections. For read-only review, inspect authoring verbs such as create, write, update, remediate, or finalize when the artifact is missing. For Round-1 completeness, reject `blockers only` wording when Important or otherwise material findings are also required.

## Regression-test pattern

1. Add a negative test that recursively reads the complete package and rejects every known contradictory phrase or output field.
2. Add positive assertions for the canonical rule, artifact path, ownership boundary, and fail-closed receipt.
3. Run the focused test and capture the expected failure before editing policy text.
4. Patch every surfaced contradiction, including eval prompts and nested references.
5. Re-run focused tests, then the repository’s full Python/Node/eval/package validation.
6. Repeat a raw recursive search after tests pass; tests are a guardrail, not the inventory itself.

Prefer exact forbidden phrases for high-signal regressions, supplemented by narrow case-insensitive patterns. Avoid banning generic words like `low` across an entire library because valid phrases such as low-risk or low-latency can produce false positives.

## Review-round handling

Treat parallel review kinds for one immutable candidate as one numbered round and consolidate all reports before the next candidate. A negative verdict on a superseded SHA still contributes reproducible findings to that round. Any byte-changing correction creates a new SHA and consumes the next monotonic round.

There is no fixed round limit for a stable lineage. Rounds 1–3 are the initial correction budget. Round 4 and later use **approval-convergence mode**: first try to prove the exact candidate approvable by reconciling all prior blocking finding dispositions and correction-introduced regressions. Return `APPROVED` as soon as no unresolved material blocker remains; do not prolong review for reversible nits, stylistic preferences, optional hardening, or evidence outside the governing acceptance criteria.

Approval convergence is never automatic approval or approval by exhaustion. Genuine material security, correctness, privacy, data-loss, compliance, destructive-migration, or ineffective-test defects remain blocking. Preserve a late reasonably discoverable material defect as `MATERIAL_PROCESS_ESCAPE`. If approval is still impossible, return one smallest complete blocking correction set, remediate to a new immutable candidate, and dispatch the next monotonic exact-SHA round with complete cumulative report history.

## Publication evidence

Before requesting the next exact-SHA review, record:

- exact local, remote-branch, and PR-head SHA equality;
- clean worktree;
- focused and full test results;
- actual eval-loader result;
- staged secret scan;
- package dry-run contents when the repository publishes whole skill directories.
