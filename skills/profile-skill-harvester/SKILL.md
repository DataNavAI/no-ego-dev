---
name: profile-skill-harvester
description: Use when harvesting skill updates from one or more live Hermes profiles into a canonical profile-distribution repository. Compares complete skill packages, consolidates compatible updates, scopes contradictory guidance by use case and product lifecycle stage, validates the result, and publishes through an isolated Git workflow without sweeping unrelated runtime or repository state.
version: 1.5.54
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
8. **One scheduler at a time.** Use a lock under the non-repository state directory and exit quietly when another harvest is active. Apart from locating and classifying an existing lock and verifying the immutable packaged helper, acquire the finite lease before fetching, refreshing PRs, measuring dirty worktrees, reading CI logs, or rewriting continuation markers. Read-only reconciliation is still harvest work and must not race another controller.
9. **Respect profile ownership.** Central orchestration may distribute reusable skill packages, but product-local runners, cron jobs, releases, and operations belong to their named profile. A controller must not take over that work unless the user explicitly authorizes intervention. Cleanup after an ownership mistake removes only controller-created scratch/cache artifacts, never similarly named state under the owning profile.
10. **No live-only harvest completion.** Every selected new or updated reusable skill must become a complete eval-backed package in the canonical repository and merge into the verified remote default branch before profile rollout or observed-digest advancement. A global/default edit, direct profile copy, candidate worktree, pushed branch, open PR, negative disposition, or owner override is not publication. Rollout bytes must be exported from the verified merge commit.

## Scheduled-job model pinning and canonical sibling rollout

When a harvest is run by a durable cron job, pin the job to an explicit provider/model after any global inference-model change. The canonical high-reasoning model for the NoEgoDev daily harvest is `gpt-5.6-sol` with provider `openai-codex` (the requested Sola model). Do not infer the model from the active profile default, because profile defaults may drift independently. An unpinned or differently pinned job is a configuration failure: update the existing job (never create a duplicate), read back the exact provider/model, and run one manual reconciliation before treating the job as healthy. Each run report must include the effective provider/model and must fail closed if the requested model cannot be selected.

Do not equate scheduler-level `ok` or `execution_success` with a successful harvest. Audit the latest run transcript, lock lifecycle, state freshness, worktree/PR disposition, and per-target rollout evidence. Repeated `BUSY`, immediate `[SILENT]` before inventory, or unchanged stale state is degraded operation even when cron reports success. Follow [`references/scheduled-harvest-health-and-lock-recovery.md`](references/scheduled-harvest-health-and-lock-recovery.md) for productive-run proof, live-but-orphaned lock classification, exact-owner cleanup, and manual reconciliation.

**Resume unfinished publication before new inventory (`resume-before-inventory`).** An open automation PR—or a closed-unmerged PR whose automation branch, dirty/local-ahead worktree, review/evidence receipts, or continuation marker still preserve unpublished candidate bytes—is a first-class queue item, as are failed required checks and reviewed candidates. A live `CLOSED` state must immediately replace stale marker prose that still says `OPEN`, but closure alone does not authorize discarding the candidate. After generation-sensitive preflights clear, either reopen the coherent PR or continue on one explicitly superseding PR; never create duplicate publication for the same candidate set. Discover this queue broadly: enumerate open and recently closed automation PRs, automation branches, registered worktrees, and continuation/review artifacts rather than filtering on one historical branch-name prefix. Enumerate timestamped and legacy marker names (for example `continuation*.json`) instead of probing only one canonical `continuation.json`; follow `supersedes` links and reconcile the newest coherent chain against live GitHub state. A differently named automation branch can still be the active publication. For a dirty isolated worktree, preserve its bytes and recompute the current exact modified-path set plus deterministic binary-diff digest and size on every reconciliation. Never carry those measurements forward from an older marker: another authorized actor or interrupted run may have changed the dirty generation while `HEAD` and the remote PR head stayed fixed. Never clean, reset, commit, or fold those bytes into a marker-only restart-boundary run. Classify the exact failed job, repair routine evidence/CI defects within existing authority, use at most one retry for a proven external transient, invalidate review whenever candidate bytes change, and continue through exact-head merge, applicable post-merge CI, merged-byte rollout, selective state advancement, and lock release. Reserve an actionable human boundary only for irreducible authorization or conflicting user decisions. Follow [`references/self-unblocking-publication.md`](references/self-unblocking-publication.md).

At a controller restart boundary, refresh `origin/<default>` before superseding the continuation marker and re-query the PR's live `mergeable` and `mergeStateStatus` fields. Default-branch movement can turn a previously mergeable publication into a stale-base conflict while the candidate head remains unchanged. Record the refreshed default SHA, merge base, ahead/behind counts, exact dirty-path set, binary-diff digest and size, and current failed-check coordinates; never carry forward the prior marker's mergeability classification as if it were current evidence.

A broad queue scan is discovery, not ownership transfer. Classify every open PR, remote branch, and registered worktree as either part of the active harvest continuation or independently owned work, and record that disposition in the continuation marker. Reconcile only the harvest-owned publication in depth unless another artifact provides explicit controller authority. Do not report unrelated open PRs as harvest blockers, do not modify their branches, and do not let their failed checks obscure the exact failed job on the active harvest PR. When the default branch advances because unrelated work merged, recompute the harvest candidate's merge base and ahead/behind counts even if its HEAD, dirty-path set, and binary-diff digest remain unchanged.

