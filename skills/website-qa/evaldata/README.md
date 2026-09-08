# Website QA Eval Fixture

Project: FieldPulse Web

The product is a responsive website used by field teams. Its accepted PRD defines these critical user journeys: sign in and recover access; review the dashboard; create and save a field report; edit an existing report; filter and search reports; export a report. The website supports current Chrome and Safari at 1440×900 and 390×844 viewports. The admin interface is supported only in desktop Chrome.

The existing QA notes contain `CUJ-1` for sign-in with `TC-1.1` and `TC-1.2`, then `CUJ-3` for creating a report with `TC-3.1`; `CUJ-2` was retired after onboarding changed. Do not renumber IDs to close that gap. Reconcile the notes into the recommended canonical core QA document and deduplicate overlapping dashboard checks. Adapt the document organization to what is useful for this product.

Release candidate: commit `abc123def456`, staging at `https://staging.fieldpulse.example`. This placeholder host is intentionally unreachable: this is a planning-only deterministic scenario, not proof that a browser run occurred. Unless actual browser evidence is obtained from a real reachable deployment, execution must be reported as `BLOCKED` or `NOT RUN`. Do not invent PASS/FAIL outcomes, screenshots, URLs, timestamps, console/network logs, or any other execution evidence.

This release changes shared authentication/session handling and dashboard navigation. Explain whether risk calls for full QA, enumerate the planned scope, define useful evidence and honest outcomes, and record the next full-QA trigger. Also explain what an emergency smoke run would contain and apply the guidance that FAIL takes precedence when an executed applicable P0 failed; otherwise use BLOCKED when an applicable P0 is blocked, unrunnable, or not run; use PASS only when all applicable active P0 passed. If no applicable active P0 exists for the required scope, report a BLOCKED coverage gap rather than PASS. Do not include P1/P2 in smoke.
