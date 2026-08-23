# Fresh agent-test gate

Code changes must be agent-tested for the exact final **code candidate** before a pull request can merge. The PR head must then be an evidence-only follow-up commit, so the candidate SHA is both exact and not self-referential.

1. Make and commit the code change.
2. Run the relevant agent test in a clean environment (prefer a fresh Docker container for installer/runtime changes).
3. Create `.github/manual-test-result.json` in an evidence-only follow-up commit:

```json
{
  "candidate_sha": "<exact SHA of the final code candidate>",
  "result": "pass",
  "tested_at": "2026-08-18T12:00:00Z",
  "environment": "fresh node:22-bookworm Docker container",
  "commands": ["npm test", "<manual command>"],
  "observations": "<concise user-visible result>"
}
```

4. Push both commits. The `manual-test-gate` check must pass before merging.

The check rejects missing evidence, non-passing results, future timestamps, evidence not tied to the exact final code candidate, and PR heads that contain anything other than the evidence file. Documentation-only changes do not require a result. Do not put credentials or secret values in evidence.
