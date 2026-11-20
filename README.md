# No Ego Dev

## Development tests

Run `npm test` for small + medium verification, including real Hermes with stubbed
model responses. Staging/system acceptance and skill/workflow evals are explicit
`test:large` and `test:eval` commands. See [TESTING.md](TESTING.md) for setup,
the four buckets, focused commands and coverage limits.

## App projects

NED Core, CLI and COM live in separate private project roots under [`apps/`](apps/README.md):
`apps/core`, `apps/cli` and `apps/com`. They share one root dependency
lockfile, compatible release and installation. Shared domain/runtime primitives
remain in `src/`; compatibility entrypoints delegate to the app-owned source.

Run `npm ci` at the repository root, then `node bin/ned.js --help`.
See the [layout contract](docs/features/app-layout/SPEC.md) and
[Core API specification](docs/features/core-orchestration/API.md).
