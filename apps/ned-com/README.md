# NED COM

`src/server.js` owns the web transport, `src/cli.js` starts COM, and `src/public/`
owns browser modules and static assets. Task coordination and authoritative work
reads belong to Core. Shared security/runtime services remain at root `src/`.

From the repository root, run `npm ci`, `node bin/ned.js com --help`, and
`node bin/ned.js com`. Verify with `npm run test:spec -- --feature communicator`.
Run `npm run build:ui` after changing UI controls; `npm run build:ui:check` verifies
committed vendor assets match the pinned dependency and source.

This private app shares the root lockfile, dependencies, verification and release.
