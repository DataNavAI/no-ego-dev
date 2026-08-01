# Immutable task snapshot code review

Use this pattern when asked for a final composite independent review at an exact immutable commit.

## Scope discovery

1. Work only in the explicitly named worktree.
2. Confirm `HEAD` equals the requested SHA and capture `git status --short`.
3. Read the implementation-plan task entry to identify its approved files and intended base.
4. Use commit history to locate the last commit belonging to the preceding task.
5. Review the cumulative task diff from that base through the requested SHA, restricted to approved files. Do not mistake the final fix commit for the whole task.

## Read-only discipline

- Do not edit, stage, commit, regenerate tracked output, or use network access.
- Reuse accepted full-suite evidence supplied by the requester instead of rerunning slow broad generation. If an initial review attempt stalls or times out while repeating a broad generator/site suite, re-dispatch a bounded source/diff review that explicitly forbids those commands, names the fresh evidence being reused, and permits only the focused task file or lightweight pure probes. A timeout is not a verdict.
- Run focused tests, syntax checks, and `git diff --check`.
- Recheck worktree cleanliness before reporting.

## Behavioral probes

If durable tests establish a requirement mostly through source-pattern assertions, add read-only runtime probes through stdin/one-liners. Useful targets include:

- semantic card caps and malformed timestamp rejection;
- successful progressive enhancement and idempotence;
- per-node error isolation;
- root-scoped/local-only DOM mutation;
- preservation of server-rendered fallback content.

Probe setup mistakes that are corrected immediately are transient; record the successful verification, not the one-off fixture-path error. Never create repository probe files for a read-only review.

## Gate sequencing and remediation

Treat specification compliance and quality/integration risk as evidence dimensions inside one immutable composite gate:

1. Validate the review-readiness receipt against the exact SHA and current base.
2. Run one composite review covering specification compliance and material quality/integration risk at that exact SHA.
3. When the gate finds a blocker, implement the smallest strict-TDD remediation, commit it, and rerun the composite immutable review; approval does not transfer across commits.
4. Do not start the next implementation-plan task until the current candidate has one complete `APPROVED` composite verdict and every predeclared specialist bundle, if any, is also approved.

For destructive generators, reviewers should trace the complete ordering chain rather than stopping at the named validator: every fallible source parse, normalization, compatibility projection, and model construction must finish before the first delete, mkdir, copy, or write. For public projection functions, probe both traversed nested data and top-level collection boundaries; a safe recursive clone does not compensate for a permissive sparse/accessor-skipping array extractor.

When a background reviewer times out after making no changes, inspect the worktree before redispatch. If an implementation worker times out after editing, preserve and inspect its partial diff, run focused verification yourself, finish or re-dispatch from that exact state, and never assume timeout means no side effects.

## Verdict format

Report:

- `Critical`, `Important`, and otherwise material findings only;
- an explicit `APPROVED` or blocking verdict;
- exact reviewed SHA and file scope;
- focused test/check counts;
- any supplied evidence reused rather than rerun;
- files modified/created (`None` for a clean read-only pass).

A safely reversible test-strength observation is omitted. If the test gap materially weakens correctness, contract, security, migration, or release confidence, classify it as `Important` and make its consequence and required outcome explicit.
