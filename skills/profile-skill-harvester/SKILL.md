---
name: profile-skill-harvester
description: Use when harvesting skill updates from one or more live Hermes profiles into a canonical profile-distribution repository. Compares complete skill packages, consolidates compatible updates, scopes contradictory guidance by use case and product lifecycle stage, validates the result, and publishes through an isolated Git workflow without sweeping unrelated runtime or repository state.
version: 1.5.29
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [skills, curation, profiles, lifecycle, automation, git]
    related_skills: [skill-creator, eval-creator]
---

# Profile Skill Harvester

## Overview

Harvest reusable improvements made inside live Hermes profiles and consolidate them into a canonical distribution repository. A harvest is not a newest-file-wins copy. It is a curation and integration pass over complete skill packages: `SKILL.md`, `EVAL.yaml`, `evaldata/`, and any `references/`, `templates/`, `scripts/`, or `assets/`.

The canonical NoEgoDev setup is:

- repository: `/Users/moonk/no-ego-dev`
- remote: `DataNavAI/no-ego-dev`
- source branch: the remote default branch, normally `main`
- live profiles: `ned`, `alphaned`, `kiaened`, `nedxned`, and `newsned`
- live profile roots: `/Users/moonk/.hermes/profiles/<name>`
- non-repository state: `/Users/moonk/.hermes/state/profile-skill-harvester/`
- isolated worktrees: `/Users/moonk/.hermes/work/profile-skill-harvester/`

## When to Use

Use this skill when:

- a live profile may contain a newer or divergent skill package;
- several sibling profiles independently improved the same skill;
- those improvements need consolidation into the distribution repository;
- a scheduled job must publish verified skill-library updates safely.

Do not use it to copy runtime state, secrets, OAuth files, sessions, logs, memories, caches, workspaces, or arbitrary profile files. Do not use it to make product-specific instructions globally canonical unless they are explicitly scoped.

## Non-Negotiable Invariants

1. **Repository is canonical after curation, not before comparison.** Live variants are evidence and candidates, not automatically authoritative.
2. **Complete packages move together.** Never copy only `SKILL.md` when the behavior change needs evals, fixtures, scripts, references, or templates.
3. **No last-write-wins merges.** Modification time is a discovery hint, never a correctness or precedence rule.
4. **No dirty-tree harvesting.** Create an isolated worktree from `origin/<default-branch>`; never commit unrelated changes from `/Users/moonk/no-ego-dev`.
5. **No secrets or runtime artifacts.** Only files under an identified skill directory may enter a harvest commit. Reject credentials, tokens, `.env`, auth, session, log, cache, memory, and workspace material.
6. **No silent contradiction deletion.** Preserve both valid behaviors by scoping them, or block that skill and report the unresolved decision.
7. **No broken uploads.** Validate packages, run repository tests, inspect the focused diff, secret-scan, push, and verify the remote SHA/PR.
8. **One scheduler at a time.** Use a lock under the non-repository state directory and exit quietly when another harvest is active.
9. **Respect profile ownership.** Central orchestration may distribute reusable skill packages, but product-local runners, cron jobs, releases, and operations belong to their named profile. A controller must not take over that work unless the user explicitly authorizes intervention. Cleanup after an ownership mistake removes only controller-created scratch/cache artifacts, never similarly named state under the owning profile.

## Scheduled-job model pinning and canonical sibling rollout

When a harvest is run by a durable cron job, pin the job to an explicit provider/model after any global inference-model change. The canonical high-reasoning model for the NoEgoDev daily harvest is `gpt-5.6-sol` with provider `openai-codex` (the requested Sola model). Do not infer the model from the active profile default, because profile defaults may drift independently. An unpinned or differently pinned job is a configuration failure: update the existing job (never create a duplicate), read back the exact provider/model, and run one manual reconciliation before treating the job as healthy. Each run report must include the effective provider/model and must fail closed if the requested model cannot be selected.

Do not equate scheduler-level `ok` or `execution_success` with a successful harvest. Audit the latest run transcript, lock lifecycle, state freshness, worktree/PR disposition, and per-target rollout evidence. Repeated `BUSY`, immediate `[SILENT]` before inventory, or unchanged stale state is degraded operation even when cron reports success. Follow [`references/scheduled-harvest-health-and-lock-recovery.md`](references/scheduled-harvest-health-and-lock-recovery.md) for productive-run proof, live-but-orphaned lock classification, exact-owner cleanup, and manual reconciliation.

An unfinished automation PR is a durable continuation, not a report-only blocker. Apply **resume-before-inventory**: reconcile any existing PR, local-ahead worktree, continuation marker, failed check, and exact-SHA review before scanning for new work. Diagnose and repair failures within the harvester's existing authority, generate required evidence-only commits, obtain a fresh independent review of the complete final evidence-child tree because code-only approval does not approve later evidence bytes, use bounded retries only for proven external transients, merge that reviewed final SHA with an exact head guard, verify applicable default-branch CI, complete authorized transactional rollout, and release the exact lock on every terminal path. See [`references/self-unblocking-publication.md`](references/self-unblocking-publication.md).

If the scheduled job also deploys the canonical distribution to sibling profiles, make the rollout contract explicit in the prompt: enumerate every target profile, define the canonical package root, compare complete-package digests and target-only drift before mutation, back up each target, preserve compatible local additions, block contradictory drift, validate fresh-process discovery per target, and report each target independently. A successful `[SILENT]` result means no new change or blocker was found—not that targets may be assumed synchronized without the per-target digest/adoption checks.

Keep this rollout separate from harvesting: first freeze and verify the canonical remote-default candidate, then apply it to authorized sibling profiles. Never copy auth, sessions, memories, state databases, workspaces, cron configuration, or other runtime state as part of a profile-template/skill rollout. See [`references/live-source-freeze-and-target-sync.md`](references/live-source-freeze-and-target-sync.md) and [`references/controller-to-profile-rollout-boundaries.md`](references/controller-to-profile-rollout-boundaries.md).

### Profile-family GitHub identity rollout

