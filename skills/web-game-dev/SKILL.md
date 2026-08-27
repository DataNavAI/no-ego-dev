---
name: web-game-dev
description: "Use when planning, architecting, implementing, or reviewing browser/web games. Research and choose a performant web game engine during architecture, document game architecture patterns, and find or create engine-specific skills for the chosen engine."
version: 0.2.2
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, web-games, game-dev, architecture, engines, performance]
---

# Web Game Dev

## Overview

Build browser games with an explicit engine choice, a game-appropriate architecture, and performance constraints from the start. Web games are not ordinary CRUD apps with sprites: the tech spec must account for frame budget, asset loading, render pipeline, input latency, game loop timing, scene/state organization, audio, physics, persistence, deployment, and analytics for player behavior.

This skill is especially important during the architect phase. The architect must research and recommend a performant web game engine before implementation begins, then either find an existing engine-specific skill or create/update one so coder agents do not improvise engine conventions from scratch.

## Upfront Requirement Confirmation and Automatic Continuation

Before engine selection, derive known constraints from the PRD, target devices/browsers, gameplay model, repository, licensing, deployment, persistence, and performance needs. Ask only about requirements whose later reversal would materially change 2D/3D architecture, multiplayer authority, engine/toolchain/licensing, persistence/economy trust, supported devices, or production workflow.

If confirmation is needed, ask **one upfront batch of no more than three short questions**. Review every question before sending it: unanswered, costly to reverse, easy to understand, one decision only, and paired with a recommended default or compact choices. Remove gameplay polish and anything research or a reversible default can resolve.

After confirmation, continue automatically only within the lifecycle scope the user authorized. A planning or architecture request proceeds through the requested plan/spec and engine-specific skill preparation, then stops before implementation; a review request remains read-only. Continue through implementation and QA only when the user requested implementation or explicitly authorized that broader scope. **Do not ask for routine phase approval inside the authorized scope.** Pause for a scope expansion, new costly contradiction, missing access, blocking performance/quality finding, or external spend/production/publication/credential/destructive authority.

Research snapshot, 2026-07-01:

- Phaser describes itself as a fast, free, open-source HTML5 game framework with WebGL and Canvas rendering for desktop and mobile browsers.
- PixiJS is a modern 2D WebGL/WebGPU-oriented rendering library rather than a full game framework; pair it with your own game architecture/ECS/state systems.
- PlayCanvas is an open-source WebGL/WebGPU 3D engine for the web and is strong when the project needs a browser-first 3D editor/runtime.
- Babylon.js is a full-featured 3D engine; npm currently recommends `@babylonjs/core` for new projects rather than legacy `babylonjs` UMD.
- Three.js is a JavaScript 3D library, not a full game engine; use it when custom 3D rendering flexibility matters more than engine-level game systems.
- Godot can export to Web, including PWA workflows, but browser export has platform constraints; choose it when editor-driven workflows or cross-platform export outweigh web bundle/runtime constraints.
- MDN's web game guidance emphasizes the main loop and browser frame budget: long work should be budgeted carefully and moved to Web Workers/GPU where appropriate.

## When to Use

Use this skill when:

- The product is a browser game, web playable, educational game, idle/clicker, arcade game, puzzle game, multiplayer web game, interactive simulation, or game-like product.
- A PRD mentions gameplay, levels, sprites, canvas, WebGL/WebGPU, physics, animation loops, real-time input, score, leaderboard, inventory, enemies, maps, or game sessions.
- The architect is writing a tech spec for any product where frame rate, render performance, asset loading, or game state architecture matters.
- A coder is implementing Phaser, PixiJS, PlayCanvas, Babylon.js, Three.js, Godot Web export, Matter.js, Rapier, ECS, networking, game saves, or real-time loops.
- QA needs a game-specific test plan for gameplay correctness, performance, deterministic mechanics, mobile browser behavior, or asset loading.

Do not default to a game engine for a normal content site, dashboard, or business app with a small animation. Use ordinary frontend architecture unless gameplay systems need a game runtime.

## Architecture-Phase Requirements

For every web game tech spec, include these sections or create follow-up issues for missing information:

