---
name: product-dashboard-evaluator
description: Evaluate a real product dashboard before claiming it is delivered, after a change, or when its metrics, freshness, layout or NED publication are questioned. Reconcile source numbers, exercise periods and failures, and verify actual private Dashboard rendering.
version: 0.2.0
metadata:
  hermes:
    tags: [product-metrics, dashboards, evaluation, no-ego-dev]
---

# Product dashboard output evaluation

Evaluate the running output, not the developer's confidence or a screenshot alone. Keep this evaluation read-only unless explicitly asked to repair; never alter a production source to create test data. Use synthetic fixtures for destructive failure/late-event tests. A new session/reviewer is useful when available; do not transfer an approval across changed app/source definitions.

## Inputs and authority

Identify the exact project, dashboard code/data revision, app process, NED registration ID/revision, source/metric contract and delivery target. Read `dashboard/METRICS.md` and the runbook. Missing identity, qualifying activity, conversion meaning, timezone, exclusions or coverage is an unresolved correctness finding, not an invitation to invent a definition. Obtain only the source access needed for reconciliation; preserve existing approvals and private credentials.

## Numeric reconciliation

Independently calculate expected daily distinct users and conversions from a bounded authorized sample. Do not call the dashboard's aggregation helper to calculate its expected output. Check:

- repeat users and repeated events; conversion unit (events or distinct converters);
- bot/internal/test exclusions consistently applied;
- reporting timezone and events across midnight;
-7/30/90/custom inclusive date boundaries and validation of reversed/invalid dates;
- complete zero days versus unknown/missing days, empty data and partial current day;
- period summaries: summed DAU is not unique users; rate denominator/window is explicit and zero denominator is N/A.

Record expected and observed values and query/time boundaries, without raw identities or credentials. If source access is unavailable, mark reconciliation NOT VERIFIED; do not call the dashboard source-correct.

## Data path and operability

For direct data, check limited read-only access, parameterized bounded queries/timeouts and visible errors. For sync, inspect the actual owned schedule and last run, run a test-owned retry twice, check no duplicate rows, simulate source failure only with synthetic resources and confirm last-good data survives. Verify last-success, data-through, stale/error status are distinct; a recent HTTP response is not proof of fresh data. Check source checksum/no writes where applicable. Confirm app/sync ownership, persistent project location, restart procedure and truthful recovery limitations. Do not stop someone else's process.

## Rendered experience and private delivery

Use a real browser. Inspect desktop and narrow project panes/mobile,320px and enlarged text, not only a full-width screenshot. Before opening any details, inspect 320×760 and 390×760 CSS-pixel viewports. Record bounds and horizontal overflow: compact product title, period controls, exactly two primary metrics (DAU/conversions), and one trend chart must be visible without scrolling. With shared count units, verify both series in that one chart. Reject marketing heroes, welcome sections, logos/branding, navigation/breadcrumbs, oversized headings, redundant cards and raw logs. Daily rows and definitions start collapsed and remain keyboard accessible; open them to reconcile exact values. A short freshness line and any material source/coverage failure stay visible. Do not hide failures merely to fit. Both required trends must be legible with accessible values/table. Exercise period controls, custom dates, empty/error/retry and freshness notices; check keyboard focus and overflow. Look for chart axis/scale/unit errors and screenshots that show stale values while requests failed.

Run `ned dashboard status --project /absolute/product --json` in the same runtime context. Match project, app ID/revision and current listener. Then actually open the NED Dashboard tab and interact with its private app frame. Localhost status, a standalone tab, a registration or an HTML file is insufficient evidence of embedded delivery. On Hub, verify the real authenticated public URL and negotiated capability. Report older-Hub unsupported delivery honestly. Confirm the working Preview and another project remain intact after dashboard publication/replacement.

Check browser responses/assets/storage/URLs for source credentials and raw user identifiers. Check the app cannot access parent COM DOM/control APIs, NED bearer tokens or other projects. Do not print secrets while checking. Shared NED transport tests provide generic security coverage, but do not replace checking that this app is using the correct isolated delivery.

## Report and repair

Write `dashboard-evaluation.json` in the evaluated workspace (or the user-specified report path):

```json
{"result":"pass|fail|not_verified","project":"product","registration":{"id":"observed","revision":1},"checks":[{"name":"daily active users","expected":"source-derived aggregate","observed":"actual app value","result":"pass|fail|not_verified","evidence":"redacted artifact or command reference"}],"issues":[{"severity":"blocking|minor","problem":"user impact","evidence":"observed result","fix":"smallest repair"}],"limitations":[]}
```

Use real values in reports; this example is a shape, not a pass. Mark pass only after all required correctness, period, freshness, mobile first-screen, privacy and delivered-rendering checks have evidence. Distinguish product defects from unavailable verification. A missing source/Hub/browser remains not_verified unless it proves a failed requirement. Give the user a brief result and material findings; keep detailed evidence in the report. If repairs are authorized, fix the smallest complete set, then re-evaluate the changed output with fresh source/rendering evidence. Never weaken expectations, edit a trusted verifier or replace unknown data with zeros to obtain a pass.

This self-contained skill is evaluated against a deliberately flawed synthetic app in [EVAL.yaml](EVAL.yaml). Do not mistake fixture-only success for real product acceptance.
