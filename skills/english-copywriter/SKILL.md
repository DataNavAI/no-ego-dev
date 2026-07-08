---
name: english-copywriter
description: "Use when writing, reviewing, or reducing English UI copy for websites and mobile apps, including headlines, labels, CTAs, onboarding, empty states, errors, confirmations, launch copy, and microcopy."
version: 0.1.0
author: NoEgoDev
license: MIT
metadata:
  hermes:
    tags: [no-ego-dev, copywriting, ux-writing, microcopy, product-design]
    related_skills: [ui-designer, ui-reviewer, product-manager, marketer]
---

# English Copywriter

## Overview

Own the English words users see in a product UI. Review and write interface copy for websites, web apps, and mobile apps from the perspective of a product copywriter / UX writer: clear, plain, useful, respectful, and short enough that the interface still feels self-explanatory.

The default bias is **minimum text, ideally no text, when the UI can explain itself through structure, labels, icons with obvious affordance, visual hierarchy, defaults, and progressive disclosure**. Text should remove uncertainty, not decorate the UI or compensate for confusing design.

## Research-backed principles

Use these principles when writing or reviewing UI copy. They synthesize common guidance from Apple Human Interface Guidelines, Google Material content design / UX writing guidance, Nielsen Norman Group UX writing research, GOV.UK plain-English standards, Shopify Polaris content guidance, and high-performing product/marketing UIs.

1. **Clarity beats cleverness**
   - Users should understand the action, state, and next step without decoding jokes, slogans, internal terms, or brand puns.
   - Prefer concrete nouns and verbs over abstract product language.

2. **Reduce copy before improving copy**
   - First ask: can layout, grouping, progressive disclosure, defaults, or a better control remove this sentence entirely?
   - If the UI is self-explanatory, remove helper text.
   - If users need the text only once, move it to onboarding, tooltip, details, or help instead of permanent chrome.

3. **Make actions verb-led and outcome-clear**
   - Buttons and menu commands should be brief, informative, and action-oriented: `Create project`, `Save draft`, `Send invite`, `Delete list`.
   - Avoid vague labels like `Submit`, `Continue`, `OK`, `Click here`, or branded verbs unless the next result is unmistakable.

4. **Write for scanning, not reading**
   - Put the user benefit, status, or required action first.
   - Use short headings, short labels, bullets for dense guidance, and one idea per line or paragraph.
   - UI text must survive a 5-second skim.

5. **Match the user's context and mental model**
   - Name objects the way users name them, not the way code or internal teams name them.
   - Use consistent terms across navigation, CTAs, empty states, errors, and docs.

6. **Guide without nagging**
   - Helper text should prevent a likely mistake or answer a real question.
   - Do not explain standard controls, obvious icons, or visible information.
   - Avoid empty encouragement like “You're almost there!” unless it reduces anxiety at a meaningful step.

7. **Errors must help users recover**
   - Say what happened, why if useful, and what to do next.
   - Avoid blame, codes, and dead-end messages.
   - Put recovery copy near the problem and pair it with the corrective action.

8. **Respect platform and surface constraints**
   - Mobile copy must be shorter, chunked, and thumb-flow friendly; avoid long instructions above forms or CTAs.
   - Desktop/web can hold more context, but should still keep primary actions and navigation labels compact.
   - Notifications, toasts, banners, and modals need especially tight copy because they interrupt users.

9. **Use plain English**
   - Prefer everyday words, active voice, present tense, and direct address when helpful.
   - Avoid jargon, legalese, filler, exclamation marks for routine states, and AI/productivity clichés.

10. **Make trust explicit only where needed**
    - Add reassurance near sensitive moments: payment, deletion, privacy, permissions, irreversible changes, account creation.
    - Do not scatter generic trust claims everywhere; prove trust through specifics, constraints, and clear consequences.

## Required workflow

1. **Identify the UI context**
   - Product, user, platform, screen/flow, business goal, desired action, constraints, and brand tone.
   - Read PRD/CUJ, UI guideline, UI review guideline, design brief, screenshots, prototype, or implemented UI when available.

2. **Inventory every visible text string**
   - Headlines, subheads, navigation, tabs, buttons, links, field labels, placeholders, helper text, tooltips, empty states, errors, success states, banners, modals, toasts, onboarding, pricing/trust copy, permission prompts, and confirmation/destructive copy.
   - Include text embedded in images/mockups when reviewing design artifacts.

3. **Run the minimum-text pass first**
   For each string, decide:
   - **Remove:** the layout/control/state already explains it.
   - **Replace with design:** use grouping, hierarchy, icon, default, state, or progressive disclosure instead of permanent text.
   - **Shorten:** keep the meaning but cut filler.
   - **Keep:** text is necessary for comprehension, trust, legal clarity, accessibility, or recovery.
   - **Add:** a missing label, accessible name, error recovery instruction, or sensitive-action consequence is needed.

4. **Rewrite necessary copy**
   - Use clear, concise English with the user's action/outcome first.
   - Keep CTAs and labels stable across the product.
   - Prefer specific verbs and nouns.
   - For error/empty states, include cause/context plus a next step when useful.

