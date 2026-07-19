# Eval data for product-manager

Static fixture for deterministic evals.

Scenario: LaunchPad Lite is a user-facing SaaS MVP, not merely a prototype, that helps indie founders publish a simple product-launch page and collect signups. Stakeholders previously approved a clickable prototype, but the current request is for a real MVP users can use after launch.

Existing product context:
- Core value: help founders validate demand quickly with a clean launch page and signup funnel.
- Primary critical user journey: create launch page → publish → share link → collect signups.
- Feedback sources available: in-app feedback link, support email, Telegram beta group, GitHub issues, and short post-signup survey.
- Current analytics are incomplete: page views and signup counts exist, but publish-state confusion, signup-form errors, activation, and retention are not instrumented yet.
- Deployment expectation: MVP should run at a hosted production URL with deploy/rollback ownership, basic monitoring/logging, persistence for pages and signups, support/feedback intake, and QA gates for create page, publish, share link, collect signup, and manage signup data flows.
- Supported device interfaces for launch: desktop web and mobile web. Native Android and iOS are planned but not supported for this release. The project does not yet have `.projects/launchpad-lite/product/supported-device-interfaces.yaml`; the response should create it from the bundled template and require at least one executable, release-candidate-specific QA case/result/evidence row for each supported web interface before deployment.
- Current raw feedback examples:
  - One user asks for "AI-generated animated backgrounds".
  - Five beta users say they cannot tell whether their page is published or still draft.
  - Two users report the signup form returns a 500 error.
  - One user asks for a full CRM.

A good product-manager response should define the PRD artifact, explicitly classify the work as an MVP rather than a prototype, plan a fully working and serviceable core product with a real deployment/release target, add deployment/support/monitoring/rollback/QA gates, add a daily feedback review loop, define product metrics tied to the primary critical user journey, route signup 500 reports as bugs, identify the repeated publish/draft confusion as a core-value aligned product problem, and avoid acting on one-off feature requests like animated backgrounds or a full CRM unless later evidence shows a repeated core problem. It should include activation/funnel metrics such as create page → publish → share link → signup, identify missing analytics instrumentation as follow-up work, name where metrics will be reviewed, and specify what regression or drop-off should trigger product work.
