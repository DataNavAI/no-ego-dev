# Local communicator
Run `ned com` to start NEDCOM. Open its printed `http://127.0.0.1:<port>` URL. The process stays running until Ctrl+C (SIGINT) or SIGTERM; stopping releases its listener. No browser is opened automatically and no cloud credentials are needed.

`ned com [--port <0..65535>] [--database <SQLite-path-or-fileURL>] [--help]`

The default port is 0: the operating system chooses an available ephemeral port. An explicit occupied port fails; select another port or stop the owner and retry. Only IPv4 loopback is supported. Help exits without starting a server. Invalid/missing/duplicate options or invalid database configuration exit 2; listener/resource failures exit 1; normal shutdown exits 0.

Database configuration uses `--database`, then `NED_DATABASE_URL`, then `~/.ned/ned.sqlite`. Local file URLs and SQLite paths follow the shared task resolver. This command slice validates configuration and passes it to the server; it does not open, initialize, migrate or write the database. A missing database does not prevent the current shell from starting. Project, artifact and task integration remain planned in #116–118. Current shell accurately reports browsing unavailable.

See [communicator contract](../features/communicator/SPEC.md) and [parent issue #113](https://github.com/DataNavAI/no-ego-dev/issues/113).