If the scheduled job also deploys the canonical distribution to sibling profiles, make the rollout contract explicit in the prompt: enumerate every target profile, define the canonical package root, compare every distinct complete-package digest regardless of version/baseline state, and assign every semantic/support-file delta exactly one evidence-backed disposition before mutation. Back up each target, re-harvest reusable additions, preserve only declared/hash-verified `product-local` adaptations, block `unsafe`/`unresolved` drift with state unadvanced, validate fresh-process discovery per target, and report each target independently. A successful `[SILENT]` result means no new change or blocker was found—not that targets may be assumed synchronized without per-target digest/adoption checks.

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

Use `scripts/lease_lock.py hold` as the packaged keeper implementation after verifying that helper against the immutable canonical blob. Run it as a managed background process with a finite `--lease-seconds` shorter than the scheduler interval; keep its PID, opaque owner token, and expiry private. Never substitute an immortal inline keeper. On every terminal path invoke `scripts/lease_lock.py release` with the exact current PID/token, let a live keeper exit only through its authenticated loopback control path, and verify both keeper disposition and lexical lock absence. Dead or expired owners may have only their exact owned lock reclaimed. If final directory removal fails, the helper must preserve or restore recoverable ownership rather than leave an ownerless lock. Follow [`references/self-unblocking-publication.md`](references/self-unblocking-publication.md).

**Before the first delegation, preflight the active controller profile—not only the live profiles being harvested.** Verify the controller's persisted child/gateway timeout values and prove the running gateway adopted them. If the config must change or runtime adoption is stale/ambiguous, fail closed for delegation and mutation, but still finish bounded read-only reconciliation of any pre-existing publication: refresh the named PR, verify merge reachability and exact post-merge CI, derive the complete changed-package set from immutable base/merge coordinates, and supersede stale continuation prose. Then persist the rollout/state gates and stop at the restart boundary. A user/admin may issue the supported messaging `/restart` command, which gracefully drains active runs before restarting, or restart from a genuinely external shell/supervisor. The agent must not invoke a terminal lifecycle command against the gateway that owns its current request. Resume delegation, review, merge, rollout, or new inventory only in a fresh request after renewed runtime proof. Follow [`references/controller-gateway-timeout-preflight.md`](references/controller-gateway-timeout-preflight.md).

Fail closed if:

- the canonical repository or expected remote is missing;
- GitHub authentication is unavailable;
- a profile path resolves outside `~/.hermes/profiles/`;
- the remote default branch cannot be resolved;
- another harvest owns the lock.

Do not modify the user's existing checkout to make it clean.

### 2. Preflight the repository's real eval path

Before curating candidates or spending any exact-SHA review round, inspect the repository's production eval loader **and invocation path**, not only its YAML parser. Run one disposable sentinel eval outside the repository when practical and capture both evaluated-agent and judge arguments. If an eval declares `parameters.fixture`, prove that the package-relative fixture text reaches both invocations. A loader retaining the fixture path in an in-memory `parameters` map is not delivery evidence; neither is adding scenarios to an `evaldata/README.md` that `run_eval` never reads.

Inventory validation and the production loader must share one command-field contract. For every present `setupCommands`, `setup_commands`, `teardownCommands`, or `teardown_commands` key, reject null, false, zero, scalar, mapping, non-string entries, and blank/whitespace-only strings; an omitted field or explicit empty array is valid. Validate every present alias independently and reject simultaneous camelCase/snake_case aliases as ambiguous—never use `value or []` or preferred-key lookup that turns falsy invalid values into absence or ignores an invalid secondary alias. Add adversarial tests for all four aliases and both validators.

Fail closed before candidate freeze when the current runner cannot exercise behavior that the harvest must add. Classify this as a repository eval-harness prerequisite rather than repeatedly revising skill prose or consuming review rounds on structurally inert fixtures. Either fix the harness in a separately scoped, independently reviewed change first, or omit/block the affected package changes without baselining them.

Before trusting an external prerequisite or continuation marker from an earlier run, reconcile it against live GitHub and repository state. A marker may still say `pending` after its PR merged, or may name a candidate SHA that is no longer the remote-default generation. Treat it as historical evidence until the PR state, merge reachability, current runner bytes, and remaining gates are re-proven. Refresh or supersede the marker outside the repository; never let stale continuation prose bypass or indefinitely preserve a prerequisite gate.

When the runner creates an isolated `HERMES_HOME`, also prove that the real authenticated runtime model reaches that profile without copying the entire live config. Credential files alone do not select a provider when the distribution config points elsewhere. Overlay only non-secret model selector fields, preserve distribution behavior settings, and run a real agent+judge smoke after fake-command wiring tests. Follow [`references/isolated-eval-runtime-provider.md`](references/isolated-eval-runtime-provider.md).

Preflight behavioral-eval side effects before treating a verdict as skill evidence. Probe declared external repositories/branches, reject concurrent execution against fixed shared workspaces, and require authenticated disposable targets when a prompt claims to verify real GitHub threads, CI retries, publication, or cleanup. If the eval's purpose is instead to test procedural policy and no disposable target exists, declare a non-mutating deterministic simulation explicitly: forbid fabricated success, require ordered state transitions, exact production command shapes, evidence gates, and cleanup for every terminal path, and state that production runs with verified coordinates must execute those actions. A prompt that demands real side effects without fixtures is an eval prerequisite failure; repair or defer only that package rather than blaming the evaluated model. A simulation verdict is behavioral evidence only, never proof that a merge, CI run, rollout, or process cleanup occurred. For Git-aware repository suites, validate in a temporary clone or detached worktree, not a metadata-free `git archive`. Follow [`references/harvest-continuation-eval-and-budget-recovery.md`](references/harvest-continuation-eval-and-budget-recovery.md) and [`references/self-unblocking-publication.md`](references/self-unblocking-publication.md).

