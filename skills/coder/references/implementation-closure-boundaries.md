# Implementation closure boundaries

Use this matrix for general implementation work:

| Boundary | Required proof |
|---|---|
| Current base/head | Authenticated refs, overlap classification, final merge result, identity-invalidated checks, fresh review. |
| Untrusted model | Separate bounded process, closed schema, timeout/output limits, denied authority by default. |
| TTY/auth | TTY preflight, hidden input discipline, echo restoration, non-secret account readback. |
| Validator | Missing/malformed/ambiguous/stale hostile cases fail closed. |
| Durable write | Expected prior state, atomic commit, external readback, idempotent recovery/rollback. |
| Evidence | Authoritative source identity, retrieval time, transformation, consumer, executable check. |
| Consumer parity | Producer and every build/runtime/export consumer share tested semantics. |

Provider-specific commands are examples only and require a matching repository contract.
