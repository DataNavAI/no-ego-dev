# Real Hermes, stubbed inference

This is a separate automated integration suite, not a replacement for the fast
synthetic-gateway Core cases. It starts the real Hermes API adapter with its
standard connect/disconnect lifecycle and actual agent loop, sessions, run ledger,
tools and SSE. It does not start messaging channels or a cron daemon. No existing
host gateway is reused, stopped, reconfigured or upgraded.

## Run

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
source/environment on exit. Cache contents are only the verified archive and uv
package artifacts. Dependencies may need network access during provisioning;
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

The normal `npm run test:spec -- --all` intentionally reports TC-007 as external
manual/scripted acceptance NOT RUN, matching container acceptance conventions.
`Core Hermes integration` CI invokes this dedicated suite on relevant PRs or
manual dispatch. Its result is separate from the ordinary spec result.

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

Pinned Hermes: `6e07eb48387044dbcaf12490931c2b8ca7ec8653`, the public parent of
the host's local launch-path-only patch at implementation time. Archive SHA256:
`63de899415219adac1ce83b40980bc9526e5c448277ebf7a02d240bccebdcb1e`.
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
