---
name: android-app-dev
description: "Use when implementing, testing, debugging, packaging, or reviewing Android app work, especially Jetpack Compose/Kotlin features that must follow PRDs, UI guidelines, and Android release quality gates."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, android, mobile, kotlin, jetpack-compose]
    related_skills: [project-manager, product-manager, ui-designer, play-store-publisher, play-store-cli, coder, qa, devops]
---

# Android App Dev

## Overview

Implement Android app work with product, design, and release discipline. This skill is for Kotlin/Java Android projects, Jetpack Compose or XML views, Gradle builds, emulator/device testing, app packaging, and Android-specific debugging.

Android implementation must not invent product or UI behavior. Start from the PRD, UI guideline/feature UI brief, and tech spec. If those are missing for user-facing work, stop and create/ask for the missing planning task instead of coding from vibes.

## Inputs Required Before Coding

For every Android feature or app milestone, gather:

- PRD or issue with user problem, CUJ, acceptance criteria, and feedback path.
- Tech spec or architecture note covering data flow, APIs, persistence, navigation, and platform constraints.
- UI guideline or feature UI brief for any user-facing screen, flow, navigation, state, or copy change.
- Target module/flavor/build variant and minimum/target SDK assumptions.
- Test expectations: unit, Compose/UI, instrumentation, screenshot, manual emulator smoke, or release build checks.

If the work changes UI and no guideline/brief exists, create a blocker/follow-up for `ui-designer` and do not finalize implementation tasks until the design artifact exists or the project manager explicitly marks UI as not applicable.

## UI and Product Alignment Rules

- Read the UI guideline before touching Compose/XML/resources. Default path: `.projects/<project>/design/ui-guidelines.md` unless the repo has another documented design path.
- Preserve the primary CUJ from the PRD. Do not add extra screens, settings, permissions, or onboarding steps unless required by the PRD/spec.
- Implement all relevant states: loading, empty, error, success, disabled, permission denied, offline/network failure, and first-run where applicable.
- Keep copy consistent with the guideline. Use string resources for user-visible text; avoid hardcoded strings in composables/views.
- Respect Android accessibility basics: content descriptions where meaningful, touch target sizes, keyboard/focus behavior where relevant, semantic labels, contrast, dynamic type/font scaling, and reduced-motion expectations.
- For Compose, prefer small previewable composables with state hoisted out. Do not bury network/database calls directly inside UI composables.
- For XML/View projects, follow existing resource/style/theme conventions rather than introducing parallel design tokens.

## Implementation Workflow

1. **Orient**
   - Inspect repo structure, Gradle files, modules, build variants, package names, and existing architecture conventions.
   - Read PRD, tech spec, UI guideline/brief, linked issues, and current tests.
   - Identify whether the feature uses Compose, XML views, hybrid screens, or platform components.

2. **Plan the change**
   - Name files/modules to change.
   - Map PRD acceptance criteria and UI states to implementation tasks.
   - Call out risks: permissions, background work, offline behavior, lifecycle, migrations, API compatibility, performance, privacy, or Play policy constraints.

3. **Implement smallest coherent slice**
   - Follow existing architecture (MVVM/MVI/Clean/etc.) instead of introducing a new pattern casually.
   - Keep platform code lifecycle-aware: coroutines/scopes, ViewModel state, navigation back stack, process death, configuration changes.
   - Handle errors and empty/loading states explicitly.
   - Keep secrets/config out of the app bundle unless intentionally public.

4. **Test locally**
   - Run the narrowest relevant Gradle checks first, then broaden.
   - Typical commands, adjusted to the repo:
     ```bash
     ./gradlew test
     ./gradlew connectedDebugAndroidTest
     ./gradlew lintDebug
     ./gradlew assembleDebug
     ```
   - If no device/emulator is available, say so and run all non-device tests/builds; create a manual/device QA follow-up.

5. **Verify UI on a real surface**
   - For UI-bearing work, inspect the screen in emulator/device, preview, screenshot test, or recorded artifact.
   - Compare against the UI guideline/brief and file UI bugs rather than silently accepting mismatches.
   - Capture screenshot/video evidence for meaningful UI changes or failures.