When repairing GitHub access across a profile family, audit authentication per profile before changing anything. The host-level `gh auth status` and the controller's keychain do not prove that a profile can authenticate: resolve each profile's CLI home, typically `GH_CONFIG_DIR="$HOME/.hermes/profiles/<profile>/home/.config/gh"`, then verify both `gh auth status` and `gh api user --jq '.login'` under that directory.

Declare the identity matrix before mutation:

- canonical shared identity and its authorized target profiles;
- explicit exception profiles and their separate identities;
- required scopes and Git transport protocol;
- profile-local backup paths and verification commands.

For a shared identity, authenticate once in an isolated temporary `GH_CONFIG_DIR`, verify the returned API login is exactly the requested account, then distribute only the approved profile-local credential/config to the shared targets. Do not use a symlink or copy a whole profile home. Preserve explicit exception profiles on independent credentials; repair them separately rather than overwriting them with the family credential. Never print tokens, raw `hosts.yml`, device codes in durable reports, or secret-bearing URLs.

After mutation, verify every profile independently: login status, API identity, required scopes, and a minimal read operation against the intended namespace. Report shared versus exception identities separately. If authentication requires user browser/device approval, stop at that external authorization boundary with the exact safe user action; do not claim the rollout is complete while any profile remains unverified.

## Daily Harvest Workflow

### 1. Acquire lock and inspect prerequisites

Use a lock such as:

```text
~/.hermes/state/profile-skill-harvester/harvest.lock
```

Use `scripts/lease_lock.py hold` as the default keeper implementation. Run it as a managed background process with a finite `--lease-seconds` value shorter than the scheduler interval and record its emitted PID/token/expiry. Never substitute an immortal inline `while True` process. On every terminal path call `scripts/lease_lock.py release` with the exact PID/token and verify both process disposition and lock absence. The helper uses a token-authenticated loopback control channel for a live keeper; it never sends a signal to a merely matching/reused PID. Dead or expired owners may have only their owned lock reclaimed. See [`references/self-unblocking-publication.md`](references/self-unblocking-publication.md).

**Before the first delegation, preflight the active controller profile—not only the live profiles being harvested.** Verify the controller's persisted child/gateway timeout values and prove the running gateway adopted them. If the config must change or runtime adoption is stale/ambiguous, persist durable continuation coordinates and stop at the restart boundary. A user/admin may then issue the supported messaging `/restart` command, which gracefully drains active runs before restarting, or restart from a genuinely external shell/supervisor. The agent must not invoke a terminal lifecycle command against the gateway that owns its current request. Resume delegation only in a fresh request after renewed runtime proof. Follow [`references/controller-gateway-timeout-preflight.md`](references/controller-gateway-timeout-preflight.md).

Fail closed if:

- the canonical repository or expected remote is missing;
- GitHub authentication is unavailable;
- a profile path resolves outside `~/.hermes/profiles/`;
- the remote default branch cannot be resolved;
- another harvest owns the lock.

Do not modify the user's existing checkout to make it clean.

### 2. Preflight the repository's real eval path

Before curating candidates or spending any exact-SHA review round, inspect the repository's production eval loader **and invocation path**, not only its YAML parser. Run one disposable sentinel eval outside the repository when practical and capture both evaluated-agent and judge arguments. If an eval declares `parameters.fixture`, prove that the package-relative fixture text reaches both invocations. A loader retaining the fixture path in an in-memory `parameters` map is not delivery evidence; neither is adding scenarios to an `evaldata/README.md` that `run_eval` never reads.

Fail closed before candidate freeze when the current runner cannot exercise behavior that the harvest must add. Classify this as a repository eval-harness prerequisite rather than repeatedly revising skill prose or consuming review rounds on structurally inert fixtures. Either fix the harness in a separately scoped, independently reviewed change first, or omit/block the affected package changes without baselining them.

Before trusting an external prerequisite or continuation marker from an earlier run, reconcile it against live GitHub and repository state. A marker may still say `pending` after its PR merged, or may name a candidate SHA that is no longer the remote-default generation. Treat it as historical evidence until the PR state, merge reachability, current runner bytes, and remaining gates are re-proven. Refresh or supersede the marker outside the repository; never let stale continuation prose bypass or indefinitely preserve a prerequisite gate.

When the runner creates an isolated `HERMES_HOME`, also prove that the real authenticated runtime model reaches that profile without copying the entire live config. Credential files alone do not select a provider when the distribution config points elsewhere. Overlay only non-secret model selector fields, preserve distribution behavior settings, and run a real agent+judge smoke after fake-command wiring tests. Follow [`references/isolated-eval-runtime-provider.md`](references/isolated-eval-runtime-provider.md).

Preflight behavioral-eval side effects before treating a verdict as skill evidence. Probe declared external repositories/branches, reject concurrent execution against fixed shared workspaces, and require authenticated disposable targets when a prompt demands real GitHub threads, CI retries, publication, or cleanup. A missing external fixture or impossible side-effect contract is an eval prerequisite failure: repair or defer only that package rather than accepting prose simulation or blaming the evaluated model. For Git-aware repository suites, validate in a temporary clone or detached worktree, not a metadata-free `git archive`. Follow [`references/harvest-continuation-eval-and-budget-recovery.md`](references/harvest-continuation-eval-and-budget-recovery.md).

### 3. Create an isolated integration worktree

Fetch the remote, create a unique branch from the current remote default branch, and work outside the canonical checkout:

```bash
git -C /Users/moonk/no-ego-dev fetch origin --prune
git -C /Users/moonk/no-ego-dev worktree add \
  -b automation/skill-harvest-YYYYMMDD-HHMMSS \
  ~/.hermes/work/profile-skill-harvester/YYYYMMDD-HHMMSS \
  origin/main
```

If a branch with that exact name exists, choose a new timestamp. Never reset or delete an unrelated branch.

### 4. Inventory and reconcile source/profile packages before editing

Run `scripts/inventory.py` from this skill package, or perform an equivalent deterministic scan. Identify skills by frontmatter `name`, not merely directory basename. Hash the complete package while excluding `.git`, Python caches, editor files, OS metadata, and runtime artifacts.

