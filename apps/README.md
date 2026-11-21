# NED apps

NED ships three private app projects in one repository and one compatible release:

| App | Owns | Entry point |
| --- | --- | --- |
| [NED Core](core/README.md) | NED API v1, coordination, chat and private data | `core/src/index.js` |
| [NED CLI](cli/README.md) | Command dispatch and task command presentation | `cli/src/cli.js` |
| [NED COM](com/README.md) | Web host, chat UI, assets and transport adapters | `com/src/server.js` |

Run `npm ci` once at the repository root. The root `package-lock.json` owns all
dependencies; app manifests identify private projects, not separately published
packages. Run `npm run lint`, `npm test` and `npm run build:ui:check` at the root.
Shared domain, storage, security and installation code remains in root `src/`.
Legacy source entrypoints re-export app-owned implementations for compatibility;
they are not alternate backends. Runtime data stays outside the source tree.

See [the layout contract](../docs/features/app-layout/SPEC.md) and
[NED API v1 specification](../docs/api.md) and [architecture](../docs/architecture.md).
