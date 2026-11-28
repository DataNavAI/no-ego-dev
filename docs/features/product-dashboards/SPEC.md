# Feature: Product dashboards

Status: implemented
Related issues: [NED #289](https://github.com/DataNavAI/no-ego-dev/issues/289)

## User outcome and scope
Product owners ask NED to build a dashboard, or accept its suggestion after a product-metric question, then inspect the running app in the existing Dashboard tab. A product dashboard is a project-owned local web app, separate from the working-app Preview and the NED control origin. The development skill builds and operates the app; the evaluation skill checks its numbers, rendered behavior and publication. Core publishes apps, not arbitrary SQL or shell commands.

Implemented scope: one dashboard per registered project, at most32 per instance; authenticated API/CLI; local and capability-negotiated Hub delivery; daily active users and conversions for7/30/90days and custom inclusive date ranges; direct read-only source access or an idempotent scheduled aggregate sync. Preserve the existing project-work progress view until a product dashboard is published. Product-specific metric definitions and data access are established when creating each dashboard. Synthetic fixtures verify the platform; a live product is selected separately.

Non-goals: a hosted BI service, public sharing, a SQL editor, generic process execution APIs, new analytics tracking on the product, automatic production schema changes, billing/retention/cohort features, or fabricated metrics. Existing Preview and project task tracking remain independent.

## Requirements
- FR-001: The development skill triggers on explicit dashboard requests and product metric questions. For a metric question, answer the question when possible and offer a dashboard; obtain acceptance before creating files, jobs, servers or registrations solely for that suggestion. Explicit dashboard requests already authorize this work.
- FR-002: Before building, record product, source, stable user identity, qualifying activity, conversion event/filter and unit (events or distinct users), timezone, exclusions and source coverage. Ask for missing business definitions. Never substitute requests/pageviews for DAU or silently invent conversions.
- FR-003: The app shows daily DAU and conversion trends for7/30/90days and a validated custom date range, clear period/timezone and accessible values/table. Mark partial current days. Zero requires known coverage; missing/unknown remains null. Never present summed DAU as period-unique users. Rate requires an eligible denominator/window; zero denominator is N/A.
- FR-004: Use existing source drivers and limited read-only access, with bounded parameterized server-side queries, or a project-local aggregate SQLite cache and an owned persistent scheduled sync. Sync is atomic/idempotent, reprocesses late-event overlap and preserves last-good data after failure. Display last successful refresh, data-through, stale/error states independently. Keep credentials and raw identities out of web assets, responses, logs and publication metadata.
- FR-005: Authenticated NED API v1 exposes GET/PUT/DELETE `/api/v1/dashboards/:projectId` and POST `/api/v1/dashboards/:projectId/access`. Use canonical registered project IDs. PUT accepts exactly `{port,name?,expectedRevision,replace?}`; DELETE `{expectedRevision}`; access `{mode:"frame"|"tab"}`. No URL, host, command, SQL or credential input. JSON bodies <=4096bytes; no query; mutations require exact Origin. Existing NED Host/auth/revocation checks apply before and after asynchronous work.
- FR-006: Registration is partitioned by selected home/instance and project, survives API/CLI restart and uses monotonic revision/CAS. Identical retries converge; changed stale writes/clear409; replacement requires replace:true. A dashboard never modifies another dashboard or the working Preview. Missing project404; unavailable filesystem/readiness does not recreate it. At most32 live registrations; capacity exhaustion fails without mutation.
- FR-007: The port is an integer1024–65535, excluding current API/gateway/control ports, including container bridge/public COM and Hermes dashboard ports. Probe only127.0.0.1 and require a project-owned listener for private delivery. Report available/app_error/stopped/unavailable truthfully; readiness is not a claim that metrics or rendering passed. Replacement/removal and listener identity changes revoke old app routes/grants.
- FR-008: `ned dashboard register|status|clear --project PATH [--api URL] [--database PATH] [--json]` calls the same APIs using the existing runtime/database context handshake and safe token loading. Register additionally accepts --port/--name/--replace/--expected-revision. No fallback after a configured API/context failure. Register initializes project metadata if necessary, never tasks/goals; reuse the persisted canonical-path project ID, including projects first registered by Preview. Status/clear require an existing project. Ambiguous mutations require status readback, not blind retries. Registration starts no app or job.
- FR-009: Embed via a separate generation-specific origin and one-time POST grants/HttpOnly scoped leases, reusing bounded app delivery. Never place NED bearer credentials in URLs, DOM/app content or browser app storage; never serve app scripts on COM's origin. Deny service workers and strip NED cookies/control authorization upstream. Container-local delivery uses exact generation hosts on the already published COM port; no random internal port is advertised and private HTTP/WS dispatch precedes control-header rewriting. Bootstrap/ready messages bind the configured public loopback COM origin. Auth loss, replacement, deletion and listener changes revoke delivery.
- FR-010: The existing Dashboard tab follows active project context and clears prior app immediately on project/auth changes. Stale responses cannot attach the wrong project. Retain work-progress fallback for an unpublished dashboard. Published apps get status/retry/open controls following the existing Preview visual language, responsive keyboard-accessible frame and no changes to Chat drafts, Goals, Artifacts or working Preview. An unavailable published app shows its failure, not a different app or fabricated metrics.
- FR-011: Hub delivery must preserve simultaneous Preview and multiple dashboard identities. Negotiate a bounded app-manifest capability, retain unchanged routes, revoke only removed/replaced apps, and enforce owner/session/generation isolation for HTTP/WS/grants/cookies. Older Hubs continue legacy Preview; dashboard remote delivery explicitly reports unavailable rather than borrowing its singleton route. Local embedding remains supported.
- FR-012: App process and optional sync job have durable owned identities, restart/run instructions and logs outside Git; verify after restart. The skill uses supported persistent background jobs/service mechanisms and does not claim that a foreground process or registration alone is durable. Source outages remain visible. Cleanup unregisters the observed revision and stops only owned app/jobs, preserving source/product data and unrelated processes.
- FR-013: The output-evaluation skill reconciles source-derived expected numbers independently, exercises period/date/empty/stale/error states, inspects desktop/narrow rendered UI, verifies no credential/identity leak, and checks API/CLI publication plus actual frame delivery. Report pass/fail with evidence; fail publication claims when only localhost status or a static screenshot was checked. Suggest repairs and re-evaluate corrected output.
- FR-014: Both skills are self-contained with EVAL.yaml/evaldata and discovery entries. A combined container workflow starts real Hermes with synthetic source data, builds/evaluates an actual dashboard, verifies it using CLI/HTTP/browser evidence, and tears down owned resources. Skill behavior is tested through live-agent evals, not prose assertions or helper-specific code tests. No live product/provider use is implicit in synthetic tests.

## Critical user journeys
### CUJ-001: Build, verify and publish a dashboard
Actor: product owner and agent; primary journey. Start with registered product context and authorized source access. User requests dashboard (or accepts suggestion), agent confirms metric definitions, builds app and source adapter/sync, starts persistently, evaluates, registers, reads back identity/revision, and user opens Dashboard. Success is source-correct interactive daily trends through authenticated frame delivery. Missing definitions/access stays explicit and unpublished; failed publication requires readback/recovery.
### CUJ-002: Inspect periods and recover
Actor: product owner. Start with published dashboard. Switch7/30/90/custom dates, inspect values and freshness, change projects, visit Preview/Chat and return. Reload after app/source interruption; see last-good/stale/error rather than invented zero. Success retains project identity, app privacy, draft and Preview state. Retry after app restart re-establishes a verified generation.
### CUJ-003: Replace or remove safely
Actor: agent/operator. Read current revision, update or clear owned project dashboard, reconcile uncertain results, stop owned processes/jobs when requested. Success revokes old grants/routes and preserves other project dashboards, Preview and source data. Stale and concurrent writes fail without clobbering a later generation.
### CUJ-004: Evaluate agent behavior in a disposable container
Actor: contributor/evaluator. Start without host Hermes, pass model credential path through the existing eval container interface. Seed synthetic source, ask real Hermes to build and evaluate, independently verify results and publication, then clean up owned container/volumes. Failed behavior is recorded, not converted into a pass by editing installed tools/evaluator.

## Detailed test cases
### TC-001: Authenticated registry, persistence and project isolation
- Journey / requirements: CUJ-001, CUJ-003 / FR-005–008.
- Level / automation: integration; [TC-001.test.js](tests/TC-001.test.js).
- Preconditions / fixtures: disposable selected homesA/B sharing a synthetic SQLite file, two registered projects, loopback app servers and NED listeners. Empty per-project revision0.
- Given: authorized app registrations with exact project identity.
- When: register A and B plus ordinary Preview; repeat, reopen API, replace/clear and race stale writers.
- Then: independent IDs/revisions persist; identical retry stable; stale changed writes409; removing A leaves B/Preview intact; B home reads none. Invalid auth/Origin/Host/query/JSON/unknown fields/ports/project/capacity fails with no publication. Stopped/missing project status is truthful and no folder is recreated.
- Steps and assertions: run named case; assert exact envelopes, monotonic revisions and no goals/tasks; use synthetic32-record boundary and distinct registered IDs. Compare state before/after denials.
- Cleanup: close servers/DB and remove only fixture roots. Pass evidence: named executable assertions, no skip/TODO.
### TC-002: CLI and private delivery lifecycle
- Journey / requirements: CUJ-001–003 / FR-007–009, FR-011–012.
- Level / automation: integration; [TC-002.test.js](tests/TC-002.test.js).
- Preconditions / fixtures: real child-owned loopback app under fixture project; known NED token in private fixture file; optional local protocol-faithful Hub fixture, no provider services.
- Given: ready app with a captured process/listener identity.
- When: register/status via spawned CLI, issue grants, bootstrap frame, read assets/API, clear and verify revocation. Test configured wrong context without fallback; reuse Preview-first project IDs; reclaim delivery capacity after another listener clears a registration.
- Then: separate origin and exact IDs; no control credential forwarded; grant single-use and unauthorized requests rejected; removal revokes; CLI prints truthful state and starts no process. Preview/dashboard coexist locally; negotiated Hub multi-app behavior is covered in the companion Hub integration suite. Shared transport expiry/listener/WS policies retain existing Preview regression coverage.
- Steps and assertions: verify HTTP and WS where inherited transport is used; validate malformed targets/manifests before changes, bounded counts and shutdown. Real hosted Hub acceptance remains separate live evidence.
- Cleanup: reap fixture children, close relay/Hub and remove synthetic homes. Pass evidence: exact output/status plus existing shared transport regression suite.
### TC-003: Project Dashboard UI and navigation
- Journey / requirements: CUJ-001–002 / FR-009–010.
- Level / automation: browser integration; [TC-003.test.js](tests/TC-003.test.js).
- Preconditions / fixtures: real served COM with synthetic projects, app registration/status/access responses and a rendered fixture app; existing work-progress fixture and a Chat draft.
- Given: Dashboard selected in desktop/mobile layouts.
- When: publish app, switch project during delayed access/status, reload access and forget authentication.
- Then: published app in the existing tab, no stale app/content on switch or auth loss, fallback before publication, retained draft and320px/200% toolbar reflow. Shared Preview tests cover unavailable/retry/new-tab and generic keyboard controls. No bearer URL/storage leaks.
- Steps and assertions: capture1280×900,390×844 and320×740; check actual iframe-ready identity rather than screenshot alone. Also run through the actual container adapter with differing internal/public ports: render both apps, verify WebSocket echo, foreign bootstrap/WS Origin denial, unknown alias denial, credential stripping, clear revocation, independent Preview and bounded shutdown while an app WebSocket stays open. Inspect captures against existing Base/Muse guideline. Auth restoration and stopped-dashboard recovery remain shared-controller acceptance rather than new direct assertions in this file.
- Cleanup: browser and servers closed; screenshots outside source. Pass evidence: browser assertions and inspected captures; actual Hub browser capture is live acceptance.
### TC-004: Real dashboard development and output evaluation
- Journey / requirements: CUJ-001–004 / FR-001–004, FR-012–014.
- Level / automation: manual; live-agent evaluation; [development skill](../../../skills/product-dashboard-dev/EVAL.yaml), [output evaluator](../../../skills/product-dashboard-evaluator/EVAL.yaml), [workflow](../../../workflows/product-dashboard/EVAL.yaml).
- Preconditions / fixtures: owned NED eval container, private model credential file, synthetic SQLite events/aggregates with duplicates, bots/internal traffic, midnight boundary, verified-zero and missing days, late events and zero eligible denominator. No real source credentials.
- Given: explicit create, unaccepted suggestion and accepted suggestion scenarios; direct and sync variants.
- When: real Hermes executes skill workflow; separate evaluator checks source reconciliation, rendered chart/table,7/30/90/custom periods, freshness/error states, source checksum, sync failure/retry and actual publication/cleanup.
- Then: exact independently calculated fixture counts, definitions/timezone/exclusions visible, no writes on mere suggestion, no sum-DAU-as-uniques, null unknowns/N/A zero denominator, last-good preservation and stable idempotent sync. Failed source/access cannot be described as delivered. Agent may not change trusted verifier/installed tools.
- Steps and assertions: run `npm run eval -- workflows/product-dashboard/EVAL.yaml --credential-file /private/model.json --provider PROVIDER --model MODEL --context CONTEXT --output-root /external/evidence`; retain redacted judge/verifier/browser results and process cleanup evidence. Run individual skill scenarios for suggestion/refusal and evaluator defect detection.
- Cleanup: runner removes owned container/volumes; source checksum unchanged; no credentials or runtime artifacts committed. Pass evidence: actual agent/judge plus post-agent verifier, not YAML parsing. Live product deployment is separately authorized and documented.

## Coverage and acceptance
| Requirements | Journeys | Cases | Evidence |
| --- | --- | --- | --- |
| FR-005–008 | CUJ-001,003 | TC-001,002 | TC-001/002 executable registry/CLI assertions |
| FR-009–011 | CUJ-001–003 | TC-002,003 | Local transport/browser assertions; Hub companion tests; hosted release NOT RUN |
| FR-001–004,012–014 | CUJ-001–004 | TC-004 | Both skill evals and combined workflow passed with real Hermes in owned containers |

All automated cases must pass; skill evaluations and rendered/live acceptance are reported separately. Unknown data is never zero, source access is read-only, and Preview is not overwritten.

## Open questions and coverage gaps
- Active-project scope is the implementation default; no instance-wide dashboard is added.
- First live product and its metric definitions/source access are not yet selected. Synthetic acceptance does not prove live product correctness.
- Hub companion #190 implements backward-compatible multi-app delivery. Public Hub deployment/acceptance remains separate; older deployed Hub capability is explicitly unavailable.
- Credential-free TC-001–003 and all three real-agent evals executed successfully during development. Merge, final-candidate checks and local deployment evidence belong to the release receipt; this spec alone does not establish delivery.

Live eval evidence (2026-11-27): development `ned-eval-bad9b1d05702fd88c677a04c`; evaluator `ned-eval-028434f6424dc7eb30105337`; workflow `ned-eval-e06a92f52725d9c7314c851b`. All passed with `cleanup_verified:true`; redacted reports remain outside Git. No live product correctness is claimed.

## Dedicated Dashboard view (#309)
FR-015: Dashboard is exclusively the active project's registered dashboard server, delivered through the existing private relay. Remove NED's built-in progress summary fallback; Goals owns work progress. No selection and no registration have distinct truthful empty states, with no grant request or iframe until registration is available. Existing TC-003 covers project selection, registered content, relay behavior and switching; communicator TC-041/062 cover empty state/navigation. FR-015 → CUJ-002 → TC-003 and communicator TC-063. Existing auth/host/grant constraints remain unchanged.