When an eval covers private owner proofs, auth, or credential-shaped command arguments, keep exact private-byte mechanics in deterministic tests and make the behavioral eval assert redaction-safe state transitions instead of literal secret-bearing shell fragments. Inspect the runner's scrubber after the first repeated failure class rather than retrying unchanged prompts. Follow [`references/redaction-safe-behavioral-evals.md`](references/redaction-safe-behavioral-evals.md).

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

**This is a pre-candidate gate, not rollout-only bookkeeping.** Finish the complete inventory of every live profile **and the active global/default installed copy of the same skill** before the first behavior edit, staged-diff freeze, or exact-candidate review. Reconcile every distinct complete-package digest regardless of whether its declared version is lower, equal, higher, missing, or malformed and regardless of whether inventory state already baselined it. Version and state control ordering/deduplication only; they never filter semantic inspection or establish authority.

Build a semantic disposition ledger before choosing canonical bytes. For every behavior and support-file delta, record origin/evidence and exactly one disposition: `adopted`, `scoped`, `superseded`, `product-local`, `unsafe`, or `unresolved`. Do not silently omit a lower-version idea, automatically classify target-only files as local, or use user standardization authority/backups to bypass this ledger. Reusable guidance absent from canonical must be synthesized into a newly validated, exact-SHA-reviewed, merged generation before overwrite. Unsafe or unresolved same-scope conflicts block only the affected package/profile and leave its state unadvanced.

After verified merge, apply the latest verified canonical package set selected by the transaction to **every nonblocked enrolled profile**, including the source profile and profiles whose version already matches. Completion requires exact canonical bytes or an explicitly declared, hash-verified three-way `product-local` adaptation, followed by fresh-process loading and post-adoption digest proof. If target preflight reveals new reusable drift, stop and re-harvest it before overwrite; canonical publication without instance convergence is incomplete. Follow [`references/pre-candidate-live-variant-reconciliation.md`](references/pre-candidate-live-variant-reconciliation.md), [`references/sibling-rollout-drift-adaptations.md`](references/sibling-rollout-drift-adaptations.md), and [`references/transactional-profile-rollout.md`](references/transactional-profile-rollout.md).

For each `(profile, skill)` record:

- package path;
- package digest;
- newest file modification time as a discovery signal;
- source-repository digest, if present;
- prior observed digest from the external state file, if present;
- whether several profiles contain distinct variants.

Every package whose complete digest differs from remote-default is a semantic synthesis input. `newly_observed` and prior state decide whether publication work is newly scheduled or deduplicated; they never decide whether a distinct variant is inspected or whether its reusable deltas enter the disposition ledger.

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

When a policy update changes cron setup, idle-worker reconciliation, dispatch authority, liveness, or crash recovery, treat it as a controller change rather than prose-only skill maintenance. Inventory every competing authority, require executable overlap/crash tests, distinguish a local state-machine model from real scheduler/broker side-effect proof, and adversarially verify that stale `ACTIVE` state cannot block a project forever. Follow [`references/controller-policy-change-validation.md`](references/controller-policy-change-validation.md).

### Policy-wide reviewer changes

When the requested change is a review philosophy or convergence rule, do not patch only the most obvious reviewer `SKILL.md`. Inventory the entire behavior surface first:

- direct role reviewers (for example product/PRD, technical design, UI, and specification compliance);
- review orchestrators and scheduled controllers;
- immutable-candidate/release gates and convergence references;
- every package's `EVAL.yaml`, fixtures, output templates, severity vocabulary, and nested `references/` files.

Publish profile-only reviewer roles only when they satisfy the normal NoEgoDev provenance and complete-package rules; copy the whole package, then adapt it canonically. Encode the shared policy with consistent headings/markers and add repository tests that recursively scan complete packages, not only top-level `SKILL.md`. This catches stale verdict enums and reference prose such as `LOW`, `APPROVED_WITH_MINOR_NOTES`, `PASS WITH MINOR POLISH`, old round caps, or unbounded retry language that would silently preserve the superseded behavior.

Follow [`references/review-policy-contradiction-scan.md`](references/review-policy-contradiction-scan.md) for the full behavior-surface inventory, TDD pattern that first proves contradictory output is still representable, semantic phrase families, action-attached negation classifiers, cross-package lifecycle invariants, eval/reference checks, and unbounded post-Round-3 approval-convergence handling. Positive-marker tests alone are insufficient: a package can contain the canonical rule while a nested template, pitfall, fixture, related lifecycle package, or lowercase output field still authorizes the opposite behavior. Generic nearby words such as `without`, `instead of`, or `may be` never exempt a destructive action unless the grammar binds them directly to that action; every exemption needs a paired unrelated-prefix mutation.

Translate user intent exactly. If the user says to **ignore reversible nits**, omit them entirely from findings and follow-up rather than merely making them non-blocking or grouping them under “minor notes.” Preserve blocking treatment for severe correctness, safety, security, privacy, destructive-data, or other high-consequence failures even when the mechanical patch is small.

