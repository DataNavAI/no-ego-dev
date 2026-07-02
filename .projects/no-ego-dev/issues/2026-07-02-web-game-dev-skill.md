# Create web-game-dev skill

## Original request

"Research and create web game dev skill. Have it to research and leverage a perfomant game engine in the architect phase. Also it should find or create skills for the game engine it chose to use. Also research common game architectures and document it as a part of the skill."

## Scope

- Research web game engine options and common game architecture patterns.
- Create `skills/web-game-dev/` with `SKILL.md`, `EVAL.yaml`, and `evaldata/README.md`.
- Require architecture-phase engine research and a performant engine recommendation/default.
- Require the agent to find existing engine-specific skills or create/update one when the engine choice becomes reusable.
- Document common web game architectures and when to use them.
- Wire `architect` to invoke `web-game-dev` for browser/web game projects.
- Update README and sync live profile copies.

## Acceptance criteria

- New skill exists with durable research-based guidance.
- Architect phase explicitly invokes web-game-dev for web games and includes engine selection in tech specs.
- Skill requires engine-specific skill discovery/creation after choosing an engine.
- Validation/tests pass and intended files are committed.

## Evidence

- Researched current web game engine/package/docs signals on 2026-07-01:
  - npm metadata for `phaser`, `pixi.js`, `playcanvas`, `babylonjs`, `three`, `matter-js`, `bitecs`, and `koota`.
  - Official docs snippets for Phaser, PixiJS, PlayCanvas, Babylon.js, Godot Web export, and MDN game loop/anatomy guidance.
- Created `skills/web-game-dev/SKILL.md` version `0.1.0` with:
  - Architecture-phase requirements.
  - Engine selection guide and comparison template.
  - Common web game architecture catalog: scene/state stack, ECS, component game objects, FSM/behavior trees, fixed timestep, event bus, data-driven content, multiplayer authority, asset pipeline, and persistence.
  - Engine-specific skill discovery/creation rules.
  - QA/performance verification checklist.
- Created `skills/web-game-dev/EVAL.yaml` and `skills/web-game-dev/evaldata/README.md`.
- Updated `skills/architect/SKILL.md` to version `0.2.2` with `Web Game Architecture and Engine Selection`, requiring `web-game-dev` before finalizing browser/web game tech specs.
- Updated `skills/architect/EVAL.yaml` expectations for web-game engine research, game architecture patterns, frame budget, asset pipeline, and engine-specific skill discovery/creation.
- Updated `skills/project-manager/SKILL.md` to version `0.5.7` to delegate browser/web game engine selection and game architecture planning to `web-game-dev` during architecture planning.
- Updated `skills/project-manager/EVAL.yaml` expectation for web-game delegation.
- Updated `README.md` skill list.
- Validated source `SKILL.md` frontmatter and EVAL YAML parsing for `web-game-dev`, `architect`, and `project-manager`.
- Ran `python -m pytest` in `/Users/moonk/no-ego-dev`: `5 passed`.
- Ran `git diff --check` for intended changed files: passed.
- Synced changed skill directories to NED and AlphaNED live profiles and validated expected markers/versions.
- Restarted live gateways:
  - `ai.hermes.gateway-ned` → running PID `13207`
  - `ai.hermes.gateway-alphaned` → running PID `13223`
