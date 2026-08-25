# Eval Fixture Resolution Contract

Use this when a profile-distribution eval runner accepts `parameters.fixture`.

## Package-root resolution

Resolve the fixture against the nearest explicit package boundary:

1. nearest ancestor containing `SKILL.md` for a skill-owned eval;
2. otherwise nearest ancestor containing `distribution.yaml` (or the repository's equivalent distribution marker) for a distribution-level eval;
3. otherwise the eval file's own directory for a standalone eval.

Do not assume every eval lives under `skills/`. Distribution repositories may keep release or product evals under root-level `evaldata/` while referencing root-owned documentation.

## Fail-closed parsing

- Treat an omitted `fixture` key as “no fixture.”
- Reject an explicitly present YAML null (`fixture: null` or `fixture: ~`).
- Reject non-string and blank values.
- Reject absolute paths.
- Reject any lexical `..` path component **before** normalization, even if normalization would land inside the package.
- Resolve symlinks and require the resulting file to remain under the selected package root.
- Require a regular, existing, non-empty UTF-8 text file.

Resolved containment checks do not replace lexical traversal checks: `subdir/../fixture.md` can normalize inside the package while still violating the declaration contract.

## Delivery proof

A loaded path or generated `prompt.txt` is insufficient. Run a disposable sentinel through the production invocation path and capture both calls. Assert the exact fixture text reaches:

1. the evaluated-agent invocation;
2. the judge invocation.

When a shell boundary remains, pass dynamic prompts through argv with `shell=False`, or quote the complete argument with `shlex.quote`. Include `$()`, backticks, quotes, and newlines in an adversarial fixture; assert literal delivery and prove no marker file was created.

## Regression matrix

- fixture key omitted → accepted, no fixture section;
- explicit null → rejected;
- blank/non-string → rejected;
- absolute path → rejected;
- outside traversal → rejected;
- traversal that normalizes inside → rejected;
- symlink escape → rejected;
- missing/directory/empty file → rejected;
- skill-relative fixture → loaded;
- distribution-root fixture → loaded;
- exact fixture text reaches both runtime invocations;
- shell metacharacters remain literal;
- repository-root discovery loads every tracked `EVAL*.yaml` and reports the count.

A focused `skills/` scan is not repository-wide evidence. Compare production discovery scope with tracked eval locations so root-level evals cannot be silently omitted.
