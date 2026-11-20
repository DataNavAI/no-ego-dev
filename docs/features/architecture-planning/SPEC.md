# Architecture planning and maintained contracts

Status: implemented in the architect skill. Related issue: DataNavAI/no-ego-dev#177.

The architect turns product intent and code into maintainable technical contracts. Canonical instructions: [architect](../../../skills/architect/SKILL.md). Behavioral evaluation: [EVAL.yaml](../../../skills/architect/EVAL.yaml) and [scenario](../../../skills/architect/evaldata/README.md).

## Requirements

- Maintain an architecture document and API specifications under the target repository's `/docs`; reuse canonical documents and link them from contributor guidance.
- Update affected documents in the same change as architecture/API behavior and verify them against implementation and deployment evidence.
- Describe component responsibilities, persistence, background processing, resource ownership, security, failures and deployment topology. Separate implemented, deployed/enabled and planned behavior.
- Describe API authentication/authorization, requests/responses/errors, asynchronous status and idempotency. Use OpenAPI when appropriate and complementary protocol prose for streams/tunnels. Explicitly state when there is no exposed API.
- Preserve self-review defaults and authorization boundaries; this practice adds no independent review or deployment approval gate.

## Acceptance scenarios

### TC-001: Maintain architecture and API contracts with implementation

- Level / automation: manual; [architect evaluation](../../../skills/architect/EVAL.yaml).
- Preconditions: A repository with an API and a background controller, stale documentation and an explicitly disabled staging feature.
- Procedure: Apply the architect skill to an architecture/API change, compare generated `/docs` files against routes, controller and deployment configuration, and inspect contributor links. Repeat for a project without an exposed API.
- Pass evidence: Retained implementation/document comparison and agent transcript; static validation alone is not a behavioral pass.
- Cleanup: Remove only evaluation-owned disposable files.


Given a project with stale architecture and missing async API contracts, when the architect changes its worker/API design, then the same change updates the canonical `/docs` architecture and contracts from code and links remaining gaps to their tasks.

Given a controller implemented but not enabled in staging, when documenting the system, then the document identifies the intended controller responsibilities and explicitly distinguishes the disabled deployment state.

Given a project with no exposed API, when applying the skill, then its `/docs` documentation says so without inventing an API.

These are behavioral evaluation cases. Static skill validation and package checks verify structure, not successful agent behavior.
