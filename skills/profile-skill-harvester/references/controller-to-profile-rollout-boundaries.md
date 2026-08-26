# Controller-to-profile rollout and ownership boundaries

Use this when a controller session synchronizes generic distribution skills into named live profiles, especially when product-local work belongs to one of those profiles.

## Ownership preflight

1. Classify the work before touching files:
   - **Distribution work:** reusable skill packages owned by the canonical profile distribution.
   - **Product-local work:** a named profile's application, runner, cron, release, or operational state.
2. Distribution rollout may be coordinated centrally when the user asks for it.
3. Product-local work stays with its owning profile. A default/controller session must not implement, review, deploy, or operate that product unless the user explicitly asks it to intervene.
4. If the controller previously crossed that boundary, cleanup means removing only controller-created scratch/cache artifacts. Do not delete similarly named files under the owning profile.

## Explicit-owner direction after a negative gate

A negative review or rejected publication cannot be overridden into distribution rollout. If the user explicitly directs the work to continue after the negative disposition:

- treat the instruction as authorization to repair and republish only, not as publication or rollout approval;
- fix the finding, revalidate, and obtain fresh exact-SHA review for the changed candidate;
- merge the approved complete package into the verified remote default branch before any profile mutation;
- if the user instead narrows the behavior to a genuinely profile-local exception, keep it outside the reusable distribution package and do not describe it as harvested or canonical;
- do not silently broaden the instruction to product runtime, cron, credentials, or unrelated configuration.

No user scope override, rejected branch commit, pushed branch, or open PR may substitute for canonical publication.

## Safe complete-package overlay

For every target profile and package:

1. Export the complete package from the exact verified remote-default merge commit into a non-repository staging directory; never source rollout bytes from a candidate worktree.
2. Back up the complete existing target package to a non-repository directory.
3. Inventory source-relative and target-relative package files, excluding known generated caches only.
4. Hash target-only files as profile-local additions.
5. Atomically overlay every canonical source file into the target package **without deleting target-only files**.
6. Re-hash every canonical path and require byte equality with the frozen source.
7. Re-hash target-only files and require exact equality with the pre-rollout inventory.
8. Repeat the comparison after runtime/fresh-process verification because profile automation may edit skills concurrently.

Do not use version strings as equality proof. Do not replace a whole skill directory when additive profile references exist.

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
