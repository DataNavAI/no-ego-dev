# Issue: Create integrator skill for third-party tool research/account setup/integration

Status: completed
Owner: integrator-skill subagent
Created: 2026-07-01
Completed: 2026-07-01

## Original request

"Create a integrator skill which research 3p tools, setup accounts and integrate those. It should also document tool-specific knowledge as skills."

## Scope

Create a new NoEgoDev profile skill named `integrator` in the source distribution and sync it to live NED/AlphaNED profiles.

## Acceptance criteria

- [x] `skills/integrator/SKILL.md` exists with valid Hermes skill frontmatter.
- [x] `skills/integrator/EVAL.yaml` exists and encodes the expected behavior.
- [x] `skills/integrator/evaldata/README.md` exists as an eval fixture.
- [x] Skill covers:
  - researching third-party tools/options,
  - account/access/auth prerequisite checks,
  - setting up accounts/workspaces/projects when credentials or user action are required,
  - integrating SDKs/APIs/webhooks/CLIs/config into the project,
  - verifying integration with read/status/smoke checks,
  - documenting tool-specific knowledge as reusable skills or support files,
  - preserving secrets outside repo artifacts,
  - creating follow-up issues for missing credentials, paid-plan decisions, or incomplete setup.
- [x] Source copy is validated and live profile copies are synced.
- [x] Existing unrelated dirty files remain untouched.

## Evidence

- Changed paths:
  - `README.md`
  - `skills/integrator/SKILL.md`
  - `skills/integrator/EVAL.yaml`
  - `skills/integrator/evaldata/README.md`
  - `.projects/no-ego-dev/issues/2026-07-01-integrator-skill.md`
- Validation:
  - `python -m pytest` → `5 passed in 0.12s`
  - Frontmatter/YAML validation for source and live profile copies passed.
  - `git diff --check` passed for changed source files.
- Live sync:
  - Synced to `/Users/moonk/.hermes/profiles/ned/skills/integrator/`
  - Synced to `/Users/moonk/.hermes/profiles/alphaned/skills/integrator/`
- Gateway restart:
  - `ai.hermes.gateway-ned` restarted and running.
  - `ai.hermes.gateway-alphaned` restarted and running.
- Commit:
  - `a32da6b` initially created for this task; issue completion was amended afterward.
