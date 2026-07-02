# Create agent-identity-and-access skill and slim project-manager account guidance

## Original request

"Let's go with this name. The skill should entail how to perform oauth by asking a user to perform a few actions over chat. Also it should entail how to keep a browser signed in so that an agent can sso to different services which supports sign by google. And update project manager to use agent identity when communicating with a user or others via email."

## Scope

- Create `skills/agent-identity-and-access/` as the owner of agent Google/Gmail identity, OAuth/delegated access, signed-in browser SSO, email identity, and safe account access practices.
- Move detailed agent Gmail/OAuth guidance out of `project-manager` and replace it with a concise handoff to `agent-identity-and-access`.
- Update `project-manager` to require using the configured agent identity for email communication with the user or others.
- Add/update eval expectations and fixtures for the new skill and project-manager handoff.
- Sync live NED/AlphaNED profiles and restart gateways after validation.

## Acceptance criteria

- New `agent-identity-and-access` skill has SKILL.md, EVAL.yaml, and evaldata.
- New skill includes chat-based OAuth/device-code consent workflow and post-consent verification.
- New skill includes keeping a browser/profile signed in to the agent Google account for Sign in with Google/SSO flows, with session isolation and secret safety.
- Project manager no longer owns the long Gmail/OAuth implementation detail and instead invokes the new skill during onboarding and for email communication identity.
- Validation/tests pass and intended files are committed.

## Evidence

- Created `skills/agent-identity-and-access/SKILL.md` version `0.1.0`.
- Created `skills/agent-identity-and-access/EVAL.yaml` and `skills/agent-identity-and-access/evaldata/README.md`.
- New skill includes:
  - Durable `agent_identity` runbook block.
  - Chat-based OAuth/delegated-access workflow with exact user steps.
  - Least-privilege scope explanation and post-consent verification rules.
  - Dedicated signed-in browser profile / Google SSO workflow.
  - Rules for asking the user to complete password, 2FA, passkey, CAPTCHA, or recovery prompts without sharing secrets.
  - Email communication identity rules for user/collaborator/vendor/support/tester messages.
- Updated `skills/project-manager/SKILL.md` to version `0.5.6` with concise `Agent Identity and Email Communication Rules` that invoke `agent-identity-and-access` instead of owning detailed OAuth/browser guidance.
- Updated `skills/project-manager/EVAL.yaml` expectations for invoking the new skill and using agent identity/delegated mailbox for email.
- Updated `README.md` skill list.
- Validated source `SKILL.md` frontmatter and EVAL YAML parsing for both changed skills.
- Ran `python -m pytest` in `/Users/moonk/no-ego-dev`: `5 passed`.
- Ran `git diff --check` for intended changed files: passed.
- Synced new and changed skill directories to:
  - `/Users/moonk/.hermes/profiles/ned/skills/agent-identity-and-access/`
  - `/Users/moonk/.hermes/profiles/alphaned/skills/agent-identity-and-access/`
  - `/Users/moonk/.hermes/profiles/ned/skills/project-manager/`
  - `/Users/moonk/.hermes/profiles/alphaned/skills/project-manager/`
- Validated live copies contain the expected markers and versions.
- Restarted live gateways:
  - `ai.hermes.gateway-ned` → running PID `98720`
  - `ai.hermes.gateway-alphaned` → running PID `98733`
