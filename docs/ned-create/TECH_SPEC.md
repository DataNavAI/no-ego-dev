# Technical Specification: `ned create`

## Architecture

```text
bin/ned.js
  -> src/cli.js                 command parsing, auth orchestration, recovery copy
  -> src/auth/openrouter.js     loopback OAuth PKCE, returns key in memory
  -> src/app.js                 provider-neutral lifecycle transaction
  -> src/providers/daytona.js   Daytona sandbox/secret/process adapter
  -> src/profile-archive.js     allowlisted credential-free distribution archive
  -> src/state.js               atomic owner-only local state
```

The application layer depends on a small injected provider boundary so lifecycle behavior is deterministic under tests and alternative providers can be added later without rewriting commands.

## Interfaces

### CLI surface

| Command | Inputs | Side effects | Success evidence |
| --- | --- | --- | --- |
| `ned create` | Daytona env credential; OpenRouter OAuth or env fallback | secret + sandbox + local state | remote health passes |
| `ned create --dry-run --json` | none | none | opinionated plan JSON |
| `ned chat <prompt>` | local state + Daytona credential | starts sandbox; model call | NED output |
| `ned doctor` | local state + Daytona credential | starts sandbox; health/model call | named checks |
| `ned reset` | local state + Daytona credential | reinstalls profile | health passes |
| `ned destroy --yes` | local state + Daytona credential | permanent deletion | remote delete awaited, state cleared |

### Provider boundary

```js
createWorkspace(plan, credentials) -> { id, name, nedSecretId, nedSecretName }
bootstrap(workspace, plan) -> { hermesVersion }
start(workspaceId) -> void
doctor(workspace, plan) -> { ok, checks, output }
chat(workspaceId, profile, prompt) -> string
destroy(workspace) -> void
```

### Local state schema

```json
{
  "provider": "daytona",
  "workspaceId": "...",
  "workspaceName": "ned-product-partner",
  "profile": "ned",
  "hermesVersion": "v2026.7.20",
  "secretId": "non-secret Daytona resource identifier",
  "secretName": "unique non-secret resource name",
  "cleanupPending": "optional boolean set only when compensating cleanup must be retried"
}
```

No API key, OAuth token, prompt, response, repository token, or credential value may be persisted.

## Daytona mapping

Official SDK: `@daytona/sdk@0.200.1`.

```js
{
  name: 'ned-product-partner',
  language: 'typescript',
  image: 'ubuntu:24.04',
  public: false,
  ephemeral: false,
  resources: { cpu: 2, memory: 4, disk: 20 },
  autoStopInterval: 15,
  autoArchiveInterval: 10080,
  autoDeleteInterval: -1,
  secrets: { OPENROUTER_API_KEY: 'ned_openrouter_<random-id>' }
}
```

Each installation creates a uniquely named OpenRouter secret restricted to `openrouter.ai`. Its non-secret resource ID is retained for deterministic cleanup. Daytona injects an opaque placeholder and substitutes plaintext only in HTTPS request headers to the allowlisted host.

SDK lifecycle calls:

- create: `daytona.create(params, { timeout: 300 })`
- retrieve: `daytona.get(id)`
- execute: `sandbox.process.executeCommand(command, cwd, env, timeout)`
- start: `sandbox.start(timeout)`
- delete: `sandbox.delete(timeout, true)`
- secret delete: `daytona.secret.delete(secretId)`

## Bootstrap

1. Upload an allowlisted tar archive containing every `distribution_owned` path, including skills and evals.
2. Install pinned Hermes from the pinned installer source and pinned commit with `--skip-setup --skip-browser --non-interactive`.
3. Install or reset NED from the local archive with `hermes profile install /tmp/ned-profile --name ned --force --yes`.
4. Set provider `openrouter` and model `openai/gpt-5.5`.
5. Verify `hermes --version`, `hermes profile info ned`, and a minimal inference request.

Git-backed profile distribution remains the preferred public update channel once the NED distribution repository is public and release pinning is reliable. The bundled archive is used for v0.2.0 because the current repository is private and Hermes `#ref` pinning is not implemented reliably in `v2026.7.20`.

## Security properties

- OpenRouter uses OAuth PKCE by default; no client secret.
- Daytona API key is the provider’s unavoidable programmatic credential. Required least privilege: `write:sandboxes`, `delete:sandboxes`, and `manage:secrets`.
- Credentials never appear in command strings, package/profile archives, local state, or normal output.
- Profile and state names are validated before shell use; user prompts are POSIX shell-quoted.
- Destruction requires explicit `--yes` and clears state only after confirmed remote deletion.
- Installation failure triggers best-effort remote rollback.

## Known constraints

- Daytona browser login yields a short-lived JWT plus organization ID; the SDK MVP uses a project-scoped API key rather than scraping CLI config.
- Stopped sandboxes retain disk billing. Seven-day auto-archive is required to reach zero active sandbox billing while retaining restorable state.
- The OpenRouter key is stored as a uniquely owned Daytona organization secret and is deleted by resource ID during rollback or destroy.
- One-shot chat is not a full interactive terminal.
- KakaoTalk requires a hosted, approved business integration and is not a profile-only adapter.

## Verification strategy

- Unit/contract tests use fake Daytona and filesystem boundaries.
- OAuth test uses a real loopback HTTP callback with fake key exchange.
- Profile archive test rejects `.git`, `.env`, `auth.json`, and runtime state.
- Package smoke must inspect published file contents, install the generated tarball, and execute the binary.
- Beta release is blocked until a real Daytona create/doctor/chat/destroy journey passes under a user-authorized account.
