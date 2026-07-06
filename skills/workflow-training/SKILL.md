---
name: workflow-training
description: "Use when iteratively training a NoEgoDev/Hermes profile to pass a specific workflow EVAL.yaml by running the eval, diagnosing failures, finding or developing general reusable skills, syncing them into the profile, and rerunning until the workflow passes without weakening correct eval criteria."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, workflow, evals, skills, training]
    related_skills: [eval-creator, skill-creator, project-manager]
---

# Workflow Training

## Overview

Workflow training is the disciplined loop for making a NoEgoDev/Hermes agent pass a **specific workflow eval** by improving the agent's reusable skill library and operating behavior, not by gaming the eval.

The goal is not to satisfy one fixture with narrow hacks. The goal is to discover the workflow pattern represented by the eval, then add or update skills that help the agent succeed across many tasks with the same shape. Treat every eval failure as training signal: the eval shows a missing behavior, missing context-routing rule, missing setup step, missing quality gate, or missing specialist skill.

## When to Use

Use this skill when the user asks to:

- "make this workflow eval pass"
- "train NED on this workflow"
- "add skills until the workflow passes"
- "run the eval and improve the agent"
- "develop skills from eval feedback"
- "iterate on a workflow EVAL.yaml result"

Do **not** use this skill for:

- Creating an eval from scratch only — use `eval-creator`.
- Creating a single unrelated skill without an eval loop — use `skill-creator`.
- Weakening or rewriting a correct eval to match current bad behavior.
- One-off code changes in the fixture app that do not teach the agent the reusable workflow.

## Core Rule: Improve the Agent, Not the Exam

Do not change the eval just because it fails. A failing eval is usually the evidence you need.

You may edit the eval only when it is objectively incorrect, for example:

- It points to a missing, misspelled, or moved fixture.
- Setup/teardown commands are broken or non-idempotent.
- The prompt contradicts the documented workflow intent.
- An expectation is impossible, unsafe, or unrelated to the workflow class.
- The runner cannot provide required parameters/context because of an eval-runner bug; fix the runner or prompt plumbing without weakening the behavioral expectation.

When an eval edit is necessary, document why it was incorrect and keep the intended bar the same or higher. Never remove expectations merely to pass.

## Training Loop

### 1. Establish the baseline

1. Inspect the target `EVAL.yaml`, its `parameters`, and any `evaldata/` fixtures.
2. Run the eval before changing skills:
   ```bash
   python -m eval_runner.cli <workflow-or-skill-dir> --markdown --output-root /tmp/no-ego-dev-eval-runs/<name>-baseline --report /tmp/no-ego-dev-eval-runs/<name>-baseline/report
   ```
3. Keep eval outputs under `/tmp` or another non-repo scratch directory. Do not put run logs, copied repos, screenshots, or intermediate reports inside the source repo unless they are durable fixtures.
4. Read `report.md`, `result.json`, relevant session logs, and any produced artifacts.
5. Independently verify deterministic claims when possible: rerun build/test commands, inspect created files, and check whether the agent used the intended setup directory.

### 2. Diagnose the failure class

Classify failures by reusable behavior gap, not by superficial symptom.

Common classes:

- **Workspace routing gap:** the agent did not work in the eval-provided repository or ignored `parameters.working_directory`.
- **Fixture inspection gap:** the agent did not read benchmark notes, existing code, screenshots, or seed data before acting.
- **Skill trigger gap:** the right specialist skill existed but was not invoked or described strongly enough.
- **Missing specialist skill:** the profile lacks guidance for the workflow class.
- **Quality gate gap:** build, smoke, browser, or evidence verification was skipped or reported vaguely.
- **Artifact hygiene gap:** scratch files or eval byproducts were written into the repo instead of `/tmp`.
- **Overfit/hard-code gap:** the agent solved only the fixture instead of the general pattern.
- **Runner/plumbing gap:** eval parameters are not injected into the actual agent prompt or cwd.

Write a short diagnosis in your working notes or final response:

```markdown
Failure class: <class>
Evidence: <report/session/file evidence>
Reusable behavior needed: <skill/rule/workflow change>
Eval correctness: correct | incorrect because <reason>
```

