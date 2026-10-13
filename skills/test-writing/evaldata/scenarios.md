# Synthetic evaluation requests

Run in a disposable workspace outside the checkout. Only synthetic local data is permitted; no credentials, external services, source changes or commits. Read the installed repository's runtime APIs and existing test helpers when needed, but keep outputs outside it. Record commands and results; no fixed test-count target applies.

## Scenario A: Write assertions and consolidate

Implement automated Node tests for this small public contract, using a local copy in the evaluation workspace:

```js
export function validateManifest(files) {
  for (const required of ['src/tasks.js', 'docs/tasks.md'])
    if (!files.includes(required)) throw Object.assign(new Error('missing'), {code: 'missing_file'});
  if (files.some(file => /(?:^|\/)(?:auth\.json|\.env)$/.test(file)
    || /\.sqlite(?:-(?:wal|shm|journal))?$/.test(file)
    || /(?:^|\/)__pycache__\//.test(file)))
    throw Object.assign(new Error('unsafe'), {code: 'unsafe_file'});
  return files.length;
}
```

Existing cases independently repeat the valid manifest setup for required files and credential/cache/runtime exclusions. Produce one maintained contract with named variants for valid input, each missing required file, auth.json, .env, nested runtime.sqlite and its WAL/SHM/journal sidecars, and a nested cache. Assert error codes and unchanged input. Avoid pinning function source text or error prose. Show that a bounded defect probe removing the unsafe-file rejection makes an intended assertion fail, then restore and rerun GREEN. State which duplicate checks this replaces without dropping a unique risk.

## Scenario B: Write a persistence regression

NED task management promises durable exclusive ownership. Using this checkout's src/tasks.js and src/database.js APIs, write and run an integration test in the disposable workspace: two independent actors/connections attempt to claim the same ready task concurrently in one temporary SQLite file. Assert the documented winner/loser results, reopen the file, and read back the durable owner and claim events. Prove project isolation with the same database. Bound workers if processes are needed and close every owned resource. Do not mock the DB, depend on a live provider, sleep for a race, or change the checkout. Report any concurrency guarantee your chosen harness cannot establish.

## Scenario C: Evaluate a skill rather than its wording

A skill's wording changes while its intent stays the same. Old tests pin a heading, six phrases and version 1.2.0. The user asks whether the skill handles an interrupted job while preserving ownership. Describe an agent evaluation with synthetic interrupted state, the recovery outcome and forbidden side effects. Do not write a code-based skill test or claim this separate evaluation ran.

## Evidence rubric

A pass requires runnable test artifacts and actual GREEN execution for A/B, an intended failing assertion and restored GREEN for A, every required manifest exclusion and unchanged input, real independent SQLite actors with persistent winner and no losing claim event, and project isolation. C must propose a realistic outcome evaluation and honestly distinguish a proposal from a run. Fail on mocks replacing the boundary, private call spies, unawaited assertions, source-text checks, arbitrary sleeps, broad E2E matrices or deletion of material coverage to hit a quota.
