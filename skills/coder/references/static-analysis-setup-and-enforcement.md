# Static-analysis setup and enforcement

Use this procedure whenever a task changes code, tests, scripts, infrastructure-as-code, or generated-code sources.

## 1. Discover the existing contract

Before editing, inspect repository guidance plus manifests, lockfiles, analyzer configuration, package/task scripts, pre-commit hooks, and CI. Treat an existing project-owned command as canonical. Run it once to distinguish pre-existing findings from task-introduced findings; record the baseline without weakening the gate.

Do not infer that static analysis is absent merely because there is no script named `lint`. Type-check, compile-with-warnings, policy, schema, IaC, security, and framework analyzers may be the canonical gate.

## 2. Choose an ecosystem-appropriate analyzer only when absent

Prefer the project's language and package manager conventions. Examples are starting points, not a universal prescription:

| Ecosystem | Typical project-owned choices |
|---|---|
| JavaScript/TypeScript | ESLint plus TypeScript type-checking; framework-native lint where maintained |
| Python | Ruff for linting; mypy or pyright when typed contracts warrant it |
| Go | `go vet` and Staticcheck or golangci-lint |
| Rust | `cargo clippy --all-targets --all-features -- -D warnings` |
| Java/Kotlin | compiler warnings plus Checkstyle, SpotBugs, Error Prone, Detekt, or project-standard equivalents |
| C/C++ | compiler warnings plus clang-tidy or project-standard equivalents |
| Ruby | RuboCop and project-standard security checks |
| Shell | ShellCheck |
| Terraform/IaC | `terraform validate` plus TFLint, Checkov, or the established policy tool |

Select a maintained version compatible with the existing runtime and framework. Add it through the repository's package/toolchain manager as a pinned development dependency and update the committed lockfile. Never depend only on a global executable.

## 3. Add a minimal explicit ruleset

Create project-owned configuration only when none exists. Start from a maintained recommended baseline, then enable rules that catch correctness defects, unsafe control flow, stale or unreachable code, invalid async/error handling, type-contract breaks, dangerous evaluation/deserialization, and ecosystem-specific security hazards. Scope generated or vendored exclusions narrowly and document why they are not authored code.

Do not:

- replace an established analyzer merely because another tool is familiar;
- turn off existing rules, lower severity, or add a blanket ignore to make the task pass;
- exclude changed files or whole source trees;
- auto-fix without reviewing the resulting diff;
- treat formatter-only output as static analysis.

A suppression is acceptable only for a demonstrated false positive, at the narrowest line/rule scope, with an explanation and a regression or other executable evidence when practical.

## 4. Expose and wire one canonical command

Add a repository-owned command through the native task mechanism (`package.json`, Makefile, task runner, build file, tool config, or equivalent). The command must run from a clean checkout using locked dependencies and return non-zero on findings or configuration failure. Add it to CI or the canonical verification entrypoint when those files are in scope; otherwise report the exact integration blocker rather than claiming enforcement.

## 5. Apply after every change

After every code change, run the fastest trustworthy changed-file analysis. When a tool cannot safely analyze an isolated file because it needs the project graph, run the full canonical command instead. After the final code or test edit, run:

1. changed-file analysis for the final diff;
2. the bare canonical full-project static-analysis command;
3. targeted tests;
4. the bare canonical full test/build commands.

A later edit makes earlier static-analysis evidence stale. Static analysis, tests, and independent semantic review are separate required gates.

## 6. Fail closed and report evidence

Block completion when setup cannot be installed, configuration does not parse, analysis crashes, findings remain, or required CI wiring is unavailable. Report:

- analyzer and exact version;
- dependency/lockfile and config paths;
- changed-file command and result;
- full-project command and result after the final edit;
- CI/canonical-script integration;
- any narrow suppression with evidence.
