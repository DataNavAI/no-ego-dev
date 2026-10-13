# Browser onboarding scope

Browser onboarding and job handling are draft capabilities implemented under `src/web/`, with credential-free adapter-backed tests under `tests/cli/web*.test.js`. Production provider wiring and hosted deployment remain parked; these local implementations do not establish a production release.

The browser handles typed operations, provider connections, job cancellation and session isolation. CLI installation and existing-workspace recovery are documented separately under [docs/cli](../cli/INSTALL.md). No CLI provisioning primitive is available.

The former hosted AWS implementation plan relied on removed CLI provisioning contracts and closed work. It has been removed rather than treated as current implementation authority. Before extending browser behavior or selecting a production provider, establish its canonical feature specification and acceptance criteria. See the [feature inventory](../features/README.md) for current coverage gaps.
