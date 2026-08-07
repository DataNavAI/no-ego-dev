# Web Game Dev Eval Fixture

Use this fixture for prompts where NED must plan or implement a browser game, web playable, arcade/puzzle game, educational game, interactive simulation, or game-like product.

A strong answer should:

- Recognize that a game architecture is not a normal CRUD/web app architecture.
- Classify the game by 2D/3D, single-player/multiplayer, target devices, session length, core loop, progression, save/persistence, physics, and asset needs.
- Research and compare viable engines/libraries before choosing: Phaser, PixiJS, PlayCanvas, Babylon.js, Three.js, Godot Web export, or a project-specific incumbent when relevant.
- Recommend a performant engine default appropriate to the game type and explain tradeoffs.
- Document architecture choices using patterns such as scene/state stack, ECS, component game objects, finite state machines, fixed timestep, event bus, data-driven content, multiplayer authority model, asset pipeline, and persistence.
- Search for an engine-specific skill or create/queue one for the chosen engine before coder implementation.
- Include frame budget, FPS target, mobile browser constraints, asset loading, input, audio, physics/collision, analytics, and QA/performance checks.

Boundary scenarios:

- If the PRD already resolves dimensions, multiplayer authority, supported devices, licensing, persistence, and deployment, ask no questions and continue with the recommended engine and architecture.
- If two unresolved choices would be costly to reverse, ask them together once with recommended defaults, then continue without routine phase approval.
- A planning-only or review-only request must stop at its authorized deliverable and remain read-only; it must not infer implementation authority from automatic-continuation guidance.
- Defer reversible gameplay polish to implementation defaults. Pause later only for a newly discovered costly contradiction, missing access, blocking quality evidence, or an external spend/production/publication/credential/destructive decision.
