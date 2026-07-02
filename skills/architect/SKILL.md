---
name: architect
description: "Use when turning a PRD into a technical spec or reconstructing missing architecture docs from a codebase."
version: 0.2.2
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, software-development]
---

# Architect

## Overview

Translate product intent into a technical plan that a coder can implement safely. The architect reads the current codebase first, then writes specs grounded in reality. For user-facing products, the architecture must include a practical way to capture and review product metrics, not just ship features. By default, research and integrate a cost-effective analytics tool for each project: you cannot improve things unless you measure.

## Tech Spec Contents

- Current architecture summary.
- Components to add/change/remove.
- Component interfaces: APIs, function signatures, events, contracts.
- Database schema or persistence changes.
- Data flow and error handling.
- Security, privacy, and operational concerns.
- Product metrics instrumentation: analytics events, schemas/properties, capture points, dashboard/reporting path, retention/privacy constraints, and ownership.
- Cost-effective analytics tool selection/integration: reuse existing tooling when adequate, or compare affordable analytics options and recommend the smallest viable default for the product stage.
- Hosting/deployment provider options that support the required stack, including tradeoffs and a recommended default.
- Web game engine and game architecture selection when the product is a browser/web game: researched performant engine recommendation, game loop/state/scene/entity architecture, asset pipeline, browser performance budget, and engine-specific skill plan.
- Test and rollout plan.

## Product Metrics Instrumentation

For any user-facing product or feature, include a minimal metrics architecture that lets the product manager and project manager tell whether the product is working after launch. Tie instrumentation to the PRD's value proposition, critical user journey, and success metrics.

The tech spec must define:

- Event/funnel capture points for activation, core CUJ completion, conversion/revenue when applicable, engagement/retention when repeated use matters, and feature-specific success metrics.
- Event names and required properties, with privacy-safe user/session identifiers and no sensitive raw payloads.
- Where events are emitted in the codebase: frontend interactions, backend API success/failure, background jobs, billing/webhook events, or integrations.
- Storage/analytics destination: existing analytics tool, warehouse/table, logs-to-metrics pipeline, or a lightweight MVP dashboard. Prefer existing tooling when it answers the PRD metrics, otherwise choose a cost-effective analytics tool by default rather than leaving measurement for later.
- Analytics-tool research summary: options considered, approximate MVP cost/free-tier fit, privacy/compliance implications, implementation effort, lock-in/migration risk, and recommended default.
- Dashboard/report path and review owner/cadence, coordinated with the product-manager metrics plan and project-manager status reporting.
- Backfill/baseline strategy when launching into an existing product, and how missing instrumentation will be detected.
- Tests or QA checks that prove metrics fire only once, fire on success/failure as intended, and do not leak private data.

If the repo has no analytics foundation, choose the smallest viable instrumentation path for the product stage and create explicit implementation tasks. Do not leave metrics as a vague future concern. Prefer free/low-cost tools that prove learning value first; upgrade only when event volume, privacy/compliance, warehouse needs, or team workflow justify the cost.


## Cost-Effective Analytics Tool Selection

For each user-facing project, the architect owns the technical analytics decision. Research before choosing; do not default to heavyweight paid analytics when a simple, affordable tool will answer the product questions.

Process:

1. Inventory existing measurement sources: current analytics SDKs, server logs, hosting metrics, app-store/play-store consoles, billing data, database tables, warehouse, or issue/support tooling.
2. Identify required capabilities from the PRD: web/mobile/server events, funnels, cohorts/retention, attribution/UTMs, dashboards, exports, self-hosting, data residency, PII controls, team access, and expected event volume.
3. Compare 2-4 cost-effective options when no adequate tool already exists. Include free/low-cost tier fit, implementation effort, privacy/compliance, maintenance burden, lock-in/export path, and expected MVP cost.
4. Recommend one default analytics tool and integration path that is sufficient to measure activation, core CUJ completion, retention/engagement, conversion/revenue when relevant, and feature success.
5. Create coder/devops tasks to wire SDKs/server events, environment variables, dashboard/report artifacts, QA checks, and privacy safeguards.

Decision template:

```text
Analytics needs: <events/funnels/dashboards/privacy/export requirements>.
Recommended analytics tool: <Tool> because it measures <core learning questions> at <free/low expected MVP cost> with <implementation effort>.
Alternatives considered: <Tool B> (<reason less ideal>), <Tool C> (<reason less ideal>).
Integration tasks: <SDK/server events/env/dashboard/tests/privacy>.
```

## Hosting Provider Selection

When the architecture depends on deployment constraints, choose or suggest the easiest-to-maintain viable hosting provider. Cost matters too: prefer providers with low operational overhead, predictable pricing, and generous free/low-cost tiers when they still satisfy the product requirements.

Process:

1. Identify the required stack from the PRD/codebase: frontend framework, backend/runtime, database, queues/workers, storage, realtime/websockets, cron, GPU/AI needs, regions/compliance, and expected scale.
2. Filter out providers that cannot support those requirements without awkward workarounds.
3. Select a recommended default that is easiest to maintain for the user and product stage, factoring in cost, existing accounts/infrastructure, deployment ergonomics, logs/rollback, and secret/environment management.
4. If more than one provider is plausible or the choice has meaningful tradeoffs, present 2-4 viable options and recommend one. Otherwise, choose the recommended provider and proceed.
5. Ask the user to choose only when provider choice materially affects cost, architecture, compliance, or account access.

Decision template:

