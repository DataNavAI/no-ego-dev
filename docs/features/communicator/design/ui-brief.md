# NEDCOM UI brief — candidate 1
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
| A5 | Retry | Re-read failed resource; preserve selection, disable concurrent retry, show loading then success/empty/error. | Native button, 44px; when removed focus content heading. |
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

Architecture assigns client code paths and cites these rows. Parent must record rendered evidence and independent review before handoff acceptance. Later slices own task details/artifact rendering/preview discovery; CLI is #115. No duplicate artifact store or task graph.