1. **Game classification**
   - 2D vs 3D vs hybrid.
   - Single-player, local multiplayer, asynchronous multiplayer, or real-time multiplayer.
   - Session length and target device/browser classes.
   - Core loop, win/loss/progression model, save/persistence needs, monetization/reward model if applicable.

2. **Engine research and recommendation**
   - Compare at least 2-4 viable engines/libraries unless an existing project has already standardized on one.
   - Include rendering model, mobile support, asset pipeline, physics/input/audio support, editor/tooling, TypeScript fit, bundle/runtime cost, community/docs, licensing, and team/agent familiarity.
   - Recommend one performant default and explain the tradeoff.

3. **Common game architecture choice**
   - Select the architecture pattern(s) from the catalog below and explain why they fit the game.
   - Define game state boundaries, scene/screen transitions, entity/component model, event flow, persistence, and test strategy.

4. **Performance plan**
   - Target FPS and frame budget: 60 FPS means about 16.7 ms/frame; 30 FPS means about 33.3 ms/frame.
   - Asset size/loading budget, texture atlas/sprite sheet strategy, lazy loading/preloading, audio policy, and mobile constraints.
   - Object pooling, spatial partitioning, update throttling, and worker/off-main-thread candidates.

5. **Engine-specific skill handling**
   - Before implementation, search for an existing engine-specific skill (examples: `phaser-game-dev`, `pixijs-game-dev`, `playcanvas-game-dev`, `babylonjs-game-dev`, `threejs-game-dev`, `godot-web-game-dev`).
   - If no suitable skill exists and the chosen engine is likely to recur, create or update an engine-specific skill/support file with setup, project structure, rendering/input/asset/testing conventions, and pitfalls.
   - Include the engine skill name/path in coder subagent prompts.

6. **Analytics/instrumentation**
   - Coordinate with `architect`'s product metrics requirement. Track player activation, tutorial completion, level attempts/completions/failures, session length, retention hooks, monetization/reward events when relevant, performance errors, and device/browser classes.
   - Avoid logging raw personal data, chat text, or sensitive user-generated content.

## Engine Selection Guide

Use current docs, npm metadata, official examples, and project constraints before choosing. Defaults below are starting heuristics, not substitutes for research.

### Recommended defaults by game type

- **2D arcade/puzzle/platformer/casual web game:** Phaser is the default first candidate because it is a full HTML5 game framework with scenes, input, asset loading, animation, physics options, and WebGL/Canvas rendering.
- **2D custom renderer / high-performance interactive graphics:** PixiJS is a strong rendering layer when you want to build your own ECS/state architecture and do not need Phaser's full game framework.
- **Browser-first 3D game with editor/runtime workflow:** PlayCanvas is a strong first candidate because it is a web-native 3D engine with WebGL/WebGPU direction and editor-oriented workflows.
- **Full-featured 3D app/game needing advanced rendering/materials:** Babylon.js (`@babylonjs/core`) is a strong first candidate.
- **Custom 3D visualization or lightweight 3D experience:** Three.js is a rendering library, not a full engine; choose it when the game systems are simple or custom architecture is desired.
- **Cross-platform/editor-first game also targeting web:** Godot Web export can be appropriate, but validate export size, browser feature support, threading/extension limitations, mobile constraints, and hosting/PWA needs.

### Engine comparison template

```text
Game needs: <2D/3D, multiplayer, physics, target devices, content pipeline, asset scale, performance target>.
Recommended engine: <engine> because <performance/tooling/fit rationale>.
Alternatives considered:
1. <engine/library> — <why less ideal or when it would win>.
2. <engine/library> — <why less ideal or when it would win>.
Performance implications: <render path, bundle/runtime size, frame budget risks, mobile/browser constraints>.
Architecture implications: <scene graph/ECS/FSM/networking/assets/testing>.
Engine-specific skill: <existing skill found or new skill to create/update>.
```

## Common Web Game Architectures

Most real games combine multiple patterns. Choose deliberately and document the combination.

### 1. Scene / State Stack

Use for menus, loading screens, levels, game over screens, pause overlays, and mode transitions.

- **Good for:** Phaser scenes, game menus, level selection, tutorial vs gameplay separation.
- **Structure:** `BootScene`, `PreloadScene`, `MenuScene`, `GameScene`, `UIScene`, `GameOverScene`.
- **Pitfall:** Putting global progression or persistence directly in scene objects makes resets and tests messy. Keep durable state in a separate store/service.

