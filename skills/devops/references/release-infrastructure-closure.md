# Release and infrastructure closure

## Immutable receipt

Bind source commit, artifact/image digest, configuration and migration identity, environment, deployment run, live runtime identity, acceptance probe, and rollback target.

## Infrastructure adoption

Inventory retained resources and dependents, verify import support and exact IDs, obtain owner authority for destructive/import actions, execute an import-only fail-closed change, and read back ownership/retention before feature mutation.

## Separation of concerns

CI lanes have distinct triggers and authority. Infrastructure health, live product acceptance, content quality, and optional analytics forwarding are separate gates. Cross-repository delivery binds producer schema/digest to consumer repository/ref.

Review installer bytes and live CLI grammar before atomic activation. During provider outage, preserve evidence and distinguish unavailable verification from candidate failure; never weaken gates. Never import nested skill packages or unaudited secret scripts.
