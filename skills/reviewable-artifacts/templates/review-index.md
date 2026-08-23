# Review: <artifact or feature>

> **Canonical artifact:** `<path>`
>
> **Revision:** `<commit or revision ID>`
>
> **Status:** `DRAFT | IN REVIEW | CHANGES REQUESTED | APPROVED | BLOCKED`
>
> **Decision owner/reviewer:** `<name or role>`
>
> **Review URL:** `<draft PR / rendered artifact>`
>
> **Decision requested:** `<one sentence>`
>
> **PR mode:** `REVIEW_ONLY | MERGEABLE`
>
> **Review-only warning:** `REVIEW ONLY — DO NOT MERGE` when applicable
>
> **Canonical destination/handoff:** `<branch, PR, or artifact path>`
>
> **Cleanup owner/trigger:** `<owner> / <approved, abandoned, or superseded>`

## TL;DR

- Problem/user:
- Recommendation:
- Largest tradeoff:
- What the reviewer should decide:

## Review order

1. Read `Decisions requested`.
2. Review the recommendation and alternatives.
3. Open linked evidence/details only where needed.
4. Leave an inline PR comment beside the exact `DEC-*`, `Q-*`, `RISK-*`, or `UI-*` item.

## Decisions requested

| ID | Decision | Recommendation | Alternatives | Reviewer status |
|---|---|---|---|---|
| `DEC-01` | ... | ... | ... | [ ] accept [ ] change [ ] discuss |

## What changed since the last revision

| Review ID | Change | Reason/source | Revision |
|---|---|---|---|
| `DEC-01` | ... | ... | ... |

## Main artifact

### `DEC-01` — <decision title>

<Short, focused section containing one coherent decision.>

### `RISK-01` — <risk title>

- Impact:
- Mitigation:
- Evidence:

## Visual review index

### `UI-01` — <variant/screen>

![UI-01 — descriptive alt text](<relative screenshot path>)

- Runnable prototype/preview:
- Primary CUJ/action count:
- Key tradeoff:
- Hotspots: `A1`, `A2`, `A3`

| Hotspot | Component/region | Behavior or question |
|---|---|---|
| `A1` | ... | ... |

## Open questions / blockers

- [ ] `Q-01` — ...

## Evidence and details

<details>
<summary>Open supporting evidence</summary>

- Source:
- Verification:

</details>

## Feedback disposition log

| Comment/thread | Review ID | Disposition | Change or rationale | Revision | Status |
|---|---|---|---|---|---|
| `<URL or thread ID>` | `DEC-01` | accepted | ... | `<commit>` | resolved |

## Review-only cleanup record

- Outcome: `APPROVED | ABANDONED | SUPERSEDED`
- Closed review PR URL:
- Closed without merge: [ ]
- Accepted revision preserved at canonical destination:
- Remote `review-only/*` branch deleted: [ ]
- Local review branch/worktree removed: [ ]
- Temporary previews/captures/copies/access removed: [ ]
- Durable decision record and evidence retained: [ ]
- Residual cleanup task/owner, if any:
