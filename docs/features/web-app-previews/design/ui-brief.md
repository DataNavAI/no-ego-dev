# Preview selector UI brief

Status: draft r2, DEC-01 pending. Owner: NED design. Governing [SPEC](../SPEC.md), [technical design](../TECHNICAL_DESIGN.md), [review deck](DESIGN_REVIEW.md). This is a scoped extension of existing COM, not a new shell or a running preview service.

## Context and reuse

Reuse [project UI guideline](../../../../.projects/no-ego-dev/design/ui-guidelines.md), [current COM design system](../../communicator/design/design-system.md), existing `public/styles.css`, `conversation.css`, pane resize and mobile navigation. Keep the neutral palette, system type, visible focus and44px mobile controls; do not add a component library, theme, media asset or port-entry form. The synthetic storefront inside the mock represents arbitrary app content, not a NED feature or design contract.

Primary audience: a user asking Hermes to develop a web app. Primary job: see/use the current working app. First value: zero selection actions when there is only one app. Switching: A takes open-menu + choose (two pointer actions); B takes one click when visible, plus scrolling/overflow handling at scale. Both use the same registry/transport/selection rules. Cross-project app selection also updates the existing project context; global chat remains unchanged.

## Directions and scope

- UI-A: compact native app menu, grouped by project. Recommended because twenty registrations, long labels and mobile fit without another navigation strip. Duplicate app labels are disambiguated by project. A singleton still shows app identity, with no unnecessary chooser step.
- UI-B: persistent app tabs, one-click switching among a few visible apps, project label in each disambiguated tab. Horizontal strip scrolls within its own area, never the page. Costs vertical space and needs deliberate keyboard/overflow handling; uses the same full-width app surface on mobile.

Neither direction adds an app manager, Stop/Restart, address editing, screenshots, device emulator or split view. Registration/removal remains agent/CLI work. Existing Preview hide/show and desktop resizing remain; do not recreate the mock's simplified surrounding shell during implementation.

## Interaction contract

| ID | Component / action | Result, state and error | Accessibility / ownership |
| --- | --- | --- | --- |
| A1 | Preview app selector (A menu or B tabs) | Exact opaque identity; grouped by project; latest selection wins, old frame torn down; cross-project updates workspace selection atomically. Stopped apps stay selectable and show a stopped state. Empty registry disables chooser. Never jump to another app on failure. | Label Preview app / Preview apps, text status not color alone, native menu keyboard; B tablist with Arrow/Home/End, roving tabindex and related panel.44px targets. Existing control tokens. |
| A2 | Reload preview | Reload/rebootstrap only the selected current generation. Disabled when stopped/instance offline/empty or a navigation is pending. Error preserves selection with Retry connection. | Accessible name Reload preview; icon has44px target and visible focus. No chat/draft reset. |
| A3 | Open in new tab | Explicit user gesture bootstraps the same private app generation in a new top-level tab, `noopener`; the bootstrap navigation uses tested origin-only referrer handling and must not use noreferrer, while ordinary unrelated outbound links retain noreferrer. Disabled when no verified app/instance connection; remains available for embedding denial. No public URL or bearer is copied. | Visible label Open in new tab; external indicator. New tab does not gain COM opener access. |
| A4 | App canvas | Cross-origin iframe, full available space with one accessible title naming project/app; app owns its internal scrolling/UI. No NED inspection of app DOM. Replace with truthful state while pending/unavailable, not a stale live frame. | Frame title e.g. Storefront — Storefront project. Keyboard can move into/out of frame through normal browser navigation. App accessibility is outside NED chrome ownership. |
| A5 | Identity/status | Selected app and project always visible; port is secondary development metadata, not a user input or remote URL. Running means verified service, not verified app paint. Connecting, Stopped, Offline, App error and Embedding blocked are distinct text. | Bounded polite status announcement on meaningful changes; no live announcement per probe/WS message. No secret/URL/token in labels. |
| A6 | Retry connection | Re-read membership/generation and reconnect only; never runs/restarts an app. Retains focus until recovery, then focus canvas heading if Retry disappears. No auto-switch. | Visible44px button, live status, stale retry responses ignored. Existing retry focus behavior preserved. |
| A7 | Mobile Chat / Preview | Reuse actual existing mobile navigation; preview occupies available viewport below chrome. Switching back preserves chat draft/session. | Existing focus restoration/inert handling, touch targets and reading order. Mock starts already in Preview and shows Menu/title/Debug chrome; the actual drawer/chat contents are not simulated. |

