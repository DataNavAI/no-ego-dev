# Eval data for product-manager

Static fixture for deterministic evals.

Positive scenario — single-audience visual MVP: LaunchPad Lite is a user-facing SaaS MVP, not merely a prototype, that helps indie founders publish a simple product-launch page and collect signups. Stakeholders previously approved a clickable prototype, but the current request is for a real MVP users can use after launch.

Existing product context:
- Core value: help founders validate demand quickly with a clean launch page and signup funnel.
- Primary critical user journey: create launch page → publish → share link → collect signups.
- Feedback sources available: in-app feedback link, support email, Telegram beta group, GitHub issues, and short post-signup survey.
- Current analytics are incomplete: page views and signup counts exist, but publish-state confusion, signup-form errors, activation, and retention are not instrumented yet.
- Deployment expectation: MVP should run at a hosted production URL with deploy/rollback ownership, basic monitoring/logging, persistence for pages and signups, support/feedback intake, and QA gates for create page, publish, share link, collect signup, and manage signup data flows.
- Current raw feedback examples:
  - One user asks for "AI-generated animated backgrounds".
  - Five beta users say they cannot tell whether their page is published or still draft.
  - Two users report the signup form returns a 500 error.
  - One user asks for a full CRM.

A good product-manager response should define the PRD artifact, explicitly classify the work as an MVP rather than a prototype, plan a fully working and serviceable core product with a real deployment/release target, add deployment/support/monitoring/rollback/QA gates, add a daily feedback review loop, define product metrics tied to the primary critical user journey, route signup 500 reports as bugs, identify the repeated publish/draft confusion as a core-value aligned product problem, and avoid acting on one-off feature requests like animated backgrounds or a full CRM unless later evidence shows a repeated core problem. It should include activation/funnel metrics such as create page → publish → share link → signup, identify missing analytics instrumentation as follow-up work, name where metrics will be reviewed, and specify what regression or drop-off should trigger product work.

Positive extension: because LaunchPad Lite is a suitable single-audience MVP with a material visual interface, prefer one problem and exactly one primary CUJ, classify scope into must-ship, manual/internal, and parking lot, and present visual mock options before PRD freeze. Maintain the supported-interface registry with executable coverage, define stable analytics and canonical terminology, and connect feedback-to-work. Demand research uses Google Trends as relative signal with caveats plus ranked source coverage. A paid smoke has explicit consent, budget, qualified conversion threshold, and stop-loss.

Boundary extension: rejects paid smoke execution without approval, unsupported or stale interface evidence, silent metric redefinition, and stale PRD/mock/QA authority after a scope reset. Independent review has no fixed round limit: Round 4+ uses approval-convergence mode and cannot approve by exhaustion.

Boundary scenario — multi-sided regulated workflow: define an MVP for a regulated prior-authorization service in which a clinician submits evidence, a payer reviewer requests or approves information, and a patient receives the decision. The product cannot deliver compliant value through one role alone. The response should define the smallest complete set of co-primary role journeys, name approval/data/state transitions, and verify cross-role handoffs end to end; it should not force exactly one primary CUJ merely to simplify scope.

Boundary scenario — non-visual API/backend/CLI: define an MVP for a headless policy-evaluation API with a companion CLI and no dashboard or other material visual surface. The response should use interface examples/contracts—such as schemas, request/response cases, command/output/error transcripts, and executable contract tests—instead of visual mock options. It must not block PRD freeze merely because visual tools are unavailable.
