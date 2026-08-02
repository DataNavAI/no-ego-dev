# Profile-Distribution Rollout for Issue Monitor

Use this reference when installing `issue-monitor` into a Hermes profile distribution with multiple live sibling profiles.

## Distribution artifacts

Promote the skill into the distribution's canonical layout, not necessarily the category layout used by the source skill library. For NoEgoDev, use:

```text
skills/issue-monitor/
  SKILL.md
  EVAL.yaml
  evaldata/README.md
  references/          # when present
  templates/           # when present
  scripts/             # when present
```

The eval should exercise the class-level contract: absolute cron `workdir`, bounded issue selection, one durable stage per fresh run, RED-before-code implementation, a distinct reviewer that writes an exact-SHA verdict, a later merge-only executor, fail-closed CI/branch-protection behavior, and external post-merge verification. Update English/localized skill indexes when the distribution publishes a list of included skills.

Validate the final source state with frontmatter parsing, eval YAML parsing, fixture-path checks, `git diff --check`, and the distribution's full test command. Re-check the final files after tests before staging.

## Dirty source checkout

Treat pre-existing modifications and untracked directories as intentional:

- stage and commit only `skills/issue-monitor/` and its exact index files;
- do not use blanket staging, reset, clean, or profile-update commands;
- avoid propagating unrelated dirty distribution-owned files into live profiles.

If the remote branch moved and rejects the focused push, preserve the dirty checkout. Fetch the remote branch into an isolated worktree outside the repo, cherry-pick the focused skill commit there, push without force, then remove the worktree. Verify the remote skill blobs. The cherry-picked remote commit will have a different SHA; report both when relevant and explicitly note any local/remote divergence left for later reconciliation.

## Live sibling sync

For every active profile installed from the same distribution:

1. Copy the entire `skills/issue-monitor/` directory into the profile's canonical flat path, `~/.hermes/profiles/<profile>/skills/issue-monitor/` for NoEgoDev.
2. Do not create duplicate flat and namespaced copies.
3. Compare source and live directories recursively and verify `SKILL.md`, `EVAL.yaml`, fixture files, and support directories.
4. Restart each running profile gateway so new sessions load the skill.
5. Verify `hermes -p <profile> skills list` shows `issue-monitor` enabled.

## macOS gateway restart from a gateway-owned session

Hermes may refuse `hermes -p <profile> gateway restart` when the command originates inside a gateway process, to prevent restart loops. For a known, already-loaded sibling LaunchAgent, restart the exact label and verify it returned with a new PID and `state = running`:

```bash
UID_NUM=$(id -u)
label="ai.hermes.gateway-<profile>"
launchctl print "gui/$UID_NUM/$label"
launchctl kickstart -k "gui/$UID_NUM/$label"
launchctl print "gui/$UID_NUM/$label"
```

Use this only for known loaded labels. Missing or unhealthy services require normal gateway/launchd diagnosis rather than blind kickstarts.