For first-round completeness, parallel review kinds against one frozen candidate share the same numbered round and should be consolidated into one author steering packet. Later rounds disposition that packet and correction-introduced regressions; splitting review kinds, renaming artifacts, or swapping reviewers does not reset or fork the monotonic lineage. Round 4 and later enter approval-convergence mode and should return `APPROVED` as soon as no unresolved material blocker remains, without extending review for reversible nits or optional hardening. If the candidate moves while Round-1 reviewers are still running, their verdicts are stale but their reproducible findings remain Round-1 input: collect the complete reports, apply one consolidated correction, rerun validation, and obtain fresh exact-SHA approval on the corrected candidate.

If the policy-wide change is specifically about coder/implementation static analysis, follow [`references/coder-static-analysis-policy.md`](references/coder-static-analysis-policy.md). It defines ecosystem-aware analyzer discovery and provisioning, per-change plus final full-project enforcement, fail-closed suppression rules, eval/test coverage, exact-SHA review interaction, and complete-package sibling rollout.

### Production metric-pipeline regression changes

When the requested policy makes production metric collection a release-critical invariant, do not patch only `devops`, `qa`, or the most obvious planning skill. Inventory and update the complete planning-to-release surface: MVP/product/project planning, architecture, implementation and delegated development, domain implementers that can ship a service, PRD/technical review, QA/DevOps, plan and launch templates, every package's `EVAL*.yaml`, fixtures, and nested references.

Every production-service plan must include a **release-blocking task** to add or update automated metric-pipeline regression tests. The evidence must cover the production-equivalent chain from emission through transport, collection, ingestion, storage, aggregation/query, and dashboard/report/alert readback, including missing, malformed, duplicate, and delayed signals. An emitter-only unit test or manual dashboard glance is not sufficient. Product analytics may be lifecycle-scoped, but regression evidence for an operational metric path used by a production service is never optional and cannot be waived by a generic owner/user exception.

Start with a failing cross-package contract test that enumerates every in-scope package and its behavioral EVAL expectation. Materialize the task and launch blocker in generated-plan templates, scan for semantic waiver paths, run focused plus repository-wide validation, and require fresh exact-SHA review after any correction. Follow [`references/production-metric-pipeline-regression-propagation.md`](references/production-metric-pipeline-regression-propagation.md) for the full propagation map, full-chain test contract, and reviewer probes.

## Live Source Freeze and Sibling Propagation

Treat profile packages as mutable until the canonical candidate is committed. Recompare every live-source file immediately before freeze, allow only recorded canonical adaptations, and restart validation if unexpected drift appears. After merge, back up target packages, replace only authorized skill directories, verify canonical digests, smoke-test discovery/provider operation, advance state, and release the exact lock on every exit.

Do not reflexively restart a gateway after a **skill-only** overlay. Existing same-name skills are read from disk when invoked, so new sessions and workers hot-load updated `SKILL.md` and support files. Existing conversations should use `/reset` or `/new` before relying on changed instructions; `/reload-skills` is for rescanning added or removed skill names. Reserve gateway restarts for startup-loaded code, plugins, environment, or configuration, or when live evidence shows the changed artifact is process-cached. Record `hot-swap verified` separately from `gateway restarted` rather than treating restart as the universal adoption gate.

Follow [`references/live-source-freeze-and-target-sync.md`](references/live-source-freeze-and-target-sync.md) for the byte-comparison loop, incomplete-package completion, scanner false-positive handling, target-variant replacement boundary, hot-swap/restart decision, and post-merge verification sequence. When a sibling has same-path live drift at rollout time, follow [`references/sibling-rollout-drift-adaptations.md`](references/sibling-rollout-drift-adaptations.md) for global preflight, mandatory per-delta disposition, canonical re-harvest of reusable drift, declared/hash-verified product-local adaptations, transactional overlays, evidence retention, and separate exact-versus-adapted reporting.

For controller-to-sibling deployment, profile ownership boundaries, verified-merge-source overlays that retain only declared/hash-verified `product-local` adaptations, fail-fast validation, fresh-process discovery smokes, and the user-authorized sibling-gateway restart procedure, follow [`references/controller-to-profile-rollout-boundaries.md`](references/controller-to-profile-rollout-boundaries.md). A user may expand rollout scope or accept product risk, but cannot waive semantic disposition or make a rejected branch commit, candidate worktree, pushed branch, or open PR count as canonical publication. Before mutating targets, separately preflight whether the current execution context can actually perform the required lifecycle adoption; skill wording is not execution authority. Follow [`references/gateway-reload-capability-preflight.md`](references/gateway-reload-capability-preflight.md).

For the canonical-publication hard gate, state advancement rules, source-of-bytes rule, and contradiction scan across executable and nested reference paths, follow [`references/canonical-publication-before-rollout.md`](references/canonical-publication-before-rollout.md).

When the user asks to apply the latest canonical distribution but the recorded per-package deployment ancestor is stale, missing, or unusable, follow [`references/stale-baseline-version-gated-rollout.md`](references/stale-baseline-version-gated-rollout.md). Missing ancestry increases semantic inspection: inspect every distinct digest regardless of version, complete the disposition ledger, re-harvest reusable drift, and converge each nonblocked target to exact canonical bytes or a declared/hash-verified `product-local` adaptation. Still require frozen-source hashes, transactional backup/rollback, fresh-process smokes, and post-smoke re-hashing.

