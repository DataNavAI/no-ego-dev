# Static-to-database migration for static-generated products

Use this reference when a static-generated site needs a database-backed content or metadata system without breaking production.

## Safe vertical slice

1. Keep existing static routes and source JSON working until the database path is proven.
2. Add a pure canonical model module that normalizes legacy records into the future DB shape.
3. Generate type-specific canonical detail pages from the model so product UX can ship before live DB writes.
4. Add dry-run seed/ingest/discovery scripts that emit preview JSON when table env vars are absent.
5. Add scheduled workflows in dry-run/readiness mode first; do not require live writes for the public deployment.
6. Expose health/schema counters for canonical record counts, table-name configuration, and last-run status.
7. Only enable live writes after IAM/table/index permissions are verified.

## Schema checks before implementation

- Detail pages need direct lookup keys: prefer `pk = CONTENT#<contentId>`, `sk = METADATA`, plus a slug lookup GSI for route resolution.
- Time/type feeds need `TYPE#<contentType>` + time sort keys.
- Moderation needs separate publish and verification concepts: `publishStatus`, `verificationStatus`, and `sourceConfidence` should not be collapsed into one `status` field.
- Multi-artist content needs fan-out index records, e.g. `pk = ARTIST#<slug>`, `sk = CONTENT#<time>#<contentId>`, one row per artist.
- Ingestion needs ops records (`INGESTION#content`, `INGESTION#artists`, `LATEST`, `RUN#<timestamp>`) so health can prove freshness.
- Artist metadata source-of-truth records should source major clusters separately: agencies, members, official links, lifecycle, and facts each need source refs/freshness/confidence.

## Deployment/IAM pattern

If CloudFormation cannot manage tables because the deploy principal lacks DynamoDB permissions, do not block the static user-facing deployment. Keep table names externally configurable (for example, `CONTENT_TABLE_NAME` and `ENTITY_TABLE_NAME`) and report the exact missing permissions. Minimum live-write permissions usually include table and index ARNs for `DescribeTable`, `GetItem`, `Query`, `Scan`, `PutItem`, `UpdateItem`, `DeleteItem`, and `BatchWriteItem`.

When live access becomes available, finish the whole chain before calling the migration complete:

1. Create/reset the external tables with the expected key schema, GSIs, PAY_PER_REQUEST billing, encryption/default backups, and PITR where appropriate.
2. Seed the content table, artist table, and any fan-out/ops records with real table env vars so scripts leave dry-run mode.
3. Store table names in CI/deploy secrets or variables.
4. Wire scheduled/manual ingest/discovery workflows to pass AWS credentials/assumed role, region, and table-name env vars.
5. Wire the production deploy workflow/CloudFormation parameters so App Runner receives the table names.
6. Grant the App Runner instance role access to the externally managed table/index ARNs; CI write access alone is not enough for runtime health/API features.

## Verification

Run syntax checks for model/seed scripts, full tests/build, dry-run seed/ingest/discovery commands, CloudFormation template validation when infra changes, deploy workflow watch, live health endpoint, representative canonical detail pages, and generated data JSON field checks.

For live database activation specifically, verify with:

- `Scan --select COUNT` on each table after seeding; do not rely on immediate `DescribeTable.ItemCount`, which can lag and show `0` after successful writes.
- At least one direct primary-key lookup and one feed/index query for the content table.
- Artist table count and representative artist record scan/query.
- Scheduled workflow dispatches for ingest/discovery and watched successful run IDs.
- Production health showing table envs configured, not just local seed success.
