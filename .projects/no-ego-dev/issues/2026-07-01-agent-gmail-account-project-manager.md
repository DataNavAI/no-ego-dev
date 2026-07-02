# Update project-manager skill: default agent Gmail account

## Original request

"Update project manager skill to ask a user to setup a gmail account for the agent to use as a single account to sso to various services. Also an agent can use this account to do email communications with a user and others."

## Scope

- Update `skills/project-manager/SKILL.md` to make agent Gmail account setup a default project onboarding/account-management step.
- Explain that the Gmail account should be used as the agent-owned identity for SSO/signups across cost-effective project services where appropriate.
- Explain that the same account can be used for project email communication with the user, collaborators, support channels, vendors, and service notifications.
- Require safe handling: user creates/owns the account, enables security/recovery/2FA as appropriate, grants access through the approved email integration/auth flow, and records account ownership/usage without committing secrets.
- Update `skills/project-manager/EVAL.yaml` expectations for this behavior.
- Sync the changed skill into live profile copies and restart gateways when validation passes.

## Acceptance criteria

- Project manager skill proactively asks for a project/agent Gmail account during new project onboarding when no account exists.
- Skill records the account as project operational context for SSO and email communications.
- Skill warns not to invent credentials, share personal inboxes by default, or commit secrets/recovery codes.
- EVAL expectations include the Gmail/SSO/email communication behavior.
- Validation/tests pass and changed files are committed.

## Evidence

- Updated `skills/project-manager/SKILL.md` to version `0.5.4` with `Agent Account and Communication Setup Rules`.
- Updated `skills/project-manager/EVAL.yaml` with expectations for Gmail/Google account onboarding, operational recordkeeping, and secret-safety rules.
- Validated source `SKILL.md` frontmatter and `EVAL.yaml` YAML parsing.
- Ran `python -m pytest` in `/Users/moonk/no-ego-dev`: `5 passed`.
- Synced the project-manager skill directory to:
  - `/Users/moonk/.hermes/profiles/ned/skills/project-manager/`
  - `/Users/moonk/.hermes/profiles/alphaned/skills/project-manager/`
- Validated both live copies contain `Agent Account and Communication Setup Rules`, `agent_google_account`, and version `0.5.4`.
- Restarted live gateways:
  - `ai.hermes.gateway-ned` → running PID `96501`
  - `ai.hermes.gateway-alphaned` → running PID `96517`
