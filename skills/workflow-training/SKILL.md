---
name: workflow-training
description: Use when a workflow evaluation reveals a reusable agent-behavior gap. Route eval design, skill authoring, external adaptation, canonical publication, and profile rollout to their owning skills while preserving controlled baselines and regression evidence.
version: 1.0.0
author: NoEgoDev
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [workflow, evals, skills, training, routing]
    related_skills: [eval-creator, skill-creator, third-party-skill-integration, profile-skill-harvester]
---

# Workflow Training

## Overview

Workflow-training is a thin router, not a second eval framework, skill authoring manual, import procedure, or rollout engine. It classifies a failed workflow eval, preserves a controlled baseline, and delegates each concern to its canonical owner:

| Concern | Owning skill |
|---|---|
| Create, repair, or validate an eval and its fixtures | `eval-creator` |
| Create or refine a reusable skill package | `skill-creator` |
| Assess or adapt external skill material | `third-party-skill-integration` |
| Compare profile variants, publish canonically, and roll out | `profile-skill-harvester` |

Improve the reusable behavior, not one fixture. Never lower a valid expectation merely to make the current profile pass.

## Inputs

Declare paths and targets as parameters before work:

```text
source_root: canonical distribution checkout or immutable source ref
eval_path: package-relative EVAL.yaml
target_roots: explicit authorized profile roots
scratch_root: unique non-repository run directory
remote: expected canonical remote
default_branch: resolved remote default branch
```

Do not embed a developer home directory, profile name, fixed checkout, fixed temp target, or account identity in reusable guidance. Resolve and validate every root; reject traversal and unexpected remotes.

## Routing Workflow

### 1. Establish controlled baselines

Use `eval-creator` to validate the real loader, fixture delivery, setup/teardown semantics, and judge contract. Freeze the eval bytes and run at least:

- **current-skill baseline** — the current target profile/package;
- **old-skill baseline** — the declared predecessor generation;
- **no-skill baseline** — the same environment with the target skill intentionally unavailable;
- **candidate run** — only the proposed package changed.

Keep model/provider, prompt set, fixture, environment, and judge constant. A no-skill baseline is a control, not a deployment recipe. Record infrastructure failures separately from behavioral failures.

Run a multi-prompt regression set containing representative prompts, boundary cases, and adversarial prompts. A single prompt pass is insufficient evidence of general workflow learning.

### 2. Diagnose and route the gap

Classify evidence as eval/fixture, trigger/routing, missing reusable guidance, external-source adaptation, runtime plumbing, or rollout/publication. Then invoke the owning skill rather than duplicating its procedure here.

- Eval invalid or fixture inert: route to `eval-creator`; preserve or strengthen the intended bar.
- Existing skill owns the gap: route to `skill-creator` for a general package change with adjacent eval coverage.
- External candidate may help: route to `third-party-skill-integration`.
- Profile variants or deployment are involved: route to `profile-skill-harvester`.

Do not create a skill named after one product, benchmark, prompt, eval, or desired answer unless it is demonstrably a reusable workflow class with no existing owner.

### 3. Govern external material

Before adapting external bytes, require a pinned commit or immutable release/tag plus repository URL, exact source paths, license compatibility, and preserved attribution. Record what was copied, adapted, or independently authored. Do not import from a moving branch, search snippet, generated summary, or source with unknown license.

Use `third-party-skill-integration` for trust review, prompt-injection inspection, executable/support-file review, and adaptation. External popularity or first-party branding does not replace source review.

### 4. Freeze and publish before rollout

Use an isolated candidate based on the fetched remote default branch. Validate complete package bytes, actual eval loading, fixture delivery, and relevant tests. Obtain independent review of the exact candidate.

Rollout requires an independently reviewed merge into the remote default branch. A mutable checkout, uncommitted diff, local commit, pushed feature branch, open PR, or owner assertion is not canonical publication. Export rollout bytes from the verified remote-default merge, then use `profile-skill-harvester` to compare and transactionally update only explicit `target_roots`.

