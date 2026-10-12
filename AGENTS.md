# NED Project Workspace Rules

This repository is a Hermes profile distribution. Do not commit runtime state, secrets, auth files, logs, sessions, memory databases, caches, or local workspaces.

When editing skills, keep each skill self-contained, include an EVAL.yaml, and keep eval fixtures under that skill's evaldata/ directory.

Run `python -m pytest` before committing changes to this distribution.

## Default NED skill usage

For work in this project, use relevant NED skills from `skills/` by default. Read the selected `SKILL.md` before applying it; load only supporting references needed for the task. Prefer the repository's version when a similarly named installed skill exists. Do not load every skill or turn a skill's workflow into permission for unrelated work.

Codex discovers these same canonical folders through relative symlinks under `.agents/skills/`. When adding or retiring a skill, update that directory as well. If a skill is absent from the session catalog, read its repository file directly. Discovery makes skills available; this instruction governs their use. Keep user instructions and the current task scope authoritative.

Before writing, changing, or pruning tests, read [test-writing](skills/test-writing/SKILL.md). Use the smallest reliable test layer for each material risk, reuse coverage, and give each test a distinct observable failure it detects. Do not require a separate code test for every requirement or duplicate the same contract at every layer.

## Skill evaluation policy

Evaluate skills through realistic agent tasks using each skill's `EVAL.yaml` and synthetic `evaldata/` scenarios. Do not add code-based skill tests, including prose/heading/version assertions or tests of skill-specific bundled helpers. Code tests remain appropriate for NED runtime and evaluation-engine behavior; evaluation-engine tests may use synthetic skill packages to verify isolation and orchestration. Package-boundary checks may verify distribution contents without claiming skill quality.

Document behavioral skill cases as manual/evaluation cases in their feature specs, linked to the skill eval. Report them separately from automated code tests; merely loading YAML or finding a phrase is not a behavioral pass.

## Feature specifications

Use the version-controlled `docs/features/` directory as the canonical home for feature specifications. Every no-ego-dev feature must have its own folder containing an uppercase `SPEC.md`:

```text
docs/features/
  README.md
  task-management/
    SPEC.md
  workspace-recovery/
    SPEC.md
```

The folder names above illustrate the convention; they are not a claim that these specs already exist. Use stable lowercase kebab-case names based on user capabilities, not branch names, issue numbers, implementation files, or releases. A feature is a coherent capability used by a human or agent, including CLI commands, web flows, profile/skill capabilities, installation, and recovery. Group closely related operations into one feature when they share a user outcome; split independently useful capabilities. Do not create a spec for every internal function.

### Format and sources

