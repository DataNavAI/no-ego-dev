# QA Eval Fixture

Project: FieldPulse
Environment: staging URL is available in the project runbook.
Request: prepare a smoke test plan for the dashboard and run the current staging build through the UI. The result should be attached to the release milestone, and bugs should be filed in the issue tracker only after checking for duplicates. The plan should identify each major user flow in scope, including login, dashboard overview, creating a field report, editing an existing report, filtering/searching reports, and exporting a report, then provide a detailed test case for each flow rather than a vague checklist.

Supported device interface registry: `.projects/fieldpulse/product/supported-device-interfaces.yaml` marks `web-desktop`, `mobile-web`, `android`, and `ios` as supported for this release candidate. The plan must include at least one executable case with a concrete target for each of the four interfaces. The run/report must show a separate PASS/FAIL/BLOCKED result and evidence row per interface against the exact staging build; any missing, stale, failed, or blocked interface must block deployment.
