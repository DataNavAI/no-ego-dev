# NED API v1 — coordination reference

The authoritative HTTP contract is now [NED API v1](../../api.md).
Coordination/task/automation operations use its `/api/v1/operator` family;
`/api/core/v1` remains a non-redirecting compatibility alias, not a separate API.

Core remains the implementation/ownership component. See [behavior](SPEC.md),
[execution design](DESIGN.md), and [system architecture](../../architecture.md).
