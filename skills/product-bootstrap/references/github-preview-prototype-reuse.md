# Reusing a GitHub-to-preview prototype workflow

Use when a user points to a prior prototype and asks to build the next one “the same way.” Reuse the proven publication loop without guessing its stack, access model, or hosting root.

## Inspect before scaffolding

Verify from source and live repository metadata:

1. Repository identity, visibility, default branch, authenticated actor, and permission level.
2. Actual prototype location: repository root, subdirectory, package, or branch.
3. README, package/lock files, framework and hosting config, asset paths, and shared design tokens.
4. Hosting root, install/build/output settings, and environment-variable requirements.
5. Deployment evidence tied to exact commits and environments.

Do not infer the workflow from an inaccessible URL or stale README. A historical successful deployment proves prior integration, not that a new branch is deployable.

## Access and secret boundary

- Prefer repository-scoped, expiring credentials with read-only contents for inspection; add contents/PR write only for implementation.
- Treat hosting integration credentials separately from repository credentials.
- Never request secrets in chat or print them. Keep temporary retrieval files permission-restricted and outside the repository.
- Inject a project credential only into the relevant process; do not replace unrelated global authentication.
- Verify remotes contain no embedded credential.

## Reuse decision

Reuse the existing prototype area when it has isolated routes or subdirectories, shared tokens/assets, mocked data without production coupling, and compatible preview settings. Use a separate repository/project when runtime requirements conflict, production data or sensitive variables are mixed in, or preview behavior cannot be isolated safely.

After pushing, verify the exact branch/commit status, preview environment, URL, primary journey, and cleanup/expiry. Repository instructions alone are not deployment evidence.