### 3. Search for existing skill material before adding a new skill

Every training iteration must include an existing-skill/source search step before proposing new skills or substantial skill patches. Before creating a new skill, search for existing trustworthy skill material that fits the behavior class. Prefer adapting established skill patterns over inventing from scratch.

Minimum search procedure:

1. Search the local NoEgoDev skills first:
   ```bash
   find skills -maxdepth 2 -name SKILL.md -print
   ```
   Then inspect likely existing skills such as `skill-creator`, `eval-creator`, `project-manager`, `architect`, `coder`, `qa`, or the workflow-specific specialist.
2. Search trusted external sources, prioritizing official or first-party repositories:
   - Anthropic: `https://github.com/anthropics/skills`
   - OpenAI owned repositories, such as cookbook/examples/evals where relevant
   - Google-owned repositories, such as Gemini CLI docs/evals where relevant
3. If a fitting skill exists, consider downloading or adapting it. Preserve attribution and license metadata. Do not blindly copy untrusted third-party skills.
4. If no fitting skill exists, create a new NoEgoDev skill that captures the reusable workflow class.

Use the search to answer:

- Is this already covered by a current skill that needs a small patch?
- Is there an upstream skill whose structure or content should be imported or adapted?
- Is the gap broad enough to justify a new skill, or should it be a pitfall in an existing skill?

### 4. Add or update skills generally

Prefer the least new surface area that fixes the class of failures:

1. Patch an existing relevant skill when it already owns the workflow.
2. Add a reference file when the detail is bulky but belongs to an existing skill.
3. Create a new class-level skill only when no existing skill covers the pattern.

A skill update should be general enough that it helps with future tasks of the same shape. For example:

- Good: "When a workflow eval provides `parameters.working_directory`, operate inside that directory and inspect benchmark/source files before creating new artifacts."
- Bad: "For the dog walker eval, create `dog-walker-intake-prototype` in the run dir."

Skill changes should usually include:

- Strong trigger description.
- Required first actions.
- Exact commands when deterministic.
- Pitfalls from the eval failure.
- Verification checklist.
- `EVAL.yaml` and `evaldata/` for the new/updated skill when appropriate.

### 5. Sync profile distributions before rerunning

When training a profile distribution, update the source-of-truth repo first, then sync the changed skill directory to live profiles that run the eval.

For NoEgoDev/NED profiles:

```bash
rsync -a --delete skills/<skill-name>/ /Users/moonk/.hermes/profiles/ned/skills/<skill-name>/
```

If active sibling profiles carry the same distribution, sync them too when appropriate, for example:

```bash
rsync -a --delete skills/<skill-name>/ /Users/moonk/.hermes/profiles/alphaned/skills/<skill-name>/
rsync -a --delete skills/<skill-name>/ /Users/moonk/.hermes/profiles/kiaened/skills/<skill-name>/
```

Restart running gateways only after validating the source files and syncing the intended skill changes. Preserve unrelated dirty files.

### 6. Rerun and compare

Run the eval again with a fresh output directory:

```bash
python -m eval_runner.cli <workflow-or-skill-dir> --markdown --output-root /tmp/no-ego-dev-eval-runs/<name>-iter-N --report /tmp/no-ego-dev-eval-runs/<name>-iter-N/report
```

Compare against the baseline:

- Which expectation moved from fail to pass?
- Which failure class remains?
- Did the agent use the intended fixtures/workspace?
- Did the skill change cause overfitting or regress another workflow?
- Are tests/builds/browser smoke checks independently verifiable?

If it still fails, repeat from diagnosis. Keep each iteration focused: one or two reusable skill changes, then rerun.

### 7. Stop criteria

Stop when:

- The eval passes.
- The failure is due to an external outage or runner bug that has been isolated and reported/fixed.
- The eval is incorrect and has been corrected with the bar preserved.
- The user asks to stop.

At the end, report explicitly. Do not leave key workflow-training rules implied. Include the eval-integrity, search, sync/rerun, baseline comparison, and artifact-hygiene statements even when they feel obvious.

Required report skeleton:

