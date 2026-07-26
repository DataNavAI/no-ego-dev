# Minimum Viable Design System for an MVP

Research synthesis for the `ui-designer` new-project bootstrap gate. Accessed 2026-07-25.

## What the sources establish

- **USWDS design tokens** organize repeatable decisions into reusable categories including color, typesetting/font size and family, spacing units, layout/grid-related values, shadow, opacity, and z-index. For an MVP, this supports a small semantic token layer rather than scattered one-off values.
- **USWDS components and design principles** emphasize consistent components, real user needs, trust, accessibility, continuity, and tested behavior. The MVP component inventory should therefore follow approved user journeys instead of copying an entire catalog.
- **GOV.UK Design System styles** separate page structure/layout, spacing, typography, color, images, components, and patterns. GOV.UK also warns that discussed or adapted ideas still need user research for the service using them. A visual system specimen is evidence to inspect, not proof that the product works for users.
- **WCAG 2.2** requires at least 4.5:1 contrast for normal text and 3:1 for large text under SC 1.4.3; visible keyboard focus under SC 2.4.7; and a 24-by-24 CSS-pixel target-size floor with defined exceptions under SC 2.5.8. Product/mobile guidance may deliberately set a stronger target such as 44px.

## Minimum MVP system

The smallest useful system is not merely a palette. It is a reviewed contract containing:

1. product/platform context and an adopt/theme/extend/create decision;
2. semantic foundations with actual values: color roles, typography, spacing, layout/breakpoints, shape/elevation, icon and necessary motion rules;
3. only the components required by approved MVP CUJs;
4. applicable interaction, validation, loading, resilience, disabled, focus, and destructive states;
5. accessibility checks for contrast, focus, target size/spacing, non-color cues, semantic controls, keyboard/touch use, and reflow;
6. a runnable or concrete visual specimen with inspected mobile/desktop evidence;
7. implementation mapping, canonical source, ownership, version, and exception/change process.

## Minimum component-selection rule

Start from CUJ steps and include only what those steps require. Usually evaluate:

- page/app shell and responsive container;
- typography, links, icons, buttons, and icon buttons;
- only required inputs and selection controls, with labels/help/validation;
- loading/progress, empty, error, success, alerts, and recovery actions;
- navigation needed by the approved information architecture;
- data display, cards, tables, tabs, overlays, charts, or specialized controls only when a mapped CUJ requires them.

A component is not ready because one default screenshot exists. Show and specify all applicable states and input methods.

## Avoid MVP design-system theater

Do not require speculative themes, exhaustive component catalogs, brand books, animation libraries, or complex governance before the product has evidence for them. Do not skip concrete values, states, accessibility, or implementation mapping in the name of speed. The right minimum is the smallest system that prevents the first approved journeys from becoming inconsistent or inaccessible.

## Sources

- U.S. Web Design System, “Design tokens”: https://designsystem.digital.gov/design-tokens/
- U.S. Web Design System, “Components”: https://designsystem.digital.gov/components/overview/
- U.S. Web Design System, “Design principles”: https://designsystem.digital.gov/design-principles/
- GOV.UK Design System, “Styles”: https://design-system.service.gov.uk/styles/
- GOV.UK Design System, “Components”: https://design-system.service.gov.uk/components/
- GOV.UK Design System, “Get started”: https://design-system.service.gov.uk/get-started/
- W3C WAI, WCAG 2.2 Understanding SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C WAI, WCAG 2.2 Understanding SC 2.4.7 Focus Visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- W3C WAI, WCAG 2.2 Understanding SC 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C WAI, WCAG 2.2 Understanding SC 4.1.2 Name, Role, Value: https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- W3C WAI, WCAG 2.2 Understanding SC 1.4.10 Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
