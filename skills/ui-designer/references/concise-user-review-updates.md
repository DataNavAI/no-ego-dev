# Concise user review updates

Status updates should state only:

1. the user-facing capability or decision;
2. the one action needed from the user, if any; and
3. one material blocker or constraint, only when it changes that decision.

End with `Human action needed: None` when no person must act, or name the exact product decision or review action when one is required.

Avoid review-process narration, CI internals, prototype plumbing, and monitoring vocabulary in chat. Keep detailed decisions, evidence, and feedback in the durable review surface.

Example:

> **Action:** Approve or revise the account-recovery direction in the review deck.
>
> The flow preserves the last confirmed state while retry is pending and keeps an explicit cancel action available.
