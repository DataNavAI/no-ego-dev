# Testing NED

## One default command

```sh
npm test
```

This runs **small + medium**, including Python code regressions and the real
Hermes/aimock integration suite. No production/staging credentials, real model
inference or existing Hermes installation/profile is needed. First Hermes setup
downloads checksum-pinned source and locked dependencies; later runs reuse the
download cache, not a running gateway. Fresh profiles, source/venv and gateway/model
processes are created and torn down on every invocation.

### First-use setup (macOS/Linux)

Use Node 22.13+ (Node 20.19+ also supported), Python 3.11+ and an activated Python
virtual environment. Install dependencies once:

```sh
npm ci
python -m pip install -r requirements-dev.txt
npx playwright install chromium
npm run hooks:install
```

Linux may need `npx playwright install --with-deps chromium`. Browser
checks select Playwright's `channel: 'chromium'` full-browser headless
mode, not its separate legacy headless shell ([official browser guidance](https://playwright.dev/docs/browsers#chromium-new-headless-mode)). Install full Chromium, not `--only-shell`.

The Python
requirements include pytest, PyYAML, ruff and pinned uv. uv provisions Hermes's
separate Python 3.11 environment; network is needed for cold provisioning unless
its source/dependencies/interpreter are already cached. Windows contributors use
WSL for the full default suite (Hermes teardown is POSIX-only); targeted native
Windows CI checks remain separate. Missing prerequisites are failures, not skips.

All test-owned runtime data stays outside Git. By default the Hermes download
cache is under the OS temporary directory. For a durable cache on this Mac:

```sh
export NED_HERMES_TEST_CACHE=/Volumes/Agent/Codex/test-cache/ned-hermes
export TMPDIR=/Volumes/Agent/Codex/test-cache
```

Use your own absolute writable paths on other hosts. Never point test caches or
temp paths at a real Hermes home. Run `npm run lint` as well before submitting.

## Four buckets

| Command | What it proves | Dependencies / effects |
| --- | --- | --- |
| `npm run test:small` | In-process logic and UI controllers with synthetic boundaries | Node/npm; no real sockets, databases, child processes, browsers or mutable fixture files |
| `npm run test:medium` | Isolated local component integration, SQLite/filesystem/processes, local Chromium chat flows, Python eval-engine regressions, real Hermes + aimock | Python/uv/Chromium, cold dependency downloads; no real inference or host Hermes state |
| `npm run test:large -- --url https://staging.ned.datanav.app/` | Deployed staging browser shell/composer plus real backend health | Explicit staging target/access + Chromium; read-only GET/HEAD, no chat submission |
| `npm run test:large -- --container` | Existing full native Docker deployment acceptance | Docker; disposable owned containers/volumes; same cleanup and flags as `test:container` |
| `npm run test:eval -- skills/test-writing` | Actual skill/workflow behavior through EVAL.yaml, agent and judge | Explicit package and provider access; may incur model cost; reports in OS temp by default |

Large and eval **never run implicitly** in `npm test` or the commit hook. A green
default test run does not certify staging or skill quality. Staging smoke is not
full chat/OAuth/live-provider E2E coverage; existing feature manual acceptance
procedures still own those journeys. Do not interpret the bucket name as new
coverage that has not been implemented or run.

Staging URLs must be HTTPS `staging.ned.datanav.app` or an instance under
`*.proxy.staging.hub.datanav.app`; no embedded credentials or implicit production
target. A deployment using HTTP Authorization can use
`NED_TEST_STAGING_AUTH_FILE`, a private chmod-600 file containing its `Basic …` or
`Bearer …` header. Supply it outside Git and never paste its value into chat/logs.
Interactive Hub sign-in is not automated by this smoke. Missing access fails.

Eval options after the package are forwarded to the existing runner, for example:

```sh
npm run test:eval -- skills/test-writing --output-root /absolute/external/eval-runs --markdown
```

Use synthetic evaldata and the package's EVAL.yaml. Evaluation-engine tests with
fake commands remain medium code coverage, not eval passes.
`python -m eval_runner.cli --help` is the executable provider/judge option reference.

## Focus and compatibility

- `npm run test:core`: all Core automated spec cases **and real Hermes**, once.
- `npm run test:spec -- --feature communicator --case TC-037`: existing focused selector; runs the whole selected case and all its variants.
- `npm run test:spec -- --all`: all automated spec cases, preserving strict named-case/no-skip checks. Does not itself provision Hermes or run Python.
- `npm run test:chat:e2e`: legacy local browser alias; these synthetic-backend flows are **medium**, despite the historical name.
- `npm run test:core:hermes`: direct Hermes-only provision/run/teardown command; requires explicit `NED_HERMES_TEST_CACHE` ([details](docs/features/core-orchestration/HERMES-TESTING.md)).
- `npm run test:container`: compatibility alias for large `--container`; forwards its existing flags.
- `npm run test:all`: compatibility alias for `npm test`, **not** all environments or paid evals. The hook uses this safe local gate.

CI runs the same default command on Linux and macOS with pinned Python/uv and
installed Chromium, not separate duplicate Python/Hermes jobs. Native Docker and
Windows acceptance retain their environment-specific workflows.

## Adding or categorizing tests

Do not move tests merely for bucket labels. Spec cases stay beside their feature
under `docs/features/<feature>/tests/TC-NNN.test.js`; CLI regressions stay in
`tests/cli`, Python code regressions in the existing pytest suite. New files are
included automatically as medium. After checking they use only in-process
synthetic boundaries, add genuinely small files to `smallTests` in
`scripts/test-suites.mjs`. A partition test prevents loss/duplication of active
spec coverage. Keep mixed files medium; split only when it improves maintainability
or feedback, not to inflate unit counts.

Manual spec cases remain visibly NOT RUN in the spec report. Core TC-007 is the
existing external/scripted case actually executed separately **inside medium**;
that real result, not its manual declaration, establishes its pass. Existing
optional Python platform-specific skips remain visible and do not imply eval
or manual acceptance.

Canonical behavior and executable coverage: [test suite spec](docs/features/test-suites/SPEC.md).