**This is a pre-candidate gate, not rollout-only bookkeeping.** Finish the complete live-profile inventory and reconcile every higher-version or same-version/different-digest variant before the first behavior edit, staged-diff freeze, or exact-candidate review. If canonical source is older than a compatible shared live predecessor, consolidate that predecessor first, then layer the requested change on top and choose a version newer than every live variant. Add a regression that proves both the new behavior and retention of reusable predecessor controls. Discovering this drift after review invalidates that review generation. Follow [`references/pre-candidate-live-variant-reconciliation.md`](references/pre-candidate-live-variant-reconciliation.md) for grouping common deltas, separating profile-local additions, and dry-running three-way target adaptations.

For each `(profile, skill)` record:

- package path;
- package digest;
- newest file modification time as a discovery signal;
- source-repository digest, if present;
- prior observed digest from the external state file, if present;
- whether several profiles contain distinct variants.

A candidate is interesting when it differs from the remote-default source package and is new or changed since the last successful harvest.

**Initial enrollment is a baseline, not a historical bulk import.** When no state file exists, record the current source/profile digests as `initialized_at` inventory and report the baseline counts. Unless the user explicitly asks for a backfill, do not treat every pre-existing difference as newly updated. This prevents the first scheduled run from importing an entire bundled/global skill library by accident.

By default, harvest only skill names already owned by the canonical distribution repository. A profile-only skill may be proposed only when its frontmatter/provenance identifies it as NoEgoDev-authored or adapted, it contains a complete reusable package with eval coverage, and it is not merely a bundled/global skill copied into that profile. Ambiguous profile-only skills are reported but not uploaded.

### 5. Classify each difference

Classify changes before editing:

| Class | Meaning | Action |
|---|---|---|
| Identical | Same complete-package digest | Ignore |
| Source-only | Repository has content absent from profiles | Preserve source; do not treat profile absence as deletion |
| Profile-only | Valid reusable skill absent from source | Consider importing as a complete package |
| Additive | Profile adds compatible guidance or support files | Consolidate and add eval coverage |
| Refinement | More precise wording without semantic conflict | Keep the clearer, testable form |
| Divergent-compatible | Variants solve different contexts | Scope by applicability dimensions and retain both |
| Contradictory | Same context demands mutually exclusive behavior | Resolve with explicit precedence or block |
| Product-local | Behavior belongs to one product/project only | Keep profile/project-local or generalize with an explicit use-case boundary |
| Unsafe/incomplete | Missing package files, malformed frontmatter, secret-like data, or untestable behavior | Reject and report |

Inspect diffs semantically. A newer timestamp or higher version does not prove superiority.

## Contradiction Resolution by Applicability

### Applicability dimensions

When two valid updates contradict each other, first determine whether they actually apply to the same operating context. Scope guidance using the smallest useful set of dimensions:

1. **Product stage**
   - `discovery`: validate problem, audience, and demand before substantial build work;
   - `mvp`: optimize for shortest end-to-end critical user journey and learning speed;
   - `growing`: optimize for adoption, reliability, measurement, iteration throughput, and emerging scale;
   - `mature`: optimize for compatibility, migrations, governance, observability, operational safety, and incremental change;
   - `regulated/enterprise`: optimize for auditability, privacy, security, approval boundaries, and contractual constraints.
2. **Use case or product type** — consumer app, internal tool, API/platform, game, marketplace, content product, regulated workflow, and so on.
3. **Risk tier** — reversible experiment, normal production change, destructive/irreversible change, security/privacy-sensitive change.
4. **System context** — greenfield versus brownfield, single-user versus multi-tenant, offline versus connected, prototype versus live production.
5. **Role and decision boundary** — advisory recommendation, implementation rule, review gate, or authorized-owner decision.

### Resolution pattern

Convert vague conflict into an explicit decision table:

| Context | Rule | Why | Verification |
|---|---|---|---|
| MVP + reversible | Prefer the smallest end-to-end implementation | Maximize learning speed | Critical user journey works and is instrumented |
| Growing + customer-facing | Preserve speed but add regression, analytics, and rollback gates | Protect adoption while iterating | CI, telemetry, rollback evidence |
| Mature/regulated | Prefer compatibility, staged rollout, approvals, and audit trail | Minimize operational and compliance risk | Migration, security, audit, and rollback checks |

Then rewrite the skill so it:

- states the universal invariant once;
- declares how the stage/context is detected;
- gives stage-specific branches rather than mixing incompatible imperatives;
- states precedence when several contexts apply;
- adds an eval scenario for each branch and at least one boundary case.

### Precedence rules

Apply these only after confirming the scopes overlap:

1. Legal, security, privacy, and explicit user constraints outrank convenience and speed.
2. A specific applicable rule outranks a generic default.
3. A verified project-local contract outranks distribution defaults for that project, but must not silently rewrite the global default.
4. Reversible experimentation may favor speed; irreversible or high-blast-radius work requires stronger gates.
5. If evidence cannot choose between mutually exclusive rules in the same scope, mark the skill `BLOCKED` for this harvest. Do not guess.

### Anti-patterns

Never resolve contradictions by:

- taking the most recently modified file;
- averaging incompatible instructions into ambiguous prose;
- keeping duplicate unscoped bullets;
- deleting a safety gate because one MVP profile omitted it;
- turning a product-specific workaround into a universal rule;
- bumping a version without adding eval coverage for the resolved behavior.

## Consolidation Rules

For every selected skill:

1. Start from the remote-default repository package in the isolated worktree.
2. Compare every distinct live variant against that base and against one another.
3. Integrate only evidence-backed behavior changes.
4. Preserve valid source behavior not explicitly superseded.
5. Bump the skill version for semantic behavior changes.
6. Update or create `EVAL.yaml`.
7. Update `evaldata/` with lifecycle/use-case scenarios, especially where conflicts were scoped.
8. Include support files referenced by the resulting `SKILL.md`.
9. Ensure related-skill references resolve or are clearly optional.
10. Do not import profile-local absolute paths, account identities, tokens, session IDs, issue IDs, or transient operational state.

