# NED CLI quickstart

Install using [INSTALL.md](INSTALL.md), then run `ned --help`.

In your project directory:

```sh
ned task init
ned goal create "Build login" --json
ned task create "Implement login" --parent <goal-id> --json
ned ready --json
```

Work persists in a local shared SQLite database. Set `NED_DATABASE_URL` or pass `--database` to choose another SQLite file. See [task commands](../tasks.md) for ownership, completion, dependencies and history.

For the local project browser, run `ned com`. See [communicator usage and current availability](COMMUNICATOR.md). Telemetry is off by default; inspect `ned telemetry status` and use `enable --yes`, `disable` or `delete` to manage consent.