5. **Review with design and accessibility in mind**
   - Check whether copy fits the visual hierarchy and component size without wrapping awkwardly.
   - Verify mobile strings are not too long for small screens.
   - Preserve visible labels or accessible names when placeholders/icons are insufficient.
   - Do not remove text that is required for accessibility, comprehension, or legal/safety clarity.

6. **Return an actionable copy report**
   - Provide original → recommended text for important strings.
   - Mark removals and explain what visual/design change makes the text unnecessary.
   - Identify open questions for product/legal/brand only when they materially affect wording.

## UI copy review output format

Use this structure for design-iteration reviews unless the caller requested another format:

```markdown
## English copy verdict
Status: PASS | PASS WITH MINOR POLISH | NEEDS ITERATION | BLOCKED
One-line verdict: <plain-language assessment>

## Minimum-text pass
- Remove: <string/screen> — <why the UI can explain it>
- Replace with design: <string/screen> — <layout/state/control change>
- Shorten: <string/screen> — `<old>` → `<new>`
- Keep/add: <string/screen> — <why needed>

## Highest-impact rewrites
| Location | Current | Recommended | Reason |
| --- | --- | --- | --- |
| <screen/component> | <text> | <text> | <clarity/action/trust/accessibility> |

## Copy system notes
- Voice/tone:
- CTA conventions:
- Empty/error/success conventions:
- Terms to use/avoid:

## Ready bar for next pass
- ...
```

For Telegram or environments where tables are awkward, use bullets instead of a pipe table.

## Copy patterns

### CTAs and commands

- Good: `Create project`, `Save draft`, `Invite teammate`, `View report`, `Cancel plan`.
- Weak: `Submit`, `Proceed`, `OK`, `Go`, `Do it`, `Leverage AI`, `Optimize now`.
- Destructive actions must name the object and consequence: `Delete workspace`, `Remove card`, `Cancel subscription`.

### Empty states

Use the smallest useful structure:

```text
No reports yet
Create your first report to see launch progress here.
[Create report]
```

If the surrounding screen already makes the object clear, the body can often be removed:

```text
No reports yet
[Create report]
```

### Error messages

```text
We couldn't save your changes.
Check your connection and try again.
[Try again]
```

Prefer recovery over apology. Avoid raw error codes unless support/debugging requires them.

### Confirmation and destructive copy

```text
Delete workspace?
This removes all projects and cannot be undone.
[Delete workspace] [Cancel]
```

Only use modal text when the consequence is not already obvious from the action.

### Forms

- Labels should identify the field permanently; placeholders should not be the only label.
- Helper text should explain format, source, privacy, or consequence only when users need it.
- Put validation close to the field and say how to fix it.

### Mobile-specific copy

- Avoid long headings and multi-line CTA labels.
- Prefer short screen titles and one clear primary action.
- Replace repeated instructions with stepper state, progress, disabled states, defaults, and smart input controls.
- Keep bottom-sheet/modal copy especially concise.

## Project copy guideline template

When a project lacks copy conventions and the task is ongoing, add a concise section to the UI guideline or create `.projects/<project>/design/copy-guideline.md`:

```markdown
# English Copy Guideline: <project>

Last updated:
Owner: NED English Copywriter
Related UI guideline / PRD:

## Audience and context
- Users:
- Core jobs:
- Product tone:
- Reading context: mobile | desktop | busy workflow | sensitive decision

## Minimum-text rules
- Remove copy when:
- Replace text with UI structure when:
- Text is required when:

## Voice and tone
- Voice:
- Tone range:
- Avoid:

## Terms
- Use:
- Avoid:
- Object names:

## UI copy conventions
- Navigation:
- CTAs:
- Empty states:
- Errors:
- Success states:
- Destructive confirmations:
- Permission/privacy/payment moments:

## Examples
- Before:
- After:
- Reason:
```

## Common pitfalls

1. **Polishing too much text instead of deleting it.** The first pass is always “can the design remove this?” not “how can this sentence sound nicer?”
2. **Removing necessary labels.** Minimal copy is not invisible UX. Keep labels/accessibility names when icons, placeholders, or context are insufficient.
3. **Clever CTAs.** Buttons are not taglines. Users should know exactly what happens next.
4. **Generic AI/productivity filler.** Avoid phrases like “unlock your potential,” “supercharge,” “seamless experience,” and “AI-powered insights” unless backed by specific visible value.
5. **Dead-end errors.** Every error should help users recover or understand the next step.
6. **Desktop-length copy on mobile.** Mobile UI copy must be shorter and broken into interaction-sized chunks.
7. **Inconsistent object names.** Pick one term and reuse it across labels, CTAs, errors, and empty states.

## Verification Checklist

- [ ] All visible UI text was inventoried or the review scope was clearly limited.
- [ ] A minimum-text pass removed, shortened, or replaced unnecessary explanatory copy with clearer UI structure.
- [ ] Necessary text remains for comprehension, accessibility, trust, legal/safety, and error recovery.
- [ ] CTAs are verb-led and outcome-clear.
- [ ] Headings, labels, empty states, errors, confirmations, and success states use plain English.
- [ ] Mobile/app copy is short enough for small screens and touch-first flows.
- [ ] Recommendations include exact replacement strings or explicit design changes that make text unnecessary.
- [ ] Project copy conventions were added to the UI guideline or a copy guideline when the product needs durable reuse.