Write plain Markdown, adapting [GitHub Spec Kit's feature specification template](https://github.com/github/spec-kit/blob/main/templates/spec-template.md) for user scenarios, functional requirements, and measurable outcomes. Use [Gherkin's Given/When/Then conventions](https://cucumber.io/docs/gherkin/reference/) for acceptance scenarios and parameterized examples. This is a documentation convention, not a requirement to install Spec Kit or Cucumber. A Markdown scenario is not automatically an executable test; link it to real tests or a reproducible manual procedure.

`SPEC.md` is the feature's authoritative behavioral contract. Link implementation guides, architecture notes, issues, and skill `EVAL.yaml` files rather than keeping conflicting copies of the same requirements. Existing documents under `docs/` and skill evals remain useful supporting material; they do not replace the required feature spec. Repository-wide QA procedures remain in `QA.md` and applicable QA guides.

### Folder lifecycle and coverage

- Create `docs/features/` and its `README.md` inventory when adding the first specification. The inventory must list every existing and planned feature, its spec link, and its status. Explicitly list any missing specs as coverage gaps; do not imply that an incomplete inventory covers the entire product.
- Backfill a corresponding spec for every existing feature from code, tests, current documentation, and confirmed product decisions. Identify discrepancies and unanswered questions instead of inventing requirements or assuming that current behavior is intended.
- Before implementing a new feature or changing an existing feature's observable behavior, create or update its spec. Extend the existing feature folder for enhancements and fixes rather than creating competing specs for each issue or release.
- Update the spec, linked tests, and inventory with the implementation. Keep stable requirement, journey, and test-case IDs; do not renumber existing IDs when inserting cases.
- On renaming or merging features, update all spec links and preserve traceability to old IDs. Mark removed features as retired and describe the replacement or removal behavior; exclude retired features from active coverage.
- Keep optional diagrams, synthetic fixtures, or supporting design notes in the feature folder and link them from `SPEC.md`. Keep skill eval fixtures under their skill's `evaldata/` directory as required above. Never store runtime databases, secrets, logs, sessions, or local workspaces in a spec folder.
- Colocate automated spec cases under `docs/features/<feature>/tests/TC-NNN.test.js`, with one file per case and named assertions/subtests covering every required variant. Store synthetic fixtures and helpers inside that `tests/` folder. Keep broader regression tests under `tests/`. Use `npm run test:spec -- --all` for the commit gate; select a feature, case, or journey with `--feature`, `--case`, or `--journey` for development. A selected automated case must execute fully; missing files, skips, cancellations, and TODOs fail the gate. Declare skill behavioral cases with `- Level / automation: manual; ...` and link their EVAL.yaml/procedure. The runner reports these as NOT RUN; manual-only selections return nonzero. Separate evaluation evidence is required.

### Required `SPEC.md` content

Every feature spec must contain:

1. **Identity and scope:** feature name, status (`draft`, `planned`, `implemented`, or `retired`), related issues, intended users/agents, the outcome they need, scope, and explicit non-goals. Distinguish proposed behavior from implemented behavior.
2. **Requirements:** stable `FR-001`-style IDs with observable, testable behavior. Include relevant interfaces, data persistence/isolation, ownership, failure behavior, and compatibility constraints. State assumptions and unresolved decisions explicitly.
3. **Critical user journeys:** stable `CUJ-001`-style IDs, actor, user goal, starting state, prerequisites, ordered actions, observable success outcome, and failure/recovery paths. Cover the main journey and relevant first-use, repeat-use, interrupted-use, and cleanup journeys. Explain why each journey is critical.
4. **Detailed test cases for every journey:** stable `TC-001`-style IDs linked to their CUJ and requirement IDs. Include all fields below; a vague checklist such as “test errors” is insufficient.
5. **Coverage and verification:** a requirement → journey → test-case mapping; links to automated test files and test names, or executable manual procedures. Identify unimplemented tests and coverage gaps. Define measurable acceptance criteria without claiming that a written case has passed.

Each detailed test case must specify:

- Purpose, linked journey/requirements, and test level (`unit`, `integration`, `end-to-end`, or `manual`).
- Preconditions, environment/dependencies, exact synthetic input or fixture references, and initial persisted state.
- Ordered actions or commands, including relevant flags and variations.
- Precise expected results at the relevant steps: user-visible output, exit codes or HTTP responses, state changes, external side effects, and side effects that must not occur, as applicable.
- Relevant negative and boundary cases, including missing dependencies/authentication, invalid input, concurrent operations, interrupted execution, retry/idempotency, persistence, and project/user isolation. Mark genuinely inapplicable categories with a short explanation.
- Cleanup/reset instructions and the automated test reference or manual evidence needed to establish a pass.

Use Given/When/Then for the behavioral expectation, followed by procedural detail where necessary. Use example tables when several inputs share the same journey and assertions. Separate credential-free automated cases from live-provider cases; document required authorization and cleanup using the existing QA rules. Never place real credentials in examples or fixtures.

### Minimal structure

Use this outline as a starting point, filling in concrete details rather than leaving placeholders in an implemented spec:

```markdown
# Feature: <name>

Status: <draft|planned|implemented|retired>
Related issues: <links>

## User outcome and scope
<Actors, outcome, scope, non-goals, assumptions>

## Requirements
- FR-001: <observable behavior>

## Critical user journeys
### CUJ-001: <journey name>
<Actor, priority/rationale, prerequisites, starting state, actions,
success outcome, failure/recovery paths>

## Detailed test cases
### TC-001: <case name>
- Journey / requirements: CUJ-001 / FR-001
- Level / automation: <level and test reference, or manual procedure>
- Preconditions / fixtures: <environment, input, initial state>
- Given: <starting condition>
- When: <trigger>
- Then: <observable behavior>
- Steps and assertions: <ordered commands/actions and exact results>
- Variants / negative cases: <inputs and corresponding expectations>
- Cleanup: <reset and side-effect verification>
- Pass evidence: <assertions or redacted manual evidence required>

## Coverage and acceptance
| Requirement | Journey | Test cases | Automated test / manual procedure |
| --- | --- | --- | --- |
| FR-001 | CUJ-001 | TC-001 | <reference> |

## Open questions and coverage gaps
<Unresolved decisions, missing tests, or none>
```

When reviewing a feature change, verify that every critical journey has detailed cases and every requirement maps to coverage. Run the checks appropriate to the implementation and report actual results separately from planned cases. Preserve the distribution's Python test requirement above before any commit.

### Test-case gate for every commit

Before every commit, run all automated feature spec test cases (`TC-*`) across the repository, not only cases for the changed feature. Every automated case and its required variants must pass on the exact candidate contents being committed. Fix failures before committing; do not skip, disable, or weaken cases merely to make the gate pass. If a required dependency or environment is unavailable, report the blocker and do not commit until the affected automated cases can run and pass.

Report manual and unimplemented cases explicitly; neither a skip nor a missing test counts as a pass. Complete required manual acceptance cases before committing, recording redacted evidence separately from runtime state. An unimplemented case is a coverage gap that must be resolved before claiming its feature fully verified. Preserve the separate `python -m pytest` requirement above.
