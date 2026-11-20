# NED Core

`src/` owns the coordination service, execution attempts, Hermes adapter,
operator-authenticated HTTP API and Core server lifecycle. Existing shared task
and SQLite primitives remain in the repository's root `src/`; they are reused,
not copied into a second task store.

From the repository root, install with `npm ci`, inspect `node bin/ned.js core
serve --help`, and run `npm run test:spec -- --feature core-orchestration`.
Start a local operator server with `node bin/ned.js core serve`. Execution remains
opt-in; starting the server does not automatically dispatch an existing backlog.
See the [API](../../docs/features/core-orchestration/API.md) and
[behavioral contract](../../docs/features/core-orchestration/SPEC.md).

This private app shares the root lockfile, dependencies, verification and release.
