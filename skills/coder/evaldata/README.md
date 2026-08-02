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
