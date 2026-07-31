# Reviewing generated browser runtime vertical slices

Use this checklist when a task changes a generator, server-rendered markup, and a generated browser module—especially analytics or delegated interaction tracking.

## Core rule

A passing helper test is not evidence that the generated production runtime is wired correctly. Verify the complete path:

`source model → rendered semantic markup → generated page shell/assets/data → browser initialization → delegated action → canonical request → server acceptance`

## Required verification

1. **Production data parity**
   - Generate an isolated real artifact and inspect the embedded data actually available to the browser.
   - Do not inject fixtures directly into a helper unless the production initializer supplies the same shape.
   - Prove each event/action is reachable using production-shaped generated markup and data.

2. **Semantic action markers**
   - Put machine-safe `data-*` action/type/module attributes on the action element at render time.
   - Delegated handlers must read those markers, not visible copy, headings, URL coincidence, or DOM position.
   - Test ambiguous presentation values (for example, a biography source whose visible type is `official`) so semantic classes cannot collapse.

3. **Lifecycle execution, not source-string confidence**
   - Execute the generated browser module in a hermetic DOM/VM/browser harness where feasible.
   - Cover direct load, repeated initialization, SPA content replacement, same-entity/detail navigation, back/forward, and non-target pages.
   - Confirm one browser action emits once while a later distinct action remains eligible.
   - Pure exported-state tests are supplemental; they cannot replace module initialization and listener tests.

4. **Deployment-path compatibility**
   - Probe canonical and path-prefixed surfaces such as `/entities/x` and `/product/entities/x`.
   - Normalize client request paths to the server's accepted canonical contract without breaking link routing.

5. **Asynchronous identity readiness**
   - Events containing signed-in/session state must wait until authoritative session hydration settles.
   - Preserve immediate non-analytics rendering if needed, then emit exactly once for the current navigation after hydration.
   - Test navigation that occurs before hydration completes.

6. **Exact boundaries and assets**
   - Test viewport breakpoints at `boundary-1`, `boundary`, and `boundary+1`.
   - Verify generated pages contain exactly one app root, data payload, browser module, canonical link, and required stylesheet.
   - Do not accept marker-only HTML assertions that omit CSS or duplicate-shell checks.

7. **Server contract probe**
   - Capture the exact emitted request and submit it to the validator/route in a hermetic test.
   - Assert exact allowlisted properties, canonical path, no private/free-text fields, and successful acceptance.

## Generated-artifact review snapshot discipline

Read-only reviewers can still produce invalid findings when a generator is concurrently replacing tracked or shared output. Before dispatching UI, copy, static, or immutable reviewers:

1. Finish every generator/build/browser writer and restore disposable tracked output.
2. Confirm the source SHA, index/worktree state, generated root, screenshots, and HTML evidence all belong to one completed snapshot.
3. Copy disposable screenshots/HTML needed by reviewers to a stable scratch/evidence directory; stop the local server only after the copy is complete.
4. Do not run tests, builds, regeneration, cleanup, or another writer against the same checkout while reviewers are inspecting it.
5. Treat a reviewer claim that the checkout was dirty as a potential evidence race: re-check timestamps/status and rerun against a stable snapshot rather than accepting or dismissing the finding by assumption.

For mutable moderation or freshness inventories, never make a deterministic test require that today's production-shaped data contains a publishable row of a particular subtype. Split coverage:

- assert the current reviewed row's real publication result, including fail-closed rejection;
- exercise positive subtype normalization/rendering with a fixed synthetic source-backed fixture and clock;
- keep release/browser evidence tied to production-shaped generated output, and label any populated-state design fixture so it cannot be mistaken for production data.

If a package test command regenerates assets before testing, record that prerequisite. A direct focused file run may legitimately fail generated-inventory parity against restored or stale assets; either run the package generation prerequisite in an isolated temp output or limit the focused pattern to assertions that do not consume generated parity. Canonical acceptance still uses the package's bare command.

## Baseline failures versus final acceptance

When an optional browser suite fails identically on the parent SHA and the staged diff, classify it accurately as **not a regression of the current slice**—but do not silently promote that result into final candidate readiness. A pre-existing failure can still violate the feature's frozen acceptance contract.

1. Reproduce the failure on the clean parent SHA to establish the baseline.
2. Let the bounded slice review proceed only if the failure is genuinely outside that slice and the reviewer records it explicitly.
3. Before immutable candidate approval, create a separate TDD micro-slice that closes the baseline acceptance gap.
4. Re-run the complete real-browser suite and require all supported targets to pass; a source-string or static CSS assertion is not a substitute.
5. Keep disposable browser evidence out of the repository unless candidate-bound durable evidence was explicitly requested.

For responsive image gates, do not invent unavailable renditions merely to populate `srcset`. If only one approved local asset exists, a truthful single-candidate width descriptor plus a `sizes` expression aligned with actual CSS slots is valid when the browser confirms the selected asset's intrinsic dimensions fit every supported viewport. Preserve the validated source path, rights receipt, and non-likeness behavior; never synthesize remote candidates or imply nonexistent resolutions.

## Immutable review prompt

Ask the spec reviewer to look specifically for fixture-only reachability, production initializer/data mismatches, text-based classification, route-prefix rejection, session timing races, viewport off-by-one errors, missing generated assets, baseline failures that still block final acceptance, and tests that extract helpers without executing the runtime.

## Recovery

If a delegated implementer times out, inspect commit/status first. If a clean commit exists, run focused production-shaped tests and review that SHA; do not restart the implementation blindly.

If the timeout leaves uncommitted generator work:

1. Inspect the source/test diff before touching anything; preserve valid partial work.
2. Treat generated output as disposable unless it was explicitly authorized. Restore and clean only the known generated subtree before focused tests that expect the tracked baseline.
3. Run the narrow new regression first, then the complete feature file.
4. Run the package's bare canonical test and build commands unchanged; these may regenerate tracked output.
5. Restore/clean only the generated subtree again, run `git diff --check`, and verify the exact authorized source/test scope before committing.
6. Do not interpret a standalone integration-test failure caused by missing generated release artifacts as a product regression. Regenerate through the canonical command and rerun; record the repeatable final result, not the transient setup state.

When a generated integration test owns a server listener, use a bounded command timeout during recovery. A failed assertion can otherwise leave the listener alive and make the test appear hung; confirm no orphan listener remains, then rerun the test in its normal complete-file setup before changing product code.
