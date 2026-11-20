# Goals and tasks workflow evaluation

This opt-in evaluation asks a real Hermes agent to operate NED goals and tasks
inside a disposable NED Docker container. It is not a model stub test. The
candidate task-management skill and its self-contained synthetic scenario and
verifier are loaded from this checkout.

## Run

Docker must provide a Linux daemon. Install this checkout's Python evaluation
dependencies first. Choose one explicitly authorized credential source:

```sh
npm run test:eval -- workflows/task-management/EVAL.yaml --container \
  --credential-home /absolute/private/hermes-home \
  --output-root /absolute/external/eval-results
```

The Docker-first shortcut defaults to this workflow:

```sh
npm run eval -- --credential-home /absolute/private/hermes-home
npm run eval -- skills/test-writing --env-file /absolute/private/provider.env
```

`--credential-home` copies only the selected provider's credentials, including
OAuth credentials when supported by Hermes. It never mounts the host profile.
Alternatively use `--env-file /absolute/private/provider.env`, a current-user-owned
mode-600 file containing only selected-provider API credential variables. Model
and provider default to the credential home's configuration, or the repository
configuration for env-file runs; override with `--provider` and `--model`.
Changing the provider requires an explicit compatible model and clears an
inherited provider endpoint unless `--base-url` is explicitly supplied.
These runs make real model calls and can incur charges. Never commit credentials.

Use `--context NAME` for a particular Docker daemon, without changing the global
context. By default the runner builds this checkout's NED Dockerfile. `--image`
reuses an existing compatible NED image; the receipt records its immutable ID.
The candidate workflow and skill are still copied from this checkout. For
release acceptance, build the image from the exact candidate commit.

## What establishes a pass

The agent starts with an empty isolated project and must create one goal, finish
two dependent tasks with a visible release-note document, explicitly finish the
goal, and leave a third standalone publication task blocked awaiting approval.
The independent post-agent verifier queries persisted state through the installed
NED CLI, including delivery, ownership, dependency ordering and transition history.
An agent's summary alone cannot establish success.

The runner requires both evaluation success and verified cleanup. Reports and
the cleanup receipt are private files outside the repository. Exit codes are
0 for pass, 2 for behavioral failure, 3 for infrastructure/cleanup failure, and
130 for interruption when cleanup succeeds. Missing credentials or Docker never
count as a pass. The runner removes only resources bearing its unique ownership
label; it preserves an explicitly supplied image. No host ports, host profile,
Docker socket or privileged container are exposed to the agent.

This paid workflow belongs to the opt-in **eval** bucket, not `npm test`.
Generic harness tests use synthetic packages and fake Docker boundaries; their
success does not establish that the task-management skill passed this workflow.

See [the scenario and trusted verifier](../../skills/task-management/evaldata/docker-workflow/README.md)
and [the test-suite specification](../../docs/features/test-suites/SPEC.md).
