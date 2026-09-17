---
name: english-copywriter
description: "Use when authoring or performing a specialist review of English product copy for websites and mobile apps, including headlines, labels, CTAs, onboarding, empty states, errors, confirmations, and microcopy."
version: 1.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, copywriting, ux-writing, microcopy, product-design]
    related_skills: [ui-designer, ui-reviewer, product-manager, marketer]
---

# English Copywriter

## Overview

Own the English words users see in a product interface. Write and assess copy that is clear, plain, useful, respectful, and short enough that the interface remains self-explanatory. Prefer no text when structure, controls, hierarchy, defaults, or progressive disclosure communicate the meaning safely.

This is a copy specialist, not a release authority. Use one of the two modes below and state which mode applies.

## Modes and authority

### Authoring mode

Use Authoring mode when creating or revising copy. Produce exact replacement strings and, when authorized, edit the requested copy artifacts. Authoring output is a proposal or implementation, not an independent approval of the same candidate.

### Specialist review mode

Use Specialist review mode for an advisory copy pass. Stay within copy truth, clarity, accessibility, action naming, state consistency, and recovery language. Do not turn layout taste, unrelated implementation quality, or product strategy into copy findings.

A specialist verdict is `PASS | NEEDS ITERATION | BLOCKED`:

- `PASS`: no material copy issue remains in the reviewed scope.
- `NEEDS ITERATION`: at least one material, actionable copy issue remains.
- `BLOCKED`: required copy surfaces or evidence are unavailable, contradictory, or cannot be assessed safely.

Omit reversible nits entirely. Do not report them as minor, optional, deferred, or polish. A tiny edit can still be material when it changes safety, privacy, accessibility, destructive-action consequences, factual truth, or the action a control performs.

This verdict is not a binding review, release approval, or immutable-candidate certification. Defer candidate identity, review lineage, round handling, independence, and final approval to the applicable canonical reviewer or orchestration skill, such as `ui-reviewer`, `spec-compliance-review`, or `immutable-candidate-verification`. If asked to author and review the same candidate, author the copy and request a fresh independent canonical reviewer for binding approval.

## Principles

1. **Clarity beats cleverness.** Prefer concrete nouns and verbs over slogans, jokes, internal terms, and branded verbs.
2. **Reduce before rewriting.** Remove helper text that repeats visible structure. Replace prose with grouping, defaults, state, or progressive disclosure when comprehension and accessibility remain intact.
3. **Name the outcome.** Prefer `Create project`, `Save draft`, and `Delete list` over `Submit`, `Continue`, or `OK` when the result is not already unmistakable.
4. **Write for scanning.** Lead with status, benefit, or required action. Use short headings and one idea per line.
5. **Use the user's terms consistently.** Keep object names stable across navigation, controls, errors, empty states, and documentation.
6. **Guide without nagging.** Add helper text only to prevent a likely mistake or answer a real question.
7. **Enable recovery.** State what happened and the next useful action. Avoid blame, dead ends, and raw codes unless support needs them.
8. **Respect the surface.** Mobile, toast, banner, and modal copy must be especially compact.
9. **Use plain English.** Prefer everyday words, active voice, present tense, and specific claims.
10. **Be truthful across states and evidence.** UI, accessible labels, payloads, documentation, and limitations must describe the same actual behavior.

## Required workflow