Loading states: initial app inventory “Loading previews…”; app opening “Connecting to app…”; instance transport “Reconnecting to NED…”. Empty: “No preview apps yet” / “Ask NED to run an app and register it for preview.” Stopped: “App stopped” / “Ask NED to start this app again. Your selection is kept.” Embedding denied: “Open this app in a new tab” / “This app does not allow embedding. Its security settings are unchanged.” Permission expired: “Sign in to reconnect” linked to existing Hub auth, preserving selection without a public bypass. No optimistic Running before authority/process verification. No remove/stop confirmation or destructive UI in scope.

## Responsive behavior and evidence

Desktop1280×800: existing split layout, preview toolbar and app viewport; responsive wraps preserve readable identity. Mobile390×844 and320px: current mobile navigation, preview full width, toolbar can wrap into two rows instead of truncating the only app identity; no horizontal viewport overflow.44px touch controls,16px fields, zoom/reflow and long names tested at implementation. No fixed height that obscures app content with the virtual keyboard. No motion dependency.

Mock evidence is clean, synthetic and captured from `options.html`; it proves draft geometry/interaction only. Desktop/mobile A/B, stopped and additional state captures are indexed in DESIGN_REVIEW.md. Implementers must capture the actual COM shell and live embedded app at the same viewports; do not count mock screenshots as integration evidence. The prototype's external-open action is an explicit simulation and no real app/tunnel/auth exists.

## Implementation acceptance map

| Acceptance ID | Design source | Required behavior | Implementation owner | Verification |
| --- | --- | --- | --- | --- |
| UI-AC-01 | UI-A/UI-B, A1/A5 | Selected identity, project grouping, deterministic default/restore, stale membership/response rejection | COM app state + preview selector | SPEC TC-004; actual desktop/mobile |
| UI-AC-02 | A2/A3/A4 | Reload scoped to app; protected new tab; isolated frame, no public/raw localhost URL | COM preview controller + relay/Hub | TC-002/003/004; actual app content/WS |
| UI-AC-03 | A5/A6 | Empty/loading/stopped/offline/denied/error truth and reconnect recovery; no app start | COM view/controller | TC-004/005; negative-state captures |
| UI-AC-04 | A7 | Existing navigation/draft/focus preserved;44px controls,320px reflow, no page overflow | Existing responsive shell + selector | TC-004; real keyboard/touch/zoom evidence |
| UI-AC-05 | A4/A5 | No app DOM/secret inspection or 'rendered successfully' inference | COM CSP/iframe + diagnostics | TC-003/006; hostile browser fixture |

## Decisions, limitations and disposition

DEC-01 remains owner-selected before PRD freeze. Recommendation: A. No accepted user choice is implied. Future review comments map to these IDs; source revisions regenerate captures. No binding independent design approval or runtime acceptance is inferred from prototype tests alone.


## Comparable patterns (primary-source research)

[GitHub Codespaces forwarding](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace?tool=webui) makes named ports discoverable and distinguishes private access. [VS Code Remote SSH](https://code.visualstudio.com/docs/remote/ssh) exposes a Ports view and browser opening. This design adopts explicit app identity and authenticated access, with Hermes handling registration instead of making users type ports. The compact menu is our proposed adaptation for COM's constrained pane, not a claim those products use this exact selector. Public-sharing controls and a general port manager are intentionally excluded. Remote browser localhost limitations are also documented in [GitHub's troubleshooting guide](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-port-forwarding-for-github-codespaces).

First-release compatibility: worker/PWA-dependent apps, unprefixed cookie-auth apps and restart-bound fixed-host HMR are outside the supported contract pending separate reviewed solutions. New-tab recovery solves embedding restrictions, not these compatibility exclusions. Local embedding site/cookie selection remains an explicit technical spike gate; the mock does not prove it.
