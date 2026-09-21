# Review-runtime integration QA

Use when a review publication layer injects comment controls, authentication, generated config, or security headers into canonical visual source. Source-local QA is necessary but not sufficient because the composed DOM and browser policy differ.

## Required sequence

1. Run source-local functional, responsive, keyboard, accessibility, console, and image checks.
2. Build the publication layer from the exact full source revision and assert generated config/manifest identity.
3. Deploy that immutable publication revision to staging.
4. Exercise changed journeys under real authentication, injected review UI, CSP, and runtime config.
5. Verify stable review IDs round-trip through navigation, zero accessibility violations after injection, zero unexpected console/page/response failures, and runtime source identity equals the intended pin.
6. Test browser-policy-sensitive behavior such as image export/share under the deployed CSP. Assert actual file type/signature, not only a clicked control.
7. Promote only after the exact staging artifact passes and all exact-candidate approvals remain valid.

## Geometry and dynamic state

Do not rely only on document scroll width when ancestors can hide overflow. For each viewport, inspect visible in-flow descendant bounds and exclude only intentional scroll containers whose overflow and scroll geometry prove that behavior. Capture clean viewport evidence for the failing/fixed state.

After dynamic rerender, preserve logical identity, rewire handlers/review decoration, and restore focus to the corresponding replacement control or an explicitly chosen heading. Test both directions of each state transition with the active element.

Review-pin controls must not become invalid direct children of ARIA composites. Put stable IDs on neutral wrappers or pins outside restricted ownership boundaries, then run accessibility checks after decoration.

## Evidence roles

Use viewport captures for initial hierarchy, safe areas, and fixed-navigation overlap. Use full-page captures only for content continuity. Before clean capture, remove incidental test focus while retaining separate keyboard-focus evidence. A local script interception against staging may prove a narrow hypothesis but never replaces a rebuilt immutable staging deployment and full rerun.