```markdown
## Workflow training result
- Eval: <path>
- Baseline: pass/fail + main failure
- Failure class: <workspace routing | fixture inspection | skill trigger | missing specialist | quality gate | artifact hygiene | overfit | runner/plumbing>
- Eval integrity: I will not weaken or change the eval unless it is objectively incorrect because <reason if incorrect, otherwise "it is valid training signal">.
- Existing-skill/source search: I will search local NoEgoDev skills and trusted first-party sources before creating a new skill or making substantial skill patches. Sources: local NoEgoDev skills; Anthropic skills; relevant OpenAI-owned repos; relevant Google-owned repos.
- General skill changes: <files/classes of behavior>, phrased as reusable workflow guidance, not a fixture-specific hard-code.
- Sync/apply step: <source repo validation and live profile sync if applicable>.
- Rerun/comparison: rerun the eval after the skill changes are applied/synced, using a fresh /tmp output directory, then compare against the failed baseline expectation by expectation.
- Artifact hygiene: keep eval reports, cloned fixtures, scratch scripts, screenshots, and temporary outputs outside the source repo unless they are intentional durable fixtures.
- Final eval: pass/fail + report path
- Verification: <commands/results>
- Remaining risks: <if any>
```

When writing an eval-facing answer, prefer plain prose over inline code formatting for paths and skill names if the eval runner's judge is shell-sensitive. The content must still name concrete paths such as /tmp/workflow-eval and BENCHMARK.md clearly.

## How to Decide Between Patch vs New Skill

Patch an existing skill when:

- The failure is a missing pitfall or checklist item in that skill.
- The skill should already have triggered for this workflow.
- The update is a narrow behavior refinement.

Create a new skill when:

- Multiple existing skills are involved and need an orchestrating workflow.
- The eval represents a recurring workflow class not owned by any specialist.
- The agent needs a stable sequence: inspect fixture → plan → delegate/build → QA → report.

Download/adapt an external skill when:

- A trusted first-party repo has a close match.
- The upstream license allows reuse.
- The skill's assumptions fit NoEgoDev or can be adapted cleanly.
- You can preserve attribution and avoid vendor-specific commands that do not exist locally.

## Common Pitfalls

1. **Changing the eval instead of learning from it.** Only edit objectively incorrect evals. Most failures should produce skill or runner improvements.
2. **Overfitting to the fixture.** Do not encode product names, one repo path, or one prompt's wording unless they are parameters in a general rule.
3. **Skipping the baseline run.** Without a baseline, you do not know whether the skill helped.
4. **Ignoring setup parameters.** If an eval clones a repo or declares `parameters.working_directory`, the agent must operate there unless the eval says otherwise.
5. **Not searching existing skills.** Before adding a new skill, inspect local skills and trusted external first-party repositories such as Anthropic skills, OpenAI examples/evals, and Google/Gemini docs/evals.
6. **Forgetting live-profile sync.** Source repo changes do not affect a running NED profile until synced and, when needed, the gateway is restarted.
7. **Polluting repos with scratch artifacts.** Eval reports, cloned fixtures, and temporary scripts belong in `/tmp` or profile-local scratch, not the source repo.
8. **Trusting the judge alone.** If a judge times out or passes weakly, inspect artifacts and rerun deterministic verification commands yourself.
9. **Bundling unrelated dirty changes.** Preserve and report unrelated working-tree changes separately.

## Verification Checklist

- [ ] Baseline eval run exists and was read.
- [ ] Failure is classified by reusable behavior gap.
- [ ] Eval was not edited unless objectively incorrect, and the reason is documented.
- [ ] Local existing skills were searched before adding a new skill.
- [ ] Trusted external sources were searched before adding/downloading a skill.
- [ ] New or patched skills are general to the workflow class, not overfit to one fixture.
- [ ] Skill has `EVAL.yaml` and `evaldata/` when added to the NoEgoDev distribution.
- [ ] Source skill changes validate and focused tests pass.
- [ ] Live profiles are synced when this training is for a running profile.
- [ ] Eval reruns use fresh `/tmp` output directories.
- [ ] Final report includes baseline, iterations, skill changes, final eval result, and verification commands.
