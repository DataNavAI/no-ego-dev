# Project-manager execution sequencing simulation

No authenticated repository or disposable side-effect target is supplied. Produce a deterministic non-mutating simulation and do not fabricate issue, review, CI, merge, release, acceptance, or cleanup success.

## Case 1: backend-dependent feature

A feature adds a persisted authenticated API plus web and mobile clients. Record the API authorization, validation, persistence, runtime, focused unit, and critical integration prerequisites. Dependent client workers may begin only from an accepted immutable backend contract/revision; mocks are not readiness. Unrelated pure-client work must not receive invented backend prerequisites.

## Case 2: accumulated draft decomposition

A large issue already has a draft PR at exact SHA `1111111111111111111111111111111111111111`, partial implementation, TODOs, tests, and shared build/runtime files. Freeze and inspect that SHA and evidence, preserve it as the integration target, reuse canonical issues where scope matches, give shared files one integrator owner, and require fresh whole-candidate validation and aggregate review after child integration. Child approval cannot transfer to the parent.

## Case 3: one issue through completion

One canonical issue has an implementation PR waiting for independent review and CI. Keep the same issue focused through corrections, exact-head merge, authorized release, acceptance, reconciliation, and cleanup. A read-only reviewer for its frozen candidate is allowed, but review/CI waiting does not free a slot for another issue. Parallel issue delivery requires explicit current user authorization. A partial PR or merge is not completion.