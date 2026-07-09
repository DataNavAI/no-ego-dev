---
name: react-native-app-dev
description: "Use when setting up, implementing, testing, debugging, packaging, or reviewing React Native mobile apps, including Android Studio/SDK environment setup for Android emulator/device testing."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, react-native, mobile, android, ios, typescript]
    related_skills: [project-manager, product-manager, ui-designer, android-app-dev, play-store-publisher, play-store-cli, coder, qa, devops]
---

# React Native App Dev

## Overview

Build React Native apps with mobile-product discipline: start from the PRD, UI guideline/feature UI brief, and tech spec; set up a reproducible local Android/iOS development environment; implement the smallest coherent slice; and verify on a real emulator/device when user-facing behavior changes.

Use this for Expo or React Native CLI projects. React Native agents own JavaScript/TypeScript app code, native module integration, Metro bundling, Android emulator testing, iOS simulator testing when available, and release-build checks. Do not invent product or UI behavior just because a component library makes it easy.

## Inputs Required Before Coding

Gather these before implementation:

- PRD or issue with user problem, primary CUJ, acceptance criteria, and feedback path.
- Tech spec covering app architecture, navigation, API/data flow, persistence, authentication/session behavior, and platform constraints.
- UI guideline or feature UI brief for any user-facing screen, flow, state, copy, or interaction change. Default path: `.projects/<project>/design/ui-guidelines.md` unless the repo has a stronger convention.
- Framework mode: Expo managed/prebuild/dev-client or React Native CLI/bare.
- Package manager and Node policy: npm, yarn, pnpm, bun; expected Node version; lockfile to preserve.
- Target platforms: Android, iOS, or both; target OS/API versions; emulator/device requirements.
- Test expectations: unit, component, E2E, lint/typecheck, Android emulator smoke, iOS simulator smoke, release build.

If a feature changes UI and lacks a UI guideline/brief, create a blocker or `ui-designer` follow-up before finalizing implementation. If the environment cannot run emulators, still run non-device checks and create an explicit QA/device follow-up.

## Dev Environment Setup

Prefer project-local/versioned setup notes in `.projects/<project>/dev-environment.md` or the repo README. Record exact versions installed or required.

### macOS baseline setup

Use Homebrew when available:

```bash
# Core tooling
brew install node watchman git

# JDK for Android Gradle builds; use the version required by the project if specified
brew install --cask temurin@17

# Android Studio includes the SDK Manager, emulator manager, and useful debugging tools
brew install --cask android-studio
```

If the project pins Node, install/use that version with the repo's preferred manager (`nvm`, `fnm`, `asdf`, Volta) instead of upgrading globally. Never delete a lockfile or switch package managers casually.

### Android Studio and SDK setup for Android testing

1. Install Android Studio.
2. Open Android Studio once to complete first-run setup.
3. In **Settings/Preferences → Languages & Frameworks → Android SDK**, install:
   - Android SDK Platform matching the project compile SDK, e.g. Android API 35 or the repo's `compileSdk`.
   - Android SDK Platform-Tools.
   - Android SDK Build-Tools matching the project or latest stable required by Gradle.
   - Android SDK Command-line Tools latest.
   - Android Emulator.
   - Google APIs / Google Play system image for the target API if emulator testing is required.
4. Create at least one Android Virtual Device in **Device Manager**. Prefer a recent Pixel device image that matches project/test requirements.
5. Accept licenses:
   ```bash
   yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses
   ```
6. Verify tools:
   ```bash
   adb version
   emulator -list-avds
   ```

If using command-line setup instead of the Android Studio UI, install packages with `sdkmanager` after setting `ANDROID_HOME`:

```bash
sdkmanager   "platform-tools"   "emulator"   "cmdline-tools;latest"   "platforms;android-35"   "build-tools;35.0.0"   "system-images;android-35;google_apis;arm64-v8a"

avdmanager create avd   -n Pixel_API_35   -k "system-images;android-35;google_apis;arm64-v8a"   -d pixel_7
```

Use `x86_64` system images on Intel machines and `arm64-v8a` on Apple Silicon when available.

