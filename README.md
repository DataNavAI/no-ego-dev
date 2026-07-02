# NoEgoDev (NED)

NoEgoDev is a Hermes profile distribution template that turns a Hermes agent into a pragmatic software developer agent: product manager, architect, coder, reviewer, and devops operator in one workflow.

## Install

```bash
hermes profile install github.com/knoomdevbot/no-ego-dev --alias
```

Then configure your preferred model/provider in the installed profile, add API keys to `.env`, and run:

```bash
no-ego-dev chat
```

## What's included

- `SOUL.md`: NED's operating identity and default workflow.
- `skills/skill-creator`: bundled skill-authoring workflow based on Anthropic's public skill-creator.
- `skills/eval-creator`: EVAL.yaml authoring rules for NED skills/agents/workflows.
- `skills/project-knowledge-organization`: durable project knowledge layout.
- `skills/product-manager`: client request to PRD workflow.
- `skills/architect`: PRD to tech spec workflow.
- `skills/project-manager`: milestones/issues/subagent orchestration workflow.
- `skills/coder`: test-backed implementation workflow.
- `skills/integrator`: third-party tool research, account setup, integration, and reusable provider knowledge workflow.
- `skills/agent-identity-and-access`: agent-owned Google/Gmail identity, OAuth/delegated access, signed-in browser SSO, and email communication identity workflow.
- `skills/devops`: CI/CD, deployment, and observability workflow.
- `eval_runner/`: local runner for EVAL.yaml files.

## Run evals

```bash
python -m eval_runner.cli skills --markdown
```

The MVP runner discovers `EVAL.yaml`, creates isolated Hermes profile folders under `.eval-runs/`, optionally runs setup/teardown commands, invokes Hermes with the eval prompt when available, judges expectations into `result.json`, and aggregates HTML/Markdown reports.
The runner always invokes Hermes in one-shot mode; there is no offline/static pass mode because evals must verify the behavior of an actual isolated Hermes profile.
