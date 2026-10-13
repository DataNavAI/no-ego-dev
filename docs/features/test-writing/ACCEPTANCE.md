# Behavioral acceptance evidence

Evaluation date: 2026-10-12. Scope: the test-writing skill and repository discovery policy, evaluated by fresh isolated Codex agents. No live providers, credentials, repository mutations or persisted runtime data were used. Generated test artifacts and execution logs remained in disposable workspaces outside this repository; this document records reviewed evidence rather than committing runtime state.

## Evaluated inputs

- `skills/test-writing/SKILL.md` — SHA-256 `b611e9904f7cd159511887b38116193d11ce56a32cd7f53eae983a89ed29c855`.
- `skills/test-writing/evaldata/scenarios.md` — SHA-256 `b1953e87fc256be24fbddfbf86c654d0a0f40e69b82cfa237c502947e7ed93fb`.
- `skills/test-writing/EVAL.yaml` — SHA-256 `e2726f4bfc6f7adf98e6763aa2fe2860c174820b8907bacfdb5a1d57f93d89b5`.

## TC-001: Runnable automated tests — PASS

The evaluating agent generated Node test artifacts using node:test/assert and the real NED task service. Parent review inspected the generated assertions and actual command results:

- Manifest contract: 12 named cases passed, covering valid input, each missing required file, root/nested auth.json and .env, nested SQLite plus WAL/SHM/journal sidecars, and nested caches. Every variant asserted unchanged input; rejections asserted documented error codes.
- A temporary mutation to the evaluation-only manifest validator removed unsafe-file rejection. The same tests exited 1 with nine intended missing-exception assertion failures. The original validator was restored; the same tests exited 0.
- Persistence: a separate integration case used two worker actors with independent real SQLite connections and a readiness barrier. Exactly one claim succeeded and one returned not_owner. A reopened connection read the winning owner and exactly one claim event, with no losing actor event. Foreign-project read/claim returned not_found and preserved both projects' data/events.
- Combined execution passed 13 generated tests with zero skips, cancellations or TODOs. Teardown closed owned services, terminated/awaited workers and removed test-owned temporary data. Child execution and barriers had bounded timeouts; no arbitrary sleep or blind retry was used.

Commands were `node --test <temporary-workspace>/manifest.test.mjs`, `node --test <temporary-workspace>/claims.test.mjs`, and the combined command with both paths. These are evaluation artifacts, not additional repository skill tests.

The old-skill baseline also produced passing manifest/persistence tests and intended RED/restored GREEN. This small comparison establishes acceptance, not a statistically measured improvement. Worker concurrency does not force every SQLite lock interleaving or establish process-crash recovery; those claims were not made.

## TC-002: Skill evaluation and discovery — PASS

A fresh agent received a generic regression-test strategy request with repository AGENTS.md, without naming test-writing in the request. Its initial catalog contained the repository skill; it read AGENTS.md and canonical skills/test-writing/SKILL.md, and produced a focused real-SQLite test strategy. It did not load every skill or write code tests of skill instructions.

The agent demonstrated direct-file fallback by reading the canonical file without catalog selection. A clearly nonexistent temporary skill path returned a missing-file result; the agent reported absence without inventing instructions. The original symlink discovery links resolved to the canonical version at that evaluation; current regular-file routing is verified below. The explicit read-only/no-services/no-code-based-skill-tests constraints were preserved.

For scenario C, agents described ownership-preserving recovery evaluation using synthetic interrupted state, durable before/after readback and forbidden side effects. They explicitly identified this as a proposal, not an executed recovery run. The acceptance criterion here is correct evaluation design and honest reporting; execution of a different recovery skill is outside this skill's scope.

The discovery evidence is a fresh isolated Codex agent task using this checkout's catalog and instructions; it does not claim that every desktop host, profile or long-lived session was refreshed.

## Discovery compatibility correction — PASS

Fresh CI showed Hermes rejects symlinks in profile sources. Discovery now uses regular `.agents/skills/<name>/SKILL.md` files carrying name/description and a link to the canonical workflow, rather than symlinks or copied workflow bodies. A fresh read-only agent loaded the test-writing and unblocker discovery files, followed their canonical links, produced the requested SQLite concurrency strategy, demonstrated direct canonical fallback, and reported a nonexistent skill path without inventing instructions. It preserved source and contacted no providers. The recovery evaluation remained explicitly proposed rather than executed. Canonical skill/eval/fixture hashes above are unchanged; this supplements TC-002's routing evidence and does not claim universal host refresh.
