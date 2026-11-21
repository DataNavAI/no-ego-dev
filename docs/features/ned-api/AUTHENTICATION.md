# Authenticated NED API v1 migration

Status: implemented source candidate; task ned-c5c39b1c-4be2-4f61-ad49-feccd060a42b.

All NED API requests, including health, discovery, read models, streams and legacy
aliases, require authentication before dispatch. Loopback and Origin checks remain
additional protections. No API resource is public because it is read-only.

The canonical namespace has no `/operator` group. Coordination resources are
directly under `/api/v1` (context, task-management, coordinator and project
execution/automation resources). The project presentation catalog remains
`/api/v1/projects`; paged registration records are the separate resource
`/api/v1/project-registrations`, with no authentication-policy difference.
Former `/api/v1/operator` paths are removed. Old Core and unversioned COM aliases
remain authenticated compatibility routes.

Canonical health/capabilities and project work retain the existing presentation
JSON shapes for every credential type; legacy Core aliases retain their `data`
envelopes. Execution capabilities have the distinct resource
`/api/v1/execution-capabilities`. Backend-only command servers enable coordination
resources only; presentation resources still404 after authentication. Dispatch
never depends on whether a caller supplied Basic or Bearer authentication.

CLI uses the persistent private instance key as a bearer credential, including
command-scoped API servers. The public COM shell requests a token on first use,
validates it against authenticated `/api/v1/auth/context`, and remembers it in
origin/instance-bound local storage. Forget removes it and aborts active requests;
401 returns to sign-in without replaying messages. When storage is unavailable,
access lasts for the current tab and a notice explains this. Fetch-based HTTP
streams attach Bearer headers and retain incremental delivery. No token is
embedded in shipped assets, URLs or readiness logs. See [bootstrap contract](INSTANCE-TOKENS.md)
for environment/file injection and safe failure behavior. Legacy Basic username
`ned` with the same key remains accepted for integrations. Container COM also accepts
its explicitly configured COM Basic username/password (or plaintext dashboard
credentials when no separate COM pair is configured); a configured password hash
alone does not become a plaintext credential. The private instance key remains
available independently.

Hub delegates its authenticated, instance-bound data channel using the private
instance credential, injected only inside the socket-less trusted bridge after
channel metadata/Origin validation. Client headers cannot establish that trust.
Public quick tunnels never inject authority: the browser must authenticate, and
the existing Host/Origin protections still apply. Authenticated owners can use
the same resources through either transport. Unknown and malformed paths remain
fail-closed. Authentication failures return401 plus a Bearer challenge and a bounded
error, without forwarding to a gateway or starting coordination work.

Verification extends TC-001/TC-002: unauthenticated and wrong-credential GET,
HEAD, mutations, SSE, discovery, health and aliases fail; valid bearer and Basic
authenticate equivalent resources; no token leaks in errors/assets/logs; browser
new/existing chat flows run with the actual token-entry screen; trusted Hub forwarding
and public-tunnel authentication are tested separately. Existing CSRF, ownership,
streaming, idempotency and runtime isolation cases remain required. Native Docker
health checks and acceptance authenticate explicitly. Full small/medium, native
container and real Hermes workflow gates precede merge/deployment.