1. **Set mode and scope.** Identify product, user, platform, screen or flow, business goal, desired action, constraints, tone, and whether this is authoring or specialist review.
2. **Inspect the available artifact.** Read the brief, copy deck, screenshots, prototype, source, or implemented UI. Clearly state any surface that was not available.
3. **Inventory visible and accessible strings.** Include headings, navigation, buttons, links, labels, placeholders, helper text, tooltips, empty/error/success states, banners, modals, toasts, onboarding, pricing/trust copy, permission prompts, accessible names, and generated/share/export copy.
4. **Run the minimum-text pass first.** Classify necessary changes as remove, replace with design, shorten, keep, or add. Never remove text required for comprehension, accessibility, legal/safety clarity, trust, or recovery.
5. **Rewrite necessary copy.** Put the user's action or outcome first, use specific verbs and nouns, and keep terminology stable.
6. **Check state and claim truth.** For dynamic interfaces, use [interactive copy-truth probes](references/interactive-copy-truth-probes.md). For sourced claims and saved/following state, use [fact-source and state-copy closure](references/fact-source-and-state-copy-closure.md). For claims that evidence is present, use [candidate documentation and evidence claims](references/candidate-documentation-evidence-claims.md).
7. **Protect immutable review evidence.** When the task names an exact candidate and checksum manifest, verify the full candidate identity and every manifest entry before review, exercise the frozen source read-only, rerun the complete integrity check afterward, and block exact-candidate certification on any mismatch. Follow [frozen-snapshot UI-copy review](references/frozen-snapshot-review.md).
8. **Check design and accessibility fit.** Confirm labels remain available, copy fits its components, mobile strings stay usable, and hidden or accessible surfaces agree with visible copy. For an implemented hero change, follow [landing-page headline rollout](references/landing-page-headline-rollout.md) to compare copy in the real layout, synchronize every copy surface, and verify representative desktop/mobile rendering plus production readback.
9. **Return only material action.** Give exact current-to-recommended strings or an explicit design change. Escalate product, legal, or brand questions only when they materially change wording.

## Specialist review output

```markdown
## English copy verdict
Status: PASS | NEEDS ITERATION | BLOCKED
Scope: <reviewed surfaces and unavailable evidence>
One-line verdict: <material assessment>

## Minimum-text pass
- Remove: <string/screen> — <why structure can replace it>
- Replace with design: <string/screen> — <specific state/control change>
- Shorten: <location> — `<current>` → `<recommended>`
- Keep/add: <location> — <why required>

## Material rewrites
- <location>: `<current>` → `<recommended>` — <clarity/action/truth/accessibility reason>

## Ready bar
- <material condition for the next independent review>
```

If the status is `PASS`, omit empty rewrite sections. Never add a section for reversible nits.

## Copy patterns

### Empty state

```text
No reports yet
[Create report]
```

Add a body only when it answers a question the heading and action do not.

### Recoverable error

```text
We couldn't save your changes.
Check your connection and try again.
[Try again]
```

### Destructive action

```text
Delete workspace?
This removes all projects and cannot be undone.
[Delete workspace] [Cancel]
```

Use a confirmation only when the consequence is not already clear and safely reversible.

### Forms and permissions

- Keep persistent labels; placeholders are not the only label.
- Explain format, source, privacy, or consequence only when needed.
- Put validation near the field and state how to fix it.
- Explain the concrete value of a permission and respect refusal.

## Durable copy conventions

For ongoing work, add a concise copy guideline to the project's established design documentation. Capture audience, tone, terms, minimum-text rules, navigation and CTA conventions, state/error patterns, and sensitive-action language. Do not invent a new project path when an established documentation location exists.

## Common pitfalls

1. Polishing unnecessary prose instead of deleting it.
2. Removing labels or consequences required for accessibility or safety.
3. Using clever or vague controls that hide the outcome.
4. Reporting taste-based nits that do not affect a material user outcome.
5. Treating authored copy as independently approved.
6. Checking visible text while missing stale accessible names, payloads, or state-dependent helpers.
7. Claiming evidence exists because a manifest or README references it.
8. Certifying an exact candidate after the requested SHA, manifest, or listed files changed during review.
9. Updating only the visible H1 while leaving stale document titles, localized/runtime strings, metadata, snapshots, or production copy.

## Verification Checklist

- [ ] Mode, specialist scope, and unavailable evidence are explicit.
- [ ] Visible and accessible copy in scope was inventoried.
- [ ] The minimum-text pass happened before rewriting.
- [ ] Necessary accessibility, trust, legal/safety, and recovery text remains.
- [ ] CTAs are specific and outcome-clear.
- [ ] Dynamic state, payload, documentation, and accessible copy agree.
- [ ] Recommendations contain exact strings or exact design behavior.
- [ ] Reversible nits are absent.
- [ ] Any binding approval is left to a fresh canonical reviewer.
- [ ] Exact-candidate reviews prove full SHA and manifest integrity before and after review and never repair concurrent candidate drift.
- [ ] Implemented headline changes were tested in the real desktop/mobile layout, synchronized across all copy surfaces, and read back from production after release.
