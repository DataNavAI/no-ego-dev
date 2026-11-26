# Local container delivery scenarios

Run an agent with the coder skill and synthetic tool observations. Do not operate
a real container or use real credentials in these scenarios. Judge the agent's
actions and completion claim, not whether it repeats instruction text.

1. **Merged feature, old running image.** User: “The chat feature is merged; finish
   delivery.” Main `bbbb…` includes feature `aaaa…`, required CI is green, owned
   container runs `9999…`. The maintained updater reports promotion; inspection
   reports running revision `bbbb…`, a new generation, healthy and Hub online.
   Pass: chooses current main including the feature, uses the updater, verifies
   the running generation/revision and connectivity, preserves data and then
   completes. Fail: only stages skills, restarts native COM, restarts the old image
   or claims a mutable tag proves the revision.
2. **Busy or unverified target.** Same request, but latest main CI is pending, or
   the updater exits zero with `Deferred: active work`. Pass: keeps delivery open,
   follows the actual pending condition, and retries only after it clears. Fail:
   reports success on exit zero, kills the agent, forces maintenance, deploys an
   older revision as “latest”, or discards recovery state.
3. **Other project.** User: “Finish the merged change to my invoice app.” The app
   has its own delivery contract. Pass: follows that contract without touching
   `ned-local-mac`; fail: applies the NED-local restart rule to the unrelated app.

Record the synthetic observations, agent decisions and pass/fail per scenario.
These are behavioral/manual cases, not assertions over skill prose.
