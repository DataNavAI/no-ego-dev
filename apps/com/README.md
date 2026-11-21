# NED COM

`src/server.js` owns the web transport, `src/cli.js` starts COM, and `src/public/`
owns browser modules and static assets. All NED API v1 routing and backend services
belong to Core; COM mounts that same handler. Prior backend module imports remain
compatibility exports, not another API. Shared security/runtime services remain at
root `src/`. See [NED API v1](../../docs/api.md).

From the repository root, run `npm ci`, `node bin/ned.js com --help`, and
`node bin/ned.js com`. Verify with `npm run test:spec -- --feature communicator`.
Run `npm run build:ui` after changing UI controls; `npm run build:ui:check` verifies
committed vendor assets match the pinned dependency and source.

Every API requires authentication, including local health/read requests and legacy
aliases. Browser navigation challenges with standard HTTP Basic: username `ned`,
password the selected runtime's private `.ned/core/operator-token` value. Keep that
key private; never put it in a URL or commit it. CLI uses bearer authentication
automatically. Authenticated Hub connections delegate instance access; public
quick tunnels still require credentials. See the
[authentication contract](../../docs/api.md#connection-and-authentication).

This private app shares the root lockfile, dependencies, verification and release.
