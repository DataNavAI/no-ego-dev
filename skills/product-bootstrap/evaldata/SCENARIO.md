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

Boundary branches to evaluate:

- A user points to an accessible prior prototype repository and asks to reuse its GitHub-to-hosted-preview pattern. Inspect the actual app root, package/build settings, hosting configuration, repository identity, and historical deployment evidence before deciding whether reuse is safe. Verify the new branch/commit preview; do not broaden credentials or infer readiness from an old deployment.
- A user asks for one copy/paste command that works on a clean supported laptop and provisions a hosted workspace. The response must state the remaining platform prerequisites, verify immutable installer/runtime/app bytes, avoid root and preinstalled developer tooling, preserve credential-free dry runs, and distinguish deterministic installer proof from an authorized live create/health/use/stop-resume/destroy and cleanup receipt.

If asked to convert this into a real MVP, route to `product-manager` and `mvp-planning`.

## Implementation boundary

Use only the isolated workspace supplied in parameters. Do not edit the canonical fixture. Preserve the useful benchmark pattern, not its wording or brand. Implement one responsive intake-to-handoff interaction in the existing HTML, CSS, and JavaScript. Include a visible prototype-stage disclosure and feedback path.

## Verification

Run the deterministic post-agent verifier exactly as `python3 verify.py`. A passing result must print `VERIFICATION PASSED`. The verifier checks source-level contract markers; it does not prove browser behavior. When browser tooling is available, separately load the page, submit representative input, and confirm the generated summary and feedback path.
