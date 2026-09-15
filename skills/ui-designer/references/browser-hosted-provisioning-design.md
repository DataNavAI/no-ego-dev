# Browser-hosted provisioning design review pattern

Use this pattern when a product moves from CLI/bootstrap onboarding to a browser that provisions paid or credentialed infrastructure.

## Product decisions before architecture

- Compute/billing owner: platform-managed quota-limited beta versus user-owned provider account.
- Authorization feasibility: verify a provider-supported third-party web OAuth/PKCE and refresh/revocation lifecycle; do not infer it from a CLI loopback login.
- Secret boundary: no token in URLs, browser storage, analytics, chat, progress payloads, client logs, or support artifacts.
- Lifecycle contract: idempotent create, refresh-safe progress, compensating cleanup, resume of the same workspace, and remote deletion readback.
- Do not expose generic hosted shell execution. Submit a typed allowlisted provisioning request to an isolated worker.

## Required visual states

Show desktop and mobile for entry, provider purpose/authorization, ready-to-create, typed progress, failure plus verified cleanup/retry, first-value request, resume, and permanent delete. Treat status navigation used to display storyboard states as prototype-only controls, not production IA.

## Bundle completeness probe

Before publication, inventory and open all of:

- project UI guideline;
- feature UI brief;
- runnable variants;
- clean desktop/mobile captures;
- `DESIGN_REVIEW.md` with stable IDs and embedded images;
- copy-review report;
- independent UI-review report;
- review-only lifecycle/cleanup record.

A successful capture script is not enough. Visually inspect representative light/dark and desktop/mobile outputs for punctuation/word spacing, headline tracking, clipped state controls, input text clipping, contrast, line wrapping, and destructive-action hierarchy. Regenerate captures after every source or typography change.

## Evidence-bound copy

Do not promise delegated OAuth availability, exact completion times, successful cleanup, or zero running compute unless the backend can prove each claim. Use conditional copy in prototypes and require production state to come from verified server evidence.
