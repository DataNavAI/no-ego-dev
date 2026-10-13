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
