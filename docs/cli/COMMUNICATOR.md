# Local communicator
Run `ned com` to start NEDCOM. Open its printed `http://127.0.0.1:<port>` URL. The process stays running until Ctrl+C (SIGINT) or SIGTERM; stopping releases its listener. No browser is opened automatically and no cloud credentials are needed.

`ned com [--port <0..65535>] [--database <SQLite-path-or-fileURL>] [--help]`

The default port is 0: the operating system chooses an available ephemeral port. An explicit occupied port fails; select another port or stop the owner and retry. Only IPv4 loopback is supported. Help exits without starting a server. Invalid/missing/duplicate options or invalid database configuration exit 2; listener/resource failures exit 1; normal shutdown exits 0.

Database configuration uses `--database`, then `NED_DATABASE_URL`, then `~/.ned/ned.sqlite`. Local file URLs and SQLite paths follow the shared task resolver. The command validates configuration and passes it to the server without initialization or migration. A missing database does not prevent the shell from starting. Project and WIP preview browsing read existing shared records and selected folders. Artifact and task browsing remain planned in #117–118. Missing/corrupt/unreadable/unsupported databases produce a recoverable project-data error; the shell still starts.

See [communicator contract](../features/communicator/SPEC.md) and [parent issue #113](https://github.com/DataNavAI/no-ego-dev/issues/113).

## Project and preview setup
Register projects through `ned task init --project <directory>` using the same database configuration. NEDCOM reads the existing registry; it never registers projects or initializes a missing DB. Select a project in the browser; matching names are distinguished by registered folder context. Missing/unavailable DB or folder is recoverable with Retry.

Start the project app separately. In its registered root, create `.nedcom.json` (at most 4 KiB) containing:

```json
{"version":1,"previewUrl":"http://127.0.0.1:5173/"}
```

Only HTTP literal 127.0.0.1 with an explicit port is accepted; no credentials, query, fragment, unknown keys or config symlink. NEDCOM checks HEAD reachability for up to one second without following redirects. A successful response offers Open app in a new tab; unavailable/invalid config or stopped app offers recovery. Selection/Retry never launches the app or modifies config. Task/artifact browsing remains planned.

Database reads preserve logical records, the main database contents and file permissions without application writes or migration. SQLite may create or update WAL/SHM coordination sidecars while reading an existing live WAL database. These sidecars remain owned by SQLite.
