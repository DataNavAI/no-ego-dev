# Browser Provisioning UI Guidelines

Status: DRAFT — review-only discovery
Related issue: https://github.com/DataNavAI/no-ego-dev/issues/23

## Product context

- **Target user:** a product-minded builder who wants a private NED without terminals, package managers, or infrastructure decisions.
- **Primary journey:** enter browser → establish identity → authorize compute/model access → create one workspace → watch resumable progress → send first request.
- **Tone:** calm, concise, trustworthy, and operationally honest.

## Design principles

1. One primary job and one dominant action per state.
2. Explain provider purpose, revocability, cost consequence, and cleanup outcome before asking for trust.
3. Prefer safe defaults; do not expose infrastructure configuration in the beta path.
4. Never imply delegated OAuth, completion time, cleanup, or zero-running-cost status without backend evidence.
5. Make interrupted setup, return, retry, and permanent deletion understandable without support.

## Layout and responsive rules

- Desktop uses a centered content shell with at most two task columns; explanatory context must not compete with the primary action.
- Mobile uses one column, full-width primary actions, 44px minimum targets, and no persistent operations rail.
- Long provider and failure copy wraps; state/status never relies on color alone.
- Prototype-only state navigation may scroll horizontally and must not ship as production navigation.

## Visual language

- Strong sans-serif hierarchy, restrained negative tracking, readable body lines, soft neutral surfaces, green for safe/healthy outcomes, rust only for destructive or failed states.
- Borders and fills establish grouping; shadows are minimal.
- Motion is optional, subtle, and disabled with `prefers-reduced-motion`.

## Components and states

- Provider rows identify provider, purpose, and connected/revocable status without displaying tokens.
- Primary buttons are explicit verbs: **Create my NED**, **Send to NED**, **Resume NED**.
- Progress exposes verified stages and says when leaving is safe.
- Failure states name the failed stage, sanitized cause class, verified cleanup state, and recovery action.
- Destroy requires an unchecked acknowledgement and never receives default focus.

## Accessibility baseline

- Semantic headings, visible labels, native inputs/checkboxes, logical keyboard order, visible focus, text status alongside color, reduced-motion support, and live-region announcements for async status in production.
- Verify WCAG AA contrast and screen-reader behavior before implementation approval.

## Copy rules

- Minimum necessary text; retain trust, recovery, privacy, cost, and destructive-consequence copy.
- Do not say “instant,” “free,” or promise an exact duration without measured evidence.
- Never place prompts, responses, credentials, or provider tokens in analytics.

## Deferred decisions

- Confirm platform-managed, quota-limited beta ownership. User-owned Daytona delegated OAuth remains an unverified future option and is not part of the current action contract.
- Identity provider/account recovery.
- Final legal/security approval of trust language.
