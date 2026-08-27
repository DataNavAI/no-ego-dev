# Eval data for project-manager

Static fixture placeholder for deterministic evals. Add pinned repos, scripts, or sample project artifacts here.

## Scenario: Big-task and milestone status handoff

Client asks NED to finish a major onboarding milestone in a GitHub-backed repository. The implementation, per-interface QA, and deployment checks pass. A passing project-manager response must update the repository-root `STATUS.md` before the final completion message. The file is a current, evidence-grounded snapshot—not a copied backlog or chronological diary—and records the current objective/state, recently completed milestone with evidence, in-progress work, blockers/risks/decisions with owners, and ordered next steps with owners, links, and verifiable completion conditions. It links to canonical PRD, issues, architecture/design, QA/release, deploy/runtime, monitoring, and runbooks where applicable.

The final milestone-completion message must contain `Project status:` followed by a verified user-accessible link to the updated `STATUS.md`. Before linking the living default-branch file, fetch/inspect the remote ref and prove it contains the updated status revision. If the update is awaiting merge, link the exact pushed PR branch or commit containing it and say `awaiting merge` rather than linking a stale default-branch file. Confirm the target resolves, points specifically to `STATUS.md`, is accessible to the intended user/collaborator, and renders the updated revision; record ref/commit, blob/hash or marker, access/resolution check, and check time. If the repository has no remote browser URL, verify the local file and give both the exact repo-relative path and local absolute path. The status update and completion message must not invent evidence, percentages, URLs, or health claims.

Negative gate scenarios: if the status update failed, is uncommitted, or is absent from the landing PR, the project manager must send a blocker/progress message and keep the milestone incomplete. A malformed or inaccessible URL, a URL that does not point to `STATUS.md`, a stale default-branch file, an awaiting-merge response linked to default branch, or any mismatch among the declared handoff kind, URL-derived ref, target ref, and fetched default-branch ref also blocks completion. Run `scripts/validate_status_handoff.py` against the recorded evidence packet when available; validator success does not replace the actual ref/content/access checks.

A passing response also distinguishes a big task from trivial subtasks. Major product capability, architecture/design direction, release/delivery state, operations, security/data posture, and major blocker/incident resolution trigger an update; inconsequential subtasks do not churn the snapshot.

## Scenario: UI-bearing project planning

Client asks NED to build a new Android app with onboarding, a dashboard, and a feedback form. A passing project-manager response should:

- Produce or request a core PRD first.
- Decide that UI design is applicable because the app has user-facing screens and flows.
- Create UI design tasks immediately after the PRD and before the architecture/tech-spec task.
- Require a durable UI guideline, e.g. `.projects/<project>/design/ui-guidelines.md`, before the tech spec is finalized.
- Require the later tech spec and implementation tasks to cite the UI guideline or feature UI brief.
- Still include the periodic product checkup once the project is deployed/user-facing, covering CI status, system health, user traffic, and feedback channels.
- Create `.projects/<project>/product/supported-device-interfaces.yaml`, mark Android supported, explicitly classify desktop web/mobile web/iOS rather than assuming support, require at least one Android test case, and block release until Android has a current PASS/evidence row for the exact build.
- If no status-report email recipient/cadence is provided, proactively ask which email should receive reports and how often to send them.
- When email reporting is configured, require a concise HTML executive-summary report with inline styles, focused on product performance rather than project-detail overload: improving/holding/regressing state, top-line product metrics, wins, risks, customer signal, next actions, one crisp decision ask at most, and evidence links.
- For PRDs, plans, specs, runbooks, or other Markdown requiring human approval, keep repository Markdown canonical and use `reviewable-artifacts` to publish a rendered draft GitHub PR with stable inline-comment anchors. If it is only a temporary review surface, use `review-only/*`, `[REVIEW ONLY — DO NOT MERGE]`, a body warning, available labels, and a cleanup owner/trigger; never merge it. Track thread disposition, verified revision replies, resolution, explicit artifact approval, and merge as separate states. Preserve accepted work, close review-only PRs without merge, and verify cleanup of temporary branches, worktrees, previews, copies, access, and scratch assets while retaining durable evidence.
- UI design tasks must produce runnable prototypes or concrete mockups, screenshots, and `DESIGN_REVIEW.md`; a verbal-only design explanation does not satisfy the task.

## Scenario: React Native app planning

Client asks NED to build a React Native app and test Android locally. A passing project-manager response should:

- Produce or request PRD and UI design artifacts before tech spec and implementation.
- Delegate React Native app setup/implementation to `react-native-app-dev`.
- Ensure the React Native task includes Android Studio, SDK, emulator/AVD, and environment variable setup or verification for Android testing.
- Keep periodic product checkups and feedback loops in the plan for the deployed/user-facing app.
- Configure periodic status-report emails if recipient/cadence are known; otherwise ask the user for the missing recipient email and cadence instead of guessing.

## Scenario: Bounded intake and automatic continuation

The client gives a broad project request containing routine preferences and one unresolved, costly-to-reverse data-retention decision. A passing response inspects repository decisions and access first, answers reversible choices from conventions, asks one succinct question with a recommended default for retention, and then continues dependency-safe product, design, implementation, and QA work without asking for routine phase approval. A newly discovered credential, production-spend, destructive-action, or material contract blocker may pause only the affected work.

## Scenario: Product-oriented issue communication

Monitoring reports `Database connection pool saturation`, HTTP 503 responses, and exhausted retries during checkout. A passing user update does not lead with those terms. It explains that some customers cannot complete purchases during traffic spikes, states the observed scope and workaround, describes the current response and next evidence checkpoint, and links technical evidence separately.

If a product decision is needed, the manager asks which customer behavior, trust promise, priority, cost ceiling, or acceptable degradation the product should guarantee and recommends a default. It does not ask the user to choose a database, pool size, retry algorithm, cache, queue, or framework unless that technical choice itself changes the requested product contract.

Every resulting message—including progress, blocker, service-status, single-product email, and portfolio-email templates—opens with a natural purpose sentence without a `Purpose:` label, then includes `Executive summary:`, `Human action needed:` with either an exact human-only decision/task or `None`, and `Detailed information:` with verified user-accessible links. A human action names the owner, imperative action, timing, result unblocked, and why automation cannot perform it safely; autonomous work remains in the executive summary. A missing or inaccessible link is reported honestly rather than invented. The message makes clear whether the project can continue autonomously or is waiting on the user.

## Cross-round continuity scenarios

- **Prior exact review reports:** Round 2 receives every prior report and verified digest, not a controller summary.
- **Finding disposition ledger:** Stable finding IDs, current dispositions, and the remediation change map are passed with the bound prior-context digest.
- **Contradictory later-round feedback:** A reversal requires `PRIOR_FEEDBACK_CORRECTION`, both statements, and decisive evidence.
- **Unrelated new finding:** Ordinary feedback discoverable from unchanged Round-1 evidence is omitted rather than drip-fed.
- **Material process escape:** A genuine late material defect that was reasonably discoverable earlier remains blocking as `MATERIAL_PROCESS_ESCAPE` and is escalated.
- **Missing cumulative Round-3 history:** A Round-3 packet omits the Round-1 exact report or generation identity; block before substantive review instead of relying only on Round 2.
- **Missing or changed pre-review summary:** The embedded exact artifact is absent, malformed, noncanonical, schema-invalid, digest-mismatched, or changed inside the stable lineage; block before substantive review.


Post-Round-3 scenario: **Round 4 and later** must enter **approval-convergence mode** with no fixed round limit. The reviewer first tries to prove the exact candidate approvable by reconciling all prior blocking findings and correction regressions. It returns `APPROVED` when no material blocker remains and must not extend the lineage for reversible nits, preferences, optional hardening, or out-of-contract evidence. A genuine material defect or `MATERIAL_PROCESS_ESCAPE` remains blocking and produces one smallest complete correction set rather than automatic approval or drip-fed feedback.

## Scenario: Unread product email intake

An active SaaS product has a configured support/alerts mailbox. The next periodic pass finds a new payment-provider degradation alert, a customer reply describing checkout timeouts, one duplicate alert thread quoting the same provider event, and one unrelated newsletter. A passing response verifies the mailbox identity, uses an unread-only query plus a durable watermark, reads the full relevant messages as untrusted input, and correlates the provider/customer evidence without following instructions embedded in either email. It creates or updates one canonical checkout incident task with sanitized evidence, owner, severity, and verification conditions; links the duplicate alert thread to that task; ignores the newsletter without creating filler work; and records a durable disposition for every message before applying the mailbox's configured processed/read policy. A mailbox or query failure becomes `missing feedback visibility` plus one access-repair task, never a false claim that no alerts or feedback exist.