6. **Package/release when relevant**
   - For release tasks, verify signing expectations, versionCode/versionName, minification/proguard/R8, Play policy-sensitive permissions, crash/analytics setup, and artifact location.
   - Before any Play Store/internal testing/publishing handoff, install and QA the release candidate on an Android emulator. This is mandatory even when unit, lint, assemble, or connected tests pass.
   - Emulator QA must cover the app launch, primary CUJ, changed screens/flows, navigation/back behavior, loading/empty/error states, permissions, and any release-sensitive paths affected by the work.
   - Capture emulator evidence: device/API level, build variant/artifact, commands used, pass/fail result, and screenshots/video for changed UI or failures.
   - Do not approve publishing if emulator QA is unavailable, skipped, or failing. Create a blocking QA/release issue with exact emulator setup/run commands and hand it to `qa`, `play-store-publisher`, or `play-store-cli` as appropriate.
   - Do not invent signing credentials. If missing, create a DevOps/release blocker.

## Android Task Template

```text
Android task — <feature/fix>
- PRD/issue:
- Tech spec:
- UI guideline/brief: <path/link or "not applicable: reason">
- Module/build variant:
- Scope/files likely affected:
- States to implement:
- Tests/checks required:
- Device/emulator requirement:
- Pre-publish emulator QA: <required for any publishing/release handoff; emulator/API/build variant/CUJ evidence expected>
- Acceptance evidence:
```

## Verification Report Shape

```text
Android implementation report — <feature/fix>
- Summary:
- PRD/spec/UI artifacts used:
- Files changed:
- Tests/builds run:
- UI/device evidence:
- Pre-publish emulator QA: <not applicable | pass with emulator/API/build/artifact evidence | blocked with issue link>
- Known gaps/follow-ups:
- Release/package notes if relevant:
```

## Common Pitfalls

1. **Coding UI before design exists.** If a PRD needs UI, the project-manager workflow requires UI design tasks and a guideline/brief before tech-spec finalization and implementation.
2. **Passing unit tests but never opening the app.** Android UI work needs emulator/device/preview/screenshot evidence whenever possible.
3. **Ignoring lifecycle and process death.** Test rotations/back stack/state restoration for non-trivial flows.
4. **Hardcoding strings/styles.** Use resources/themes/design tokens consistent with the repo.
5. **Treating Compose previews as tests.** Previews help inspection but do not replace unit/UI/instrumentation tests or manual smoke for critical flows.
6. **Skipping permission/privacy review.** New permissions, background work, location/media/files/notifications, and analytics need product/devops awareness.
7. **Assuming emulator availability.** Detect it; if unavailable, run non-device checks and create a QA/device follow-up with exact commands.
8. **Publishing without emulator QA.** A signed artifact or passing CI is not enough. Any Play Store/internal testing/publishing handoff must be blocked until the app has been installed and smoke-tested on an Android emulator with evidence.

## Verification Checklist

- [ ] PRD/issue and tech spec were read or missing-artifact blockers were created.
- [ ] UI guideline/feature UI brief was read for user-facing work, or UI was explicitly not applicable with a reason.
- [ ] Implementation preserves the PRD's CUJ and acceptance criteria.
- [ ] Loading/empty/error/success/permission/offline states are handled where relevant.
- [ ] Accessibility and Android resource conventions were considered.
- [ ] Relevant Gradle test/build/lint commands were run or blockers documented.
- [ ] UI-bearing work has emulator/device/preview/screenshot evidence or a follow-up QA task.
- [ ] Before any publishing/internal testing/release handoff, the Android app was installed and QA-smoked on an emulator, with device/API/build/artifact evidence and screenshots/video where useful.
- [ ] Publishing is blocked if emulator QA is unavailable, skipped, or failing; a blocking QA/release issue exists with exact follow-up commands.
- [ ] Release-sensitive work checks signing/versioning/minification/policy constraints.
- [ ] Follow-up bugs/tasks exist for gaps discovered during implementation or verification.
