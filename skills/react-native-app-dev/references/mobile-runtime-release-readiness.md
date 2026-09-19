# Mobile runtime and release readiness

Use this matrix after prerequisite inspection; never optimize implementation or prose for an eval judge.

## Runtime matrix

| Boundary | Positive evidence | Boundary/negative probe |
| --- | --- | --- |
| Android navigation | Root exits/backgrounds per product rule; nested/modal/webview returns correctly | Hardware/system back during loading, auth return, modal, and browser handoff |
| Client parity | Same CUJ on every supported Expo Go/dev client/prebuild/release client | A web or Expo Go pass cannot certify a native module or signed release |
| Toolchain/device | Project JDK/Gradle match; exact `adb -s <serial>` target and API/ABI recorded | Multiple devices attached, stale Metro target, wrong JDK |
| In-app browser | Open, cancel, close, back, redirect/deep-link return | External browser fallback, interrupted auth, malformed destination |
| Analytics | Bounded allowlisted events/properties | Raw URL, free text, article body, token, identifier, or PII is rejected/redacted |
| Notifications | Permission, token, registration, foreground/background/tap, retry, opt-out | Denial, token rotation, stale completion, revoked consent, provider failure |

## EAS/Firebase recovery

Capture project/account identity, app/package IDs, build profile/channel, signing identity, service-file project IDs, and provider status before mutation. Classify auth, binding, signing, service-file, quota, and outage failures separately. Apply the smallest repair and read back the same identities. Cache deletion or credential regeneration is never the first diagnostic.

## Prebuild and artifact identity

Diff prebuild output and explain each native change. For the candidate actually installed, record source SHA, build ID, package/application ID, signing certificate/team, profile/channel, Android `versionName` + `versionCode`, or iOS short version + build number. Compare runtime-visible values with package-manager/device inspection. Keep marketing version and immutable build separate.

## Scoped News policy

For a News-classified app, verify current rejection/policy evidence, listing and website contact, persistent labeled in-app contact navigation, and the journey on the exact installed candidate. Apply a date-based visible version only when that product contract requires it; never replace the build number or impose the rule on other products.
