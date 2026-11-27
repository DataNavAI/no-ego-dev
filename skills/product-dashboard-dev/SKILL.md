---
name: product-dashboard-dev
description: Build and publish a product dashboard in NED when a user requests one or accepts a suggestion after asking about product metrics. Use also for DAU or conversion questions to offer a reusable dashboard without starting unrequested work.
version: 0.1.0
metadata:
  hermes:
    tags: [product-metrics, dashboards, no-ego-dev]
---

# Product dashboard development

Turn an authorized product-metrics question into a source-correct web app running inside the user's NED instance. Keep product analytics separate from NED's own work progress. Read this skill's [metric contract](references/metric-contract.md) before writing source queries.

## Trigger and permission

- An explicit request to build/update a dashboard authorizes the ordinary reversible project work needed to do it. Preserve permissions already established in the session.
- On a DAU/conversion/product-metric question, answer what the evidence supports, then briefly offer to build a dashboard. A suggestion is not acceptance: do not create app files, servers, sync jobs or registrations solely for the offer. Wait for acceptance.
- Identify the active product/project from NED context. Ask one focused question if it is ambiguous. Do not build a dashboard for NED itself when the user meant their product.
- Record development work in the project's selected tracker, preserving ownership. Do not create duplicate trackers or make live-provider/production changes merely to run a synthetic evaluation.

## Establish the metric contract

Inspect existing product definitions, analytics events, schema and known source coverage first. Record them in the project's `dashboard/METRICS.md`: product, authorized source, identity, qualifying activity, conversion event/filter and unit, eligible population/window if rates are shown, timezone, bot/internal/test exclusions, coverage, late-event policy and source/query limits. Ask for missing business definitions; do not guess conversion from an arbitrary database column. Distinguish verified zero from missing data and current-day partial data.

Default periods are7/30/90days plus a custom inclusive date range. Show daily active users and conversions as daily trends. Summed DAU is user-days, never period-unique users. Do not add revenue, retention or churn unless requested. Use the product's established timezone; otherwise agree a timezone and label it.

## Choose the smallest data path

1. Reuse existing analytics/source drivers with least-privilege read-only credentials. Keep queries parameterized, bounded and server-side with timeouts. Verify read access without displaying secrets. For SQLite, open `file:…?mode=ro` with URI mode; `PRAGMA query_only` alone is not a read-only credential boundary. For PostgreSQL use a limited role, read-only transactions and statement timeouts.
2. When live queries are costly or unreliable, run a named, owned scheduled job that writes aggregate-only SQLite under this project. Update transactionally by day, recomputing an overlap window for late events. Repeated sync must not append duplicates. Preserve last-good data on failure and separately retain last-success, data-through and the current sync error. No model call is needed to execute a deterministic sync.
3. Use the existing secret store by key/private-file reference. Never place source credentials in source control, static assets, client storage, URLs, command arguments, metrics responses or reports. Do not copy full user profiles or grant source write permissions.
4. If access/definitions/coverage are unavailable, report the limitation and keep the result unpublished or explicitly incomplete. A polished graph is not evidence of valid data.

## Build and verify the app

Use the project's stack if suitable. For a small new app, locally bundled, pinned Chart.js is a maintained MIT option; category day labels avoid a date-adapter dependency. Reuse another maintained existing chart library when appropriate. Never depend on a public CDN for the delivered dashboard. Follow the project's design system; NED defaults to the compact neutral Base/Muse language. For a materially new product-specific design, show visual alternatives and confirm the direction before freezing it.

Show product/period/timezone, two readable daily trends, exact accessible values/table, last successful refresh and data-through. Use brief status notices for missing/stale/error/partial data. Offer7/30/90/custom dates; reject invalid or reversed ranges clearly and bound expensive requests. A conversion rate needs a stated denominator and returns N/A for zero eligible users. Make charts usable at desktop, narrow panes,320px and enlarged text. Do not send raw user IDs/events to the browser just to draw aggregates.

Run numeric checks independently from the rendered summary against a small authorized source sample. Exercise duplicate users/events, exclusions, day boundaries, unknown vs zero, partial current day, empty range, source failure and retry. With a cache, actually run sync twice and inject a test-owned failure without touching production data. Ask the output-evaluation skill to evaluate the real app and fix material findings before claiming completion.

## Run persistently and publish

- Keep app code/data under the persistent registered project, not `/tmp`, installed skills, NED source or a model credential directory. Bind only `127.0.0.1` on an agent-selected non-control port. Do not expose a Docker port, create a public tunnel or deploy the product to make the dashboard visible.
- Use the runtime's supported background/service mechanism and retain its owned job/PID/log identity. Current Hermes terminal supports `background:true,persist_on_release:true` for this user-requested long-lived app. Check the installed tool schema rather than inventing flags. This survives conversation cleanup, **not container restart**. Prefer an existing project supervisor/boot service when available; otherwise record the exact restart command and disclose the restart requirement. Do not claim automatic recovery that was not configured and tested.
- Sync jobs must be durably scheduled and owned when the chosen data path requires them. A foreground loop or a written cron example is not a running schedule. Reuse the existing scheduler; do not silently add paid agent/model jobs for deterministic ETL.
- Wait for actual HTTP readiness and inspect the rendered app. Run `ned dashboard --help`, then:

```sh
ned dashboard status --project /absolute/product --json
ned dashboard register --project /absolute/product --port 4300 --name "Product analytics" --json
ned dashboard status --project /absolute/product --json
```

Choose the real available port;4300 is illustrative. A new project may need registration; `register` initializes project metadata, never goals/tasks. Status of an unregistered project may explain initialization is needed. Preserve the same runtime home/database/API selection throughout. Never switch home or fall back after a configured API/context failure. On an existing dashboard, read its revision and use `--replace --expected-revision N` only for an intentional replacement. After an ambiguous result, read status before any retry. Never call `ned preview register` for a product dashboard: it would replace the working-app Preview.

- Open the actual NED Dashboard tab and verify the app frame's project, content and interactions. API `available` only means HTTP responded. An instance-local localhost URL is not accessible from a remote user's computer. Hub access requires negotiated dashboard delivery; if the Hub reports unsupported, state that limitation instead of claiming delivery.
- Keep `dashboard/RUNBOOK.md` with start/stop/restart/sync commands, owned process/job identities, private log locations, credential **key names only**, freshness policy and unregister procedure. Verify after any restart.
- For removal, read the observed revision, use `ned dashboard clear --project … --expected-revision N`, then stop only this dashboard's owned app/sync job. Preserve product/source data, other project dashboards and Preview.

## Completion

Say what product and metrics the user can inspect, reporting timezone/data-through, whether data is direct or synchronized, actual Dashboard delivery and any restart/source limitations. Link the metric contract and short evaluator report. Do not mark work done on a registration, screenshot, written schedule or unexecuted test alone.

References: [Chart.js accessibility](https://www.chartjs.org/docs/latest/general/accessibility.html), [responsive charts](https://www.chartjs.org/docs/latest/configuration/responsive.html), [Python SQLite URIs](https://docs.python.org/3/library/sqlite3.html#how-to-work-with-sqlite-uris). This skill's realistic scenarios are in [EVAL.yaml](EVAL.yaml); no real credentials/data are bundled.