### 2. Entity Component System (ECS)

Use for many entities with composable behavior: enemies, bullets, pickups, particles, status effects, procedural objects.

- **Good for:** Performance-sensitive or content-heavy games, simulations, reusable behaviors.
- **Structure:** entities are IDs; components are data; systems update components.
- **Pitfall:** Overengineering small games. For a tiny puzzle game, simple objects plus state machines may be faster to implement.

### 3. Component-Based Game Objects

Use when the engine already provides game objects/sprites and you want modular behaviors without full ECS.

- **Good for:** Phaser/Pixi projects with moderate entity counts.
- **Structure:** sprite/game object + behavior modules such as movement, health, input, collision response.
- **Pitfall:** Deep inheritance hierarchies. Prefer shallow composition.

### 4. Finite State Machines (FSM) / Behavior Trees

Use for player states, enemy AI, animation state, menus, and interaction flows.

- **Good for:** `idle`, `run`, `jump`, `attack`, `hurt`, `dead`; enemy patrol/chase/attack; tutorial steps.
- **Structure:** explicit states, transitions, guards, side effects.
- **Pitfall:** Hidden boolean soup (`isJumping`, `isFalling`, `isAttacking`) causes impossible states. Prefer explicit state machines.

### 5. Fixed Timestep Simulation + Render Interpolation

Use when deterministic physics or consistent simulation matters.

- **Good for:** Physics, multiplayer sync, replays, deterministic mechanics.
- **Structure:** update simulation at fixed delta; render interpolated state at display refresh rate.
- **Pitfall:** Tying gameplay directly to variable frame delta can make mechanics device-dependent.

### 6. Event Bus / Command Queue

Use to decouple gameplay events, UI, audio, analytics, achievements, and persistence.

- **Good for:** `level_completed`, `player_died`, `item_collected`, `purchase_started`, `settings_changed`.
- **Structure:** typed domain events; systems subscribe; analytics maps events to product metrics.
- **Pitfall:** Global untyped event soup. Define event names/payloads and ownership.

### 7. Data-Driven Content

Use when levels, items, enemy configs, dialogue, tuning constants, or rewards should change without touching engine code.

- **Good for:** Puzzle levels, balance tuning, content updates, localization.
- **Structure:** JSON/CSV/Tiled maps/assets with schema validation.
- **Pitfall:** No validation. Add content schema checks and sample fixtures.

### 8. Client-Authoritative vs Server-Authoritative Multiplayer

Choose intentionally.

- **Client-authoritative:** simpler, good for solo, casual async, or non-competitive multiplayer; vulnerable to cheating.
- **Server-authoritative:** required for competitive real-time, shared economies, anti-cheat, or durable progression.
- **Deterministic lockstep/rollback:** consider only when latency/competitive mechanics justify complexity.
- **Pitfall:** Starting with local-only state and later bolting on server authority can force rewrites. Document multiplayer assumptions early.

### 9. Asset Pipeline Architecture

Use for sprites, texture atlases, tilesets, audio, fonts, shaders, 3D assets, and localization.

- **Good for:** Reducing load time and runtime memory pressure.
- **Structure:** source assets → optimized build assets → manifest/preload groups → runtime cache.
- **Pitfall:** Large unoptimized images/audio. Define max dimensions, formats, compression, and lazy loading.

### 10. Save / Persistence Architecture

Use for progress, settings, achievements, inventory, purchases, or cloud sync.

- **Local-first:** localStorage/IndexedDB for simple offline progress.
- **Server-backed:** account-based saves, leaderboards, purchases, cross-device sync.
- **Pitfall:** Storing trusted economy/progression entirely client-side when cheating matters.

## Implementation Workflow

