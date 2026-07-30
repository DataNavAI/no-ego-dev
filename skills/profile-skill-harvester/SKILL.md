---
name: profile-skill-harvester
description: Use when harvesting skill updates from one or more live Hermes profiles into a canonical profile-distribution repository. Compares complete skill packages, consolidates compatible updates, scopes contradictory guidance by use case and product lifecycle stage, validates the result, and publishes through an isolated Git workflow without sweeping unrelated runtime or repository state.
version: 1.0.0
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
- live profiles: `ned`, `alphaned`, `kiaened`, and `nedxned`
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

## Daily Harvest Workflow

### 1. Acquire lock and inspect prerequisites

Use a lock such as:

```text
~/.hermes/state/profile-skill-harvester/harvest.lock
```

Fail closed if:

- the canonical repository or expected remote is missing;
- GitHub authentication is unavailable;
- a profile path resolves outside `~/.hermes/profiles/`;
- the remote default branch cannot be resolved;
- another harvest owns the lock.

Do not modify the user's existing checkout to make it clean.

### 2. Create an isolated integration worktree

Fetch the remote, create a unique branch from the current remote default branch, and work outside the canonical checkout:

```bash
git -C /Users/moonk/no-ego-dev fetch origin --prune
git -C /Users/moonk/no-ego-dev worktree add \
  -b automation/skill-harvest-YYYYMMDD-HHMMSS \
  ~/.hermes/work/profile-skill-harvester/YYYYMMDD-HHMMSS \
  origin/main
```

If a branch with that exact name exists, choose a new timestamp. Never reset or delete an unrelated branch.

### 3. Inventory source and profile packages

Run `scripts/inventory.py` from this skill package, or perform an equivalent deterministic scan. Identify skills by frontmatter `name`, not merely directory basename. Hash the complete package while excluding `.git`, Python caches, editor files, OS metadata, and runtime artifacts.

For each `(profile, skill)` record:

- package path;
- package digest;
- newest file modification time as a discovery signal;
- source-repository digest, if present;
- prior observed digest from the external state file, if present;
- whether several profiles contain distinct variants.

A candidate is interesting when it differs from the remote-default source package and is new or changed since the last successful harvest. On the first run, inventory all differences but apply the same validation and conflict rules; do not bulk-copy blindly.

### 4. Classify each difference

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

## Validation and Publication

Before publication:

1. Parse every changed `SKILL.md` frontmatter and changed `EVAL.yaml`.
2. Ensure fixtures referenced by each eval exist.
3. Run deterministic support-script checks (`python -m py_compile`, `bash -n`, or relevant validators).
4. Run `python -m pytest` from the isolated worktree.
5. Run `git diff --check`.
6. Inspect only the intended skill-package and documentation/test changes.
7. Scan staged content for private keys, OAuth/client secrets, refresh/access tokens, passwords, cookies, `.env` content, and high-entropy credentials.
8. Commit with a focused conventional commit.

Publication policy:

- If changes are compatible, tests pass, and no unresolved contradiction exists, push a branch and open or update a PR against the remote default branch.
- Enable auto-merge only when repository policy permits it and required checks are green.
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

## Verification Checklist

- [ ] Lock acquired outside the repository
- [ ] Remote/default branch and GitHub auth verified
- [ ] Isolated worktree created from current `origin/<default>`
- [ ] All configured profiles scanned read-only
- [ ] Complete skill packages compared by frontmatter identity and digest
- [ ] Every divergence classified
- [ ] Contradictions scoped by lifecycle/use case or explicitly blocked
- [ ] `SKILL.md`, `EVAL.yaml`, and fixtures updated together
- [ ] No runtime state or secrets staged
- [ ] Changed package metadata and support scripts validate
- [ ] `python -m pytest` and `git diff --check` pass
- [ ] Remote SHA and PR/merge state verified
- [ ] External state advanced only after final disposition
- [ ] Exact lock/worktree cleanup performed
