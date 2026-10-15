# Standalone NED container

## Build and start

Requires Linux Docker (amd64/arm64), Docker Compose with long-form optional env-file support (tested v5.6.0; v2.30+) for the optional Compose file, roughly 4–8 GB memory and enough disk for the upstream image. Run from repository root:

```sh
docker build -t ned-standalone:local .
```

Create a private runtime environment file **outside this checkout/build context**, mode 0600. Set `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` and `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` (or upstream `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH`). Choose a strong unique password using a password manager. Optionally set provider variables such as `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`. No real credentials belong in Dockerfile, Compose, source control, screenshots or reports. Docker administrators can inspect runtime environment values; use an appropriately protected Docker host.

```sh
docker run -d --name ned --restart unless-stopped --stop-timeout 30 \
  --env-file /absolute/private/ned-runtime.env --shm-size=1g \
  -p 127.0.0.1:9119:9119 -p 127.0.0.1:8787:8787 \
  -v ned-profile:/opt/data -v ned-database:/var/lib/ned -v ned-projects:/projects \
  ned-standalone:local
# Or:
export NED_RUNTIME_ENV_FILE=/absolute/private/ned-runtime.env
docker compose up -d --build
```

Open [Hermes dashboard](http://127.0.0.1:9119) and sign in using the runtime credentials. This is the actual Hermes React web application with its Python backend, including configuration, sessions and chat surfaces; it is not a terminal process relabeled as HTTP. Model chat requires configuring/authenticating a provider; service health does not prove a paid model response. Open [NED COM](http://127.0.0.1:8787) to browse projects/WIP and preview links. Main currently reports tasks/artifacts unavailable; this container does not import unfinished #117 or #118 work.

COM's container adapter listens on 8787 and proxies to a random-port **loopback-only** COM server. It accepts only the exact Host and Origin in `NED_COM_ORIGIN`, default `http://127.0.0.1:8787`. Use that URL, not localhost, unless overriding the origin. To map another host port, e.g. 8790, publish `127.0.0.1:8790:8787` and set `NED_COM_ORIGIN=http://127.0.0.1:8790`. Keep both published ports on loopback. COM has no user authentication; do not expose it externally. The Hermes dashboard requires authentication even though host publication is loopback, because its internal bind is `0.0.0.0`.

## Data and operation

| Volume | Contents |
| --- | --- |
| `/opt/data` | Complete NED distribution profile, config, skills/evals, Hermes auth/session/memory state |
| `/var/lib/ned` | Shared NED CLI and COM SQLite database (`ned.sqlite`, WAL/SHM) |
| `/projects` | Project repositories and files; default Hermes terminal cwd |

Use fresh volumes. Initialization rejects unrecognized nonempty profiles. It copies every manifest-owned component, `.env.EXAMPLE` and the manifest itself; only the initial terminal cwd becomes `/projects`. A marker records seed provenance. Later startup preserves config, skills, credentials and projects. Upstream adds its bundled skills and generates a runtime gateway key in the profile; that key is not baked into the image. Automatic upstream config migration is disabled; upgrades require explicit backup and compatibility checks. Distribution updates do not overwrite an existing profile automatically. Use a new volume and selectively transfer reviewed operator config/state, or perform a deliberate manual migration after backup. Never share the three volumes concurrently between installations.

```sh
docker inspect ned --format '{{.State.Health.Status}}'
docker logs --tail 100 ned
curl --fail http://127.0.0.1:9119/api/health
curl --fail http://127.0.0.1:8787/api/health
# All CLI writes must run as the same service user:
docker exec --user hermes ned ned --version
docker exec --user hermes ned ned status --json
docker exec --user hermes -it ned hermes setup
docker stop --time 30 ned
```

The Dockerfile clears only upstream image-baked home seed files at build time so fresh volumes start empty; it never deletes a mounted runtime home. s6-overlay is PID 1 and restarts the dashboard and COM after a crash, forwards logs and handles shutdown/reaping. Startup runs as root only for volume initialization/ownership; services run as upstream `hermes` UID 10000. Use default named volumes and user identity; changing upstream UID/GID knobs is outside verified support. Do not use `--init`, override entrypoint, or mount the Docker socket. Health requires the Hermes `/api/health` response with `ok` and `auth_required` true, plus exact COM health identity. A missing dashboard credential exits startup visibly. Docker restart policy restarts exited containers; Docker does not automatically restart solely because health is unhealthy.

Back up all three volumes together while stopped (SQLite must not be copied live without its WAL). Restore backups to separate volumes and verify health and data before switching. Upgrade by building a reviewed updated Dockerfile/base digest and recreating the container with backed-up volumes; retained profiles are not silently replaced. Keep the prior image and backup for rollback. Inspect compatibility before using an older image against newer SQLite/profile data.

```sh
# Remove container only; preserve data:
docker rm ned
# Compose equivalent; preserves named volumes:
docker compose down
# Data deletion is an explicit operator choice after backups:
# docker volume rm ned-profile ned-database ned-projects
# docker compose down -v   # deletes this Compose project's volumes
```

## Upstream image research

Checked 2026-10-13 (America/Los_Angeles; registry timestamps UTC). [Official Hermes Docker documentation](https://hermes-agent.nousresearch.com/docs/user-guide/docker) identifies `nousresearch/hermes-agent`; [Docker Hub registry](https://hub.docker.com/r/nousresearch/hermes-agent/tags) published `latest` at `2026-10-14T04:07:01.45213Z`, index digest `sha256:c69536a39e885b8943329bda68cdf44492458b96aa74a212239bde9d2aeb406a`, with amd64 `sha256:c50eef7ccc91db06cdfe729008f45267a7208d899c73dd257c19eb4a30450c7d` and arm64 `sha256:14258f345ff9726457e7316240262f7e02110ea17522fdb19d7f4ae2cb5094de` manifests. Actual pull and build confirmed availability. Image `/opt/hermes/install-stamp.json` reports Hermes 0.22.0, commit `e06df9c2eae6901f4c88f464e0ae6e753c0428b8`, branch `rc.3-v0.22.0`, built `2026-10-14T00:39:47.174759+00:00`. This exceeds NED's >=0.14.0 requirement; actual acceptance establishes interface compatibility rather than assuming it from version alone.

[Official Dockerfile](https://github.com/NousResearch/hermes-agent/blob/e06df9c2eae6901f4c88f464e0ae6e753c0428b8/Dockerfile), [dashboard service](https://github.com/NousResearch/hermes-agent/blob/e06df9c2eae6901f4c88f464e0ae6e753c0428b8/docker/s6-rc.d/dashboard/run), and [dashboard documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard) establish the real dashboard, authentication and s6 service contract. We extend the official image and retain its supervision rather than rebuilding Hermes from source. A pinned source installation was the fallback considered; it would duplicate upstream toolchain, frontend, Chromium and supervisor assembly with additional maintenance risk. No third-party image is needed. The pinned base's npm 12 requires explicitly approving/rebuilding `better-sqlite3`; Docker build exercises a real in-memory database to fail if native installation breaks. The profile initializer uses separate pinned PyYAML 6.0.3 because the image's launcher Python is not a general dependency environment.

## Acceptance

Credential-free automated cases: activate Python, install `python -m pip install -r requirements-dev.txt` (pinned pytest, PyYAML and Ruff), run `node --test docs/features/standalone-container/tests/*.test.js`, `npm run lint`, `npm run test:spec -- --all`, `npm test`, `python -m pytest`. Manual TC-003/004 must be run against the actual image and recorded separately; NOT RUN in the spec runner is not a pass.

The repeatable image acceptance script runs TC-003/004 against real Docker services, using unique containers/volumes and synthetic runtime credentials. It builds by default and cleans test resources on success or failure. An existing image passed with `--image` is preserved. Docker resources are local to the selected daemon, but the HTTP checks run on this machine: use a locally reachable Docker context. The script uses random host ports and the default COM Host/Origin headers to avoid colliding with other installations. It intentionally requires Docker and is separate from the fast, credential-free spec gate.

```sh
python -m pip install -r requirements-dev.txt
npm run test:container
# Require native host, daemon, image and executed Node architecture:
npm run test:container -- --expected-architecture amd64
# ARM64 equivalent: --expected-architecture arm64
# Choose a local Docker context explicitly:
npm run test:container -- --context colima-ned-container
# Reuse a built image without rebuilding or removing it:
npm run test:container -- --context colima-ned-container --image ned-standalone:local
```

A successful run prints a JSON receipt with test-case IDs, image ID, platform, timestamp, shutdown duration and cleanup status. Failure exits nonzero and does not print a pass receipt. Resource names print before setup so a Docker-host crash can be recovered by removing only those named resources. Never use this script to test a shared host profile. Compose wiring still uses the procedure below.

1. Build as above. Launch with **test-owned names** `ned-container-acceptance` and `ned-container-test-{profile,db,projects}` and a generated synthetic runtime password in a private temporary env file. Do not mount host profiles or provider credentials.
2. Wait boundedly (up to 180 seconds) for Docker healthy. Assert dashboard HTML 200, `/api/health` says `ok:true, auth_required:true`, unauthenticated `/api/config` is 401, and login form submission to `/auth/password-login` yields a cookie and authenticated `/api/config` is 200. Assert COM health/capabilities/projects endpoints are 200 with real service identity and empty projects. Host `evil.example` or Origin `https://evil.example` returns 403. Verify `ned --version`, unprivileged service PIDs and all manifest components under `/opt/data`.
3. Create synthetic project `/projects/acceptance`, profile/project sentinels and a CLI task. Record database readback and sentinel hashes. Kill the s6 dashboard child and COM child one at a time; boundedly wait for new PIDs and correct HTTP responses. No blind retry masks a failed acceptance: report each transition.
4. Stop within 30 seconds, record exit code (no forced SIGKILL), remove container only. Recreate with the same volumes, verify healthy services, CLI task/database, COM project and sentinel bytes. Confirm profile config edit retained.
5. Launch another test container without dashboard credentials: require nonzero exit and no services. Launch with a fresh test profile volume holding an unrelated sentinel: require nonzero exit and unchanged sentinel/no seeded profile. Check image config/history and build context allowlist for absence of runtime password/host state.
6. Run Compose configuration and startup with an isolated project name and external synthetic env file, verify both services and retained volumes, then `compose down -v` only for that test project. Remove only named test containers/volumes and synthetic secret file. No changes to existing Hermes profiles, old staging data/schedules or artifact worktree.

Record commands, image ID/base digest/platform, HTTP codes, process replacement, stop outcome, volume readbacks, cleanup and limitations in [ACCEPTANCE.md](ACCEPTANCE.md). Never store runtime logs/databases/credentials in this feature folder.

## Architecture coverage

AMD64, x64 and x86-64 name the same 64-bit x86 architecture; ARM64 is separate. The native container workflow runs this complete script on `ubuntu-24.04` (AMD64) and `ubuntu-24.04-arm` (ARM64), without QEMU setup. `--expected-architecture` checks the local host, Docker daemon, built image metadata and an actually executed Node process. A mismatch exits nonzero. Receipts identify all four architectures and whether execution matched natively. A successful pull or cross-build alone is not execution acceptance. The workflow is scoped to image inputs/test changes; it needs no provider credentials and makes no paid model requests. See [GitHub runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

Live model acceptance is a separate provider-authenticated operation. It requires explicit authorization and a runtime-only credential file outside the repository, with an explicit provider/model; whole host profiles are never copied into the image or test volume. Service/architecture PASS does not claim a live model reply.

## Reuse a local OpenAI Codex token

An operator may authorize using an existing Hermes token without mounting the host profile. The pinned upstream image supports `HERMES_AUTH_JSON_BOOTSTRAP` on first boot only. Export an **access-only** credential pool into a new private runtime env file outside the checkout. This deliberately excludes refresh tokens, preventing the container from rotating the host login. The snapshot works only until its access token expires; for ongoing use, authenticate independently inside the container. Do not share a writable host auth file between processes.

Run this on the host, changing the two absolute paths. The destination must not already exist. No secret values are printed:

```sh
python3 - /absolute/local/hermes/auth.json /absolute/private/ned-model-runtime.env <<'PYTHON'
import base64, json, os, secrets, sys, time
from pathlib import Path
source, destination = map(Path, sys.argv[1:])
auth = json.loads(source.read_text())
token = auth['providers']['openai-codex']['tokens']['access_token']
claims = json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '==='))
if claims.get('exp', 0) <= time.time() + 300:
    raise SystemExit('Access token expires too soon; reauthenticate in the host first')
bootstrap = {'version': 1, 'active_provider': 'openai-codex', 'providers': {},
    'credential_pool': {'openai-codex': [{'id': 'runtime-access',
        'label': 'operator authorized access snapshot', 'auth_type': 'oauth',
        'priority': 0, 'source': 'manual', 'access_token': token,
        'base_url': 'https://chatgpt.com/backend-api/codex'}]}}
with os.fdopen(os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as f:
    f.write('HERMES_DASHBOARD_BASIC_AUTH_USERNAME=operator\n')
    f.write('HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=' + secrets.token_urlsafe(32) + '\n')
    f.write('HERMES_AUTH_JSON_BOOTSTRAP=' + json.dumps(bootstrap, separators=(',', ':')) + '\n')
PYTHON
```

Use this file with the normal `docker run --env-file` command and **fresh test-owned volumes**. Docker administrators can inspect runtime environment values. The token is persisted in the container profile volume; it is never an image layer. Existing profile auth is preserved, so changing the env file does not overwrite a previous login. Keep the generated dashboard password in the private file; do not print it into reports.

For TC-005, record a private SHA-256 of the source auth file before/after and compare equality. After health is ready, run this bounded request (replace only the test container name and, if necessary, the entitled model):

```sh
docker exec --user hermes ned-model-test /opt/hermes/.venv/bin/python \
  /opt/hermes/hermes_cli/main.py chat --safe-mode --provider openai-codex \
  --model gpt-6.1-sol --toolsets none --max-turns 1 --run-budget 90 -Q \
  -q 'Reply with exactly NED_CONTAINER_MODEL_OK and do not call tools.'
```

Require exit0 and the expected final reply. Capture provider output privately and report only the reply assertion; errors may contain sensitive provider details. Expired/rejected tokens, missing entitlement, network failure or quota exhaustion do not count as a pass. Remove the exact test container with `docker rm -f -v`, its explicitly named test volumes, and the exported env file; preserve the original host auth file. The credential-free `npm run test:container` never performs this import or model call.
