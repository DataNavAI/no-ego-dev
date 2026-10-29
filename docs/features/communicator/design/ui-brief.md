# NEDCOM UI brief

Current governing composition: the final “Left tab workspace revision” below. Earlier screens document design history and are superseded wherever they conflict with fixed NED Chat, the app name NED, Preview, or left Chat/Goals/Artifacts tabs.

Chat layout extension: [chat UI brief](../CHAT.md#ui-brief--implementation-acceptance) supersedes this document's two-pane composition, default Tasks behavior on mobile and read-only header. Existing project interactions and tokens are retained; Chat is independent of project selection.
Status: proposed; no visual or browser acceptance claimed. Owner: ui-designer. Issue: #114; domain slices #116–#118. Sources: [SPEC](../SPEC.md), expected `../TECH_SPEC.md`, [guidelines](../../../../.projects/no-ego-dev/design/ui-guidelines.md), [foundations](design-system.md), [interface registry](../../../../.projects/no-ego-dev/product/supported-device-interfaces.yaml).

## Direction
Readable chat enhancement: assistant paragraphs, headings, lists, links, tables and code use existing typography/spacing; user messages remain plain text. Tool activity and unknown structured records use native collapsed details with exact labels `Tool: <name>`, `Arguments`, `Output`, or `Structured data`. Preserve all prose alongside details. Code and large fallback wrap within the transcript; opening details never invokes tools. No syntax-coloring dependency, remote media or extra controls.

A project workbench matches project-first browsing: choose project → choose section (two actions to content). No onboarding or cross-project dashboard. SCREEN-01 covers project entry, loading, empty and error. SCREEN-02 covers a selected project and Tasks, Artifacts or Preview. Skeleton includes shell and honest unavailable states; mock project names are synthetic fixtures, not runtime data. No mutation, app launch, filters or search in #114.

## Visual index
[Clean responsive specimen](mockup.html) includes desktop/mobile shell and loading/empty/error specimens. `?annotations=1` adds stable IDs. Targets: 1280×800 desktop, 390×844 mobile, 320 CSS px reflow. Rendering/capture, contrast inspection and fresh independent UI/copy review remain outstanding parent gates; HTML source is not a screenshot or approval.

## Stable interaction contract
| ID | Exact label/action | Transition/states | Keyboard/focus |
| --- | --- | --- | --- |
| A1 | Project | Native chooser; registered project IDs only. Project change clears old content, resets Tasks, then loads. Missing project: Project is unavailable. No editable paths. Disable only initial inventory load. | Native arrows/Enter; 44px target; retain focus; polite update announcement. |
| A2 | Tasks | Selected project tasks; skeleton: Task browsing is not available yet. | Tab/Enter/Space; aria-current=page; retain focus. |
| A3 | Artifacts | Selected project artifacts; skeleton: Artifact browsing is not available yet. | Same as A2. |
| A4 | Preview | Selected project preview; skeleton: App previews are not available yet. Never launch app on selection. | Same as A2. |
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
Scope: read registered projects and their configured preview; no task/artifact detail design. SCREEN-03 is Preview inside the existing SCREEN-02 shell. Preserve A1–A6 and all tokens/layout. Do not show fake production records. Initial registry entry still requires choosing a project; no auto-selection across projects.

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

## Historical Antigravity reference refresh — 2026-10-26

Inspected the signed-in [Antigravity remote UI](https://antigravity.google.com/u/1/r/d90b4bc6-ff44-45e1-a994-141b7dcf14f4-v2): landing composer, existing conversation, and auxiliary Overview pane. Observed patterns: muted sidebar separated by a fine rule, compact app chrome, a wide uncluttered transcript, rounded persistent composer, and a distinct auxiliary workspace. This is direct visual research; no performance or provider-feature parity is claimed. Do not copy account, machine, or conversation content into NED fixtures.

SCREEN-04 adapts that hierarchy to existing NED capabilities. Retain all A1–A7 and chat control behavior. The measured desktop contract is a 256px full-height #f3f3f3 sidebar, flexible #fafafa canvas, contextual populated-conversation bar, max-768px content, and no permanently visible right detail pane. The empty desktop state has no main title/header. Sidebar rows begin with New Conversation near y52, Conversation History near y90, honest Project details near y128, Projects near y197 and Conversations near y237. Sessions render only real selectable conversation entries; an empty catalog has no selected placeholder row. The project chooser sits directly above the composer. At 1280×800 the empty composer targets x385/y325/w768/h82 with its selector baseline near y302; populated state anchors it 12px from the bottom. The auxiliary project surface is opened only through its accessible toggles, moves focus to its heading, and restores focus on close. Mobile navigation is a left-anchored drawer with a scrim, inert covered content, Escape/outside dismissal and focus restoration. Assistant output is plain readable text and user input is a fine outlined row. Status, Reload and history actions appear only in relevant recovery/populated contexts. Do not introduce unsupported provider/model/attachment controls or inert reference-only icons.

UI-AC-09: compare against `/tmp/nedcom-parity/reference-empty.png` at the 1280×800 reference canvas and the actual 1175×570 embedded region; also verify 800×900 intermediate, 390×844 mobile and 320px reflow. The 256px rail, compact bar, empty-state composer position, bottom populated composer, optional detail pane, transcript containment, zero horizontal overflow, reachable mobile navigation and visible focus are material. Existing TC-008 owns rendered acceptance; TC-010 continues to own chat behavior. Canonical token values are in design-system.md and implementation in public/styles.css. No remote fonts/assets or motion added.

Prior-candidate focused refresh verification inspected synthetic project/chat previews at 1280×800, 800×900, 390×844 and 320×844. Those captures are external review evidence, not acceptance for this revised candidate or distribution runtime content. The current candidate still requires fresh rendered desktop/mobile evidence and parent-owned TC-008 evaluation. Automated results are reported separately from manual evidence; long-history, 200% text, the error matrix and independent UI approval remain unverified here.

App naming: browser title and sidebar brand are **NED**, with accessible navigation label **NED navigation**. **NED COM** remains the communicator feature name. This naming decision supersedes NEDCOM branding in earlier candidates.

Project navigation revision: remove Conversation History and the conversation session list from the sidebar. Group the Project chooser with full-width Goal & Tasks, Artifacts and Preview rows on the left; keep rows visible but disabled until a project is selected. Selecting a row opens its existing detail pane, closing the mobile drawer first. The Tasks internal section key is retained, with Goal & Tasks as its visible label/title. Chat continues to resume the most recent session and New Conversation remains available; no new goal/task/artifact data capability is claimed. This supersedes the session-list and composer-project-chooser placement in SCREEN-04.

Single-chat revision: the conversation is always **NED Chat**, including its empty state; remove New Conversation and all session selection. Resolve fixed gateway ID `nedcom-main` on startup/Reload. Use the Hermes-supported `api_server` source (custom source labels are normalized by Hermes). User text stays literal; assistant prose is sanitized Markdown. [Message rendering direction](message-rendering.md) governs activity/copy behavior and supersedes earlier prose-only text rendering.

## Historical preview-oriented workspace revision (superseded by left tabs)
The latest user direction supersedes the earlier Antigravity shell geometry. Benchmark: [Lovable project editor](https://docs.lovable.dev/features/projects/editor). Adopt the persistent left chat and primary preview hierarchy, with NED project work in a toggleable right inspector. Historical UI-AC-14: desktop 1280×800 has a 360px chat, flexible central preview and optional 300px inspector; the toolbar owns project selection and inspector actions. At 390×844 and 320px, Preview is initial, Chat/Preview buttons switch the single DOM workspace, and the inspector replaces it temporarily. Preserve fixed NED Chat and existing message rendering. Historical UI-AC-15: Tasks/Artifacts select the inspector independently of central preview; closing restores the invoking control. Preview shows existing truthful status, explicit Open app new-tab action and Retry; no iframe, launch or invented project data. Verify controller transitions in TC-006 and rendered geometry manually.

See [Lovable benchmark and adaptation](lovable-benchmark.md) for the current source evidence and nonembedded Preview scope.


## Left tab workspace revision (current governing layout)
The latest user direction supersedes the right inspector. UI-AC-14: desktop has one 360px left pane (320px intermediate), with Chat, Goals, Artifacts tabs, and a flexible Preview main area. Remove all right-pane toggles and close controls. UI-AC-15: tabs select one preserved panel; Goals is the visible replacement for Goal & Tasks. Chat remains the same NED Chat DOM/session. Arrow/Home/End navigation, selected state and inert hidden panels are required. On mobile Preview is initial and the toolbar switches Preview versus the left pane, restoring its selected tab. Project tabs stay selectable without a project and explain selection. Preserve current composer and message controls, truthful data availability and new-tab Preview behavior. Verify TC-006 controller transitions and desktop/mobile rendered captures.
