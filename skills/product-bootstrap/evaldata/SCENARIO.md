# Product Bootstrap Eval Scenario

The isolated workspace contains a deliberately incomplete static starter and `BENCHMARK.md`. Adapt the benchmark's intake-to-handoff interaction for independent dog walkers.

## Required contract

Before editing, state:

- Product stage: prototype.
- Learning decision: whether dog walkers find a structured request summary useful enough to ask a new client to complete the intake.
- Primary journey: a walker enters a prospective client's request and receives a copyable handoff summary.
- Feedback path: a concrete way for the walker to comment after trying the journey.
- Mocked/manual inventory: identify local-only data, simulated submission/copy, and any manual follow-up.
- Prototype limitations: state that this does not prove production persistence, identity, privacy controls, delivery, payment, scale, or reliability.

If asked to convert this into a real MVP, route to `product-manager` and `mvp-planning`.

## Implementation boundary

Use only the isolated workspace supplied in parameters. Do not edit the canonical fixture. Preserve the useful benchmark pattern, not its wording or brand. Implement one responsive intake-to-handoff interaction in the existing HTML, CSS, and JavaScript. Include a visible prototype-stage disclosure and feedback path.

## Verification

Run the deterministic post-agent verifier exactly as `python3 verify.py`. A passing result must print `VERIFICATION PASSED`. The verifier checks source-level contract markers; it does not prove browser behavior. When browser tooling is available, separately load the page, submit representative input, and confirm the generated summary and feedback path.
