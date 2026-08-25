# Harvest continuation under eval failures and execution-budget pressure

Use this when resuming an existing harvest PR or when validation reveals that only a subset of packages can safely publish.

## Distinguish package failures from harness/setup failures

Before interpreting a behavioral eval verdict:

1. Load the eval through the production loader.
2. Inspect every `setupCommands`, `parameters.working_directory`, fixture, repository, and branch dependency.
3. Probe external Git inputs read-only (for example, exact branch reachability) before starting the agent. A missing/private repository or unavailable branch is an eval prerequisite failure, not a skill-quality verdict.
4. Reject fixed shared workspaces for concurrent evals. If an eval deletes or clones into a constant absolute path, run it serially or first repair it to use a unique per-run workspace.
5. Require a prompt that can actually be exercised in the supplied environment. A prompt demanding real GitHub threads, CI retries, artifacts, or destructive cleanup without an authenticated disposable target is structurally unexercisable. Defer or repair that package; do not accept a prose-only answer or blame the model for missing side effects it could not perform.

When one package fails these gates, remove only that package from the candidate, rerun affected validation, freeze a new SHA, and obtain fresh exact-SHA review. Continue publishing independent safe packages.

## Preserve Git metadata in repository-suite validation

Do not use `git archive` as the only full-suite workspace when tests derive expected files from `git ls-files`, commit ancestry, or repository state. An archive has no `.git`, so tracked-file oracle tests can falsely report every discovered eval as untracked.

Use a temporary clone or detached worktree outside the canonical repository:

```bash
git clone --no-checkout /absolute/source/worktree /tmp-or-profile-scratch/validation-clone
git -C /tmp-or-profile-scratch/validation-clone checkout --detach <exact-sha>
```

Install test-only dependencies inside that disposable clone, run the full suite, npm package checks, diff checks, and secret scan, then remove the clone during final cleanup. This keeps generated dependencies and caches out of the publishable worktree while preserving Git-aware tests.

## Exact-review lineage while narrowing

Every package omission or remediation changes the candidate generation. Do not leave multiple stale binding reviewers running while repeatedly narrowing the candidate:

1. Record the failed package and stable reason.
2. Make the focused omission/remediation commit.
3. Cancel or disposition stale reviewer processes when possible.
4. Validate the new exact SHA.
5. Dispatch one binding reviewer for the latest clean SHA.
6. Only after approval create any required evidence-only commit and perform final-tree review.

Historical negative verdicts remain useful evidence, but cannot approve the narrowed SHA.

## Execution-budget emergency cutoff

Reserve tool capacity before starting long evals, reviews, CI waits, publication, or rollout. Keep enough calls for:

- writing and verifying a continuation/blocker marker;
- terminating or dispositioning background processes;
- exact lock release and lock-absence verification;
- worktree disposition;
- truthful final reporting.

If the tool-iteration ceiling becomes near:

1. Stop creating new candidate SHAs and stop dispatching new reviewers.
2. Cancel nonessential duplicate evals/reviewers.
3. Persist immutable coordinates and remaining gates outside the repository.
4. Release the exact owned lock and verify absence.
5. Report publication and rollout as pending/blocked.

Never let “one more reviewer” consume the cleanup reserve. Never claim lock cleanup, state advancement, publication, or rollout unless each was verified after the final mutation.
