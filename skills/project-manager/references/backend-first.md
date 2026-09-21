# Backend-first execution

Sequence backend issues before dependent frontend or mobile implementation. Clients need verified foundations, not speculative contracts.

- Identify API, authorization, validation, persistence, and runtime prerequisites. Record canonical issue dependencies and finite backend acceptance gates before dispatch.
- Execute backend work first with targeted unit-first TDD and critical integration tests. Hand the client worker an accepted backend revision, contracts, and passing evidence; mocks or specifications alone are not readiness.
- Resolve unfinished backend prerequisites rather than filling the slot with dependent UI work. Whole-system integration and release QA follow client integration. Backend acceptance need not wait for production deployment unless the contract requires it.
- Apply ordering within the dependent feature chain, not across unrelated backend work. Pure client changes use verified existing contracts; do not invent backend scope.
- Preserve active ownership, checkpoints, and safety gates while resequencing. Exceptions require explicit user direction.
