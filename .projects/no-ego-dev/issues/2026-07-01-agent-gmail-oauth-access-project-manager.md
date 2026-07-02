# Update project-manager skill: OAuth access assistance for agent Google account

## Original request

"Also agent should ask a user to help with oauth to give access to the account."

## Scope

- Update `skills/project-manager/SKILL.md` so the agent explicitly asks the user to complete OAuth/delegated-access consent for the dedicated project/agent Google account after the account exists.
- Clarify that OAuth setup is required before the agent can send/receive project email, read service notifications, access calendar/Drive artifacts, or manage SSO-backed services that require Google consent.
- Require least-privilege scopes, explicit consent link/device-code/auth-flow instructions, user-owned approval, and durable recording of granted scopes/access status without committing tokens/secrets.
- Update `skills/project-manager/EVAL.yaml` expectations for OAuth assistance.
- Sync live profile copies and restart gateways after validation.

## Acceptance criteria

- Skill asks the user to help complete OAuth/delegated-access for the project/agent Google account.
- Skill records OAuth status/scopes/access method in durable project ops context.
- Skill blocks OAuth-dependent email/service access until consent is completed.
- Skill continues to prohibit storing committed credentials/tokens.
- Validation/tests pass and changed files are committed.

## Evidence

- Updated `skills/project-manager/SKILL.md` to version `0.5.5` with `OAuth/delegated-access setup` guidance.
- Added durable fields: `agent_oauth_status`, `agent_oauth_scopes`, and `agent_oauth_access_path`.
- Added default OAuth ask that tells the user to approve consent/device-code/delegated access without sharing passwords, recovery codes, cookies, or raw tokens.
- Added least-privilege scope guidance, plain-language scope explanation, post-consent verification, and runbook recording rules.
- Updated `skills/project-manager/EVAL.yaml` with OAuth/delegated-access expectations.
- Validated source `SKILL.md` frontmatter and `EVAL.yaml` YAML parsing.
- Ran `python -m pytest` in `/Users/moonk/no-ego-dev`: `5 passed`.
- Ran `git diff --check` for intended changed files: passed.
- Synced the project-manager skill directory to:
  - `/Users/moonk/.hermes/profiles/ned/skills/project-manager/`
  - `/Users/moonk/.hermes/profiles/alphaned/skills/project-manager/`
- Validated both live copies contain `OAuth/delegated-access setup`, `agent_oauth_status`, and version `0.5.5`.
- Restarted live gateways:
  - `ai.hermes.gateway-ned` → running PID `98009`
  - `ai.hermes.gateway-alphaned` → running PID `98025`