If a live package has no eval, do not automatically reject useful guidance. Import the guidance only after creating an eval and fixture in the canonical package.

### Completion-hook orchestration changes

When harvesting subagent lifecycle or continuation behavior, inventory the whole completion-to-scheduling surface: orchestration skill, lifecycle-hook reference/plugin, scheduled or Kanban controller, active-worker lease, cron prompt, evals, fixtures, and smoke tests. Canonicalize one explicit chain: every terminal worker event emits a content-free, idempotent wake; the authoritative reconciler re-reads durable artifacts, verdicts, dependencies, claims, and capacity; then it schedules the next eligible worker or records the exact blocker.

Reject variants where callback code directly calls `delegate_task`, selects work from child-controlled summaries, treats lifecycle `completed` as acceptance, or promotes dependencies without artifact/gate verification. Scope interactive parent re-entry separately from durable controller/Kanban acceleration. Preserve periodic reconciliation as lost-event fallback, debounce completion bursts under one lock, and require a smoke case proving one completion starts at most one successor. A modern top-level `tasks=[...]` fan-out creates independent background children with separate handles and completion deliveries; it does not impose an all-children drain barrier.

Before promoting any runtime-hook claim, verify it against the live Event Hooks documentation, the installed delegation implementation, and the active tool schema. Hermes supports one persistent `subagent_stop` subscription per loaded process/profile rather than a callback argument on each child. Verify top-level and nested delegation paths separately: top-level batch children currently complete and deliver independently, while a nested orchestrator's aggregate path may synchronously wait for all nested children. Use separate single-child calls only when explicit ownership, timing, capacity, cancellation, or retry boundaries require them—not merely to obtain first-finisher continuation. Install/load the hook in every independently running profile or worker process that must observe children, and restart after registration changes. Follow [`references/delegation-hook-runtime-contract.md`](references/delegation-hook-runtime-contract.md) for the authoritative contract, scheduling boundary, and eval scenarios.

### Policy-wide reviewer changes

When the requested change is a review philosophy or convergence rule, do not patch only the most obvious reviewer `SKILL.md`. Inventory the entire behavior surface first:

- direct role reviewers (for example product/PRD, technical design, UI, and specification compliance);
- review orchestrators and scheduled controllers;
- immutable-candidate/release gates and convergence references;
- every package's `EVAL.yaml`, fixtures, output templates, severity vocabulary, and nested `references/` files.

Publish profile-only reviewer roles only when they satisfy the normal NoEgoDev provenance and complete-package rules; copy the whole package, then adapt it canonically. Encode the shared policy with consistent headings/markers and add repository tests that recursively scan complete packages, not only top-level `SKILL.md`. This catches stale verdict enums and reference prose such as `LOW`, `APPROVED_WITH_MINOR_NOTES`, `PASS WITH MINOR POLISH`, old round caps, or unbounded retry language that would silently preserve the superseded behavior.

Follow [`references/review-policy-contradiction-scan.md`](references/review-policy-contradiction-scan.md) for the full behavior-surface inventory, TDD pattern that first proves contradictory output is still representable, semantic phrase families, eval/reference checks, and unbounded post-Round-3 approval-convergence handling. Positive-marker tests alone are insufficient: a package can contain the canonical rule while a nested template, pitfall, fixture, or lowercase output field still authorizes the opposite behavior.

Translate user intent exactly. If the user says to **ignore reversible nits**, omit them entirely from findings and follow-up rather than merely making them non-blocking or grouping them under “minor notes.” Preserve blocking treatment for severe correctness, safety, security, privacy, destructive-data, or other high-consequence failures even when the mechanical patch is small.

For first-round completeness, parallel review kinds against one frozen candidate share the same numbered round and should be consolidated into one author steering packet. Later rounds disposition that packet and correction-introduced regressions; splitting review kinds, renaming artifacts, or swapping reviewers does not reset or fork the monotonic lineage. Round 4 and later enter approval-convergence mode and should return `APPROVED` as soon as no unresolved material blocker remains, without extending review for reversible nits or optional hardening. If the candidate moves while Round-1 reviewers are still running, their verdicts are stale but their reproducible findings remain Round-1 input: collect the complete reports, apply one consolidated correction, rerun validation, and obtain fresh exact-SHA approval on the corrected candidate.

If the policy-wide change is specifically about coder/implementation static analysis, follow [`references/coder-static-analysis-policy.md`](references/coder-static-analysis-policy.md). It defines ecosystem-aware analyzer discovery and provisioning, per-change plus final full-project enforcement, fail-closed suppression rules, eval/test coverage, exact-SHA review interaction, and complete-package sibling rollout.

## Live Source Freeze and Sibling Propagation

Treat profile packages as mutable until the canonical candidate is committed. Recompare every live-source file immediately before freeze, allow only recorded canonical adaptations, and restart validation if unexpected drift appears. After merge, back up target packages, replace only authorized skill directories, verify canonical digests, smoke-test discovery/provider operation, advance state, and release the exact lock on every exit.

Do not reflexively restart a gateway after a **skill-only** overlay. Existing same-name skills are read from disk when invoked, so new sessions and workers hot-load updated `SKILL.md` and support files. Existing conversations should use `/reset` or `/new` before relying on changed instructions; `/reload-skills` is for rescanning added or removed skill names. Reserve gateway restarts for startup-loaded code, plugins, environment, or configuration, or when live evidence shows the changed artifact is process-cached. Record `hot-swap verified` separately from `gateway restarted` rather than treating restart as the universal adoption gate.

Follow [`references/live-source-freeze-and-target-sync.md`](references/live-source-freeze-and-target-sync.md) for the byte-comparison loop, incomplete-package completion, scanner false-positive handling, target-variant replacement boundary, hot-swap/restart decision, and post-merge verification sequence. When a sibling has same-path live drift at rollout time, follow [`references/sibling-rollout-drift-adaptations.md`](references/sibling-rollout-drift-adaptations.md) for global preflight, deterministic compatible adaptations, transactional overlays, evidence retention, and separate exact-versus-adapted reporting.

