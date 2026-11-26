# Mobile organization review

Status: proposed direction accepted for implementation by the user on2026-11-26.
Scope: mobile header, contextual provider actions, authorization cards, message hierarchy, project navigation and composer. Preserve the light theme and existing desktop workspace. The private source screenshot is intentionally excluded; these diagrams use redacted/synthetic content only.

- [Problems](problems.png): numbered reconstruction of the screenshot; not an exact captured implementation.
- [Proposed Chat and Project views](proposal.png): visual direction, not a verified implementation.
- [Authorization state examples](states.png): states must come from authoritative request status; never infer connection success from opening a link.
- [Self-contained visual source](review.html): open in a browser; conceptual, non-interactive review surface.

## Interaction contract

MOB-01: compact grouped NED/version/current-model identity, labeled Project entry and More menu with utilities. No duplicate mobile project navigation. Keep all existing desktop rail destinations.
MOB-02: connection initiation in message options/settings. Current requests appear as structured inline cards; no detached button or duplicate request creation on load/refresh.
MOB-03: existing trusted provider receipts/API drive cards and modal actions. Named external sign-in link, supplied code with explicit Copy, truthful request/expiry/unavailable/verified states. Do not fabricate cards from prose, URLs or model claims. Preserve the separate AWS CLI console-login owner and connection confirmation semantics.
MOB-04: assistant prose has a restrained surface and compact spacing; action cards carry primary actions. Quiet copy/reaction controls retain44px targets and do not depend on hover. Preserve structured content and streaming.
MOB-05: full-width mobile Project view with selected project identity, existing Goals/Artifacts/Preview/Dashboard destinations, one Back to chat action and restored draft/references/media/scroll/tab/preview nodes. Hidden views inert and focus returns to opener.
MOB-06: compact bottom composer above virtual keyboard with safe-area spacing, bounded multiline growth and no empty optional rows. Keep attachment/link/help/model controls and sending/stop contracts. Do not claim a physical-keyboard defect from a screenshot.

Acceptance: named320/390/430px captures,200% text, long model/project names, representative code/links/long replies, provider pending/expired/error/success, project roundtrip with draft/reference/media/scroll retention, visual viewport shrink/recovery, keyboard/focus and44px touch geometry. Record real-device limitations separately from browser emulation. Exact screenshot matching is not required; organization and existing behavior are.
