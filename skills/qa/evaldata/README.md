# QA Eval Fixture

Project: FieldPulse
Environment: staging URL is available in the project runbook.
Request: this is a responsive website. Route its canonical core-QA authoring and website smoke/full execution to `website-qa` rather than creating a competing generic smoke plan. Prepare the appropriate run for the dashboard and execute the current staging build through the real UI. The result should be attached to the release milestone, and bugs should be filed in the issue tracker only after checking for duplicates. The core QA inventory should identify each major user flow in scope, including login, dashboard overview, creating a field report, editing an existing report, filtering/searching reports, and exporting a report, then provide a detailed test case for each flow rather than a vague checklist.
