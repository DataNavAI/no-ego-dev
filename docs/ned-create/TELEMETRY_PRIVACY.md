# NED opt-in telemetry and privacy

Last researched: 2026-08-02

## Consent and control

Telemetry is disabled until a user explicitly runs `ned telemetry enable --yes` with all of:

- an HTTPS collector URL they own or administer;
- its **public project ingest key** (never a personal or admin API key); and
- the URL of the collector operator's published privacy policy.

Use `ned telemetry status`, `disable`, or `delete` at any time. Disable stops future events while
retaining the local installation identity in case telemetry is re-enabled. Delete removes
`~/.ned/telemetry.json`, including that random identity and all collector configuration. It cannot
erase events already accepted by a remote collector; the user-owned collector's privacy policy and
deletion process govern those records.

## Collector decision

PostHog is the recommended low-operations collector, but the CLI is configured by the collector
operator and does not ship an account or a real key. The reasons are:

- its documented HTTP capture API accepts a project ingest key and supports PostHog Cloud or a
  self-hosted endpoint;
- Cloud has US (`https://us.i.posthog.com`) and EU (`https://eu.i.posthog.com`) ingestion regions;
- the published pricing page currently includes the first 1 million Product Analytics events per
  month at no charge, making the expected low volume inexpensive;
- the current free plan states one-year data retention. Operators should choose the appropriate
  region before collection and configure a shorter **90-day retention target** when their plan or
  deployment permits it. NED itself cannot enforce collector-side retention.

Authoritative sources consulted on 2026-08-02:

- [PostHog capture API](https://posthog.com/docs/api/capture)
- [PostHog pricing and plan retention](https://posthog.com/pricing)
- [PostHog data storage/privacy documentation](https://posthog.com/docs/privacy/data-storage)

Cost, plan limits, and retention can change; collector operators must confirm them before enabling.

## Schema version 1

Only these event names can leave the CLI:

| Event | Boundary |
| --- | --- |
| `cli_create_started` | A non-dry-run create invocation starts |
| `cli_create_completed` | The workspace is bootstrapped, healthy, and activated |
| `cli_create_failed` | Create validation or operation failure |
| `cli_chat_completed` | The primary chat journey returns successfully |
| `cli_chat_failed` | Chat validation or operation failure |
| `cli_doctor_completed` | Doctor returns a health result |
| `cli_reset_completed` | Reset returns a health result |
| `cli_destroy_completed` | Destruction completes successfully |

Each request contains only:

- random installation ID (`distinct_id`);
- NED CLI version;
- OS family (`macos`, `windows`, `linux`, or `other`);
- allowlisted event name;
- allowlisted result class (`started`, `success`, `validation_error`, `operation_error`, or
  `health_check_failed`);
- coarse duration (`<1s`, `1-10s`, `10-60s`, `1-5m`, or `5m+`); and
- integer schema version (`1`).

The public project ingest key is request routing configuration, not event data. NED never adds
prompts, responses, workspace IDs, provider keys, usernames, paths, repository names, exception
messages, or arbitrary caller properties. Unknown events and result classes are rejected before
network access.

## Delivery and verification

Delivery is detached from product operations, uses the platform HTTP client, has a 250 ms timeout,
and swallows network, parsing, and collector failures so telemetry can never delay or fail a product
command. Configuration is stored locally
with owner-only file permissions. No queue, retry log, admin credential, or telemetry payload is
written to the package or workspace.

Run the deterministic event verification (it uses a local fake transport and no live account):

```bash
node --test tests/ned-create/telemetry.test.js
```

The verification asserts default-off behavior, affirmative consent, local deletion, every lifecycle
boundary, strict payload keys, forbidden-value exclusion, schema versioning, and bounded failure-safe
delivery.