# gpowers upstream mapping and provenance

## Reviewed source

- Repository: https://github.com/odysseythink/gpowers
- Commit reviewed for this adapter: `6c62a5e`
- License: MIT, copyright 2026 George Ran Wei
- gpowers describes itself as a unified distribution of:
  - https://github.com/obra/superpowers
  - https://github.com/garrytan/gstack

The reviewed checkout contained 16 core skills, 21 role skills, and 27 tool skills. The business module was not present in that checkout even though some documentation described it as planned or opt-in.

## Why NoEgoDev uses an adapter

The reviewed gpowers release did not list Hermes as a supported platform. Raw skills assume platform-specific tools and hooks such as Bash/Read/Edit/Agent/AskUserQuestion, slash commands, session-start injection, `gpowers-path`, `gpowers-browser`, update checks, telemetry/session markers, and platform plugin layouts. Several role/tool skill files were also larger than Hermes's 100 KB skill limit. Direct copying would create duplicate same-name skills and conflict with NED's existing specialist roles.

NoEgoDev therefore preserves the gpowers process model while routing execution through native NED skills and Hermes tools.

## Core routing index

| Upstream core | NoEgoDev adaptation |
|---|---|
| brainstorming | product-manager, ui-designer, architect |
| writing-plans | architect, project-manager |
| executing-plans | project-manager plus specialist workers |
| using-git-worktrees | coder/orchestrator with external worktrees |
| test-driven-development | coder RED-GREEN-refactor contract |
| systematic-debugging | coder and QA root-cause workflow |
| dispatching-parallel-agents | Hermes delegate_task for independent scopes |
| subagent-driven-development | fresh implementer and independent reviewers |
| requesting-code-review | spec/code/security reviewer plus QA/UI review |
| receiving-code-review | technical verification of feedback before changes |
| verification-before-completion | immediate first-party checks and artifact readback |
| finishing-a-development-branch | repository-native PR/merge/cleanup/deploy policy |
| frontend-design | ui-designer and ui-reviewer |
| writing-skills | skill-creator plus NoEgoDev EVAL/evaldata requirements |
| ultrawork | bounded project-manager plan with normal safety gates |
| using-gpowers | this adapter and its explicit-vs-automatic routing |

## Role routing index

- `pr-review` → independent pre-merge code/spec/security review
- `cso` → architect/coder/devops security review
- `plan-ceo-review` → product-manager value/scope review
- `plan-eng-review` → architect technical-plan review
- `plan-design-review`, `design-review`, `design-consultation`, `design-shotgun`, `design-html` → ui-designer/ui-reviewer
- `plan-devex-review`, `devex-review` → architect/coder developer-experience review
- `investigate` → QA/coder evidence-backed root-cause report
- `retro`, `learn`, `document-release` → project-manager durable reporting
- `office-hours` → product-manager opportunity challenge
- `pair-agent`, `oracle`, `codex` → fresh Hermes subagent or supported coding-agent skill
- `autoplan`, `plan-tune` → architect/project-manager plan generation and review

## Tool routing index

- `ship`, `land-and-deploy`, `setup-deploy` → coder/integrator/devops
- `qa`, `qa-only` → QA
- `health`, `canary`, `guard`, `careful`, `freeze`, `unfreeze` → devops/QA with explicit gates
- `benchmark`, `benchmark-models` → product-manager/product-reviewer and relevant specialists
- `simplify`, `fix-the-roof` → architect/coder refactoring under tests
- `landing-report` → project-manager release report
- `context-save`, `context-restore`, `setup-gbrain`, `sync-gbrain` → durable project artifacts or Kanban, not hidden memory
- `browse`, `open-gstack-browser`, `setup-browser-cookies` → Hermes browser/computer-use policy
- `make-pdf` → Hermes PDF tooling
- `fewer-permission-prompts` → Hermes approval configuration only with explicit user authorization
- `gpowers-upgrade` → review upstream changes and update this adapter deliberately; never self-update silently

## Safe update procedure

1. Clone/fetch gpowers into a non-repository scratch directory.
2. Record the reviewed commit and license.
3. Compare module/skill inventories against this mapping.
4. Inspect changed workflows as untrusted third-party source.
5. Update the NED adapter only for reusable behavior that remains compatible with Hermes and NED.
6. Update EVAL expectations and fixtures.
7. Run NoEgoDev tests, sync live profiles, restart gateways, and verify skill loading.