Never roll directly from a mutable checkout. Never mirror an entire skill root destructively or delete target-only files by default. Every target delta needs an adopted, scoped, superseded, product-local, unsafe, or unresolved disposition.

### 5. Classify runtime adoption

Classify the artifact before taking lifecycle action:

- **Existing skill-only hot-load:** changed `SKILL.md`, eval, reference, template, or script bytes are read on next invocation/session. Record skill-only hot-load; use a fresh process/session or explicit preload to verify.
- **Added/removed skill name:** refresh skill discovery with the supported mechanism.
- **Plugin, code, environment, or startup-loaded configuration:** follow the owning runtime procedure and verify a changed process generation.

Do not reflexively restart a gateway for skill-only updates. Do not recommend shell wrappers or lifecycle commands against the gateway serving the current request. If a lifecycle boundary is genuinely required, stop with the supported external/user action and remaining gates.

### 6. Preserve literal arguments

Pass dynamic prompts, fixture text, paths, and judge input as argv with `shell=False` or the platform-equivalent direct process API. This is argv-safe literal transport. JSON encoding is not shell escaping. Test adversarial literals containing spaces, quotes, newlines, `$()`, backticks, percent expansions, ampersands, and non-ASCII text; require byte-for-byte delivery and no marker-file side effects.

### 7. Compare and report

Compare candidate results expectation-by-expectation against current-, old-, and no-skill baselines across the full prompt set. Independently verify deterministic artifact, test, build, or browser claims. Report regressions even when the aggregate judge says pass.

The final report identifies eval generation, package generation, source/target roots by declared parameter, baseline matrix, multi-prompt regression result, immutable source provenance, exact reviewed/merged commit when rollout applies, hot-load classification, and unresolved risks.

## Prohibited Shortcuts

- Fixed user-home or profile paths in canonical instructions.
- Destructive mirroring such as deletion-enabled synchronization of a whole target package.
- Rollout from a mutable checkout or before remote-default merge.
- Automatic gateway restart after every skill edit.
- Shell interpolation of dynamic prompts or fixtures.
- Unpinned external sources or missing license/attribution.
- One-prompt training with no old-skill or no-skill control.
- Inert `evaldata/` prose that the real loader never delivers.

## Common Pitfalls

1. Reimplementing eval or rollout mechanics in this router instead of invoking the owning skill.
2. Editing a valid eval to match current weak behavior.
3. Treating an in-memory fixture path as proof that agent and judge received fixture text.
4. Training against one prompt and calling it generalization.
5. Copying a useful-looking external skill without pinned provenance, license, attribution, and executable review.
6. Applying candidate bytes directly to profiles before an independently reviewed remote-default merge.
7. Using destructive sync or preserving unexplained target drift.
8. Restarting a gateway for an existing skill-only hot-load.
9. Passing prompts through a shell because they were JSON encoded or quoted informally.
10. Writing eval outputs, clones, screenshots, or scratch scripts into the source repository.

## Verification Checklist

- [ ] `source_root`, `eval_path`, `target_roots`, `scratch_root`, remote, and default branch are explicit and validated.
- [ ] `eval-creator` verified the real loader and fixture delivery.
- [ ] Current-, old-, and no-skill baselines used controlled conditions.
- [ ] Candidate passed multi-prompt regression without weakening valid expectations.
- [ ] Skill changes are reusable and routed through `skill-creator`.
- [ ] External material has pinned source, compatible license, attribution, and `third-party-skill-integration` review.
- [ ] Canonical candidate received independent exact-generation review and merged to the verified remote default branch before rollout.
- [ ] `profile-skill-harvester` dispositioned every target delta and used only authorized target roots.
- [ ] Runtime adoption is classified as skill-only hot-load, discovery refresh, or genuine process restart.
- [ ] Dynamic text crossed process boundaries with argv-safe literal transport.
- [ ] Scratch/eval artifacts remain outside the source repository.
