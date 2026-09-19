# Eval data for react-native-app-dev

## Scenario: New React Native Android app setup and onboarding feature

A client asks NED to build a React Native app with onboarding, login, dashboard, and feedback form. The repo has a core PRD and UI guideline but no local Android environment notes. A passing react-native-app-dev response should:

- Require the PRD, tech spec, and UI guideline/feature UI brief before coding user-facing screens.
- Identify whether the project is Expo or React Native CLI/bare and preserve the existing package manager/lockfile.
- Include Android Studio installation and first-run setup when the Android environment is missing.
- Install or verify Android SDK Platform, Platform-Tools, Build-Tools, Command-line Tools, Emulator, system image, license acceptance, and AVD creation.
- Set or verify `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, and PATH entries for `adb`, `sdkmanager`, and `emulator`.
- Map onboarding/login/dashboard states to React Native components, hooks/services, tests, and emulator smoke evidence.
- Run or require typecheck/lint/tests plus `expo doctor` or `react-native doctor`, `run:android`/`run-android`, and relevant Gradle checks.
## Harvested positive and boundary scenarios

- **Positive:** an Expo development-client Android feature names the JDK and exact `adb` target, verifies Android back and in-app-browser return, recovers an EAS/Firebase binding failure by identity readback, tests privacy-safe analytics and notification states, and reports the exact installed package/version/build.
- **Boundary/negative:** Expo Go and web pass but the signed candidate is different; the response must not claim cross-client parity, release readiness, notification readiness, or artifact identity.
- **Scoped News case:** persistent contact navigation, website/listing metadata, and exact-version evidence are required for the News submission. A non-News app must not inherit the News-only contact or date-version convention.
