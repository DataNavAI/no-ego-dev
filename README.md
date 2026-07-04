# NoEgoDev (NED)

NoEgoDev — NED for short — is a Hermes profile that turns a plain request into a working, publishable prototype. It can help shape the product, design the UI, build the app, QA it, publish it, and plan honest marketing around it.

NED is best for people who want to test an idea quickly with something real enough to share with users, teammates, or customers.

## What NED can help with

- Turn a rough idea, URL, screenshots, or benchmark product into a concrete build plan.
- Design a practical UI and core user flow.
- Build browser, mobile, game, or app prototypes.
- QA the result with reproducible checks and user-flow testing.
- Prepare publishing/deployment steps when the project is ready to share.
- Create positioning, launch notes, outreach plans, and marketing assets without spammy growth hacks.

## Install

```bash
hermes profile install github.com/knoomdevbot/no-ego-dev --alias
```

Then copy the environment example and add at least one model provider key:

```bash
cd ~/.hermes/profiles/no-ego-dev
cp .env.EXAMPLE .env
# edit .env with your API key
```

Run NED:

```bash
no-ego-dev chat
```

If you installed without the alias, run:

```bash
hermes --profile no-ego-dev chat
```

## Minimum requirements

- [Hermes Agent](https://hermes-agent.nousresearch.com/docs) installed and working.
- A model provider API key in `.env`.
  - OpenRouter: `OPENROUTER_API_KEY`
  - Anthropic: `ANTHROPIC_API_KEY`
- Git installed if you want NED to work with repositories.
- Node.js and/or Python installed for the kinds of projects you want NED to build.
- Optional: GitHub CLI, hosting provider CLI, browser access, or app-store credentials when you ask NED to publish something.

## How to use NED

Start with the outcome you want, the audience/problem, and any examples NED should learn from. Good prompts usually include:

- What you want to test or show.
- Who it is for.
- A benchmark URL, screenshots, sketches, or examples if you have them.
- What matters most: visual similarity, main interaction, speed to publish, polish, onboarding, conversion, etc.
- Any constraints: platform, branding, content, language, deadline, or places you want to publish.

NED works best when you ask for a usable prototype rather than prescribing technical choices. Give it the product intent and examples; let it infer the simplest practical way to build and share it.

## Copy-paste example prompts

```text
Build a prototype inspired by this website: [URL]. Keep the core user flow, but adapt it for [your audience/problem].
```

```text
Build a prototype based on these screenshots. Focus on reproducing the main interaction and visual structure, not every detail.
```

```text
I want to test this product idea: [idea]. Use [URL] as the benchmark product. Create something simple enough to publish and test with real users.
```

```text
Here are screenshots of an app I like. Build a prototype with a similar flow, but for this different use case: [use case].
```

```text
Turn this rough idea into a shareable prototype: [idea]. Make the first user flow obvious, include realistic sample content, QA it, and give me a link I can send to testers.
```

```text
Build a landing page and lightweight product demo for [audience] who struggle with [problem]. Use this competitor as a quality bar: [URL]. Keep it practical and ready to publish.
```

```text
I have a product concept for [audience]. Create a prototype that lets a user experience the main value in under two minutes, then suggest how I should test it with real users.
```

```text
Create a prototype for this mobile app idea: [idea]. I care most about onboarding, the main interaction, and whether the concept feels useful enough to share.
```

```text
Review this deployed prototype: [URL]. QA the main user flow, identify the biggest usability issues, and suggest the next practical improvements before I share it publicly.
```

```text
Prepare this prototype for launch: [URL or repo]. Check the user flow, write concise launch copy, list publishing steps, and create a non-spammy marketing plan.
```

## Skills included

NED is packaged with focused skills for the common work needed to go from idea to public test:

- `product-manager`: turns fuzzy requests into product direction, target users, success criteria, and prototype scope.
- `ui-designer`: designs practical screens, interaction flows, first-user experience, and visual QA notes.
- `architect`: shapes the build plan and project structure without overcomplicating the approach.
- `project-manager`: breaks work into tracked tasks and coordinates specialist subagents.
- `coder`: builds and verifies the product changes.
- `qa`: tests the user flow, catches regressions, and reports evidence.
- `devops`: handles deployment, operational checks, domains, CI/CD, and basic observability.
- `marketer`: creates positioning, channel plans, launch copy, outreach notes, and feedback loops.
- `play-store-publisher`: prepares Android app publishing work for Google Play.
- `play-store-cli`: supports Google Play CLI/API workflows.
- `integrator`: researches and wires up external tools, accounts, APIs, and provider setup.
- `agent-identity-and-access`: helps create agent-owned accounts, OAuth access, browser SSO, and email identity.
- `web-game-dev`: builds browser games and interactive web experiences.
- `android-app-dev`: supports native Android app work.
- `react-native-app-dev`: supports cross-platform mobile app work.
- `project-knowledge-organization`: keeps project decisions, notes, and artifacts organized.
- `skill-creator`: creates or adapts Hermes skills.
- `eval-creator`: creates evals for skills and workflows.

## Built with NED

Examples of deployed work created through the NED workflow:

- **Korean Ground News / DataNav News** — a deployed news-analysis product with live story feeds and product monitoring.  
  https://3ddjyvpgr3.us-east-1.awsapprunner.com/
- **Group Game Maker** — a shareable browser game/prototype experience.  
  https://knoomdevbot.github.io/group-game-maker/
- **Viral Product Experiments** — a set of lightweight viral/shareable product experiments.  
  https://knoomdevbot.github.io/viral-product-experiments/

## Configuration

This repository includes shareable profile defaults. Put machine-specific paths, private tokens, API keys, browser sessions, and local runtime state in your installed profile's local files, not in this repository.

Use `.env.EXAMPLE` as the safe template for local secrets.

## Run evals

```bash
python -m eval_runner.cli skills --markdown
```

The eval runner discovers `EVAL.yaml`, creates isolated Hermes profile folders under `.eval-runs/`, optionally runs setup/teardown commands, invokes Hermes with the eval prompt when available, judges expectations into `result.json`, and aggregates HTML/Markdown reports.
The runner always invokes Hermes in one-shot mode; there is no offline/static pass mode because evals must verify the behavior of an actual isolated Hermes profile.

## License

MIT. See [LICENSE](LICENSE).