### Shell environment variables

Add to the user's shell profile (`~/.zshrc` on modern macOS) if missing. Adjust paths if Android Studio installed the SDK elsewhere:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home)
```

Reload the shell and verify:

```bash
source ~/.zshrc
java -version
node -v
npm -v
adb version
sdkmanager --list | head
```

### Project dependency setup

Inspect the repo before installing:

```bash
pwd
ls
node -v
npm -v
```

Then use the lockfile:

```bash
# npm
npm ci

# yarn
yarn install --frozen-lockfile

# pnpm
pnpm install --frozen-lockfile
```

Expo projects often use:

```bash
npx expo doctor
npx expo start
npx expo run:android
```

React Native CLI/bare projects often use:

```bash
npx react-native doctor
npx react-native start
npx react-native run-android
```

For iOS on macOS, verify Xcode separately when iOS is in scope:

```bash
xcode-select -p
sudo xcodebuild -license accept
cd ios && bundle install && bundle exec pod install && cd ..
npx react-native run-ios
```

Do not require Xcode for Android-only work.

## Implementation Workflow

1. **Orient**
   - Identify Expo vs bare/CLI, package manager, Node version, app entry points, navigation library, state/data libraries, native modules, and existing test setup.
   - Read PRD/spec/UI guideline and linked issues.
   - Run repo-specific doctor/check commands before changing files when setup is uncertain.

2. **Plan the change**
   - Map acceptance criteria to screens/components/hooks/services/tests.
   - Name affected platforms and native permissions/capabilities.
   - Identify all UI states: loading, empty, error, success, offline, disabled, permission denied, first-run, auth expired.

3. **Implement the smallest coherent slice**
   - Follow existing architecture and style. Do not introduce a new state manager, navigation pattern, or UI kit without spec approval.
   - Keep presentational components separate from data-fetching/business logic when the repo already uses that pattern.
   - Use project design tokens/theme/components before adding new styles.
   - Keep user-visible text localizable where the repo supports i18n; avoid hardcoded copy that contradicts the UI guideline.
   - Handle platform differences deliberately with `Platform.select`, native config, or separate files only when necessary.

4. **Native/platform changes**
   - For permissions, app icons, deep links, notifications, background modes, billing, camera/media/files/location, or native modules, update Android/iOS config and document why.
   - Expo managed projects should prefer config plugins/app config changes over manual native edits unless the project is already prebuilt/bare.
   - Bare projects should keep Gradle, AndroidManifest, Info.plist, CocoaPods, and native source changes minimal and reviewable.

5. **Verify**
   - Run fast checks first, then device/emulator checks.
   - Capture evidence for UI-bearing changes: screenshots, video, emulator/device logs, or QA report links.
   - If Android Studio/SDK/emulator is missing, set up the environment when in scope; if setup cannot be completed, document the blocker and create a QA/device task.

## Common Commands

Adjust commands to the repo and package manager.

```bash
# Static checks
npm run typecheck
npm run lint
npm test -- --runInBand

# Expo diagnostics/build smoke
npx expo doctor
npx expo start --clear
npx expo run:android

# React Native CLI diagnostics/build smoke
npx react-native doctor
npx react-native start --reset-cache
npx react-native run-android

# Android native checks
cd android && ./gradlew test lintDebug assembleDebug && cd ..

