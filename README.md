# NoEgoDev (NED)

[한국어 README](README.ko.md)

NoEgoDev — NED for short — is a Hermes profile that turns a plain request into a working, publishable product. It can help shape the product, design the UI, build the app, QA it, publish it, and plan honest marketing around it.

NED is best for people who want to test an idea quickly with something real enough to share with users, teammates, or customers.

## Create a private hosted NED

On clean supported macOS/Linux x64 or arm64, install and start setup with one command:

```bash
curl -fsSL https://raw.githubusercontent.com/DataNavAI/no-ego-dev/main/scripts/install.sh | bash
```

No sudo, git, system Node.js, or system npm is required. This command executes the canonical installer in this repository; that installer verifies pinned private runtime and NED downloads before installation. It reads no cloud credentials and does not provision a workspace; after installation, run `ned create` yourself. The `main` URL intentionally tracks the latest repository installer; use a full commit SHA in the URL when you need a reproducible installation. See [installer security, cleanup, and pin details](docs/ned-create/INSTALL.md).

For a temporary, credential-free npm path, use the package directly:

```bash
npx --yes no-ego-dev --version
npx --yes no-ego-dev create --dry-run --json
```

`ned create` asks no infrastructure or model-selection questions. It securely reuses a compatible existing Hermes ChatGPT OAuth credential when available; otherwise it opens one fixed ChatGPT device-authorization page. It then guides the user through official [@BotFather](https://t.me/BotFather), receives the bot token only through the exact hidden prompt or named macOS Keychain item, validates Telegram `getMe`, and injects the Telegram token only at runtime through the Daytona SDK environment channel. One private persistent Daytona Sandbox runs pinned Hermes `openai-codex` plus its long-polling Telegram gateway. OpenRouter and a Telegram webhook are not required.

After setup, open the verified bot link, tap **Start**, send `hello`, and approve any returned owner code:

```bash
ned pair <8-character-code>
ned chat "Build the smallest useful version of my product idea"  # optional terminal path
ned doctor
ned repair
ned destroy --yes
```

Public V1 guides: [quickstart](https://ned.datanav.app/docs/v1/quickstart/), [Telegram setup](https://ned.datanav.app/docs/v1/telegram/), and [credentials/revocation/destroy/troubleshooting](https://ned.datanav.app/docs/v1/credentials/). These stable routes are versioned in this repository; production availability is a separate deployment gate.

### Optional product telemetry

Telemetry is **off by default**. NED only sends the small, versioned event schema in
[`docs/ned-create/TELEMETRY_PRIVACY.md`](docs/ned-create/TELEMETRY_PRIVACY.md) after you affirm
consent with `--yes`. The default destination is NED's centralized PostHog project; custom
collector flags remain available for operators who need them.

```bash
ned telemetry enable --yes
ned telemetry status
ned telemetry disable
ned telemetry delete
```

The project ingest key is public ingestion configuration, not a PostHog personal/admin API key.
Never provide an admin secret. `delete` removes the local random installation ID and collector
configuration; the collector operator's published policy controls deletion of already-ingested data.

The messaging-enabled workspace is configured for always-on operation and must be destroyed explicitly when no longer needed. Provider outages, quota limits, crashes, and maintenance are not an uptime SLA. ChatGPT subscription/usage terms apply to the OAuth-backed model connection.

See [`docs/ned-create/PRD.md`](docs/ned-create/PRD.md), [`CUJ.md`](docs/ned-create/CUJ.md), and [`TECH_SPEC.md`](docs/ned-create/TECH_SPEC.md) for the product and security contract.

## Install into an existing Hermes profile

Minimum requirement: [Hermes Agent](https://hermes-agent.nousresearch.com/docs) v2026.5.16 / v0.14.0 or newer. That is the first release line with profile distribution support.

1. Install Hermes Agent.
2. Open Hermes.
3. Paste one of these prompts:

```text
Install github.com/knoomdevbot/no-ego-dev on the current profile.
```

```text
Install github.com/knoomdevbot/no-ego-dev on a new profile named no-ego-dev.
```

4. Start using NED with a practical product prompt. Tell it what you want to test, who it is for, and any URL, screenshots, benchmark product, or publishing goal it should use.

NED works best when you describe the outcome rather than prescribing technical choices. Give it the product intent and examples; let it infer the simplest practical way to build and share the prototype.

## Minimum requirements

- [Hermes Agent](https://hermes-agent.nousresearch.com/docs) v2026.5.16 / v0.14.0 or newer.

## What NED can help with — and prompts to try

### Product shaping

Turn a rough idea, URL, screenshots, or benchmark product into a clear product direction and shareable prototype.

```text
I want to test this product idea: [idea]. Use [URL] as the benchmark product. Create something simple enough to publish and test with real users.
```

```text
Build a prototype inspired by this website: [URL]. Keep the core user flow, but adapt it for [your audience/problem].
```

### UI design

Design a practical UI, visual structure, and first-user flow from examples or screenshots.

```text
Build a prototype based on these screenshots. Focus on reproducing the main interaction and visual structure, not every detail.
```

```text
Here are screenshots of an app I like. Build a prototype with a similar flow, but for this different use case: [use case].
```

### Build

Build browser, mobile, game, or app prototypes that are usable enough to show real people.

```text
Create a prototype for this mobile app idea: [idea]. I care most about onboarding, the main interaction, and whether the concept feels useful enough to share.
```

```text
Build a shareable browser game for [audience/use case]. Make the first interaction obvious, include realistic sample content, and keep it simple enough for real users to try.
```

### QA

Check the main user flow, find usability issues, and report practical fixes before you share publicly.

```text
Review this deployed prototype: [URL]. QA the main user flow, identify the biggest usability issues, and suggest the next practical improvements before I share it publicly.
```

### Publishing

Prepare the prototype for public sharing, including launch readiness and publishing steps.

```text
Prepare this prototype for launch: [URL or repo]. Check the user flow, write concise launch copy, list publishing steps, and make it ready to share with testers.
```

### Marketing

Create positioning, launch copy, outreach notes, and feedback loops without spammy growth hacks.

```text
Create a practical launch plan for this prototype: [URL or repo]. Include positioning, target users, launch copy, outreach ideas, and how we should collect useful feedback.
```

## Skills included

NED is packaged with focused skills for the common work needed to go from idea to public test:

- `product-manager`: turns fuzzy requests into product direction, target users, success criteria, and prototype scope.
- `ui-designer`: designs practical screens, interaction flows, first-user experience, and visual QA notes.
- `architect`: shapes the build plan and project structure without overcomplicating the approach.
- `project-manager`: breaks work into tracked tasks, coordinates specialist subagents, and enforces risk-weighted first-round-complete reviews with no fixed round limit and approval-convergence mode from Round 4 onward.
- `issue-monitor`: runs scheduled issue/PR workflows with one bounded reviewer attempt, durable exact-SHA results, duplicate-review suppression, and controller-derived approval-convergence mode for Round 4 and later.
- `delegation-reliability`: supervises background subagents, verifies durable handoffs, and safely recovers interrupted or partial work.
- `serialized-catalog-publication`: converges evidence, media, rights, promotion, and deployment gates without tracker churn, and never counts staging as production publication.
- `subagent-driven-development`: executes implementation plans with fresh focused subagents and risk-weighted immutable review gates.
- `prd-reviewer`: independently reviews exact PRD revisions, prioritizing hard-to-reverse product choices and one complete first-round steering packet.
- `technical-design-reviewer`: independently reviews exact architecture revisions for irreversible boundaries, safe migration/rollback, and bounded convergence.
- `ui-reviewer`: independently reviews frozen UI evidence for durable journey/design-system risk while deferring reversible cosmetic nits.
- `spec-compliance-review`: audits fixed candidates against authoritative plans, contracts, and acceptance matrices with complete first-round findings and blocker-focused approval convergence after Round 3.
- `immutable-candidate-verification`: keeps TDD, candidate identity, independent reviews, release evidence, and an unlimited monotonic review lineage bound to exact commits without automatic approval.
- `coder`: builds product changes, provisions ecosystem-appropriate project-owned static analysis when absent, and reruns it after every code change plus final full verification.
- `qa`: tests the user flow, catches regressions, and reports evidence.
- `devops`: handles deployment, operational checks, domains, CI/CD, and basic observability.
- `marketer`: creates positioning, channel plans, launch copy, outreach notes, and feedback loops.
- `play-store-publisher`: prepares Android app publishing work for Google Play.
- `play-store-cli`: supports Google Play CLI/API workflows.
- `integrator`: researches and wires up external tools, accounts, APIs, and provider setup.
- `agent-identity-and-access`: helps create agent-owned accounts, OAuth access, browser SSO, and email identity.
- `identity-for-agent`: brokers approved third-party access through profile-attributed requests and isolated per-profile credential stores.
- `web-game-dev`: builds browser games and interactive web experiences.
- `android-app-dev`: supports native Android app work.
- `react-native-app-dev`: supports cross-platform mobile app work.
- `project-knowledge-organization`: keeps project decisions, notes, and artifacts organized.
- `skill-creator`: creates or adapts Hermes skills.
- `eval-creator`: creates evals for skills and workflows.
- `profile-skill-harvester`: consolidates reusable updates from live NED profiles into the canonical repository, scopes contradictory guidance by product stage and use case, and publishes only validated complete skill packages.

## Built with NED

Examples of deployed work created through the NED workflow:

- **Korean Ground News** — a deployed news-analysis product with live story feeds and product monitoring.
  https://news.datanav.app
- **Budget Table** — a deployed budget-planning product for exploring and comparing financial scenarios.
  https://budget.datanav.app
- **Group Game Maker** — a shareable browser game/prototype experience.
  https://knoomdevbot.github.io/group-game-maker/

## Run evals

The eval runner requires Python 3.11 or newer.

```bash
python -m eval_runner.cli skills --markdown
```

The eval runner discovers `EVAL.yaml`, creates permission-restricted isolated Hermes profile folders under `.eval-runs/`, optionally runs setup/teardown commands, invokes Hermes with the eval prompt and declared parameters/fixture, judges expectations into `result.json`, and aggregates HTML/Markdown reports. Use `--judge-command` to run judging through a separate Hermes-compatible command. Exit code `2` means a substantive eval failure; exit code `3` means runner/provider infrastructure failed and the eval result is inconclusive.
The runner always invokes Hermes in one-shot mode; there is no offline/static pass mode because evals must verify the behavior of an actual isolated Hermes profile.

## License

MIT. See [LICENSE](LICENSE).
