# Browser Provisioning Feature UI Brief

Status: IN REVIEW — REVIEW_ONLY / DO NOT MERGE
Related issue: https://github.com/DataNavAI/no-ego-dev/issues/23
Related product contract: `docs/ned-create/PRD.md`, `docs/ned-create/CUJ.md`
Guideline: `docs/browser-provisioning-design/UI_GUIDELINES.md`
Human review index: `docs/browser-provisioning-design/DESIGN_REVIEW.md`
Expected implementation PRD/spec: to be created after design and compute-ownership decisions

## CUJ and scope

A user with no local tooling creates one private NED from a browser, sees trustworthy resumable progress, sends the first request, returns to the same workspace, and can permanently destroy it.

Three interaction directions cover `SCREEN-01` entry, `SCREEN-02` authorization, `SCREEN-03` progress, `SCREEN-04` failure/retry, `SCREEN-05` first request, `SCREEN-06` resume, and `SCREEN-07` destroy. Desktop and mobile-web captures are included.

## MVP UX scope check

- **Entry → value:** sign in → connect NED compute → connect OpenRouter → Create my NED → send first request.
- **Removed:** region, image, CPU/RAM/disk, terminal commands, package-manager setup, and raw Daytona API-key form.
- **Primary action:** exactly one dominant product-owned next action per screen.
- **Parked:** broad workspace dashboard, activity feed, advanced settings, multi-workspace management, and provider management beyond required authorization/revocation guidance.

## Design directions

- `UI-01` Guided setup — recommended; trust and setup remain together.
- `UI-02` Focused staged setup — lowest cognitive load; weaker lifecycle continuity.
- `UI-03` Workspace lobby — useful future lifecycle reference; too operational for beta setup.

Recommendation: select `UI-01`, optionally borrowing `UI-02`’s focused redirect-return treatment.

## Image index

| ID | Desktop | Mobile | Purpose |
| --- | --- | --- | --- |
| `UI-01` | `screenshots/ui-01-desktop.png` | `screenshots/ui-01-mobile.png` | Recommended guided journey |
| `UI-02` | `screenshots/ui-02-desktop.png` | `screenshots/ui-02-mobile.png` | Staged wizard comparison |
| `UI-03` | `screenshots/ui-03-desktop.png` | `screenshots/ui-03-mobile.png` | Lifecycle-lobby comparison |

The storyboard captions and visible `data-hotspot` identifiers are the annotated implementation references; clean state-by-state visuals remain runnable in the prototypes.

## Interaction legend

| ID | Component | Behavior and state contract |
| --- | --- | --- |
| `A1` | Compute authorization | Checks or enrolls platform-managed limited-beta access; no user API key is requested. |
| `A2` | OpenRouter authorization | Starts server-mediated OAuth PKCE; duplicate flows are prevented. |
| `A5` | Create my NED | Submits one idempotent provisioning request and resumes the same request after refresh. |
| `A6` | Create NED again | Reuses the provisioning intent after verified deletion of the incomplete workspace. |
| `A7/A8` | First request/send | Uses a visible label, emits no prompt analytics, and shows pending/success/sanitized failure. |
| `A9` | Resume NED | Restores the same stopped workspace. |
| `A10/A11` | Acknowledge/destroy | Requires explicit acknowledgement; awaits verified remote deletion before clearing product state. |

## Copy, accessibility, and responsive acceptance

- Tokens remain server-side and never enter URLs, browser storage, chat, or analytics; legal/security must approve final wording.
- No availability, duration, or cleanup claim may outpace backend evidence.
- Mobile uses one column and full-width primary actions; desktop avoids admin-console density.
- Production adds async live regions, complete keyboard-order tests, OAuth redirect fallback, offline/poor-network recovery, session-expiry handling, and contrast verification.

## Open decisions

1. `DEC-01`: confirm the platform-managed, quota-limited beta working assumption. User-owned Daytona delegated OAuth is an unverified future option only.
2. `DEC-02`: select/combine/reject `UI-01`–`UI-03`.
3. `DEC-03`: approve the five visible product actions to first value: sign in, connect NED compute, connect OpenRouter, create, and send.
4. `DEC-04`: destroy removes workspace files; provider grant revocation remains separate.

## Review gates

- English copy review round 2: NEEDS ITERATION; all three contract findings corrected in revision 3; final re-review pending.
- Independent UI review round 2: technical/visual dispositions verified; final verdict BLOCKED on complete continuity and human `DEC-01`. Revision 3 supplies continuity; `DEC-01` remains pending.
- UI review guideline: `UI_REVIEW_GUIDELINE.md` frozen for revision-3 review.
- Human design decision: PENDING.
- Architecture/implementation handoff: BLOCKED until final review gates and `DEC-01` pass.