1. Read PRD, UI/design notes, existing repo, and target deployment constraints.
2. Classify the game and list hard requirements: dimensions, target devices, FPS, multiplayer, physics, asset types, save model, analytics, and accessibility.
3. Research engines/libraries using official docs and package metadata. Compare at least 2-4 viable options.
4. Recommend a performant engine and architecture pattern set. If engine choice materially changes cost, tooling, licensing, browser support, or production workflow, resolve it in the single upfront question batch; otherwise use the recommendation and proceed.
5. Search skills for the chosen engine. If missing and reusable, create a focused engine skill or support file before coder implementation begins.
6. Write the tech spec with engine choice, architecture, game loop, scenes/state, asset pipeline, input/audio, persistence, analytics, performance budgets, and tests.
7. Spawn coder subagents with the chosen engine skill and exact conventions.
8. Verify with browser smoke tests, frame-rate/performance checks, deterministic gameplay tests where applicable, mobile viewport checks, and analytics event checks.

## Engine-Specific Skill Creation Rules

After choosing an engine, search for skills and support files first:

```text
Search targets:
- skills/<engine-name>/SKILL.md
- skills/<engine-name>-game-dev/SKILL.md
- skills/web-game-dev/references/<engine-name>.md
- user/global skill library for <engine> game development
```

Create or update an engine-specific skill when:

- The engine will be used for implementation, not just considered.
- The setup/build/test loop has engine-specific commands or pitfalls.
- Engine conventions matter for coder quality: scenes, systems, assets, physics, input, bundling, deployment, or tests.
- The project will likely need follow-up features or multiple agents.

Minimum engine skill contents:

- Install/bootstrap commands and recommended template.
- Project structure and naming conventions.
- Scene/world/game object/ECS architecture conventions.
- Asset pipeline conventions.
- Input/audio/physics/persistence conventions.
- Testing and browser smoke-test commands.
- Performance pitfalls and debugging workflow.
- Links to official docs and version researched.

If creating a full engine skill is too much for the current task, create a concise support file under `skills/web-game-dev/references/<engine>.md` and a follow-up issue to promote it.

## Mandatory Metric-Collection Regression Task

Every plan that creates, changes, or deploys a production service **must include an explicit release-blocking metric-collection regression task**, even when product analytics is intentionally minimal or deferred. The task must add automated coverage across emission, transport/retry, collection and ingestion, storage, aggregation/query, and dashboard or reporting readback. It must prove that expected metrics arrive exactly as intended, required labels/cardinality remain valid, and missing, malformed, duplicate, delayed, or wrongly attributed signals are detected by a pipeline self-check or alert instead of appearing healthy. Use the lowest reliable layer, but include a focused integration test across emission → collection → destination whenever unit tests cannot prove the pipeline boundary. A manual dashboard glance is supplemental, never a replacement. If the production-like metric backend is unavailable in CI, plan a deterministic local collector/contract harness plus a staging destination readback gate, and keep release blocked until current evidence exists.

## QA / Verification Checklist

- [ ] Engine research compares viable options and recommends one performant default for the game type.
- [ ] Tech spec includes game classification, target devices/browsers, FPS/frame budget, and asset loading strategy.
- [ ] Architecture pattern(s) are chosen from the common catalog and tied to the actual gameplay needs.
- [ ] Game loop/timestep strategy is explicit.
- [ ] Scene/state boundaries are explicit.
- [ ] Entity/game object/component or ECS model is explicit.
- [ ] Input, audio, physics/collision, persistence, and analytics approaches are explicit or marked not applicable with reason.
- [ ] Engine-specific skill/support file was found or created/queued before implementation.
- [ ] Browser smoke tests, performance checks, mobile viewport checks, and gameplay acceptance tests exist.
- [ ] Metrics events include player progression/success/failure and do not leak private data.

## Common Pitfalls

1. **Choosing React/DOM for game loops by habit.** DOM can work for simple UI-heavy games, but canvas/WebGL engines are usually better for sprite-heavy or real-time gameplay.
2. **Using Three.js as if it were a full game engine.** It is a rendering library. Add architecture for scenes, input, physics, assets, and state.
3. **Ignoring mobile browsers.** Test touch input, orientation, audio unlock rules, memory, and viewport scaling early.
4. **Variable timestep bugs.** Frame-rate-dependent movement/physics creates inconsistent gameplay. Use fixed timestep or engine physics correctly.
5. **No asset budget.** Unoptimized images/audio can dominate load time and memory. Define budgets before implementation.
6. **No engine-specific skill.** Coder agents will drift if engine conventions are not captured. Find or create the engine skill before coding major features.
