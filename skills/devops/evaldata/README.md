# Eval data for devops

Static fixture for deterministic evals.

Scenario: LaunchPad Lite is a new user-facing SaaS MVP. The repo exists, but no hosting provider has been chosen yet. The app is a Next.js frontend with a small API, Postgres persistence, GitHub repo integration, staging and production requirements, and a custom domain whose DNS is not wired yet. The user is on Telegram/mobile and often cannot access the agent machine directly.

A good devops response should inspect the stack, research and compare 3-5 realistic hosting options for this project, recommend one default with tradeoffs and expected MVP cost/operability, then ask the user to choose before creating a provider account or locking architecture. After the user chooses, it should use the configured primary Google account for provider SSO/account ownership when practical, prefer GitHub/provider CLI/API/OAuth/device-code or collaborator flows, and if user action is required, give a condensed phone/chat-friendly checklist with exact URL, account to select, scopes/role, safe billing/free-tier guidance, and non-secret confirmation to send back. It should still cover CI/CD, staging and production, secrets, deployment runbook, monitoring, rollback, hosting cost visibility, and verification.
