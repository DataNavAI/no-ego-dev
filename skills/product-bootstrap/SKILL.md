---
name: product-bootstrap
description: "Use when a user asks NED to create a small publishable prototype or MVP slice from a benchmark URL, benchmark notes, screenshots, or an existing starter app."
version: 0.1.1
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, product, prototype, benchmark, bootstrap]
    related_skills: [product-manager, ui-designer, architect, coder, qa, project-knowledge-organization]
---

# Product Bootstrap

## Overview

Turn a benchmark, screenshot set, notes file, or starter repository into a small working product prototype that can be shown to real users. Keep the benchmark's useful product pattern, but adapt the user, copy, flow, and branding to the requested audience. Ship the smallest coherent slice that proves the core user journey.

This skill exists for fast product bootstraps, not long planning projects. It should produce a usable prototype with verification evidence in the target app repository.

## Trigger Examples

Use this skill when the user says things like:

- "Build a prototype inspired by this benchmark."
- "Use this URL or screenshot as the reference and adapt it for another vertical."
- "Bootstrap a small publishable version of this idea."
- "Turn the benchmark notes into a working demo."
- "Create something simple enough to publish and test with real users."

## Required First Actions

1. **Resolve the working directory before editing.**
   - If an eval, prompt, issue, or setup context provides a repository, branch, or `working_directory`, work there.
   - If the repository is already cloned by setup, do not create a second app elsewhere.
   - Run `pwd`, `git status --short --branch`, and inspect top-level files before editing.

2. **Inspect the benchmark and existing app before deciding scope, then carry that evidence into the final report.**
   - Read `BENCHMARK.md`, screenshot notes, URLs, existing README, package files, and the current source structure.
   - Identify the benchmark pattern to keep: conversion flow, information architecture, interaction model, trust cues, onboarding pattern, or workflow shape.
   - Identify what must change: target user, domain language, branding, example data, tone, and any copied benchmark text.
   - In the final response, explicitly say that `BENCHMARK.md` or the relevant benchmark evidence and the existing app files were inspected before editing. This is required even when the report must stay concise.

3. **Define the smallest publishable prototype slice.**
   - One primary user journey only.
   - One or two polished screens/sections are better than many shallow pages.
   - Prefer the existing app stack and file conventions.
   - If a real backend is not necessary for prototype learning, use local state, generated summaries, downloadable data, or mailto handoff clearly.

## Build Rules

- Keep the benchmark inspiration, but do not copy benchmark-specific branding, proprietary text, or irrelevant domain details.
- Implement in the existing app files unless the repo clearly expects a new package or sub-app.
- Create or update only durable product artifacts: source files, styles, tests, README/handoff notes, and project docs that future work should keep.
- Put scratch notes, research dumps, temporary screenshots, and eval run outputs outside the repository, under `/tmp` or the profile-local `tmp/` or `work/` directory.
- Make the prototype understandable on first load: clear headline, target user, primary action, and realistic example state.
- Include at least one real interaction that demonstrates the core journey, such as form input updating a preview, generated handoff text, validation, navigation, or saved/exported state.
- Keep copy honest about prototype limitations. Do not imply production readiness if persistence, auth, payment, or delivery are mocked.

## Verification Rules

Before reporting done:

1. Run the repository's relevant deterministic checks, preferring:
   - `npm test` or equivalent smoke/unit command.
   - `npm run build` for frontend apps when available.
   - Existing lint/typecheck commands if they are quick and configured.
2. Perform a browser or visual smoke check for user-facing UI when browser tools are available:
   - load the local app,
   - exercise the primary interaction,
   - check obvious desktop/mobile layout breakage if relevant.
3. Review changed files with `git status --short` and confirm only durable prototype artifacts were changed.
4. Report exact verification commands and results. Avoid vague statements like "tests passed" without naming the command/output.

## Output Shape

Default to three concise bullets, but the first bullet must include benchmark/app inspection evidence when the task was benchmark-driven:

- What benchmark/app evidence was inspected, what was built, and which durable files changed. Name concrete evidence such as BENCHMARK.md, README/package files, and source paths so automated judges and future maintainers can see that inspection happened before editing.
- Verification evidence with exact commands/results and any browser/visual smoke evidence.
- What needs the user's attention next, such as copy/branding choices, publish target, or known prototype limits.

For eval-facing or automation-sensitive summaries, avoid markdown backticks around commands and paths when shell-sensitive judging may consume the output. Plain text command names and concrete paths are enough.

## Pitfalls

1. **Skipping fixture inspection.** Always read benchmark notes/screenshots and the existing app before editing.
2. **Working in the wrong directory.** Use the provided setup repository/working directory; do not create an unrelated app in the eval run folder.
3. **Copying the benchmark too literally.** Keep product structure and lessons, not brand, exact text, or irrelevant workflows.
4. **Overbuilding.** A publishable prototype should prove one core journey, not implement accounts, payments, admin dashboards, and production ops by default.
5. **Reporting without evidence.** Always name the files changed and the commands/results used to verify.
6. **Repo pollution.** Scratch and eval byproducts do not belong in the source repo.

## Verification Checklist

- [ ] Worked in the provided repository/working directory.
- [ ] Inspected benchmark material and existing app structure before editing.
- [ ] Preserved the useful benchmark pattern while changing domain, branding, and copy for the requested audience.
- [ ] Built a clear working prototype for one primary user journey.
- [ ] Kept implementation simple enough to publish/test with real users.
- [ ] Ran build/test/smoke checks and captured exact commands/results.
- [ ] Performed browser/visual smoke verification for UI work when available.
- [ ] Left only durable prototype artifacts in the repository.
