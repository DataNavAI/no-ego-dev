# PR-Mode Consistency Audit

Use this when adding or changing temporary review-PR behavior in a multi-skill profile or distribution.

## Failure pattern

The central review skill correctly distinguishes `MERGEABLE` from `REVIEW_ONLY`, but a higher-priority global prompt or an orchestrator says every human-reviewed artifact should use a review-only PR. Agents then create temporary, non-mergeable PRs for changes that were actually meant to land.

Marker-presence tests do not catch this cross-layer contradiction; they pass even when the global default is wrong.

## Audit surfaces

Check all layers that can steer publication:

- global persona/SOUL/profile guidance;
- project-manager or orchestrator workflow;
- product-manager, architect, UI/design, QA, and release skills;
- the central review skill and PR-body templates;
- evaluation prompts and fixtures;
- regression tests;
- README/user-facing workflow descriptions;
- deployed profile copies.

Search semantically for blanket phrases such as “for any reviewed artifact, create a review-only PR” and for older generic title conventions that omit the mode.

## Required mode matrix

| Scenario | Mode | Markers | Terminal action |
|---|---|---|---|
| Temporary discussion/presentation surface | `REVIEW_ONLY` | Draft, `review-only/*`, `[REVIEW ONLY — DO NOT MERGE]`, body mode/banner, available labels | Preserve accepted content, close without merge, clean exact temporary resources |
| PR whose commits should land directly | `MERGEABLE` | No review-only markers | Normal CI, approval, and merge lifecycle |
| Review-only PR converted to landing PR | `MERGEABLE` after explicit approval | Remove all review-only markers and record conversion | Re-run normal CI/review gates before merge |

## Regression pattern

Tests should assert both positive and negative behavior:

1. The temporary fixture requires every review-only identity and cleanup safeguard.
2. A separate landing-PR fixture requires `MERGEABLE` and explicitly says it must not receive review-only branch/title/body/label markers.
3. Global/profile guidance contains conditional mode selection.
4. A negative regression proves global/profile guidance does not contain the previous blanket review-only instruction.
5. Downstream skills point to the central protocol without redefining it inconsistently.

Example assertions:

```python
assert "Use a normal `MERGEABLE` PR with no review-only markers" in soul
assert "Only when the PR is a temporary discussion surface" in soul
assert "must not receive review-only branch/title/body/label markers" in fixture
assert blanket_review_only_wording not in soul
```

## Release gate

- Run deterministic tests and lint on the exact staged revision.
- Dispatch a fresh independent reviewer against that same revision.
- Do not push or deploy while the reviewer callback is pending.
- If the reviewer finds a cross-layer contradiction, fix it, expand the regression test, and request a fresh review before publishing.
- After deployment, verify the same mode markers and negative assertions in every profile copy.
