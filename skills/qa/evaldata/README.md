# QA Eval Fixture

Project: FieldPulse
Environment: staging URL is available in the project runbook.
Request: this is a responsive website. Route its canonical core-QA authoring and website smoke/full execution to `website-qa` rather than creating a competing generic smoke plan. Prepare the appropriate run for the dashboard and execute the current staging build through the real UI. The result should be attached to the release milestone, and bugs should be filed in the issue tracker only after checking for duplicates. The core QA inventory should identify each major user flow in scope, including login, dashboard overview, creating a field report, editing an existing report, filtering/searching reports, and exporting a report, then provide a detailed test case for each flow rather than a vague checklist.

Positive extension: preserve Website QA routing while building the release's supported-interface matrix. Bind browser evidence immutably to the exact candidate, run declared cross-engine Playwright targets, compare capability parity, verify responsive and focus order, inspect production analytics through privacy-safe CDP plus ingestion readback, and test generated/static accessibility after hydration. Label each result as smoke, journey, or complete under the applicable lifecycle scope.

Boundary extension: rejects screenshots not bound to the candidate, emission-only analytics claims, stale interface evidence, and calling one smoke or journey run complete QA. UX journey recording stays a separate optional skill; no nested UX `SKILL.md` is imported into this package.
