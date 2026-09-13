---
name: product-bootstrap
description: "Use when creating a small, disposable or publishable product prototype from benchmark notes, screenshots, or a starter app in order to answer one explicit learning question."
version: 1.0.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, product, prototype, benchmark, bootstrap]
    related_skills: [product-manager, mvp-planning, ui-designer, coder, qa]
---

# Product Bootstrap

## Overview

Turn benchmark evidence or a starter app into the smallest coherent prototype that lets the team learn from a user or stakeholder. Preserve the useful interaction pattern while adapting the audience, copy, flow, branding, and examples.

This skill is for a prototype only. A request for a real MVP, production launch, durable service, authentication, payments, operational reliability, or a multi-milestone build must route to `product-manager` and `mvp-planning`. A prototype may look polished, but it is not production readiness evidence.

## Required framing

Before editing, write a short prototype contract with these exact fields:

- **Product stage:** prototype, plus why prototype evidence is appropriate. If the stage is MVP or later, stop and route it.
- **Learning decision:** the single decision this prototype should inform and the evidence that would change that decision.
- **Primary journey:** one user and one end-to-end task.
- **Feedback path:** how a real reviewer can respond, such as a feedback form, interview script, email handoff, or observed usability session.
- **Mocked/manual inventory:** every mocked, local-only, hard-coded, simulated, or human-operated behavior.
- **Prototype limitations:** what the artifact does not prove, including persistence, auth, privacy, delivery, payments, scale, or reliability when applicable.

Do not start implementation until the stage, learning decision, and feedback path are explicit. If the user did not provide them, choose a reversible assumption, label it, and include it in the handoff.

## Required workflow

1. **Resolve an isolated workspace.** Use the repository or working directory explicitly provided by the task. For evals, copy the vendored starter into the run's isolated workspace. Never work in the canonical fixture, a shared fixed temporary path, or a moving external branch.
2. **Inspect before scoping.** Read benchmark notes, screenshots, README, package files, current source, and configured checks. Record which concrete artifacts were inspected.
3. **Extract the reusable pattern.** Identify the journey shape, information architecture, trust cues, feedback mechanism, or interaction worth preserving. Do not copy branding, proprietary text, or irrelevant domain details.
4. **Write the prototype contract.** State Product stage, Learning decision, Primary journey, Feedback path, Mocked/manual inventory, and Prototype limitations.
5. **Build one coherent slice.** Prefer one or two polished screens and the existing stack. Include at least one real interaction that demonstrates the journey. Use local or mocked behavior only when it can answer the learning question and is disclosed at the point of use or handoff.
6. **Make feedback possible.** Add the declared feedback path to the artifact or provide a concrete facilitation procedure. “Show it to users” is not a feedback path.
7. **Verify deterministically.** Run the repository's configured checks and the fixture's deterministic post-agent verifier when provided. For the canonical fixture, run `python3 verify.py`. Then exercise the primary interaction in a browser when browser tooling is available.
8. **Inspect the final diff.** Keep only durable prototype artifacts. Report exact files and exact command results.

## Build rules

- Make the target user, value, primary action, and realistic example state understandable on first load.
- Prefer existing conventions over scaffolding another app.
- Keep mocked behavior honest in both UI and handoff. Do not imply real delivery, storage, payment, AI generation, or account behavior when it is manual or simulated.
- Keep the prototype safe for its learning purpose. Do not collect sensitive real data merely to improve realism.
- Use deterministic local fixtures. Do not depend on an inaccessible repository, mutable branch, live account, secret, or network service.
- Keep scratch notes, captures, generated reports, and runtime output in the unique run workspace or runner output directory, not the canonical package.
- Treat a build, source scanner, or verifier as evidence only for what it checks. Browser interaction evidence remains separate.

## Handoff format

```markdown
## Prototype contract
- Product stage: prototype — <reason>
- Learning decision: <decision and decision-changing evidence>
- Primary journey: <user completes task>
- Feedback path: <specific channel or session>
- Mocked/manual inventory: <itemized limitations>
- Prototype limitations: <what this does not prove>

## Built
- Inspected: <benchmark and starter evidence>
- Changed: <durable files and behavior>

## Verification
- <exact command>: <result>
- Browser journey: <interaction and observed result, or unavailable>

## Next decision
- <what evidence to collect and who decides>
```

If the next decision is to build a real MVP, hand off to `product-manager` and `mvp-planning` rather than extending the prototype indefinitely.

## Common pitfalls

1. Calling a production-bound slice a prototype to skip MVP planning.
2. Building before defining the learning decision.
3. Offering no concrete feedback path.
4. Hiding simulated behavior behind production-sounding copy.
5. Editing the canonical starter rather than an isolated workspace copy.
6. Cloning a mutable or inaccessible external dependency for an eval.
7. Claiming browser behavior from a static source check.
8. Overbuilding accounts, payments, admin, analytics, and operations before the prototype needs them.

## Verification Checklist

- [ ] Product stage is explicitly prototype; MVP-or-later work was routed.
- [ ] Learning decision and decision-changing evidence are explicit.
- [ ] One primary journey is implemented.
- [ ] Feedback path is concrete and usable.
- [ ] Mocked/manual inventory is complete and visible in the handoff.
- [ ] Prototype limitations do not imply production readiness.
- [ ] Work happened in an isolated workspace from a vendored immutable fixture or authorized repository.
- [ ] Deterministic checks and the configured post-agent verifier passed.
- [ ] Browser evidence is reported separately when available.
- [ ] Only durable prototype artifacts changed.
