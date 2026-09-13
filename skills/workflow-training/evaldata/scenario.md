# Deterministic workflow-training scenario

WORKFLOW_TRAINING_FIXTURE_SENTINEL

This fixture contains no live repository, profile, gateway, or external service.

## Failure evidence

- The valid eval setup provided a workspace and BENCHMARK.md fixture.
- The evaluated agent worked in a different directory and never read the delivered fixture.
- One judge invocation timed out; deterministic artifact inspection confirms the workspace-routing failure independently.
- The candidate behavior should generalize across prompts rather than memorize this scenario.

## Required controlled comparison

Keep one frozen eval, fixture, model/provider, environment, and judge while comparing current-skill, old-skill, no-skill, and candidate conditions. Use at least three prompts: a representative workspace-routing prompt, a boundary prompt with no working directory, and an adversarial literal prompt containing spaces, quotes, `$(touch SHOULD_NOT_EXIST)`, backticks, `%PATH%`, and non-ASCII text. The transport must use argv-safe literal delivery and create no side-effect marker.

## Publication scenario

Assume a reusable skill change is eventually selected. It may roll out only after complete-package validation, independent review of the exact candidate, and verified merge into the remote default branch. Rollout roots are supplied through source_root and target_roots parameters. Existing skill-only content is hot-loaded on a fresh invocation/session; no gateway restart is implied.

If external material is considered, its repository, pinned commit, source paths, license, and attribution must be recorded and reviewed through the external-integration owner.
