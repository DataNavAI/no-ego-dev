# Preview design evidence — draft r2

Scope: design-only publication for #155. Not a running preview feature, approved PRD freeze, implementation handoff approval, public tunnel, Hub deployment or runtime QA pass. DEC-01 remains pending the user's selection. The draft can be retained in main without treating its proposals as implemented behavior.

## Executed design checks

- Inspected existing COM project/preview state, Hub bridge, NED runtime-home/project stores and Hub HTTP/upgrade/origin/auth code; versions are recorded in TECHNICAL_DESIGN.md. Reused existing transport/control design rather than selecting a new provider.
- Runnable `design/options.html` provides A/menu and B/tabs, app switching, project identity changes and synthetic stopped/empty/reconnecting/embedding-denied states. External-open is explicitly mocked and no service/process/auth is created.
- Chromium captures at1280×800 and390×844 for both directions; stopped desktop/mobile, extra desktop states, clean/annotated variants and contact sheet. Captures were visually inspected by the author.320px horizontal overflow and B's ArrowRight app switching/project change were checked; no page script errors in the exercised scenarios.
- Rendered Markdown review/spec/architecture/UI brief to an outside-repository HTML review surface; verified image loads, direct local links/heading anchors, clicked through to UI brief and checked390px rendered review reflow. The Mermaid sequence is intended for GitHub's renderer; local HTML retained its code fence, so no local diagram-render claim.
- No runtime app, port registration, tunneled HTTP/WS, private origin, auth-cookie behavior or native tool was implemented/tested. Proposed runtime TC-001–006 remain NOT RUN; TC-007 prototype review is partial until the owner selects DEC-01. Full existing repository gates and independent draft-review results are recorded in the design PR/issue, separately from these prototype checks.

## Publication and limits

User instruction is design, not feature implementation. Draft documentation is MERGEABLE; it is not a temporary review-only PR and carries no authority to change cloud/DNS/security policies. User selection and independent technical/platform proof remain explicit gates before coding/release. Planned implementation work is no-ego-dev #157 and ned-hub #81, linked on the shared project board. Both are unclaimed/planned until design acceptance; no duplicate local NED task graph.

The mobile mock opens directly in Preview; actual COM still opens Chat and retains its existing menu/header behavior. Synthetic app metrics/order content is not NED product UI. Desktop/mobile mock geometry cannot substitute for real COM/frame/remote browser evidence. Existing live profiles/services are not modified for mock review.

## Independent draft-review corrections

Round1 product/copy/UI found PREVIEW-UI-001 (contradictory selector recovery states). Technical review found TSR-001–006 (dynamic CSP, form/Origin/DOM contradictions, service-worker bootstrap interception, local cross-site Strict cookie mismatch, unsupported arbitrary cookie isolation, and fixed-host HMR restart cycle). r2 corrects those contracts and regenerates mock evidence. Publication still requires fresh exact-r2 disposition review; no earlier approval is transferred. Runtime platform/browser/auth spikes and DEC-01 remain distinct. The initial Node gate run without the required Python environment failed standalone-container/TC-002; only a completed proper-environment rerun may supersede it, not a missing-dependency explanation alone.