For controller-to-sibling deployment, profile ownership boundaries, exact-source overlays that preserve target-only additions, explicit owner overrides after a known negative gate, fail-fast validation, fresh-process discovery smokes, and the user-authorized sibling-gateway restart procedure, follow [`references/controller-to-profile-rollout-boundaries.md`](references/controller-to-profile-rollout-boundaries.md). Before mutating targets, separately preflight whether the current execution context can actually perform the required lifecycle adoption; skill wording is not execution authority. Follow [`references/gateway-reload-capability-preflight.md`](references/gateway-reload-capability-preflight.md).

When the user asks to apply the latest canonical distribution but the recorded per-package deployment ancestor is stale, missing, or unusable, follow [`references/stale-baseline-version-gated-rollout.md`](references/stale-baseline-version-gated-rollout.md). Use semantic versions only to conservatively select absent/newer candidates; preserve equal/newer live packages, block ambiguous unversioned comparisons unless explicitly resolved, and still require frozen-source hashes, target-only preservation, transactional backup/rollback, fresh-process smokes, and post-smoke re-hashing.

Follow [`references/harvest-gate-implementation-checks.md`](references/harvest-gate-implementation-checks.md) when implementing the freeze gate, spawning an exact-SHA reviewer, validating eval fixture delivery and literal shell-safe prompt transport, building isolated mutating eval workspaces, proving browser/screenshot evidence, or budgeting the final cleanup sequence. In particular, run drift comparisons under fail-fast shell semantics so a nonzero drift result cannot fall through into commit, amend, push, or state-update commands; make disposable fixture recorders independent of scrubbed custom environment variables; keep cross-platform eval fixtures free of POSIX-only setup commands; and explicitly dispatch a newly introduced workflow from the frozen candidate ref when PR checks do not auto-start, verifying the run `headSha` and required platform job.

When the harvest also addresses slow, interrupted, or repeatedly dispatched subagent reviews in sibling profiles, follow [`references/scheduled-reviewer-reliability-audit.md`](references/scheduled-reviewer-reliability-audit.md). Diagnose child execution, async result delivery, controller context size, duplicate same-SHA verdicts, and cron configuration separately before changing timeout values. Package synchronization alone is insufficient when existing cron prompts or attached-skill lists encode the stale behavior; update those jobs through the Hermes cron interface and verify durable reconciliation on a fresh run.

When a live workflow-stall postmortem must become a canonical policy correction and sibling rollout, follow [`references/workflow-stall-postmortem-to-rollout.md`](references/workflow-stall-postmortem-to-rollout.md). It separates immediate product blockers from systemic protocol multipliers, requires direct staging/production truth, preserves safety gates while removing coordination churn, enforces monotonic package versioning across divergent live variants, and defines backup, duplicate-retirement, parity, and adoption checks.

For a concise, reusable rollout transaction—including candidate-generation digests, immutable squash-merge comparison, detached remote-source worktrees, pre-mutation drift guards, atomic canonical overlays that preserve target-only files, rollback, duplicate retirement, and fresh runtime skill-load proof—follow [`references/transactional-profile-rollout.md`](references/transactional-profile-rollout.md). A staged-diff digest can bind a pre-commit review generation, but it does not replace exact commit-SHA approval where the publication gate requires it.

When repository manual-test evidence must name the latest code-change commit, or when post-merge CI includes PR-only versus push-trigger applicability, follow [`references/manual-evidence-and-postmerge-ci.md`](references/manual-evidence-and-postmerge-ci.md). It defines the two-commit/final-tree review sequence, trigger-aware exact-head CI proof, immediate incident response, and fresh-merge three-way profile rollout boundary.

## Validation and Publication

Before publication:

1. Parse every changed `SKILL.md` frontmatter and every changed scenario file matching `EVAL*.yaml`.
   - Also load every changed `EVAL*.yaml` through the repository's actual evaluation loader. A generic YAML parse or a custom focused test can pass while the production loader rejects the schema.
   - Add a repository-wide loader regression that discovers from the repository root or every declared eval root—not only `skills/`—and loads every tracked `EVAL*.yaml`. Report the discovered count so accidentally omitted distribution-level evals are visible.
   - Verify every declared fixture is package-relative, reject absolute/traversing/missing/empty/non-string fixture values, and prove the effective fixture text reaches both the evaluated-agent and judge invocations. Distinguish an omitted fixture key from an explicitly declared YAML null. Reject lexical `..` components before normalization; resolved-path containment alone is insufficient because traversal can normalize back inside the package. An eval may legitimately omit a fixture; validate it conditionally rather than indexing an optional field unconditionally. Checking only a generated prompt file does not prove runtime delivery.
   - Resolve fixture paths against the nearest explicit package boundary: a containing `SKILL.md` for skill evals, otherwise a containing distribution marker such as `distribution.yaml` for distribution-level evals, with the eval directory as the standalone fallback. See [`references/eval-fixture-resolution-contract.md`](references/eval-fixture-resolution-contract.md).
2. Ensure fixtures referenced by each eval exist.
3. Run deterministic support-script checks (`python -m py_compile`, `bash -n`, or relevant validators).
4. Stage only the intended candidate paths before running the final repository suite when the repository-wide eval regression derives its expected set from `git ls-files`. Newly added, still-untracked `EVAL*.yaml` files are discoverable on disk but absent from the tracked-file oracle, producing a false loader-regression failure. Staging is not publication: inspect the staged set, run the suite, secret-scan the staged bytes, and unstage or amend freely until candidate freeze.
5. Run `python -m pytest` from the isolated worktree with an explicitly verified interpreter that satisfies the repository's supported Python version and has pytest installed. Do not infer interpreter suitability from the `python3` command name alone, especially across foreground/background execution environments.
6. Run `git diff --check`.
6. Inspect only the intended skill-package and documentation/test changes.
7. Scan staged content for private keys, OAuth/client secrets, refresh/access tokens, passwords, cookies, `.env` content, and high-entropy credentials.
8. Commit with a focused conventional commit.
9. Freeze the exact candidate SHA and obtain independent review against that SHA. If any review finding changes package bytes, the previous approval is stale: rerun affected validation, push the new SHA, and obtain a fresh independent review before merge.
   - A spawned reviewer may honor its profile-configured terminal cwd instead of the subprocess workdir. Require absolute-path reads and `git -C <isolated-worktree>` commands, and invalidate the verdict unless the reviewer confirms the requested HEAD, clean status, and exact worktree path.
   - Background-process completion output may be a truncated preview that omits the opening verdict or identity proof. Before accepting approval, read the full process log from offset zero and require the explicit verdict, worktree path, clean status, and exact SHA to be present together.
