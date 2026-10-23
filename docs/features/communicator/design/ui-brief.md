# NEDCOM UI brief — candidate 1
Chat layout extension: [chat UI brief](../CHAT.md#ui-brief--implementation-acceptance) supersedes this document's two-pane composition, default Tasks behavior on mobile and read-only header. Existing project interactions and tokens are retained; Chat is independent of project selection.
Status: proposed; no visual or browser acceptance claimed. Owner: ui-designer. Issue: #114; domain slices #116–#118. Sources: [SPEC](../SPEC.md), expected `../TECH_SPEC.md`, [guidelines](../../../../.projects/no-ego-dev/design/ui-guidelines.md), [foundations](design-system.md), [interface registry](../../../../.projects/no-ego-dev/product/supported-device-interfaces.yaml).

## Direction
A project workbench matches project-first browsing: choose project → choose section (two actions to content). No onboarding or cross-project dashboard. SCREEN-01 covers project entry, loading, empty and error. SCREEN-02 covers a selected project and Tasks, Artifacts or WIP app. Skeleton includes shell and honest unavailable states; mock project names are synthetic fixtures, not runtime data. No mutation, app launch, filters or search in #114.

## Visual index
[Clean responsive specimen](mockup.html) includes desktop/mobile shell and loading/empty/error specimens. `?annotations=1` adds stable IDs. Targets: 1280×800 desktop, 390×844 mobile, 320 CSS px reflow. Rendering/capture, contrast inspection and fresh independent UI/copy review remain outstanding parent gates; HTML source is not a screenshot or approval.

## Stable interaction contract
| ID | Exact label/action | Transition/states | Keyboard/focus |
| --- | --- | --- | --- |
| A1 | Project | Native chooser; registered project IDs only. Project change clears old content, resets Tasks, then loads. Missing project: Project is unavailable. No editable paths. Disable only initial inventory load. | Native arrows/Enter; 44px target; retain focus; polite update announcement. |
| A2 | Tasks | Selected project tasks; skeleton: Task browsing is not available yet. | Tab/Enter/Space; aria-current=page; retain focus. |
| A3 | Artifacts | Selected project artifacts; skeleton: Artifact browsing is not available yet. | Same as A2. |
| A4 | WIP app | Selected project preview; skeleton: App previews are not available yet. Never launch app on selection. | Same as A2. |
| A5 | Retry | Re-read failed resource; preserve selection, disable concurrent retry, show loading then success/empty/error. | Native button, 44px; restore focus to Retry after loading if still actionable, otherwise content heading when removed. Preserve focus moved to another control; navigation cancels pending Retry focus intent. |
| A6 | Skip to content | Focus main heading/anchor. | First tab target, visible on focus. |

## Exact state copy
Unselected heading: Projects. Body: Choose a project to browse its tasks, artifacts and app. No projects: No projects yet / Register a project with NED, then retry. / Retry. Loading: Loading projects… (or Loading project… for selection). Inventory error: Projects could not be loaded / Check that NEDCOM is running, then retry. / Retry. Folder error: Project folder is unavailable. / Check access to the project folder, then retry. Database error: Project data could not be loaded. / Check that the NED database is available, then retry. All errors offer Retry and keep chooser available. Never expose raw exceptions, paths, secrets or stack traces. Permission/offline use relevant recoverable error. Before selection disable section controls with explanation Choose a project first. No success toast/destructive states needed for read-only shell.

## Responsive/accessibility
One DOM order: skip, header, Project label/select, section navigation, main heading/content. ≥768px: 240px sidebar + flexible content. <768px: chooser and wrapping navigation above main. No hamburger, duplicated controls, hidden/reordered content or fixed bars. Wrap long project names; no overflow at 320px or 200% text. Safe-area padding on outer container. Native controls, semantic landmarks, one H1, visible focus, min 44px targets. Static loading text uses polite status; error announced once on transition. Selected style includes bold/border and aria-current, not color alone. No motion or remote resources.

## Acceptance mapping
| ID | Source | Contract / implementation owner | Deterministic check | Required rendered evidence |
| --- | --- | --- | --- | --- |
| UI-AC-01 | SCREEN-01/A1 | coder: project-first shell and honest unselected/loading/empty/error | exact labels/state transitions, no runtime fixtures | each state desktop/mobile |
| UI-AC-02 | SCREEN-02/A2–A4 | coder: project stays visible, heading matches section, stale content cleared | project ID and navigation transitions | three sections desktop/mobile |
| UI-AC-03 | A5 | coder: Retry recovers without duplicate requests | error→loading→success/empty, disabled while pending | failure/recovery |
| UI-AC-04 | A1–A6 | coder: keyboard order, semantics, labels, focus/live feedback | focus sequence/native roles/current section | keyboard capture/accessibility inspection |
| UI-AC-05 | SCREEN-01/02 | coder: stacking, 44px controls, wrapped names/no overflow | geometry at 1280/390/320px | viewport captures, 200% text |

Architecture assigns client code paths and cites these rows. Parent must record rendered evidence and independent review before handoff acceptance. Later slices own task details/artifact rendering; CLI is #115. Project and preview behavior is specified below for #116. No duplicate artifact store or task graph.


## Issue #116 — registered projects and WIP preview (candidate 2)
Scope: read registered projects and their configured preview; no task/artifact detail design. SCREEN-03 is WIP app inside the existing SCREEN-02 shell. Preserve A1–A6 and all tokens/layout. Do not show fake production records. Initial registry entry still requires choosing a project; no auto-selection across projects.

A1 option values and requests retain the full opaque registered ID. Visible options use `Name · displayPath`; selected project identity shows the name and registered folder context. The API supplies safe displayPath: home-relative path when possible, otherwise the exact registered directory path. This deliberate local-owner metadata distinguishes worktrees with matching names; opaque IDs remain exclusively for routing/selection, never substitutes for readable context. Example synthetic specimen: `Sample shop · ~/Projects/shop`, `Sample shop · ~/Worktrees/shop-review`. Names and display paths render as text, wrap in the identity summary at 320px, and never become HTML. Native option lists may use OS scrolling; selected name and full folder context are also shown as wrapping text above content. Empty registry and database error retain the original SCREEN-01 copy/Retry. Registration itself is outside web UI.

During detail loading the chooser stays enabled; sections remain selectable. A project switch immediately clears old content and old preview link, updates identity, and resets Tasks. Render `Loading project…` until the current selection resolves. A late response for a different ID or superseded request never changes current identity/content, including after Retry. Selection stays on A1; announce completion politely. An unavailable folder shows `Project folder is unavailable.` / `Check access to the project folder, then retry.` with Retry and permits another selection. Project removed after inventory shows `Project is unavailable.` / `Choose another project or retry.` with Retry. Failed registry reload must not preserve an actionable stale preview link.

| State | Exact WIP card copy | Action |
| --- | --- | --- |
| Running / verified reachable | App is running / Open the project app in a new tab. | A7: Open app |
| Unconfigured | No app preview configured / Configure a local preview URL for this project, then retry. | A5: Retry |
| Stopped / unreachable | App is not running / Start the project app separately, then retry. | A5: Retry |
| Invalid / disallowed URL | App preview URL is not allowed / Use an allowed local preview URL for this project, then retry. | A5: Retry |
| Read failure | Project data could not be loaded. / Check that the NED database is available, then retry. | A5: Retry |

The running label requires authoritative reachability evidence under architecture's bounded probe policy; configuration alone cannot assert running. Registered folder displayPath is deliberately visible project metadata. No configured URL, provider credential, query/fragment, connection exception or path obtained from raw errors is visible. Failure copy never echoes paths, stacks or secrets; this does not hide the selected project’s registered folder context. The architect defines accepted local URL policy and authoritative configuration contract. The user starts/configures their app outside NEDCOM; card selection and Retry never start/build/deploy or write files.

A7 is a native link labeled `Open app`, with visible adjacent `Opens in a new tab.` Accessible name: `Open app (opens in a new tab)`. Use target=_blank and rel=noopener noreferrer. Only expose it for a validated currently selected reachable preview. Keyboard Tab/Enter and min 44px touch target; do not move focus on opening; leave NEDCOM selection intact. In other states omit the link entirely instead of keeping a dangerous or misleading disabled anchor. Mobile uses the same stacked card and wrapping text, no embedded iframe or fixed action bar. Retry rechecks current project's preview and clears prior link immediately. Failed request announces one alert; success/reachability changes announce a polite status.

| Acceptance ID | Source | Required behavior | Deterministic check | Rendered evidence |
| --- | --- | --- | --- | --- |
| UI-AC-06 | A1 / SCREEN-02 | Opaque ID routing and readable registered folder context distinguish duplicate names; chooser remains usable during load | duplicate-name records; ID request and stale-response rejection | desktop/mobile name/folder identity, 320px path wrapping and loading |
| UI-AC-07 | A4/A7 / SCREEN-03 | Truthful running card; safe explicit new-tab link; no launch or embedding | validated URL/reachability; rel/target/name; switch clears link | running card and keyboard focus, both interfaces |
| UI-AC-08 | A5 / SCREEN-01/03 | Empty/database/folder/unconfigured/stopped/invalid states recover with current selection | exact state copy; retry transitions/no write effects | each state on desktop/mobile |

The updated [specimen](mockup.html) is synthetic design source only; state gallery is a design aid, not production UI. Domain/API implementation, rendering/capture and exact-candidate review remain separate gates.
