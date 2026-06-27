# Eval data for android-app-dev

## Scenario: Compose onboarding feature

A client asks for an Android onboarding flow with three Compose screens, API-backed signup, empty/error/loading states, and copy matching the new project UI guideline. A passing android-app-dev response should:

- Require the PRD, tech spec, and UI guideline/feature UI brief before coding.
- Refuse to invent UI behavior if the guideline is missing; create a `ui-designer`/project-manager follow-up instead.
- Map acceptance criteria and UI states to Android tasks.
- Mention likely Gradle checks such as `test`, `lintDebug`, `assembleDebug`, and `connectedDebugAndroidTest` when a device/emulator exists.
- Require emulator/device/preview/screenshot evidence or an explicit QA follow-up if device testing is unavailable.
- For any Play Store, internal testing, or publishing handoff, require the release candidate to be installed and QA-smoked on an Android emulator first, with emulator/API/build artifact/pass-fail evidence; block publishing and create a QA/release issue if emulator QA is unavailable, skipped, or failing.
