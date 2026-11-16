# Feature: App project roots

Status: implemented
Related issues: [#164](https://github.com/DataNavAI/no-ego-dev/issues/164).

## User outcome and scope

Contributors can find NED Core, CLI and COM in separate project roots inside the
single no-ego-dev repository. Each app owns real source and project metadata,
while installation, dependency locking and release compatibility remain shared.
This is a source-layout change, not independent package publication, a new UI,
separate repositories or a rewrite of shared runtime/domain services.

## Requirements

- FR-001: Root `apps/` contains `ned-core/`, `ned-cli/` and `ned-com/`, each with
  package metadata, documented ownership/development commands and app-owned source.
- FR-002: Core owns its coordination API/runtime modules, COM owns its server and
  browser assets, CLI owns command dispatch. Existing shared runtime/domain modules
  remain shared; app copies cannot introduce parallel authoritative task stores.
- FR-003: Existing `ned` commands and compatibility server/CLI imports retain
  behavior. Root install/lockfile, lint, tests, UI generation, distributable package
  and container include and exercise the relocated apps.
- FR-004: Relative static assets, attachment workers and installed app startup
  resolve from their new locations without relying on the checkout's CWD or files
  omitted from the distributable. No runtime data moves with source.

## Critical user journeys

### CUJ-001: Develop and run the separated apps

Actor: contributor/operator. Critical because an attractive directory tree is
insufficient if released commands or COM break. Starting state: fresh checkout
with root dependencies installed. Inspect app metadata; run existing CLI and Core
help; start COM with a temporary runtime; load static assets; inspect packaged
contents. Success: all three project roots are real, familiar commands work and
the package contains their runtime dependencies. Missing assets/imports fail the
gate rather than falling back to old duplicate implementation.

## Detailed test cases

### TC-001: App roots preserve executable and distribution contracts
- Journey / requirements: CUJ-001 / FR-001–FR-004.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: root npm dependencies, temporary runtime/project,
  synthetic gateway configuration; no credentials or live model calls.
- Given: app-owned source is relocated and legacy entrypoints are compatibility
  wrappers only.
- When: import each app entry, invoke `ned --help` and `ned core serve --help`,
  start COM and retrieve its HTML/module/CSS assets, and inspect npm pack output.
- Then: CLI exits 0; Core help is available; COM assets return 200 with correct
  types; metadata identifies the three app packages; packed runtime includes apps
  but excludes test/runtime databases; old and new server imports agree.
- Steps and assertions: execute actual Node entrypoints with a disposable
  `NED_AGENT_HOME`; create a loopback server; fetch its asset map; compare legacy
  and app exports; use npm's JSON dry-run file list for distribution assertions.
  Run existing CLI/COM/Core regression cases and `npm run build:ui:check` as
  broader compatibility evidence.
- Variants / negative cases: unrelated CWD must not change app import/static paths;
  missing browser assets must not return HTML masquerading as JavaScript. Public
  authentication behavior is covered by existing COM/Core transport cases, not
  duplicated here. No user-data migration or concurrent mutation occurs.
- Cleanup: close owned server/sockets and delete only temporary fixture files.
- Pass evidence: named executable assertions plus root static analysis, package
  and existing regression results. Independent review and merged-installed smoke
  are release gates, not implied by this written case.

## Coverage and acceptance

| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-001–FR-004 | CUJ-001 | TC-001 | `tests/TC-001.test.js`; existing CLI/COM/Core regressions, UI build and installed smoke |

Before completion: full canonical repository gates, independent candidate review,
green remote CI, main merge, canonical merged installation, skills staging and
default local COM restart/readback. Preserve configuration, credentials, sessions
and all unrelated working-tree changes.

## Open questions and coverage gaps

TC-001 exercises real app imports, CLI subprocesses, COM HTTP assets and npm's
distribution file list. Core and COM regression suites cover their existing
transport/domain behavior. Source implementation does not imply release acceptance:
independent review, full repository gates and merged-installed smoke remain required.
Apps share one release and root lockfile; independent releases and migration of
every shared `src/` module are not required.
