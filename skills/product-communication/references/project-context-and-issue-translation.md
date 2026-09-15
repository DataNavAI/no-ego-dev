# Project Context and Issue Translation

## Failure pattern

A technically accurate progress note can still be unusable when it lists internal findings without naming the active project or explaining their consequences.

Reported anti-example:

> I’ve consolidated six material findings into one correction set. A focused remediation worker is adding regression coverage first, then fixing fallback validity, hostile undo history, max-mistake safety, elapsed-time accounting, board separators, dialog focus containment, disabled contrast, and the false-green smoke gaps.

The user had requested a Sudoku implementation and deployment. The message did not identify Sudoku, deployment readiness, user-visible impact, the next product checkpoint, or whether any action was required.

## Decision procedure

Before mentioning a new issue:

1. Recover the active project and requested outcome from the current conversation or verified project state.
2. Determine whether the issue’s relationship to that outcome is verified.
3. If verified, translate it into user-visible behavior or delivery risk.
4. If unverified, state that the relationship is under investigation; never infer a plausible product impact from an internal label alone.
5. Group related findings by consequence instead of preserving internal taxonomy.
6. End with the current response, next product checkpoint, and exact human-action boundary.

## Reusable rewrite

```markdown
**The requested Sudoku game is not ready to deploy yet.**

**Executive summary:** Release review found gameplay, accessibility, and test gaps: undo or mistake handling may behave incorrectly, the timer may be inaccurate, parts of the board may be hard to distinguish, and keyboard focus may escape dialogs. The automated release check also missed these paths. The team is correcting them and will next replay the complete game-and-deploy journey.

**Human action needed:** None

**Detailed information:** No user-accessible link is available.
```

Use only impacts supported by verified context. If the source provides labels but no mapping, replace the impact list with:

> Review found several internal concerns during work on the requested Sudoku deployment. Their effect on gameplay and deployment readiness is still being verified; the next update will report that relationship in plain language.

## Pre-send checks

- Does the first sentence name the project and requested outcome?
- Can the user tell whether the requested result is ready?
- Does every new matter have discovery, relationship, consequence, response, and action context?
- Were internal labels translated or omitted rather than dumped?
- Is uncertainty explicit where the relationship is not verified?
- Is the next checkpoint a product checkpoint rather than a worker/process event?
