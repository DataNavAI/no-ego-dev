# Critical User Journey and Acceptance Contract

## CUJ-1: Create a working NED

**Given** Node.js 20+, a Daytona API key with `write:sandboxes`, `delete:sandboxes`, and `manage:secrets`, and successful OpenRouter browser authorization
**When** the user runs `ned create`
**Then** the CLI asks no infrastructure questions and:

1. creates a private, non-ephemeral Daytona sandbox;
2. configures 2 vCPU, 4 GiB RAM, 20 GiB disk, 15-minute auto-stop, seven-day auto-archive, and no auto-delete;
3. stores OpenRouter as a host-allowlisted Daytona secret rather than plaintext in the sandbox;
4. uploads only credential-free NED distribution content;
5. installs pinned Hermes and NED noninteractively;
6. verifies sandbox, Hermes, profile, and model inference;
7. saves only workspace identity and version metadata locally with mode `0600`;
8. prints one next command.

**Failure contract:** if steps 4–6 fail, the just-created workspace is deleted and no local state is saved.

## CUJ-2: Use NED after suspension

**Given** an existing stopped or archived workspace
**When** the user runs `ned chat "<request>"`
**Then** the CLI starts/restores it, safely quotes the request, runs the NED profile, streams or prints the completed response, and preserves the workspace for later use.

v0.2.0 prints the completed one-shot response; interactive PTY streaming is a follow-up.

## CUJ-3: Diagnose and recover

- `ned doctor` wakes the workspace and verifies the exact managed Hermes/profile/inference path.
- `ned reset` reinstalls the bundled NED profile in the same workspace, preserving projects, then reruns health checks.
- Failures identify the failing stage without printing credentials.

## CUJ-4: Stop future cost

**When** the user runs `ned destroy --yes`
**Then** the managed Daytona workspace is permanently deleted, deletion is awaited, and local state is cleared only after remote deletion succeeds.

## Automated evidence

- `npm test`
- `python -m pytest`
- `npm run check`
- `npm audit --omit=dev`
- `npm pack --dry-run`
- install tarball into an isolated prefix and run `ned create --dry-run --json`
- authorized beta smoke: `ned create` → `ned doctor` → `ned chat "Reply with exactly: ready"` → `ned destroy --yes`
