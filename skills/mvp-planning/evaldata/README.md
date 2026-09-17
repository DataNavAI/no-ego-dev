# MVP Planning Eval Fixture

## Scenario

A new product targets independent home-care nurses who coordinate patient visits through texts and spreadsheets. The clearest user problem is losing time and confidence while turning a changing list of visits into a workable daily schedule.

Stakeholders have requested route optimization, team chat, payroll, CRM, AI visit summaries, patient billing, inventory, analytics dashboards, native iOS and Android applications, and a web admin portal. These requests intentionally exceed a credible first MVP.

This is an explicit **non-mutating deterministic simulation**, not evidence of a live repository or tracker operation. Treat this fixture as the complete modeled issue graph and implementation/test snapshot: it contains dependency-heavy launch, migration, provider, and duplicate QA children, while static status documents may be stale. The response must not claim live access. It must classify every modeled open child exactly once as must-before-user-testing, simplify/merge, defer-post-validation, or close/supersede, and name retained outcomes, simpler replacements, dependency rewrites, and evidence triggers. A production run with verified repository and issue coordinates must inspect those sources directly before acting.

The current website also contains scheduling, inbound lead-intake, and education hypotheses. A passing plan gives the site one coherent promise and one primary CUJ, classifies other routes as necessary support, shared foundation, beta, or reserve, keeps route attribution independent, and avoids a homepage experiment chooser. Staff handoff is unresolved: the plan must schedule decision-gated discovery for routing, minimum permitted data, per-channel consent, authoritative lifecycle states, warm-item next action/due time, operating-hours fallback, and a synthetic contained pilot. The session does not authorize sensitive-data access, production outreach, direct booking/payment, or live payment tests; payment testing needs an approved sandbox or controlled transaction and cancellation/refund procedure.

The detailed staff workflow applies here only if the selected scope makes staff conversion a material part of a selected CUJ; it is not a universal MVP requirement. If applied, plan a 60–75 minute session around routing, minimum capture/contact policy, lifecycle authority, only the material inbound sources, contained-pilot evidence, and owned unresolved decisions. Stakeholders can provide only 30 minutes initially, so the plan must use a 20-minute decision core plus 10 minutes for examples and unresolved-owner assignment rather than compressing the full question bank. A self-service alternative whose selected CUJs do not depend on staff conversion should use the lighter normal planning path instead.

A passing response must choose one key user problem, exactly one primary CUJ, and at most two truly necessary supporting CUJs. It should cut or park capabilities that do not enable those journeys. A reasonable primary journey could be: import or enter today's visits → resolve required schedule details → produce a usable ordered daily plan → confirm the nurse can begin the route. The eval does not require that exact solution, but it requires an equally narrow end-to-end value path.

A passing response must also label the product stage and distinguish the purpose, storage expectations, and exit evidence for a prototype, PoC, and MVP. For this scenario the target is an MVP: real user/business data must use a deployment-persistent database or equivalent durable managed store that survives redeployments, restarts, and instance replacement. A local file, in-memory store, container filesystem, or ephemeral platform volume may be used only for disposable prototype/PoC data and must not silently carry into the MVP. The plan must name a persistence-readiness task covering schema/migrations, backup/restore, monitoring, ownership, and rollback.

The UX plan must derive screens and states from selected CUJ steps, minimize actions and choices, use one primary job per screen, and avoid a broad dashboard/navigation system unless necessary. Simplicity must not remove required accessibility, privacy, loading, empty, error, success, and recovery states.
The QA plan must include a CUJ traceability matrix, executable automated coverage for the primary journey when technically feasible, focused tests for critical rules and persistence, a zero-context manual smoke case, supported-interface-specific evidence, and release-blocking behavior for missing/stale/failed/blocked core coverage.

Structured analytics is not mandatory for this first MVP. The plan must choose whether measurement is not yet required, one minimal learning signal is needed, or growing-product analytics controls apply, and justify that choice from the product contract and release decision. A broad analytics dashboard remains parked scope.

The durable MVP plan should cross-link artifacts that already exist and name explicit planned paths and owners for missing PRD, CUJ, UI, tech, task, and QA artifacts. It should not create empty documents solely to make a link table look complete.

## Failure indicators

- Treating the stakeholder wishlist as the MVP backlog.
- More than three CUJs or no clearly marked primary CUJ.
- Multiple unrelated personas or problems.
- A screen inventory without CUJ-step mapping.
- A dense dashboard, admin portal, or multi-platform plan before proving the core value path.
- Requiring cohort analytics or a dashboard without a named product-contract or learning-decision need.
- Unit tests without end-to-end CUJ coverage.
- Manual QA described only as `test the app`.
- Calling a local demo an MVP without serviceability, deployment, support, recovery, and ownership.
