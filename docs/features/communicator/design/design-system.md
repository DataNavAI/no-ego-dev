# Communicator minimal design system

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

## Current left-tab Preview workspace
Supersedes historical shell geometry above. App name NED; NED COM remains the feature name. Desktop toolbar spans the workspace; the left pane is 360px above 1100px and 320px at intermediate widths, with flexible main Preview. Left tabs: Chat, Goals, Artifacts. No right pane or resize separator. Mobile breakpoint768px shows Preview initially and one interactive workspace at a time. Preserve the neutral Antigravity palette and message rendering; composer remains the existing fixed input surface. See the current UI-AC-14/15 in [brief](ui-brief.md).
