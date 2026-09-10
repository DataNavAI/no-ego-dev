# Controller-to-profile rollout and ownership boundaries

Use this when a controller session synchronizes generic distribution skills into named live profiles, especially when product-local work belongs to one of those profiles.

## Ownership preflight

1. Classify the work before touching files:
   - **Distribution work:** reusable skill packages owned by the canonical profile distribution.
   - **Product-local work:** a named profile's application, runner, cron, release, or operational state.
2. Distribution rollout may be coordinated centrally when the user asks for it.
3. Product-local work stays with its owning profile. A default/controller session must not implement, review, deploy, or operate that product unless the user explicitly asks it to intervene.
4. If the controller previously crossed that boundary, cleanup means removing only controller-created scratch/cache artifacts. Do not delete similarly named files under the owning profile.

## Canonical publication is not waivable

Do not merge or roll out a rejected candidate. User direction may expand target scope or accept product risk, but it cannot make rejected, unreviewed, candidate-worktree, pushed-only, or open-PR bytes canonical. Resolve material findings, obtain fresh exact-SHA approval, merge with the guarded final head, verify the remote-default merge, and export rollout bytes from that immutable merge commit.

## Safe complete-package overlay

For every target profile and package:

1. Fetch and verify the exact remote-default merge commit, then export the complete package from that immutable object into non-repository staging. Never source rollout bytes from a candidate worktree, pushed branch, open PR, global installation, or live profile.
2. Back up the complete existing target package to a non-repository directory.
3. Inventory source-relative and target-relative package files, excluding known generated caches only, and compare every distinct complete-package digest regardless of version or baseline state.
4. Inspect every behavior and support-file delta and assign exactly one evidence-backed disposition: `adopted`, `scoped`, `superseded`, `product-local`, `unsafe`, or `unresolved`. A target-only path is not automatically profile-local.
5. If a reusable target delta is absent from canonical, stop that generation and re-harvest it through validation, fresh exact-SHA review, and verified merge before overwrite. Leave unsafe or unresolved package state unadvanced.
6. Stage exact canonical files plus only declared `product-local` adaptations, recording each adaptation's reason and digest. Standardization authority and backups cannot waive disposition, review, publication, or safety gates.
7. Atomically install the staged complete package, with rollback on any validation or swap failure.
8. Re-hash every canonical path and require byte equality with the verified merge export; re-hash every declared product-local adaptation against its preflight manifest.
9. Repeat the comparison after runtime/fresh-process verification because profile automation may edit skills concurrently.

Do not use version strings as equality proof. Do not preserve or overwrite unclassified additions; re-harvest reusable additions and block unsafe or unresolved drift.

## Validation details

- Parse only the YAML frontmatter between the opening and closing `---` markers in `SKILL.md`; the whole Markdown file is not a YAML document.
- Parse every `EVAL*.yaml` and run deterministic support-script compatibility checks.
- Run validation under fail-fast semantics. A failed Python/YAML check must prevent later success markers or cleanup commands from masking the failure.
- Do not use the rendered `hermes skills list` table as exact machine-readable name evidence because long names may be visually truncated. Verify package path/frontmatter identity, then run a fresh process with the skill explicitly requested.
- A useful fresh-process smoke is:

  ```bash
  hermes --profile <profile> --skills <skill> chat \
    -q 'Fresh-process skill/provider smoke test. Reply with exactly OK.' \
    --toolsets safe --quiet
  ```

  Require the exact response and revalidate package bytes afterward.

## Gateway restart procedure

Never restart or terminate the gateway process that owns the current request. For a user-authorized rollout to **different named profile gateways**, direct sibling restart is permitted on macOS when the exact target is proven first.

For each sibling target, serially:

1. Identify the controller profile/service label and the target profile/service label; fail closed if they match or either identity is ambiguous.
2. Capture the target gateway's current PID or launchd generation.
3. Invoke the exact sibling label directly:

   ```bash
   launchctl kickstart -k "gui/$(id -u)/ai.hermes.gateway-<target>"
   ```

4. Wait for the target platform connection to become ready.
5. Require a new PID/generation, healthy gateway status, and a successful provider smoke.
6. Re-hash installed package bytes after readiness because restart hooks may mutate them.
7. Continue to the next sibling only after the current target passes.

Do not use wildcard labels, kill unrelated processes, or route lifecycle commands through cron or AppleScript. If the execution layer blocks the direct sibling command, preserve the rollout manifest and backup path, verify the gateway remains healthy, and report that target as restart-pending. Fresh-process skill/provider smokes prove discoverability but are not evidence that the long-lived gateway restarted.

## Scope-preservation audit

A rollout should touch only authorized skill package paths and its non-repository backup/manifest. Keep profile identity, `SOUL.md`, memories, roots, auth, credentials, cron state, workspaces, and unrelated configuration outside the copy set. For an isolated-credential profile, avoid reading credential contents entirely; path-scoped writes are stronger evidence than printing or inspecting secrets.
