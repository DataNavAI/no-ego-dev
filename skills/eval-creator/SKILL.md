---
name: eval-creator
description: "Use when creating deterministic EVAL.yaml files for NoEgoDev skills, agents, or workflows."
version: 0.1.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development]
---

# Eval Creator

## Default verification policy

Self-review and appropriate automated checks are the default. Use a separate reviewer only when the user explicitly requests one. Do not add review rounds, lineage packets or approval receipts unless the user also requests that formal process. Historical separate-review procedures in linked references are optional, not completion gates. Preserve user authorization, real test/provider verification, secret protection and truthful delivery evidence.

## Overview

Create deterministic `EVAL.yaml` files that prove a skill, agent, or workflow behaves correctly. Evals are product-quality regression tests for agent behavior: stable prompt, explicit expectations, pinned fixtures, and reproducible setup/teardown.

## EVAL.yaml Schema

```yaml
prompt: string                 # task given to the evaluated Hermes profile
expectations: string[]         # observable outcomes the judge must check
setupCommands: string[]        # optional shell commands run before prompt
teardownCommands: string[]     # optional shell commands run after prompt
parameters: map                # fixture locators, commit SHAs, URLs, metadata
```

## Rules

1. Store the eval next to the thing it evaluates: `skills/<name>/EVAL.yaml`, `agents/<name>/EVAL.yaml`, or `workflows/<name>/EVAL.yaml`.
2. Put every referenced fixture, helper script, seed file, or sample project under the sibling `evaldata/` directory.
3. Never evaluate against moving targets. Pin GitHub repos to commit SHAs, freeze API responses as fixtures, and keep expected artifacts in `evaldata/`.
4. Expectations must be objectively judgeable. Prefer “creates docs/PRD.md containing value proposition and CUJ” over “makes a good plan”.
5. Setup and teardown commands must be idempotent and local-first. They should not mutate production systems.
6. Include parameters for every external locator so the runner and judge can report exactly what was tested.

## Workflow

1. Identify the behavior that must not regress.
2. Create a realistic but small prompt.
3. Add fixtures under `evaldata/`.
4. Write specific expectations.
5. Run the eval with `python -m eval_runner.cli <folder> --markdown`.
6. Tighten only incorrect eval prompts; do not weaken correct expectations just to pass.

## Verification Checklist

- [ ] `EVAL.yaml` is beside the evaluated artifact.
- [ ] All fixtures are under `evaldata/`.
- [ ] Every external reference is pinned by commit/version or copied locally.
- [ ] Expectations are observable and stable.
- [ ] Setup/teardown are optional, deterministic, and reversible.
