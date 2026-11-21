# Persistent instance tokens and direct UI sign-in

Status: implemented source; release/deployment gates pending. Native issue [188](https://github.com/DataNavAI/no-ego-dev/issues/188),
managed integration [Hub142](https://github.com/DataNavAI/ned-hub/issues/142).
This extends the implemented authenticated API; Basic compatibility is not the
new direct-browser sign-in experience.

The instance owns a random256-bit opaque key in the existing private
`<runtime>/.ned/core/operator-token` file, retained for upgrade compatibility.
CLI reads that same key for configured and command-scoped API servers. Help and
invalid arguments do not create credentials. Generation occurs only when no
persisted key and no injection exist; restarts preserve it.

`NED_API_TOKEN_FILE` accepts a bounded absolute, regular, nonsymlink input secret
file; `NED_API_TOKEN` is an environment alternative. Exactly one may be supplied.
Both use the existing64-character hex representation. Invalid/empty/missing input
fails without fallback. A matching stored key is reused; a mismatch fails startup
without changing either source. Input mount files are never rewritten. The local
copy remains owner-only; supported root/group-readable Kubernetes mounts are
validated separately from persisted file permissions. The API key is never a
model, gateway or rotating Hub connection credential.

The public document is a static token-entry shell. Before importing the normal
UI controllers it probes an authenticated context: a valid saved bearer or an
already-authenticated Hub/legacy proxy can open the UI. Otherwise it asks for an
access token, validates it, then stores it for that browser origin and opaque
instance identity. No data or chat mutation loads before authentication. Browser
storage failure keeps a validated token in memory with an explicit tab-only
notice. Forget clears browser credentials and aborts pending streams;401 clears
stale storage and returns to sign-in without replaying mutations or discarding a
draft. Tokens never enter URLs, app logs or rendered chat/tool content. Browser
storage is JavaScript-readable: CSP, sanitized content and origin-isolated previews
remain required. Individually revocable browser credentials are future scope.

All API clients use one shared bearer-aware fetch utility for bounded same-origin
API paths, including uploads and image outputs. Generic API SSE uses fetch
streaming rather than native EventSource so Authorization can be attached. Preserve
event parsing, reconnect IDs, bounded buffers, backpressure and cancellation;
401 must stop reconnect. Existing chat turn streaming remains HTTP streaming.
The server still authenticates every API, including discovery/health and aliases.

Managed Hub stores one encrypted stable API token per permanent instance, separate
from generation-scoped tunnel capabilities. A current workload capability can
bootstrap only its own instance via a private authenticated endpoint; browser
cookies/Origin cannot request the raw token. KMS awaits require fresh revocation
checks. The runtime supplies a private file to NED before COM starts. Owner-checked
Hub routing may inject the same bearer; client headers never establish authority.
Stop/start retains the API key, while deletion denies disclosure/forwarding.
Existing-key adoption is an explicit migration, never a silent overwrite.
Hosted KMS/IAM/image rollout remains separately verified and is not implied here.

Acceptance extends NED API TC005–007 and existing Core/COM cases: generated and
injected keys, restart/reuse, invalid/missing/symlink/unsafe files, conflict and
concurrent bootstrap; CLI context/ownership; browser first/repeat/wrong/forgotten/
401/storage-failure flows; authenticated uploads/images/SSE with no token leakage;
Hub pass-through versus public-tunnel denial without a credential; native container
lifecycle and real Hermes workflow. Runtime/profile/project isolation and existing
model-provider setup remain mandatory regressions.
