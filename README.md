# No Ego Dev

## App projects

NED Core, CLI and COM live in separate private project roots under [`apps/`](apps/README.md):
`apps/ned-core`, `apps/ned-cli` and `apps/ned-com`. They share one root dependency
lockfile, compatible release and installation. Shared domain/runtime primitives
remain in `src/`; compatibility entrypoints delegate to the app-owned source.

Run `npm ci` at the repository root, then `node bin/ned.js --help`.
See the [layout contract](docs/features/app-layout/SPEC.md) and
[Core API specification](docs/features/core-orchestration/API.md).