Follow [`references/harvest-gate-implementation-checks.md`](references/harvest-gate-implementation-checks.md) when implementing the freeze gate, spawning an exact-SHA reviewer, validating eval fixture delivery and literal shell-safe prompt transport, building isolated mutating eval workspaces, proving browser/screenshot evidence, or budgeting the final cleanup sequence. In particular, run drift comparisons under fail-fast shell semantics so a nonzero drift result cannot fall through into commit, amend, push, or state-update commands; make disposable fixture recorders independent of scrubbed custom environment variables; keep cross-platform eval fixtures free of POSIX-only setup commands; and explicitly dispatch a newly introduced workflow from the frozen candidate ref when PR checks do not auto-start, verifying the run `headSha` and required platform job.

When the harvest also addresses slow, interrupted, or repeatedly dispatched subagent reviews in sibling profiles, follow [`references/scheduled-reviewer-reliability-audit.md`](references/scheduled-reviewer-reliability-audit.md). Diagnose child execution, async result delivery, controller context size, duplicate same-SHA verdicts, and cron configuration separately before changing timeout values. Package synchronization alone is insufficient when existing cron prompts or attached-skill lists encode the stale behavior; update those jobs through the Hermes cron interface and verify durable reconciliation on a fresh run.

When a live workflow-stall postmortem must become a canonical policy correction and sibling rollout, follow [`references/workflow-stall-postmortem-to-rollout.md`](references/workflow-stall-postmortem-to-rollout.md). It separates immediate product blockers from systemic protocol multipliers, requires direct staging/production truth, preserves safety gates while removing coordination churn, enforces monotonic package versioning across divergent live variants, and defines backup, duplicate-retirement, parity, and adoption checks.

For a concise, reusable rollout transaction—including candidate-generation digests, immutable squash-merge comparison, detached remote-source worktrees, pre-mutation drift guards, atomic canonical overlays that retain only ledger-dispositioned, hash-verified `product-local` adaptations, rollback, duplicate retirement, and fresh runtime skill-load proof—follow [`references/transactional-profile-rollout.md`](references/transactional-profile-rollout.md). A staged-diff digest can bind a pre-commit review generation, but it does not replace exact commit-SHA approval where the publication gate requires it.

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

Record a new or updated profile package as harvested, and advance its observed digest, only after its result is merged into the verified remote default branch. Persist a stable blocked/rejected disposition separately, keyed to the candidate digest, so repeated analysis can be deduplicated without replacing the prior observed digest, making the candidate no longer `newly_observed`, or counting it as publication. Do not advance state because a diff was inspected, validated, rejected, pushed, or placed in an open PR.

State should include:

- last successful run time;
- remote default branch and verified SHA;
- observed digest per profile/skill;
- resulting canonical digest for merged entries;
- separate blocked/rejected candidate digest and reason without baseline advancement;
- PR URL/merge status when applicable.

A retry must reuse or supersede an existing automation PR rather than opening duplicate PRs for the same candidate set.

### Selective state advancement

The inventory script's `--record` mode writes a complete observation snapshot. Do **not** use it when any newly observed candidate remains unpublished, because that silently baselines blocked, rejected, deferred, pushed-only, or open-PR differences. The executable `--record` path must fail closed unless every new/update candidate is already represented by the verified remote-default merge generation; prose-only warnings are insufficient.

When only some entries are merged:

1. keep the prior state as the base;
2. atomically update only each merged `profiles[profile][skill]` digest/metadata entry;
3. record the resulting canonical digest, PR URL, merge commit, and verified remote-default SHA for those merged entries;
4. record blocked/rejected candidate digests and stable reasons in a separate disposition map without changing their prior observed digest;
5. leave every unpublished profile/skill digest unchanged so it remains `newly_observed` next run;
6. rerun inventory against the updated state and assert that merged entries are no longer new while blocked, rejected, deferred, pushed-only, and open-PR entries still are.

Use full `--record` only when every newly observed new/update candidate in the scan is merged into the verified remote default branch. Add a deterministic test that invokes the executable record path and proves it refuses unpublished candidates; marker-presence tests alone do not close the bypass.

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

For a controller/gateway restart boundary, the user-facing report must name the active harvest/publication outcome and distinguish the **first failed preflight** from the **full remaining publication path**. Explain why runtime adoption is unproved, why the owning request cannot safely restart itself, exactly which gate an external restart clears, and which known conflict-resolution, validation, exact-SHA review, evidence, CI, merge, rollout, and fresh-load gates still remain. Never imply that restart alone publishes or deploys the skill set. Keep PIDs, timestamps, timeout keys, lock mechanics, and marker paths secondary unless needed as evidence. Apply the `product-communication` envelope even when that skill is not separately attached to the cron job.

If there are no new differences and no blocker requiring attention, return `[SILENT]`.

## Common Pitfalls

