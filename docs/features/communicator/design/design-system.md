# Communicator minimal design system

## Current composer tokens (UI-AC-16)
Scoped extension of the current left-tab workspace, not a shell redesign. Composer: surface #fff, border #d7dadf, radius16px, shadow 0 2px 8px #2021240a; focus-within border #a5b8ca. Prompt 14px/1.5, minimum34px, maximum min(160px,25dvh). Footer actions use 12px labels, 44px minimum height, 8px radius and #f1f3f5 hover; text #4a5058. Static backend label #60656d, 12px. Send44×44px, radius12px, ready #303943 with white arrow, hover #17212b; disabled #edf0f2 with #8a929a arrow. Native disclosure summary44px; context and chip surfaces #f6f8fa, border #e2e6eb. Link fields white, 1px #c4cbd3 border, radius8px, min-height44px. Preserve global visible focus. Keep all assets local and motion unchanged. Browser evidence is a separate gate.
Candidate 1; ui-designer authors, coder implements. Existing src/web onboarding has a distinct workflow; use native HTML and minimal communicator CSS. This is canonical token source until promoted to one shared CSS source and linked here.

| Token | Value |
| --- | --- |
| canvas/surface | #f4f6f8 / #ffffff |
| text/muted | #152238 / #42536b |
| border | #ced6e0 |
| action/selected surface | #164fa3 / #e8f0fd |
| error/error surface | #a51d29 / #fff0f1 |
| focus | 3px #164fa3 outline, 3px offset |
| type | system-ui; body 16px/1.5; heading 24px/1.25 bold; label 14px/1.5 bold |
| spacing | 4,8,12,16,24,32px |
| radius/border | 8px / 1px solid |
| geometry | 240px sidebar; main max 960px; breakpoint 768px; outer padding 24px desktop/16px mobile |
| control | min-height 44px; horizontal padding 12px |
| motion/shadow | none |

Components: shell, labeled select, section buttons, content card, loading status, empty and error with Retry. Hover uses selected surface; pressed retains border/text; selected uses bold/border plus aria-current. Disabled uses native disabled/muted text, no opacity-only cue. No icon-only controls, decorative media, theme catalog, success or destructive components needed. [Specimen](mockup.html) consumes these values. AA contrast, focus, mobile/desktop rendering, reflow and independent review must be recorded; none claimed from source alone. Detailed behavior: [brief](ui-brief.md).

## Antigravity parity refresh (SCREEN-04)
Supersedes the initial palette, floating-shell treatment, and always-visible three-pane composition for the live chat workbench. Canonical implementation: `src/communicator/public/styles.css`. Canvas #fafafa; 256px rail #f3f3f3; surface #fff; text #202124; muted #707070; border #e5e5e5. System UI is 14px with compact 12px metadata. The 40px conversation bar is contextual to populated desktop conversations; the empty desktop canvas has no title/header chrome. Desktop is rail / flexible canvas; the auxiliary project pane is closed by default. Conversation content and composer max at 768px. The composer is 82px tall with 16px radius, fine border, and subtle lower shadow; its disabled Send control is a gray circular arrow. At 1280×800 the empty-state selector baseline is approximately y302 and the composer is x385/y325/w768/h82; with messages it anchors 12px above the bottom. Assistant messages read as plain transcript text and user messages use a fine outlined row. Real controls use coherent inline SVG icons, visible focus, and expanded 44px mobile targets without adding decorative or unsupported actions. Mobile navigation is a fully anchored drawer with a scrim, inert covered content, Escape/outside dismissal, and focus entry/restoration. No remote assets or motion.

## Shared control kit (current enhancement)
Use pinned Web Awesome 3.14.0 Select/Option for the project picker, bundled locally with esbuild 0.28.2. Keep the existing native select as the controller and initialization fallback. Import the kit's default theme rather than its global native reset; override semantic colors with NED's existing neutral palette. Canonical styling remains public/styles.css.

Control radius: 8px; neutral input border #d5d5d5, hover #b0b0b0, text #202124; popup surface #fff, border #e5e5e5 and subtle shadow. Selected/hover option surface #ededed with explicit check indicator. Keyboard focus uses 2px #525252, with a 2px offset on actions. Composer focus belongs to the full rounded card: #737373 border plus a subtle neutral outer ring, rather than a blue textarea rectangle. Preserve clear focus in forced-colors mode using system Highlight. The project trigger is at least 36px desktop and 44px mobile; options at least 40px desktop/44px mobile. Fit the popup within the viewport and keep long project paths readable.

Build inputs, pinned dependencies and MIT license are durable repository files; generated component JS/CSS are fixed same-origin assets. No CDN, external fonts/icons, arbitrary asset proxy or CSP relaxation. Kit initialization failure retains the existing labeled native control. Rendering/keyboard acceptance is SPEC TC-028; adapter/build/HTTP coverage is TC-027. Scope does not replace the working chat textarea or its draft/media/streaming logic.
# Conversation refinement tokens (2026-10-30)

The scoped `public/conversation.css` extends the existing theme: message body16px/1.65, author12px/650, heading18px/1.4, user surface`#eef0f2`, notice surface`#f1f4f6`, notice text`#303943`, border`#dde2e7`, status`#596471`, blocked`#825a17`, done`#356643`. Mobile header56px; navigation drawer max320px with32px backdrop reveal,44px close/menu targets and48px navigation rows. Notice radius12px, max-height22dvh (150px desktop/140px mobile), independent overflow; text code13px horizontally scrollable. Standard semantic status notice reuses native section/status/button rather than adding a second component dependency. Existing Web Awesome project picker remains the same DOM instance inside the native dialog. FR-055–057 / UI-AC-23 govern behavior.