10. Reconcile cross-skill gate semantics before approval. In particular, post-Round-3 approval convergence must never permit tests/scanners to substitute for independent review of changed bytes, approve by exhaustion, or suppress a genuine material finding; same-SHA review deduplication must still provide a non-duplicating approval-to-merge continuation.

Publication policy:

- Before every push or merge attempt, fetch the remote and compare the candidate branch with its remote tracking branch. If another actor advanced the branch, inspect those commits, integrate them without force, rerun all affected validation, and freeze a new SHA; every approval bound to the pre-integration SHA is stale. Never overwrite concurrent remote skill changes merely to preserve a local review lineage.
- If changes are compatible, tests pass, and no unresolved contradiction exists, push a branch and open or update a PR against the remote default branch.
- Merge only after required checks are green and the exact final candidate SHA has independent approval. On GitHub, consume that approval with a direct merge guarded by `--match-head-commit APPROVED_SHA`; do not arm GitHub auto-merge from an external agent verdict because an authorized push can leave it enabled for an unreviewed head. A canonical command shape is `gh pr merge PR_NUMBER --squash --delete-branch --match-head-commit APPROVED_SHA`. If checks finish later, persist `merge_pending` and use a narrowly authorized guarded merge-only continuation.
- Treat the remote PR state as the merge authority. `gh pr merge` can complete the server-side merge and then fail to fast-forward or switch a divergent local branch/worktree. After any warning or non-clean local follow-up, query the PR's `state`, `mergeCommit`, and `headRefOid`, fetch `origin`, verify the merge commit is reachable from `origin/<default>`, and only then classify the merge. Never reset a pre-existing divergent local default branch merely to make post-merge cleanup look successful; remove only the isolated worktree after proving it is clean and the remote merge is durable.
- Never force-push the default branch.
- If no changes survive curation, do not create an empty commit or PR.
- If one skill is blocked, omit that skill and publish independent safe skills; report the blocked skill separately.

After push, verify the remote branch SHA and PR URL. After merge, verify the merge commit is reachable from `origin/<default-branch>`.

## State and Idempotency

The state file is operational metadata and must remain outside the repository, for example:

```text
~/.hermes/state/profile-skill-harvester/state.json
```

Record a profile package as harvested only after its result is merged into the canonical branch or deliberately rejected with a stable reason. Do not advance state merely because a diff was inspected or a branch was pushed.

State should include:

- last successful run time;
- remote default branch and verified SHA;
- observed digest per profile/skill;
- resulting canonical digest or rejection reason;
- PR URL/merge status when applicable.

A retry must reuse or supersede an existing automation PR rather than opening duplicate PRs for the same candidate set.

### Selective state advancement

The inventory script's `--record` mode writes a complete observation snapshot. Do **not** use it after publishing or rejecting only a subset of newly observed candidates, because that silently baselines every unprocessed profile/package difference.

When only some entries are dispositioned:

1. keep the prior state as the base;
2. atomically update only each dispositioned `profiles[profile][skill]` digest/metadata entry;
3. record the resulting canonical digest, stable rejection reason, PR URL, merge commit, and verified remote-default SHA for those entries;
4. leave every unprocessed profile/skill digest unchanged so it remains `newly_observed` next run;
5. rerun inventory against the updated state and assert that dispositioned entries are no longer new while deferred entries still are.

Use full `--record` only when every newly observed candidate in the scan has a final merged or stable-rejection disposition.

### Verify operational markers as changed artifacts

A continuation, blocker, or rollout-state JSON file is an operational deliverable even though it lives outside the repository. After writing or updating one:

1. Create a focused verification script with `tempfile` under the OS temporary directory, using a `hermes-verify-` filename prefix; never place the script in the canonical repository.
2. Parse the marker and assert its required status, immutable repository coordinates, provider/model pin, target list, mutation/state-advancement flags, and remaining gates.
3. Verify external invariants represented by the marker, especially that the exact single-flight lock is absent after cleanup and that any referenced state file exists.
4. Run the script, preserve its real output, and remove it afterward. If the normal file-writing tool rejects the OS temporary path, create the already-scoped temporary file through a noninteractive Python command rather than relocating it into a repository.
5. Treat the marker as the changed artifact for verification bookkeeping. Run the verifier after the final marker write and after lock cleanup, in the same completion sequence. If the execution environment supplies an exact temporary root or repeats a fresh-verification requirement, use that root and rerun the focused verifier rather than pointing to earlier evidence. Keep the verifier idempotent and read-only.
6. Report this evidence explicitly as **targeted ad-hoc verification**, not as repository-suite green. A valid operational marker does not prove `pytest`, package validation, harvest inventory, or rollout adoption passed.

## Daily Report

Report only material outcomes:

- profiles and package counts scanned;
- skills imported or consolidated;
- contradictions and the lifecycle/use-case scoping applied;
- blocked or rejected packages with reasons;
- tests and secret-scan result;
- commit SHA, PR URL, and merge status;
- whether state advanced.

If there are no new differences and no blocker requiring attention, return `[SILENT]`.

## Common Pitfalls