1. **Copying from the dirty canonical checkout.** Always compare against and edit an isolated worktree from the remote default branch.
2. **Treating absence as deletion.** Profiles can carry partial libraries; source-only skills remain canonical.
3. **Ignoring nested packages.** Discover by `SKILL.md` and frontmatter name, including nested category paths.
4. **Losing support files.** Hash and move complete package directories.
5. **Creating duplicate skill names.** If two paths declare the same frontmatter name, block until ownership/path is resolved.
6. **Publishing unresolved ambiguity.** A concise blocked report is better than a confident but incoherent merge.
7. **Updating state or rolling out before canonical publication.** Only candidates merged into the verified remote default branch may advance their observed digest or supply rollout bytes. Keep blocked/rejected dispositions separate; do not baseline them. Do not use an owner override, tree equality, a candidate worktree, pushed branch, or open PR as a publication substitute. Scan executable helpers and every nested reference/template for semantic bypasses; positive markers in top-level prose are not sufficient.
8. **Leaving worktrees and locks behind.** Clean only the exact automation worktree/branch you created after verifying publication status.
9. **Validating evals with YAML parsing alone.** Run the repository's real eval loader over every package; focused tests must not encode a private schema that production rejects.
10. **Treating a negative verdict as reviewer failure.** A valid `REQUEST_CHANGES` for an unchanged SHA is complete evidence. Fix once and review the new SHA instead of dispatching duplicate reviewers.
11. **Assuming skill sync rewrites cron behavior.** Existing job prompts, attached skills, and toolsets remain stale until explicitly updated and verified through the cron interface.
12. **Fixing review findings without invalidating approval.** Any byte change creates a new candidate SHA and requires fresh independent review; a bounded correction limit can block/escalate but cannot authorize unreviewed remediation.
13. **Using GitHub auto-merge to consume an external exact-SHA verdict.** The enable request can be head-guarded while the later automatic merge is not; an authorized push may leave stale approval armed. Persist `merge_pending` and use a direct `--match-head-commit APPROVED_SHA` merge after revalidation instead.
14. **Verifying target digests only immediately after copy.** For skill-only hot swaps, re-hash after a fresh-process explicit skill load and retain only adaptations already dispositioned `product-local` and bound in the pre-rollout manifest; existing conversations need `/reset` or `/new` before clean adoption. When a restart is genuinely required, restart recovery or self-improvement hooks can resume and edit skill files, so re-hash again after platform readiness and provider smoke.
15. **Treating every profile overlay as restart-required—or treating skill policy as runtime capability.** Classify artifacts first. Existing same-name `SKILL.md` and support-file changes hot-load on the next skill invocation; added/removed names may need `/reload-skills`; code, plugins, environment, and startup-loaded configuration require process adoption. Only after that classification should lifecycle capability be preflighted. If a required lifecycle path is unavailable, choose `deploy-only, reload-pending` or `stop-before-deploy`; do not retry blocked restart mechanisms through wrappers. See [`references/gateway-reload-capability-preflight.md`](references/gateway-reload-capability-preflight.md), [`references/controller-gateway-timeout-preflight.md`](references/controller-gateway-timeout-preflight.md), and [`references/controller-to-profile-rollout-boundaries.md`](references/controller-to-profile-rollout-boundaries.md).
16. **Letting a drift gate print failure but continue.** A nonzero comparison does not stop later shell commands unless the shell is fail-fast or the status is explicitly checked. Never place commit/amend/push/state-update commands after a drift probe in a non-fail-fast command chain.
17. **Accepting a review from the wrong checkout.** Spawned Hermes sessions can use a profile-configured cwd. Exact-SHA approval is invalid unless the reviewer reports the requested worktree, clean status, and exact HEAD while using absolute paths or `git -C`.
18. **Testing fixture generation instead of fixture delivery.** A correct `prompt.txt` does not prove either runtime invocation received it. Capture and assert both evaluated-agent and judge arguments, and harden package-relative fixture paths against absolute paths and traversal.
19. **Exhausting execution capacity before cleanup.** Reserve enough tool/time budget for freeze, review, publication disposition, selective state advancement, lock/worktree cleanup, and reporting. Treat discovery of a separately scoped prerequisite PR as a new transaction boundary: normally finish, verify, record, and clean up the prerequisite, then defer the harvest candidate to a fresh run. Continue both transactions in one scheduled run only when enough capacity remains to complete the final gates and cleanup for both. If capacity is tight, stop before creating or publishing another SHA; do not claim state advancement or cleanup that was not verified. After opening a PR, prefer one-shot status reads or a single bounded watcher with completion notification; do not repeatedly poll it. If any required check fails, stop the watcher immediately, persist the failed check/run coordinates and exact candidate SHA, then release the exact lock and clean the isolated worktree before spending more calls on diagnosis. Publication investigation is resumable; lock/worktree cleanup is not optional. Keep a final cleanup reserve even when background subagents, reviewers, and CI watchers are still running, and cancel or disposition those processes before the platform's tool-iteration ceiling can strand them. Do not dispatch overlapping binding reviewers while repeatedly narrowing a candidate; preserve negative findings, cancel stale work where possible, and spend the final review round only on the latest validated SHA. Follow [`references/harvest-continuation-eval-and-budget-recovery.md`](references/harvest-continuation-eval-and-budget-recovery.md).
20. **Letting Python validation contaminate an npm package manifest.** `pytest`, `py_compile`, and imported support scripts can create ignored `__pycache__/` and `.pyc` files under publishable skill directories; npm's `files: ["skills/"]` may still include those ignored bytes and make package-boundary tests fail. In the isolated worktree, inspect `npm pack --dry-run --json` for caches, remove only generated cache directories after Python evidence is complete, and rerun the bare npm package/test command. Prefer repository-wide package exclusions such as `!skills/**/__pycache__/**` and `!skills/**/*.pyc` when changing package metadata is in scope; never delete unknown tracked or user-owned files.
21. **Treating version or baseline state as semantic authority.** Two profiles can declare the same version with different behavior, and a lower-version or previously baselined package can contain the best reusable control. Inspect every distinct complete-package digest across lower/equal/higher/missing versions, assign every delta exactly one disposition, and synthesize reusable guidance canonically. Immediately before rollout, repeat the comparison; re-harvest reusable target drift into a new reviewed/merged generation, preserve only declared/hash-verified product-local adaptations, and block unsafe/unresolved packages with state unadvanced.
22. **Pushing over a concurrently advanced feature branch.** A remote rejection is a concurrency signal, not permission to force. Fetch, inspect the remote-only commits, rebase or merge them without discarding either side, rerun validation, and obtain exact-SHA review for the integrated result. Remote movement creates a new candidate generation even when the local patch itself is unchanged.
23. **Treating screenshot existence as browser evidence.** A zero-byte or fake `.png`, placeholder HTML/JavaScript, and agent prose can satisfy naive artifact checks without exercising the product. Decode and inspect dimensions, run the critical interaction in deterministic browser automation, assert the rendered result, and deliver browser output plus artifact metadata to the judge. See `references/harvest-gate-implementation-checks.md`.
24. **Treating a live lock PID as proof of productive ownership—or trusting stale metadata.** A durable lock keeper must survive tool calls, but PID liveness alone does not prove that a scheduled session, worktree, reviewer, publication, or rollout still uses it, and an old PID can be reused by an unrelated process. Classify the owner using its exact PID/token, command, ancestry, age, associated cron transcript, worktree, and PR/continuation disposition. If useful ownership is proven, exit without interference. If evidence is incomplete, report blocked. A live keeper may self-terminate only through an authenticated control path. Never signal a PID from owner metadata. A dead or expired owner may have only its exact token-owned lock reclaimed after proving no productive work remains. Verify keeper disposition and lock absence, then trigger at most one manual reconciliation. See [`references/scheduled-harvest-health-and-lock-recovery.md`](references/scheduled-harvest-health-and-lock-recovery.md) and [`references/self-unblocking-publication.md`](references/self-unblocking-publication.md).

   Binding review must adversarially probe the implementation rather than trusting happy-path tests. Simulate termination between lock-directory creation and owner publication, ownerless and malformed lock directories, and cleanup with an unexpected file left in the directory. Cleanup must not delete the only recoverable owner identity before proving the directory can be removed; if final removal fails, restore safe ownership or retain a narrowly reclaimable initialization marker. Prove that a subsequent acquisition cannot remain permanently `BUSY` on an ownerless directory. When a validated old malformed claim races with a new canonical owner, discard only the stale claim, preserve the replacement, remove all private claim/backup artifacts, and prove the replacement can subsequently release; keep a backup/recheck so disappearance of the replacement during discard restores recoverable ownership. Also mutate policy-scanner inputs into passive and inflected destructive forms (`can be killed`, `was stopped`, `may be terminated`) with misleading safe prefixes (`without exposing the token`, `instead of deleting the log`, `owner record may be stale`). A scanner that catches only imperative base verbs or positive markers is not a sufficient safety gate.
