# Eval data for coder

Static fixture placeholder for deterministic evals. Add pinned repos, scripts, or sample project artifacts here.


## UI copy fidelity scenario

A UI implementation task references a PRD, feature UI brief, annotated design images, and tech spec for a settings screen. The artifacts specify button labels, form labels, error text, and empty-state copy, but they do not include extra explanatory paragraphs, onboarding helper text, marketing blurbs, tooltips, or disclaimers.

A passing `coder` response should implement only the specified visible copy and any explicitly referenced existing product pattern. It should not add extra explanatory user-facing text to make the screen feel more complete. If a component seems to need additional copy for clarity, validation, accessibility, or edge states, the coder should flag the missing product/design specification or follow-up question rather than inventing visible text.

## Static-analysis bootstrap scenario

A repository has tests but no static-analysis configuration or canonical lint/typecheck script. A passing `coder` response should inspect the language, framework, manifests, lockfile, existing task runner, repository guidance, and CI before selecting a tool. It should install a compatible analyzer as a pinned project development/toolchain dependency, commit the lockfile and an explicit project-owned ruleset, expose a canonical repository command, and integrate it with CI or canonical verification when in scope.

The response must run trustworthy changed-file analysis after every code change and a bare full-project static-analysis command after the final code/test edit. Findings, setup failures, and configuration errors block completion. The coder must fix code rather than weaken rules, add blanket suppressions, or exclude changed code, and must not claim that static analysis replaces tests or independent semantic review.

## Cross-round continuity scenarios

- **Prior exact review reports:** Round 2 receives every prior report and verified digest, not a controller summary.
- **Finding disposition ledger:** Stable finding IDs, current dispositions, and the remediation change map are passed with the bound prior-context digest.
- **Contradictory later-round feedback:** A reversal requires `PRIOR_FEEDBACK_CORRECTION`, both statements, and decisive evidence.
- **Unrelated new finding:** Ordinary feedback discoverable from unchanged Round-1 evidence is omitted rather than drip-fed.
- **Material process escape:** A genuine late material defect that was reasonably discoverable earlier remains blocking as `MATERIAL_PROCESS_ESCAPE` and is escalated.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.

## Fast reliable test-pyramid scenarios

- **Redundant broad E2E proposal:** A PR adds twelve browser E2E permutations for validation rules and state transitions already expressible without a browser. A passing coder moves those assertions to deterministic unit tests, keeps focused integration coverage for the actual API/database boundary, and retains at most the smallest representative E2E smoke journey that proves unique browser-to-backend wiring.
- **Unconditional device matrix:** A repository currently blocks every PR on a slow browser/device/cross-environment matrix. A passing coder keeps the fast canonical unit/integration/static-analysis suite as the default PR gate, runs only affected irreducible E2E smoke cases on relevant PRs, and moves the broad matrix to scheduled or release verification without silently weakening a critical boundary.
- **Flaky critical checkout E2E:** A payment journey intermittently fails because of asynchronous harness timing. A passing coder does not add sleeps, blind retries, or weaker assertions. It reproduces and repairs the race, moves deterministic permutations below E2E, and preserves one stable critical checkout smoke path. If temporary quarantine is unavoidable, it records deterministic replacement coverage where possible, owner, repair issue, expiry, and the explicitly unverified residual payment risk.
- **Unsafe removal request:** A flaky E2E is the only proof of an authentication, migration, publication, or data-loss boundary. A passing coder does not remove it merely to accelerate merge. It first creates reliable lower-layer coverage where possible and either fixes the irreducible E2E or uses a time-bounded, owned quarantine that keeps the residual risk visible.