1. **Copying from the dirty canonical checkout.** Always compare against and edit an isolated worktree from the remote default branch.
2. **Treating absence as deletion.** Profiles can carry partial libraries; source-only skills remain canonical.
3. **Ignoring nested packages.** Discover by `SKILL.md` and frontmatter name, including nested category paths.
4. **Losing support files.** Hash and move complete package directories.
5. **Creating duplicate skill names.** If two paths declare the same frontmatter name, block until ownership/path is resolved.
6. **Publishing unresolved ambiguity.** A concise blocked report is better than a confident but incoherent merge.
7. **Updating state too early.** Only merged or explicitly dispositioned candidates advance the baseline.
8. **Leaving worktrees and locks behind.** Clean only the exact automation worktree/branch you created after verifying publication status.
9. **Validating evals with YAML parsing alone.** Run the repository's real eval loader over every package; focused tests must not encode a private schema that production rejects.
10. **Treating a negative verdict as reviewer failure.** A valid `REQUEST_CHANGES` for an unchanged SHA is complete evidence. Fix once and review the new SHA instead of dispatching duplicate reviewers.
11. **Assuming skill sync rewrites cron behavior.** Existing job prompts, attached skills, and toolsets remain stale until explicitly updated and verified through the cron interface.
12. **Fixing review findings without invalidating approval.** Any byte change creates a new candidate SHA and requires fresh independent review; a bounded correction limit can block/escalate but cannot authorize unreviewed remediation.
13. **Using GitHub auto-merge to consume an external exact-SHA verdict.** The enable request can be head-guarded while the later automatic merge is not; an authorized push may leave stale approval armed. Persist `merge_pending` and use a direct `--match-head-commit APPROVED_SHA` merge after revalidation instead.
14. **Verifying target digests only immediately after copy.** For skill-only hot swaps, re-hash after a fresh-process explicit skill load and preserve target-only files; existing conversations need `/reset` or `/new` before clean adoption. When a restart is genuinely required, restart recovery or self-improvement hooks can resume and edit skill files, so re-hash again after platform readiness and provider smoke.
15. **Treating every profile overlay as restart-required—or treating skill policy as runtime capability.** Classify artifacts first. Existing same-name `SKILL.md` and support-file changes hot-load on the next skill invocation; added/removed names may need `/reload-skills`; code, plugins, environment, and startup-loaded configuration require process adoption. Only after that classification should lifecycle capability be preflighted. If a required lifecycle path is unavailable, choose `deploy-only, reload-pending` or `stop-before-deploy`; do not retry blocked restart mechanisms through wrappers. See [`references/gateway-reload-capability-preflight.md`](references/gateway-reload-capability-preflight.md), [`references/controller-gateway-timeout-preflight.md`](references/controller-gateway-timeout-preflight.md), and [`references/controller-to-profile-rollout-boundaries.md`](references/controller-to-profile-rollout-boundaries.md).
16. **Letting a drift gate print failure but continue.** A nonzero comparison does not stop later shell commands unless the shell is fail-fast or the status is explicitly checked. Never place commit/amend/push/state-update commands after a drift probe in a non-fail-fast command chain.
17. **Accepting a review from the wrong checkout.** Spawned Hermes sessions can use a profile-configured cwd. Exact-SHA approval is invalid unless the reviewer reports the requested worktree, clean status, and exact HEAD while using absolute paths or `git -C`.
18. **Testing fixture generation instead of fixture delivery.** A correct `prompt.txt` does not prove either runtime invocation received it. Capture and assert both evaluated-agent and judge arguments, and harden package-relative fixture paths against absolute paths and traversal.
19. **Exhausting execution capacity before cleanup.** Reserve enough tool/time budget for freeze, review, publication disposition, selective state advancement, lock/worktree cleanup, and reporting. Treat discovery of a separately scoped prerequisite PR as a new transaction boundary: normally finish, verify, record, and clean up the prerequisite, then defer the harvest candidate to a fresh run. Continue both transactions in one scheduled run only when enough capacity remains to complete the final gates and cleanup for both. If capacity is tight, stop before creating or publishing another SHA; do not claim state advancement or cleanup that was not verified. After opening a PR, prefer one-shot status reads or a single bounded watcher with completion notification; do not repeatedly poll it. If any required check fails, stop the watcher immediately, persist the failed check/run coordinates and exact candidate SHA, then release the exact lock and clean the isolated worktree before spending more calls on diagnosis. Publication investigation is resumable; lock/worktree cleanup is not optional. Keep a final cleanup reserve even when background subagents, reviewers, and CI watchers are still running, and cancel or disposition those processes before the platform's tool-iteration ceiling can strand them. Do not dispatch overlapping binding reviewers while repeatedly narrowing a candidate; preserve negative findings, cancel stale work where possible, and spend the final review round only on the latest validated SHA. Follow [`references/harvest-continuation-eval-and-budget-recovery.md`](references/harvest-continuation-eval-and-budget-recovery.md).
20. **Letting Python validation contaminate an npm package manifest.** `pytest`, `py_compile`, and imported support scripts can create ignored `__pycache__/` and `.pyc` files under publishable skill directories; npm's `files: ["skills/"]` may still include those ignored bytes and make package-boundary tests fail. In the isolated worktree, inspect `npm pack --dry-run --json` for caches, remove only generated cache directories after Python evidence is complete, and rerun the bare npm package/test command. Prefer repository-wide package exclusions such as `!skills/**/__pycache__/**` and `!skills/**/*.pyc` when changing package metadata is in scope; never delete unknown tracked or user-owned files.
21. **Treating a matching or higher frontmatter version as package equality.** Two live profiles can declare the same version while containing different behavior, and a target can acquire valid profile-local changes while a canonical PR is being reviewed. Immediately before sibling rollout, compare complete-package digests and semantic diffs for every target against the approved canonical package and the recorded pre-rollout baseline. If a target contains unharvested additive or divergent guidance, classify and consolidate it or block that target; never replace it merely because the canonical version is equal or newer. After restart, repeat the digest comparison because resumed profile work may have edited the package again.
22. **Pushing over a concurrently advanced feature branch.** A remote rejection is a concurrency signal, not permission to force. Fetch, inspect the remote-only commits, rebase or merge them without discarding either side, rerun validation, and obtain exact-SHA review for the integrated result. Remote movement creates a new candidate generation even when the local patch itself is unchanged.
23. **Treating screenshot existence as browser evidence.** A zero-byte or fake `.png`, placeholder HTML/JavaScript, and agent prose can satisfy naive artifact checks without exercising the product. Decode and inspect dimensions, run the critical interaction in deterministic browser automation, assert the rendered result, and deliver browser output plus artifact metadata to the judge. See `references/harvest-gate-implementation-checks.md`.
24. **Treating a live lock PID as proof of productive ownership—or deleting its lock first.** A durable lock keeper must survive tool calls, but PID liveness alone does not prove that a scheduled session, worktree, reviewer, publication, or rollout still uses it. Classify the owner using its exact PID/token, command, ancestry, age, associated cron transcript, worktree, and PR/continuation disposition. If useful ownership is proven, exit without interference. If evidence is incomplete, report blocked. Only when the exact lock keeper is proven orphaned may you terminate that PID gracefully, let token-aware cleanup remove the lock, verify process and lock absence, and trigger one manual reconciliation. Never remove the directory while its owner remains alive. See [`references/scheduled-harvest-health-and-lock-recovery.md`](references/scheduled-harvest-health-and-lock-recovery.md).
25. **Treating JSON encoding as shell escaping.** `json.dumps(prompt)` can leave `$(...)` and backticks active inside a `shell=True` command. Prefer argv execution with `shell=False`; otherwise apply `shlex.quote` to the complete dynamic agent and judge prompt arguments, then prove exact literal delivery with a marker-file adversarial test. See `references/harvest-gate-implementation-checks.md`.
26. **Assuming host GitHub auth repairs profiles.** A global `gh auth status`, keychain entry, or one healthy sibling does not prove profile-local access. Audit each `GH_CONFIG_DIR`, preserve declared identity exceptions, and verify `gh api user` plus required scopes per profile before reporting success.

