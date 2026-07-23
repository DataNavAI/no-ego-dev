# NED CLI Release and Operations Runbook

## Environments

This is a user-installed CLI, not a continuously hosted application.

- Staging: GitHub branch/PR CI plus unpublished npm tarball installed into a temporary prefix.
- Production: public npm package `no-ego-dev` and GitHub release tag.
- Provisioned user runtime: private Daytona sandbox in target `us` by default, or `DAYTONA_TARGET=eu`.

## Release flow

1. Run `npm ci`, `npm test`, `npm audit --omit=dev`, `npm pack --dry-run --json`.
2. Install the real tarball into a fresh prefix and run `ned create --dry-run`.
3. Run the live Daytona test plan on macOS and Linux for the exact tarball.
4. Merge a green PR.
5. Publish with npm provenance from the tagged release once npm auth is configured.
6. Reinstall from the registry and repeat dry-run plus one live create/destroy smoke.

## Required credentials

- `DAYTONA_API_KEY`: local process/secret store only; scopes `write:sandboxes`, `delete:sandboxes`, `manage:secrets`.
- OpenRouter: browser PKCE; no stored publisher key required.
- npm publisher authorization: official npm web login or GitHub Actions trusted publishing; do not use a token in chat.
- GitHub: authenticated `gh` CLI with repo/workflow access.

## Health

`ned doctor` starts the workspace if necessary and verifies:

1. Daytona sandbox reachability.
2. Pinned Hermes executable.
3. Installed `ned` profile.
4. Successful OpenRouter-backed inference.

## Logs and privacy

Daytona command output is available through the CLI. The CLI must never print credential values. Anonymous telemetry is not shipped in 0.2.0 because no user-owned collector or privacy policy is configured; local command failures are user-visible only.

## Cost visibility

- Daytona compute while running; automatic stop after 15 idle minutes.
- Daytona disk while stopped; automatic archive after seven idle days.
- Archived sandboxes retain restorable state without active sandbox billing according to Daytona documentation.
- OpenRouter inference billed to the user-controlled OAuth key.
- Check current Daytona pricing and account quotas before public launch; limits and pricing can change.

## Rollback

- npm: deprecate the bad version, republish a fixed patch version, and update the `latest` dist-tag.
- GitHub: revert the merge and tag a patch release.
- User workspace: `ned reset` reapplies the bundled profile; `ned destroy --yes` removes the remote sandbox.
- Failed creation automatically attempts remote deletion and does not save local state.

## Current release blockers

- `DAYTONA_API_KEY` is absent, so live provisioning and cleanup are not verified.
- npm is not authenticated, so registry publication and post-publish installation are blocked.
- Analytics collector/privacy policy is not configured; anonymous opt-in telemetry is deferred.
