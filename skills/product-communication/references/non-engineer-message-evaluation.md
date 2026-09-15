# Non-Engineer Message Evaluation

Use this reference when reviewing agent-to-user status messages, especially messages about software delivery, incidents, automation, or release state.

## First-read comprehension test

Assume an intelligent recipient with no software-engineering background. After one read, they should be able to answer in their own words:

1. What changed or happened?
2. Who or what is affected?
3. Why does it matter?
4. What is the current state and what remains uncertain?
5. Do I personally need to do anything, and what happens next?

If a core answer requires understanding acronyms, repository mechanics, CI terminology, commit identifiers, or tool internals, the message needs revision. Technical evidence may appear after the product consequence, not instead of it.

## Weighted rubric

Score out of 100:

- Product and user outcome: 15
- Non-engineer first-read comprehension: 25
- Human-action boundary: 15
- Context and 5W1H completeness: 10
- Status structure and semantics: 10
- Cognitive load and brevity: 10
- Evidence and epistemic honesty: 10
- Respectful, accessible tone: 5

Approve only at 85 or above, with no hard-fail gate, and only when the five-question readback is complete.

Keep qualitative classification separate from deterministic decision logic. A reusable scorer should accept the eight dimension scores, hard-fail gates, and first-read result; it should then total the score and apply the threshold exactly. Freeze representative exact-score cases in structured fixture data and test threshold, hard-fail, and first-read overrides independently.

## Hard-fail gates

Require revision regardless of score when the message:

- claims success, availability, causality, scope, timing, or evidence that was not verified;
- hides the product consequence behind unexplained jargon;
- omits or misuses the exact `Human action needed:` field;
- asks the user to perform work automation can safely complete;
- asks for a consequential human action without owner, imperative task, timing/condition, result unblocked, and reason automation cannot safely perform it;
- exposes sensitive data;
- distorts severity or invents evidence.

Use redaction-safe gate labels in behavioral fixtures. Avoid secret-shaped strings and labels that can cause the evaluation harness to scrub or truncate the result. Represent an exposure descriptively without embedding real or token-shaped data.

## Evidence-bound rewriting

A rewrite must not improve readability by inventing certainty.

- Separate correlated facts unless evidence proves causality.
- Say `timing is unknown` or use `<decision deadline>` rather than asserting that no deadline exists.
- Say no verified user-accessible link was *supplied for this evaluation* rather than asserting that no link exists.
- Distinguish command success from product availability. For example: `The upload command returned without an error, but tester availability has not been verified.`
- Preserve unknown audience, scope, owner, dates, and causes as explicit unknowns or angle-bracket placeholders.

## Behavioral-EVAL design pitfalls

Model-judged evaluations need deterministic companions:

1. Keep actual secrets and secret-shaped placeholders out of fixtures.
2. State exact evidence boundaries for cause, absence, timing, links, and success.
3. Include technically accurate but opaque messages, good no-action messages, incorrect action delegation, and misleading/sensitive messages.
4. Freeze exact score/verdict oracles separately from the judge prompt.
5. Test that optional typography is not promoted into a material finding when severity is accurate.
6. Iterate on fixture ambiguity, not only prose, when a judge consistently identifies unsupported inferences.

The evaluator should report material findings only. Do not turn capitalization, preferred wording, or optional polish into blockers.