## Verification Checklist

- [ ] Active controller profile/config path identified before the first delegation
- [ ] Package-copy authority and runtime-adoption mode evaluated before target mutation; transaction declared as skill hot-swap, deploy-and-reload, deploy-only/reload-pending, or stop-before-deploy
- [ ] Controller child timeout covers the longest delegated stage and gateway timeout is strictly greater
- [ ] Running controller gateway proved adoption; stale/ambiguous runtime crossed an external-restart boundary and resumed only in a fresh request
- [ ] Scheduler health was proven from the latest run transcript, lock lifecycle, state freshness, and publication/rollout disposition—not inferred from cron `ok`
- [ ] Lock acquired outside the repository
- [ ] Lock ownership remained productive for the run; any live-but-orphaned keeper was classified from exact PID/token, command/ancestry, session, worktree, and PR state, then gracefully terminated with lock absence verified
- [ ] Remote/default branch and GitHub auth verified
- [ ] Production eval invocation path preflighted before curation; any declared fixture was proven to reach both evaluated-agent and judge calls with a disposable sentinel
- [ ] Dynamic fixture and candidate-output text remains literal at every shell boundary; agent and judge marker-file adversarial tests create no side effects
- [ ] Isolated worktree created from current `origin/<default>`
- [ ] All configured profiles scanned read-only before the first canonical behavior edit or exact-review freeze
- [ ] Higher-version and same-version/different-digest live variants reconciled into a common predecessor or explicitly classified; regressions prove reusable predecessor controls remain
- [ ] Complete skill packages compared by frontmatter identity and digest
- [ ] Live-source files rechecked immediately before freeze; drift probe ran under fail-fast semantics and only recorded canonical adaptations differ
- [ ] Every divergence classified
- [ ] Contradictions scoped by lifecycle/use case or explicitly blocked
- [ ] `SKILL.md`, `EVAL.yaml`, and fixtures updated together
- [ ] No runtime state or secrets staged
- [ ] Changed package metadata and support scripts validate
- [ ] Every changed `EVAL*.yaml` loads through the repository's actual eval runner; every declared fixture path is package-relative, optional fixture fields are handled conditionally, and both agent/judge invocations receive the effective fixture when one is declared
- [ ] Mutating evals operate on a unique copied workspace, preserve canonical fixture bytes, reject workspace/artifact path escapes, and run declared verification commands before judging
- [ ] Browser/screenshot claims are backed by deterministic journey execution, decoded non-empty images with required dimensions or viewport metadata, and browser/artifact evidence delivered to the judge—not artifact existence or agent prose alone
- [ ] Remote feature branch was fetched immediately before push/merge; concurrent remote commits were inspected and integrated without force, affected validation was rerun, and any older exact-SHA approval was invalidated
- [ ] `python -m pytest` and `git diff --check` pass
- [ ] After Python validation, npm package manifests/tests exclude generated `__pycache__/` and `.pyc` bytes; only known generated caches were removed
- [ ] Independent review approves the exact final candidate SHA from the intended clean worktree; any remediation was freshly re-reviewed
- [ ] Reviewer reliability changes were reconciled into existing cron prompts/skill attachments when applicable
- [ ] Completion-hook changes wake the authoritative scheduler on every terminal event, keep hook payloads out of dispatch authority, debounce duplicates, and retain periodic fallback
- [ ] Remote SHA and PR/merge state verified
- [ ] Existing sibling target packages backed up before authorized replacement
- [ ] Every target's complete-package digest and semantic diff compared against the approved canonical package and its pre-rollout baseline; equal version strings were not treated as equality, and unharvested target drift was consolidated or blocked
- [ ] Same-path profile adaptations used the immutable pre-change canonical SHA as three-way ancestor (never post-merge `origin/main`), passed a conflict-free dry-run, and retained explicit profile-policy markers in addition to target-only file counts
- [ ] Installed target package bytes verified immediately after copy and after the applicable adoption proof: fresh-process explicit skill load for hot swaps, or changed gateway generation plus platform/provider readiness when restart is required
- [ ] Profile-family service identities audited per profile-local configuration; shared identity targets and explicit exception profiles are declared before mutation
- [ ] Shared credentials were authenticated in isolation, copied only to approved profile-local destinations, and every target passed identity/scope/API verification without secret exposure
- [ ] Skill discovery confirms one enabled package per frontmatter name; superseded nested duplicates were backed up and removed
- [ ] External state advanced only after final disposition
- [ ] Exact lock/worktree cleanup performed
