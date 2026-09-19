# Lifecycle system-of-record decision table

| Scope | Persistence and lifecycle requirement |
|---|---|
| Disposable prototype | May use disposable state only when labeled and excluded from production claims. |
| MVP | Durable system of record, schema/migrations, backup/restore test, retention, access, monitoring, rollback owner, and cost. |
| Growing/mature | Compatibility migrations, staged rollout, disaster recovery, observability, capacity, and retirement controls. |
| Security/privacy-sensitive | Managed controls first, auditable authority, minimization, retention/deletion proof, and stronger review. |
| Destructive/irreversible | Exact inventory, owner approval, rehearsal, backup, rollback or explicit irreversibility, and readback. |

Public identity changes require aliases/backfill, consumer migration, collision handling, deprecation, rollback, and removal evidence. Every handoff is committed to the repository with evidence timestamps and owners.
