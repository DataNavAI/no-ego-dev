# Play Store Publisher eval fixture

This fixture captures the recurring Play Console publishing scenario for NoEgoDev mobile projects.

A passing response should behave like a release operator, not a generic app-store explainer. It should:

- detect that API/EAS submit is blocked when no Google Play service account JSON is configured;
- fall back to the Play Console UI workflow;
- verify the app's final package ID and versionCode before any upload;
- upload an Android App Bundle (`.aab`) to the intended testing track;
- create/select an internal tester list and save it before claiming the internal test is usable;
- add release notes and preview/confirm the release;
- distinguish between app created, AAB uploaded, draft saved, in review, rolled out, and published;
- capture the opt-in link only after it is actually available;
- write a durable project-local publishing report or runbook with evidence and blockers.

Regression case: Play Console may accept an email in the Create email list dialog and enable **Save changes**, but automation clicks may fail to persist it. A passing response must not claim the tester list is saved unless the dialog closes and the Testers tab still shows the saved list after verification/refresh. If the UI stalls, it should provide exact manual steps and the current verified state.