```text
This stack needs <required capabilities>.
Recommended hosting provider: <Provider A> because it is the easiest viable option to maintain and should cost <cost expectation> at MVP scale.
Key tradeoff: <tradeoff>.
Alternatives considered: <Provider B> (<reason rejected/less ideal>), <Provider C> (<reason rejected/less ideal>).
```

If user choice is required:

```text
This stack needs <required capabilities>. The viable hosting options are:
1. <Provider A> — recommended; easiest to maintain because <reason>; cost: <cost expectation>; tradeoff: <tradeoff>.
2. <Provider B> — best for <reason>; cost: <cost expectation>; tradeoff: <tradeoff>.
3. <Provider C> — best for <reason>; cost: <cost expectation>; tradeoff: <tradeoff>.

Recommended default: <Provider A> because it minimizes maintenance while keeping MVP costs low.
Which hosting provider should we design for?
```

Default heuristics:

- Static/frontend/Next.js-first apps → prefer Vercel when low ops matters, unless backend/runtime needs make a full-stack host simpler.
- Full-stack apps with simple web services/databases/workers → prefer Render or Railway; choose the one that best matches the repo and expected always-on cost.
- Small containerized apps, websocket apps, or long-running services → consider Fly.io or Render, but avoid Kubernetes/cloud primitives unless needed.
- Strict enterprise/compliance or existing infra → prefer the user's current cloud/provider if it avoids new operational burden.
- AWS/GCP/Azure are usually not the MVP default unless the user already operates there or needs a managed service only they provide.

Do not finalize provider-specific architecture, secrets, CI/CD, or deployment layout until a provider has been chosen by the agent or by the user when tradeoffs require user input.

## Web Game Architecture and Engine Selection

When the PRD is for a browser game, web playable, interactive simulation, or game-like product, the architect must invoke `web-game-dev` before finalizing the tech spec. Do not treat a web game as a normal app with a few animations. The architecture must deliberately choose a performant game engine/library and a game architecture pattern set.

Required architecture-phase outputs:

1. Classify the game: 2D/3D, single-player/multiplayer, target browsers/devices, session length, core loop, progression, persistence, physics/collision, and asset types.
2. Research and compare 2-4 viable engines/libraries unless an incumbent already exists. Include Phaser, PixiJS, PlayCanvas, Babylon.js, Three.js, Godot Web export, or another better-fit engine as appropriate.
3. Recommend one performant engine default and explain render path, mobile/browser fit, TypeScript/tooling, bundle/runtime cost, asset pipeline, licensing, community/docs, and tradeoffs.
4. Select game architecture patterns: scene/state stack, ECS or component game objects, finite state machines, fixed timestep/game loop, event bus/command queue, data-driven content, multiplayer authority model, asset pipeline, and persistence model as applicable.
5. Find an existing engine-specific skill for the chosen engine or create/queue one before coder implementation. Coder prompts must include the engine-specific skill when available.
6. Include browser/game QA: smoke tests, performance/frame-budget checks, mobile viewport/touch/audio checks, gameplay acceptance tests, and analytics event checks.

Decision template:

```text
Web game classification: <2D/3D, multiplayer, devices, session/core loop, persistence/assets>.
Recommended engine: <engine> because <performance/tooling/game-fit rationale>.
Alternatives considered: <engine A>, <engine B>, <engine C> with rejection rationale.
Architecture patterns: <scene/state, ECS/component, FSM, fixed timestep, event bus, asset pipeline, persistence, multiplayer authority>.
Performance budget: <FPS/frame budget, asset/loading limits, mobile/browser risks>.
Engine-specific skill: <existing skill path or follow-up skill to create>.
Implementation/QA tasks: <engine setup, gameplay systems, analytics, tests, smoke/perf checks>.
```

## Workflow

1. Inspect the repository and existing project knowledge.
2. Create retrospective specs for key components if missing.
3. Choose the simplest sustainable architecture.
4. Add product-metrics instrumentation tied to the PRD success metrics and CUJ, including event capture points, researched cost-effective analytics tool selection, analytics destination, dashboards/reports, privacy constraints, and tests.
5. If the product is a browser/web game or game-like interactive product, invoke `web-game-dev` to research and choose a performant game engine, document the game architecture pattern set, and find/create the engine-specific skill before implementation.
6. Identify hosting/runtime requirements and choose or suggest the easiest-to-maintain compatible hosting provider, factoring in MVP cost.
7. Ask the user to choose only when provider choice materially affects cost, architecture, compliance, or account access.
8. Name every affected component and interface.
9. Save the spec under `.projects/<project>/tech-specs/`.

## Verification Checklist

- [ ] Spec is grounded in current code.
- [ ] Required hosting/runtime capabilities are identified.
- [ ] User-facing products/features have a product-metrics instrumentation plan tied to the PRD success metrics and CUJ.
- [ ] Event names/properties, capture points, analytics destination, dashboard/report path, and owner/cadence are explicit.
- [ ] Analytics tool selection is researched: existing tools are reused when adequate, otherwise cost-effective options are compared and a recommended default is chosen.
- [ ] Metrics privacy constraints and tests/QA checks are included.
- [ ] Browser/web game specs invoke `web-game-dev`, compare viable engines, recommend a performant engine, document game architecture patterns, and find/create the engine-specific skill.
- [ ] The recommended hosting provider is the easiest viable option to maintain for this product stage.
- [ ] MVP cost expectations and provider tradeoffs are stated.
- [ ] User is asked to choose only when provider choice materially affects cost, architecture, compliance, or account access.
- [ ] Affected components and interfaces are explicit.
- [ ] Schema/data migrations are described when relevant.
- [ ] Tests and rollout are included.
