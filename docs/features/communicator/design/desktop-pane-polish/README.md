# Desktop project-pane refinement

Four initial action items plus the Settings finding #274 from desktop visual review at1280/1440px. These guidance images reconstruct problems and propose hierarchy with synthetic content; they are not screenshots of a finished implementation. Keep the existing light-theme Muse split and mobile organization. [Authoritative requirements and cases](../../SPEC.md#desktop-project-pane-refinement-269272).

| Action | Guidance | Key implementation constraint |
| --- | --- | --- |
| #269 Single-row navigation | [Image](01-navigation.png), [source](01-navigation.html) | All five destinations and keyboard reachability; local scrolling at narrow bounds |
| #270 Pane proportions/header | [Image](02-split.png), [source](02-split.html) | Useful default project width; saved resize wins; quiet Project label |
| #271 Compact work hierarchy | [Image](03-work.png), [source](03-work.html) | Preserve work order/filter/details/reference semantics |
| #272 Preview states | [Image](04-preview.png), [source](04-preview.html) | Bounded state card; no invented configuration/start action |
| #274 Settings groups | [Image](05-settings.png), [source](05-settings.html) | Preserve all credential semantics; clarify sections and action spacing |

Review actual implemented Goals, Dashboard, Preview, Artifacts and Settings at1024/1280/1440px, minimum resized pane,200% text, and phone regression. Automation catches layout/state regressions; TC-056 requires visual judgment from captures. No real authorization data or private conversation is included.

### Dashboard metric scaling supplement (#271)
[Guidance image](06-metrics.png) / [source](06-metrics.html): the enlarged-text review found character-stacked labels in four forced columns. Use text-relative container sizing to switch to two columns; the rendered TC-055 regression verifies labels stay within two lines at the narrow bound.
