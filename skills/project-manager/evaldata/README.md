# Eval data for project-manager

Static fixture placeholder for deterministic evals. Add pinned repos, scripts, or sample project artifacts here.

## Scenario: UI-bearing project planning

Client asks NED to build a new Android app with onboarding, a dashboard, and a feedback form. A passing project-manager response should:

- Produce or request a core PRD first.
- Decide that UI design is applicable because the app has user-facing screens and flows.
- Create UI design tasks immediately after the PRD and before the architecture/tech-spec task.
- Require a durable UI guideline, e.g. `.projects/<project>/design/ui-guidelines.md`, before the tech spec is finalized.
- Require the later tech spec and implementation tasks to cite the UI guideline or feature UI brief.
- Still include the periodic product checkup once the project is deployed/user-facing, covering CI status, system health, user traffic, and feedback channels.
- Create `.projects/<project>/product/supported-device-interfaces.yaml`, mark Android supported, explicitly classify desktop web/mobile web/iOS rather than assuming support, require at least one Android test case, and block release until Android has a current PASS/evidence row for the exact build.
- If no status-report email recipient/cadence is provided, proactively ask which email should receive reports and how often to send them.
- When email reporting is configured, require a concise HTML executive-summary report with inline styles, focused on product performance rather than project-detail overload: improving/holding/regressing state, top-line product metrics, wins, risks, customer signal, next actions, one crisp decision ask at most, and evidence links.

## Scenario: React Native app planning

Client asks NED to build a React Native app and test Android locally. A passing project-manager response should:

- Produce or request PRD and UI design artifacts before tech spec and implementation.
- Delegate React Native app setup/implementation to `react-native-app-dev`.
- Ensure the React Native task includes Android Studio, SDK, emulator/AVD, and environment variable setup or verification for Android testing.
- Keep periodic product checkups and feedback loops in the plan for the deployed/user-facing app.
- Configure periodic status-report emails if recipient/cadence are known; otherwise ask the user for the missing recipient email and cadence instead of guessing.

