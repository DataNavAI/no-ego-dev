# Browser Provisioning UI Review Guideline

Status: FROZEN FOR DESIGN REVIEW
Scope: Issue #23 browser provisioning beta
Approval owner: NED product owner

## Comparable product patterns

These comparables inform interaction patterns, not visual imitation:

| Comparable | Pattern to reuse | Pattern to avoid | Reference |
| --- | --- | --- | --- |
| Vercel | One dominant deployment action, staged progress, clear completion | Exposing implementation detail before first value | https://vercel.com/new |
| Railway | Concise provider/project connection and deployment status | Infrastructure-dashboard density for a first-time user | https://railway.com/new |
| Replit | Browser-first transition from intent to a working environment | Premature broad workspace navigation during setup | https://replit.com/ |
| Daytona | Workspace lifecycle terminology and recoverable provisioning | Claiming third-party delegated OAuth until provider support is verified | https://www.daytona.io/ |

Comparable URLs are review references; availability and exact current behavior must be rechecked before implementation.

## Review principles

1. The core journey is understandable without terminal, package-manager, cloud, or VPS knowledge.
2. Each state has one dominant next action and no dead production-looking controls.
3. Identity and each provider authorization are explicit, independently recoverable, and never represented by a raw API-key form.
4. Progress, cleanup, cost, privacy, and timing language never outruns backend evidence.
5. First value is represented by a real empty → pending → success/failure request transition.
6. Delete is disabled until explicit acknowledgement and shows pending, failure/retry, and verified completion.
7. Refresh/return resumes one idempotent intent and one workspace.
8. Desktop and 320px/390px mobile layouts have no document overflow; enabled controls are at least 44px.
9. Route transitions move focus to the destination heading; async state uses live-region semantics.
10. UI stays within one primary create/use journey; broad operations-console navigation is deferred.

## Approval bar

- **PASS:** no unresolved blocker/high finding; CUJ, trust, responsive, accessibility, and failure-state evidence are complete enough for product selection.
- **PASS WITH MINOR POLISH:** only non-blocking cosmetic/copy changes remain, each recorded with owner.
- **NEEDS ITERATION:** a material CUJ, trust, responsive, accessibility, interaction, or evidence defect has a bounded correction.
- **BLOCKED:** required product authority, compute-ownership choice, provider capability, immutable candidate identity, or review evidence is absent.

Implementation readiness is separate from visual direction approval. Production architecture remains blocked until Daytona authorization capability, platform-managed beta cost/abuse policy, identity provider, legal/security copy, and backend state contracts are approved.
