---
name: test-writing
description: Write and improve automated test code for software changes. Use when adding regression tests, implementing spec cases, fixing flaky tests, or pruning redundant coverage. Select material behavior, reliable fixtures, precise assertions and the smallest useful test layer.
---

# Test Writing

Write executable tests that catch plausible user-affecting defects and survive behavior-preserving refactors. Optimize for useful feedback, not test counts or coverage percentages.

## Choose the behavior to prove

Read the affected contract and existing tests before adding code. Identify the observable failure each test must detect and reuse an existing case when it already owns that risk. Prefer unit tests for pure decisions, focused integration tests for persistence and component boundaries, and a small end-to-end set for behavior that requires the assembled system. One test can cover several requirements; avoid repeating the same assertion at every layer.

Keep material regressions for data loss, credentials, ownership/isolation, atomicity, compatibility and cleanup. Use representative equivalence classes and boundaries rather than every input permutation. Add concurrency, crash or retry cases when the actual contract promises those behaviors.

## Write the test code

- Use the repository's existing runner, assertion library and fixture conventions. Extend a maintained helper rather than introducing a new framework or a second harness for the same boundary.
- Give the test a behavioral name: trigger plus observable outcome. Arrange explicit synthetic input and initial state, perform the public action, then assert the result and relevant persisted state. Keep the expected result independent of the implementation: do not call the function under test to compute its own expected value.
- Assert precise values, shapes and error codes where they are contracts. For rejected input, also verify unchanged state and absence of external side effects when relevant. A nonzero exit or a truthy object alone rarely proves the intended failure.
- Separate independent cases. Use named subtests or parameterized IDs for variants so the failure identifies the input. Put setup inside the isolated case when one variant's mutation could affect another. Share expensive setup only when its state is safe to share and cleanup ownership stays clear.
- Exercise the real component whose behavior matters: a real temporary SQLite database for transaction/ownership tests, actual HTTP routing for handler contracts, or a spawned CLI for exit/output/environment behavior. Mock unrelated remote providers at a public boundary with deterministic responses. Do not mock the DB to prove atomicity or spy on a private method to prove a public result.
- Await promises and asynchronous assertions. Collect both outcomes in a race before asserting them; verify final state, not just which call returned first. Use explicit barriers, deferred promises or observable readiness to control interleavings. Avoid arbitrary sleeps and success-by-retry. Give child processes and potentially hanging operations bounded timeouts, then terminate and await them during cleanup.
- Use per-test temporary directories, fresh databases and synthetic credentials. Close connections, stop servers/workers, restore environment changes and remove only test-owned files through runner teardown registered as soon as resources are acquired. Tests must work alone, in the suite and under the runner's normal parallelism without relying on order, a developer's HOME, live authentication or leaked global state.
- Inject clocks/randomness only when their behavior is relevant and the interface supports it. Assert stable identities/relations rather than exact random values. Test time boundaries deterministically rather than waiting for wall-clock expiry.

For example, a concurrent claim test should await two independently connected actors attempting the same task, assert exactly one success and one documented conflict, reopen the database to verify the winning owner, and check that the losing operation added no claim event. Two sequential calls or an assertion that a mocked transaction ran cannot establish this contract.

## Prove the test is useful

For a bug fix, reproduce the intended failure before the fix, then run the same case after the fix. For new coverage, use a bounded temporary mutation or known broken fixture when it materially improves confidence: prove the test fails for the named defect, then restore the candidate and rerun. Distinguish an assertion failure from a broken import, missing dependency or timeout. Do not commit probes or alter unrelated code to manufacture a RED result.

Run the selected case, then the relevant integration/regression suite. Follow the repository's required final gates. Investigate flakes as product or harness races; do not hide them with relaxed assertions, skips or blind retries. Report the exact checks that ran and any unverified behavior.

## Reduce maintenance without losing coverage

When tests overlap, transfer unique assertions to the strongest check before deleting weaker code. Share a packaging contract across manifest formats instead of invoking the same expensive pack step in multiple files. Remove source-wording, heading, historical version, internal call-order and implementation-mirroring assertions unless those exact bytes are part of a supported interface.

In NED, keep stable FR/CUJ/TC links and colocate automated spec cases under the feature's tests folder. Follow AGENTS.md for commit gates. Skills themselves are evaluated through realistic agent outcomes using EVAL.yaml and evaldata, not code tests of their instructions or bundled helpers. Runtime, evaluation-engine and package-boundary tests remain appropriate code coverage. This skill's own evaluations can ask an agent to produce runnable software tests in a disposable workspace; inspect that output as behavioral evidence without adding a code-based skill-test suite.
