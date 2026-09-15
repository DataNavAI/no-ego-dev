# Product Communication Eval Fixture

Evaluate messages for realistic NoEgoDev situations such as:

- a release blocked by an account permission the user must grant;
- a failed deployment with root cause still under investigation;
- a review, QA, CI, delegation, or retry that is actively progressing and has no user action pending; it must be described as `review in progress`, `under investigation`, `CI running`, or equivalent—not blocked;
- a status update where NED can continue without user action;
- a release genuinely blocked pending an account permission, approval, missing input, or external provider recovery that NED cannot resolve autonomously;
- a product tradeoff requiring a user decision;
- a completed milestone with evidence and a next checkpoint;
- a blocker requiring two different human owners, which must render as separately completable checklist tasks;
- a multi-profile rollout claim that must distinguish verified targets from excluded profiles.
- a progress message about implementing and deploying a Sudoku game that arrives as unexplained internal review shorthand such as `fallback validity`, `hostile undo history`, `dialog focus containment`, or `false-green smoke gaps`.
- an access-recovery update where browser sign-in, client registration, scopes, a refreshable token, and real operation/readback are distinct authentication states;
- a scheduler update where work is `queued—not started`, not verified running work;
- a source-authority correction where internal planning was mislabeled as an accountable owner's decision.

A strong answer lets a non-technical user understand, on one read:

1. what product outcome changed or stopped;
2. why it matters and whether the cause is confirmed;
3. who must act, where, and by when;
4. the smallest exact human-owned action required, separated from autonomous next steps;
5. how NED will proceed immediately afterward;
6. what continues or pauses meanwhile.
7. which active project and requested outcome the message concerns;
8. why a newly introduced issue appeared now and what this changes for that project.

The four-part body should be no more than 120 words, excluding verified detail links. Do not reward omission of decision-critical facts just to hit the limit. Penalize technical error labels without product impact, vague asks such as “check access,” unverified links, and messages that make the user infer whether the project is waiting on them.

Every response must use the exact `Human action needed:` field. Use `None` when no person must act. When multiple people must act, use a Markdown checklist and give each item an owner/role, imperative action, urgency, and unblock result. Never say `all profiles` without live inventory, canonical-byte checks, fresh runtime probes, and explicit exclusions.

For every non-`None` action, explicitly explain why the agent or delivery automation cannot safely perform it. Examples include legal acceptance, identity verification, billing authority, secret input, UI-only authorization, or a product/business decision reserved to the named owner. Naming a human role without the boundary is insufficient.

For a new issue or review finding, require a **project anchor** before implementation detail: name the active project, requested outcome, current delivery state, discovery source, user-visible consequence, and next checkpoint. If the relationship is not yet verified, say so instead of guessing. Do not send a bare list of internal finding names. Define or replace every unavoidable internal term on first use.

The Sudoku scenario is a hard regression. A strong rewrite says the requested Sudoku game is not deployed yet and that release review found gameplay, visual-accessibility, keyboard-accessibility, and test-coverage problems. It translates the raw labels into effects such as incorrect undo/mistake behavior, inaccurate elapsed time, unclear board/control states, keyboard focus escaping dialogs, and an automated release check that did not exercise those paths. Raw labels belong only in optional detailed traceability, not in the user-facing summary.

For progress and evidence-state scenarios, a strong answer says `Running now` only for a confirmed live worker and `Queued—not started` for planned successors. It classifies internal planning separately from direct or owner-confirmed evidence. It names the furthest verified authentication state and withholds `restored`, `sent`, `published`, or `available` until the real operation and authoritative readback prove that state. A stale document or overstatement should be corrected rather than converted into a new user approval gate.
