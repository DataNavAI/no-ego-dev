# Coder static-analysis policy migration

Use this when a profile distribution's implementation/coder skill must guarantee static analysis for every code change.

## Canonical behavior

1. Inspect repository guidance, language/framework manifests, lockfiles, analyzer configuration, scripts, hooks, and CI before choosing a tool.
2. Preserve an existing project-owned analyzer and rules. Do not replace or weaken an established gate merely because another analyzer is more familiar.
3. If no project-owned command exists, select an ecosystem-appropriate maintained analyzer; add it as a pinned development/toolchain dependency, update the committed lockfile, add explicit project-owned configuration, and expose one canonical repository command. Wire it into CI or canonical verification when in scope. Never depend only on a global installation.
4. Run the fastest trustworthy changed-file analysis after every code change. If isolated-file analysis is unsound because the analyzer needs the project graph, run the full canonical command instead.
5. After the final code or test edit, run changed-file analysis and the bare canonical full-project analysis command. A later edit makes prior evidence stale.
6. Fail closed on findings, missing dependencies, setup/configuration failures, or unreviewed suppressions. Fix code instead of lowering severity, adding blanket ignores, or excluding changed source.
7. Static analysis supplements rather than replaces tests, builds, scanners, and independent semantic review. Record tool/version, config path, exact commands, results, and any narrowly justified false-positive suppression.

## Package migration checklist

- Add a dedicated section and workflow/checklist hooks to `coder/SKILL.md`.
- Bump the behavior version.
- Add a concise ecosystem-selection/setup reference rather than bloating the main skill.
- Extend `EVAL.yaml` with setup, per-change enforcement, fail-closed, and no-rule-weakening expectations.
- Add an eval fixture where tests exist but project-owned static analysis is absent.
- Add repository tests that assert both provisioning and per-change/full-project execution rules.
- Update distribution docs.
- Validate focused/full tests, real eval loading, frontmatter, links, package contents, diff checks, and secret scanning.
- Publish and independently review one exact SHA; then synchronize the complete package, including its new reference, to every active sibling profile.

## Review-policy interaction

When this change is bundled with review-convergence corrections, treat one round as one immutable candidate generation shared by every required review kind. A test-only/static-analysis-policy correction changes the commit SHA and invalidates every commit-bound verdict. No owner waiver, scanner pass, or static-analysis pass substitutes for exact-SHA semantic approval. There is no fixed round cap: Round 4 and later follow approval-convergence mode and continue the monotonic lineage until one exact candidate has no unresolved material blocker.
