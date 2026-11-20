# NED CLI

`src/cli.js` owns command dispatch; `src/task-cli.js` owns task command parsing and
presentation. Commands reuse shared task/security services and Core/COM entrypoints
rather than maintaining independent persistence. Root `bin/ned.js` remains the
installed executable.

From the repository root, run `npm ci`, `node bin/ned.js --help`, and
`node --test tests/cli/cli.test.js`. Run the full suite with `npm test`.
This private app shares the root lockfile, dependencies, verification and release.