25. **Treating JSON encoding as shell escaping.** `json.dumps(prompt)` can leave `$(...)` and backticks active inside a `shell=True` command. Prefer argv execution with `shell=False`; otherwise apply `shlex.quote` to the complete dynamic agent and judge prompt arguments, then prove exact literal delivery with a marker-file adversarial test. See `references/harvest-gate-implementation-checks.md`.
26. **Assuming host GitHub auth repairs profiles.** A global `gh auth status`, keychain entry, or one healthy sibling does not prove profile-local access. Audit each `GH_CONFIG_DIR`, preserve declared identity exceptions, and verify `gh api user` plus required scopes per profile before reporting success.
27. **Rolling out only the package that triggered the incident—or preserving unexplained target drift.** Derive the complete changed-package set from immutable `BASE_SHA..REMOTE_MERGE_COMMIT`, deduplicate by frontmatter identity, and include every changed canonical package in every authorized target plan. Treat broad profile inventory as discovery only. Before mutation, disposition every target delta; re-harvest reusable additions and preserve only declared/hash-verified product-local adaptations. Unclassified, unsafe, or unresolved drift blocks that package/profile and leaves state unadvanced. Verify closure for the full package/profile matrix.
28. **Improvising a missing packaged lock helper.** A live or globally installed copy can contain the current `SKILL.md` while omitting a newly required support script. Do not replace the helper with an inline keeper or trust a same-named file by path/version alone. Resolve the helper blob from the already verified canonical commit; if executing a copy found in another complete package, prove its Git blob/hash is byte-identical to that immutable canonical blob, validate its syntax, and record only the non-secret blob identity. A safe recovery pattern is to export the single canonical helper path with `git archive <verified-ref> <path>`, extract it into an OS-temporary directory outside every repository, compare `git hash-object` with `<verified-ref>:<path>`, run the language syntax check, and execute that exact temporary copy. Do not pipe `git show` directly into an interpreter: it weakens provenance evidence and may trigger shell/interpreter safety controls. Track the keeper as a managed background process, capture the acquisition receipt privately, release through the helper's authenticated control command, verify the keeper's exit code and lock absence, then remove only the temporary export. If the process manager reports completion without a usable exit code, do not infer success from `exited` alone: parse the private newline-delimited JSON receipt and require the same PID to emit `acquired` followed by `released`, require empty stderr, and verify lexical lock-path absence before removing the receipt and temporary helper. Never print or persist the receipt's owner token. If no exact verified helper is available, persist the boundary without acquiring an ad-hoc lock. Never put the opaque owner token in durable reports or markers.
29. **Presenting a restart boundary as the publication blocker.** A stale controller may be the first failed gate while the publication also has conflicts, dirty candidate bytes, stale approval, missing evidence, failed CI, or pending rollout probes. State both layers. The external restart clears runtime-adoption preflight only; it does not make an open PR canonical, supply evidence, merge, or prove profile adoption.
30. **Using approval-sensitive shell pipelines in an unattended harvest.** Security policy may pause commands such as `git ... | python3` or `ps ... | python3` for interactive approval, which a cron run cannot provide. Build unattended preflight and verification commands in approval-safe shapes from the start: prefer direct CLI output, invoke Python as the parent process and use `subprocess.run(..., shell=False, stdout=PIPE)` with fixed argv, or write output to an OS-temporary file and inspect it separately. If a command is paused for approval, do not wait or weaken security policy; retry the same read-only probe with a non-pipelined argv form. Never treat the approval pause as evidence that Git, Python, or the underlying probe is unavailable.
31. **Assuming the nominated local checkout contains the canonical generation.** A remembered source path can be dirty, stale, or on a heavily diverged branch while another clean clone tracks the current remote default. Before editing, fetch the remote default, record its SHA, and compare the target package version/digest across plausible checkouts and live profiles. Create the candidate from that fetched SHA. If work began on an older package, discard that candidate and reapply the behavior change to the latest generation rather than syncing or merging stale bytes. Follow [`references/pre-candidate-live-variant-reconciliation.md`](references/pre-candidate-live-variant-reconciliation.md).

