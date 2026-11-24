# Real Hermes, stubbed inference

This automated integration suite is included in `npm test`, `test:medium` and
`test:core` ([four test buckets](../../../TESTING.md)). It is not a replacement for the fast
synthetic-gateway Core cases. It starts the real Hermes API adapter with its
standard connect/disconnect lifecycle and actual agent loop, sessions, run ledger,
tools and SSE. It does not start messaging channels or a cron daemon. No existing
host gateway is reused, stopped, reconfigured or upgraded.

## Run

For the full local gate use `npm test`; for just Core use `npm run test:core`.
These commands select a temporary-directory download cache automatically unless
`NED_HERMES_TEST_CACHE` is set. The direct Hermes-only command below retains its
explicit-cache requirement.

Prerequisites: POSIX host, root `npm ci`, `uv` (tested 0.12.5), Python 3.11
discoverable by uv, and an absolute writable dependency-cache directory outside
the repository. First use downloads the pinned Hermes source and locked Python
dependencies. A warmed uv cache reduces subsequent setup cost.

```sh
export NED_HERMES_TEST_CACHE=/Volumes/Agent/Codex/test-cache/ned-hermes
export TMPDIR=/Volumes/Agent/Codex/test-cache
npm run test:core:hermes
```

Use an appropriate external cache/temp path on other POSIX machines, for example
the CI runner's temporary directory. Do not point these variables at a real Hermes
home. The command verifies the source archive checksum, extracts fresh source,
creates a fresh locked dependency environment, runs the suite, and removes its
source/environment on exit. Cache contents are the verified archive, uv package
artifacts and any uv-managed Python interpreter. Existing verified archives are
never rewritten; concurrent cold downloads publish atomically without overwriting
another caller's archive. Corrupt cached bytes fail closed instead of being
silently replaced. Dependencies may need network access during provisioning;
offline execution requires the archive/packages/Python already cached.

Every test creates a fresh profile/Core database, starts an aimock HTTP server and
a separate Python Hermes gateway, then tears them down. Requests go through real
Core HTTP and Hermes HTTP/SSE. A transparent model-only stream barrier pauses
aimock's actual SSE frames; it never fabricates Hermes events. This proves partial
text is readable before terminal completion rather than merely seeing a stream
content type. Scripted tool responses exercise real file access and delegation.

Assertions cover streaming and explicit verification/completion, real file-tool
round trips, child-session bindings, stopping a held model call, deliberate test
failure and startup failure cleanup. Failures are nonzero; no missing dependency
or unsupported platform is represented as a passing or skipped live test.

A timed-out streaming assertion includes a failure-only metadata snapshot (Core
state/error, run-ID presence, result count, gateway status/output count and mock
request/forwarded-character counts). No instructions, response text or credentials
are logged. This distinguishes an ambiguous admission/control-plane failure from
a model-stream delivery failure without relaxing the assertion or retrying it.

The normal `npm run test:spec -- --all` intentionally reports TC-007 as external
manual/scripted acceptance NOT RUN, matching container acceptance conventions.
The standard Linux/macOS CI npm-test jobs invoke this suite through medium;
there is no duplicate dedicated Hermes workflow. Its six-case result remains
separate from the ordinary spec report (which still lists TC-007 NOT RUN).

## Isolation and limitations

Hermes receives an allowlisted environment with a disposable HOME/HERMES_HOME,
synthetic keys and explicit local model configuration. No auth files or production
environment are copied. Main and delegated inference target the same mock; title
upgrades, memory, compression and configured fallback providers are disabled.
Before Hermes imports, a Python audit guard rejects external DNS, IP connections
outside the model listener and external commands; a denial self-test must pass
before readiness. This is a test guard for the pinned Python stack, not an OS
sandbox for hostile native extensions or arbitrary untrusted code.

Only fixture-owned files/tools are used. Full live-provider behavior, model
intelligence, messaging/cron runners, every wire protocol and SIGKILL/power-loss
cleanup are not certified. Normal TERM/INT and bounded timeout cleanup are owned
by the runner; killed processes cannot run finally blocks. Existing deterministic
Core cases retain exhaustive ambiguity/crash/ownership tests.
The fast TC-008 case separately verifies concurrent/warm/corrupt caches and that
timeout or interruption fails even if child TERM cleanup returns exit0.

Pinned Hermes: v0.23.4, `8fc0374447313e276f6b9a2764bfc750190c966a`, using its locked Python 3.14 environment. Archive SHA256:
`620bf64a63c7fabd995df402e46d5eee0cdab7e5d01a4aeddc3a6fa5dee54cc0`.
Update the revision/checksum deliberately and rerun all cases when upgrading.

## Model-stub research and choice

Researched November 16, 2026 against upstream documentation and published npm
metadata; features were then exercised through the real Hermes stack.

| Option | Fit and tradeoff |
| --- | --- |
| [CopilotKit aimock](https://github.com/CopilotKit/aimock) | Selected MIT package `@copilotkit/aimock` 1.48.0, exact dev-only pin with lockfile integrity. Node HTTP server, no runtime dependencies, streaming/nonstreaming replies, function-call fixtures and request journal. Uses our existing test language; works across the Python process boundary. |
| [Tokenless](https://github.com/inference-gateway/tokenless) | Apache-2.0, scripted OpenAI/Anthropic streaming and tool calls; credible alternative but adds a Go binary/build lifecycle to a Node/Python harness. |
| [mock-llm-server](https://github.com/sulaimanvesal/mock-llm-server) | MIT Python-stdlib server with canned replies, tools, SSE and failures; small alternative, but additional process/fixture integration rather than a Node library we can directly own/close. |
| Handwritten HTTP stub | No dependency, but duplicates provider SSE/tool-call serialization and makes wire correctness our maintenance burden. Rejected in favor of a pinned library. |

`@copilotkit/llmock` is the old package name; current npm metadata redirects it
through aimock. We use the actual maintained package rather than a similarly
named fork. No proxy/record/upstream mode is enabled; unmatched requests fail.
Reference: [Hermes custom providers](https://hermes-agent.nousresearch.com/docs/integrations/providers)
and [auxiliary/delegation configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration).
