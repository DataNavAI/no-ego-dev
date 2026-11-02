# NED CLI quickstart

Install using [INSTALL.md](INSTALL.md), then run `ned --help`.

In your project directory:

```sh
ned task init
ned goal create "Build login" --json
ned task create "Implement login" --parent <goal-id> --json
ned ready --json
```

Work persists in the selected agent's `<agent-home>/.ned/ned.sqlite`; standalone without agent context retains `~/.ned/ned.sqlite`. See [runtime home selection and existing-store compatibility](RUNTIME_HOME.md). Set `NED_DATABASE_URL` or pass `--database` to choose only the task database. CLI and COM must select the same runtime to share credentials/secrets and work. See [task commands](../tasks.md) for ownership, completion, dependencies and history.

For the local project browser, run `ned com`. See [communicator usage and current availability](COMMUNICATOR.md). Telemetry is off by default; inspect `ned telemetry status` and use `enable --yes`, `disable` or `delete` to manage consent.
