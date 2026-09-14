# Minimum viable design-system checklist

Use this checklist to prevent both design-system theater and scattered one-off UI decisions.

## Greenfield contract

1. Record product, platform, supported viewports, approved CUJs, accessibility/trust needs, and the `create` decision.
2. Define concrete semantic names and values for color roles, typography, spacing, layout/breakpoints, shape/elevation, icon rules, focus, and only necessary motion.
3. Derive every component from a named CUJ step. Include shell/navigation, text/link, button/icon button, only required form controls, validation, and feedback/recovery states; add specialized data display or overlays only when mapped.
4. Specify each applicable default, hover, focus-visible, pressed, selected, disabled, loading, validation/error, success, and destructive state, plus keyboard/touch behavior and content constraints.
5. Record contrast checks, non-color status cues, semantic names/roles/values, visible focus, reflow/large-text behavior, and target size/spacing. Treat 44px as the normal mobile product target.
6. Render a concrete specimen at required mobile and desktop viewports. Inspect both pixels and semantics before feature work consumes it.
7. Name the canonical token source, component code paths, naming, variants, owner, version/date, and exception/change process.

## Brownfield boundary

Audit existing token and component coverage, accessibility, ownership, and CUJ gaps. Choose `adopt`, `theme`, or `extend`; add only demonstrated gaps in the existing canonical source. Never create a parallel contract or library merely because the existing one uses a different structure or naming preference.

## Proportionality rule

The minimum is the smallest owned and tested system that keeps approved journeys consistent, implementable, responsive, and accessible. Park speculative themes, exhaustive catalogs, brand books, and motion libraries. Do not use MVP speed to waive concrete values, interaction states, accessibility, specimen evidence, or implementation ownership.

## Acceptance receipt

The bootstrap is ready only when:

- concrete token values exist in the named canonical source;
- every included component maps to an approved CUJ and shows applicable states;
- accessibility checks are recorded;
- mobile and desktop specimen captures were rendered and inspected;
- implementation paths and owners are named; and
- feature visuals reference and consume the accepted baseline.

## Standards references

- WCAG 2.2 contrast minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2 focus visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- WCAG 2.2 target size minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.2 name, role, value: https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- WCAG 2.2 reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- USWDS design tokens: https://designsystem.digital.gov/design-tokens/
- GOV.UK Design System styles: https://design-system.service.gov.uk/styles/
