# Fresh manual test gate

Code changes must be manually exercised for the exact releasable pull-request candidate before a pull request can merge.

1. Make and commit the code change.
2. Run the relevant manual test in a clean environment (prefer a fresh Docker container for install/runtime changes).
3. Create `.github/manual-test-result.json` in a follow-up commit:

```json
{
  "candidate_sha": "<exact SHA of the releasable pull-request candidate>",
  "result": "pass",
  "tested_at": "2026-08-18T12:00:00Z",
  "environment": "fresh node:22-bookworm Docker container",
  "commands": ["npm test", "<manual command>"],
  "observations": "<concise user-visible result>"
}
```

4. Push both commits. The `manual-test-gate` check must pass before merging.

The check rejects missing evidence, non-passing results, future timestamps, and evidence tied to any SHA other than the exact candidate SHA. Documentation-only changes do not require a manual result. Do not put credentials or secret values in the evidence file.