# Device/emulator inspection
adb devices
adb logcat
emulator -list-avds
emulator @Pixel_API_35
```

If Metro cache or Gradle state causes flaky local failures, prefer a targeted cleanup before broad destructive resets:

```bash
npx react-native start --reset-cache
cd android && ./gradlew clean && cd ..
```

Do not delete `node_modules`, lockfiles, Gradle caches, Pods, or generated native folders unless there is a clear reason and the user/project permits it.

## Testing and QA Expectations

For user-facing React Native work, verification should normally include:

- Typecheck/lint/unit tests if present.
- Component tests or snapshot tests if the repo uses them.
- Android emulator/device smoke for the affected CUJ.
- iOS simulator/device smoke when iOS is in scope and Xcode is available.
- UI guideline comparison for layout, copy, states, accessibility, and responsive/device differences.
- Logs checked for runtime warnings, redboxes, native crashes, API errors, and permission failures.

Minimum Android smoke evidence:

```text
Android smoke — <feature>
- Emulator/device: <name/API/architecture>
- Build/install command:
- Flow tested:
- Result: pass/fail/blocked
- Evidence: <screenshot/video/log path>
- Runtime warnings/errors:
```

## React Native Task Template

```text
React Native task — <feature/fix/setup>
- PRD/issue:
- Tech spec:
- UI guideline/brief: <path/link or "not applicable: reason">
- Framework mode: <Expo managed | Expo dev client/prebuild | RN CLI/bare>
- Platforms: <Android | iOS | both>
- Environment setup needed: <Node/JDK/Android Studio/SDK/emulator/Xcode/etc.>
- Scope/files likely affected:
- States to implement:
- Native permissions/modules/config changes:
- Tests/checks required:
- Emulator/device evidence required:
- Acceptance evidence:
```

## Environment Setup Report Shape

```text
React Native environment setup — <project>
- OS/architecture:
- Node/package manager:
- JDK/JAVA_HOME:
- Android Studio:
- ANDROID_HOME / SDK path:
- SDK packages installed/verified:
- AVD/emulator:
- Commands run:
- Blockers/follow-ups:
```

## Implementation Report Shape

```text
React Native implementation report — <feature/fix>
- Summary:
- Files/artifacts inspected before editing: <explicitly name mobile/App.js, app config files such as mobile/app.json, QA notes, PRD/spec/UI artifacts, and existing tests that informed the change>
- Framework/platforms touched:
- Files changed:
- Checks run:
- Android/iOS emulator evidence:
- Known gaps/follow-ups:
- Release/package notes if relevant:
```

For evals or acceptance-driven mobile tasks, the final response must explicitly say which required source/config/QA-note files were inspected before editing, even if the implementation changed those same files. Automated judges cannot infer inspection from a diff alone.

## Common Pitfalls

1. **Skipping Android Studio/SDK setup.** For Android app testing, `adb`, `sdkmanager`, emulator images, and an AVD must be installed/verified; Node alone is not enough.
2. **Ignoring PRD/UI artifacts.** React Native speed makes it easy to build the wrong flow quickly. UI-bearing work needs the project UI guideline or feature brief first.
3. **Switching package managers.** Use the existing lockfile and package manager. Do not create competing lockfiles.
4. **Confusing Expo managed and bare workflows.** Do not manually edit native folders in managed Expo unless the project intentionally uses prebuild/dev-client or the spec calls for it.
5. **Testing only in web/preview.** React Native must be tested on Android/iOS surfaces when app behavior or native integration changes.
6. **Hiding native permission changes.** Permissions and native capabilities affect privacy, store review, and user trust; document them and route through product/devops when needed.
7. **Over-cleaning build state.** Broad cache deletion can mask real setup bugs and waste time. Start with targeted Metro/Gradle cleanup.

## Verification Checklist

- [ ] PRD/issue, tech spec, and UI guideline/brief were read or missing-artifact blockers were created.
- [ ] Framework mode and package manager were identified before dependency changes.
- [ ] Android Studio/SDK/emulator requirements were installed or explicitly verified for Android testing work.
- [ ] `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, `adb`, and SDK packages were checked when environment setup was in scope.
- [ ] Implementation preserves the PRD's CUJ and acceptance criteria.
- [ ] Loading/empty/error/success/offline/permission states are handled where relevant.
- [ ] Native permissions/modules/config changes are documented.
- [ ] Relevant typecheck/lint/test/build commands were run or blockers documented.
- [ ] Android emulator/device evidence exists for Android UI/native work, or a QA/device follow-up was created.
- [ ] iOS simulator/device evidence exists when iOS is in scope and Xcode is available, or a follow-up was created.
- [ ] Follow-up bugs/tasks exist for gaps discovered during setup, implementation, or verification.