## Verification Checklist

- [ ] Active controller profile/config path identified before the first delegation
- [ ] Package-copy authority and runtime-adoption mode evaluated before target mutation; transaction declared as skill hot-swap, deploy-and-reload, deploy-only/reload-pending, or stop-before-deploy
- [ ] Controller child timeout covers the longest delegated stage and gateway timeout is strictly greater
- [ ] Running controller gateway proved adoption; stale/ambiguous runtime crossed an external-restart boundary and resumed only in a fresh request
- [ ] Scheduler health was proven from the latest run transcript, lock lifecycle, state freshness, and publication/rollout disposition—not inferred from cron `ok`
- [ ] Lock acquired outside the repository
- [ ] Lock ownership remained productive for the run; any live-but-orphaned keeper was classified from exact PID/token, command/ancestry, session, worktree, and PR state, then released only through the packaged authenticated control path. No process is signaled from owner metadata. Exact-owner deletion atomically claimed the current owner file before authenticating it, preserved concurrent/unknown canonical owners, and used only non-recursive directory removal; dead/expired reclamation touched only the matching claimed lock; validated stale-malformed claims racing with a canonical replacement left only the replacement owner, no private claim/backup artifacts, and a normally releasable lock; and keeper disposition plus lock absence were verified
- [ ] Remote/default branch and GitHub auth verified
- [ ] Canonical generation resolved from fetched remote-default SHA; plausible local checkouts and live target package versions/digests were compared before editing, and no stale/diverged candidate can overwrite newer bytes
- [ ] Production eval invocation path preflighted before curation; any declared fixture was proven to reach both evaluated-agent and judge calls with a disposable sentinel
- [ ] Dynamic fixture and candidate-output text remains literal at every shell boundary; agent and judge marker-file adversarial tests create no side effects
- [ ] Isolated worktree created from current `origin/<default>`
- [ ] All configured profiles scanned read-only before the first canonical behavior edit or exact-review freeze
- [ ] Every lower/equal/higher/missing-version distinct-digest live variant, including previously baselined divergence, was semantically inspected and each delta dispositioned; regressions prove all adopted/scoped predecessor controls remain
- [ ] Complete skill packages compared by frontmatter identity and digest
- [ ] A disposition ledger records origin/evidence plus exactly one of adopted, scoped, superseded, product-local, unsafe, or unresolved for every behavior/support-file delta
- [ ] Reusable rollout drift triggers a new canonical reviewed/merged generation; only declared/hash-verified product-local adaptations may differ from canonical
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
- [ ] Complete rollout package set derived from immutable `BASE_SHA..REMOTE_MERGE_COMMIT`; every changed `skills/<package>/...` identity appears in the transaction plan for every authorized target, while unrelated profile-only libraries remain discovery-only
- [ ] Existing sibling target packages backed up before authorized replacement
- [ ] Every target's complete-package digest and semantic diff compared against the approved canonical package and its pre-rollout baseline; equal version strings were not treated as equality, and unharvested target drift was consolidated or blocked
- [ ] Same-path profile adaptations used the immutable pre-change canonical SHA as three-way ancestor (never post-merge `origin/main`), passed a conflict-free dry-run, and retained explicit profile-policy markers in addition to target-only file counts
- [ ] Installed target package bytes verified immediately after copy and after the applicable adoption proof: fresh-process explicit skill load for hot swaps, or changed gateway generation plus platform/provider readiness when restart is required
- [ ] Profile-family service identities audited per profile-local configuration; shared identity targets and explicit exception profiles are declared before mutation
- [ ] Shared credentials were authenticated in isolation, copied only to approved profile-local destinations, and every target passed identity/scope/API verification without secret exposure
- [ ] Skill discovery confirms one enabled package per frontmatter name; superseded nested duplicates were backed up and removed
- [ ] Every selected new or updated reusable skill exists as a complete eval-backed package merged into the verified remote default branch before any target mutation
- [ ] Rollout package bytes were exported from the verified remote-default merge commit, never from a local/global installation, candidate worktree, pushed branch, or open PR
- [ ] Executable state recording refuses unpublished candidates; blocked/rejected dispositions remain separate and their prior observed digests remain unchanged
- [ ] External state advanced only for merged candidates after final rollout/adoption evidence
- [ ] Exact lock/worktree cleanup performed
