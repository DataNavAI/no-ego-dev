# Current editorial inventory audit at an immutable SHA

Use for post-commit editorial/source-provenance gates where the candidate code is frozen but the publishable inventory is time-sensitive.

## Read-only procedure

1. Record trusted current UTC, exact SHA, tree, and clean status before evaluating inventory. If tracked generated output was intentionally restored after a disposable build, do **not** reuse that older artifact's `generatedAt` as the source-inventory evaluation clock: newer committed/source records will appear future-dated and create a false rejection. Evaluate mutable source inventory with trusted current UTC (or a separately trusted source snapshot time), while treating the disposable build log as generated-artifact count evidence.
2. Read the committed inventory and call the production normalization/publication functions with that trusted source clock. Report raw, normalized, and publishable counts separately. If generated files are excluded from the source-only commit by protocol, audit source truth and disposable artifact truth as two explicit evidence layers rather than requiring the restored historical generated file to match newer source rows.
3. For every raw candidate, record the publication verdict plus title, declared entity, independently inferred entity, relevance result, outlet label, publisher origin, source URL, publication time, and verification time. Rejected rows are part of truthful inventory evidence; do not silently omit them.
4. Recompute final entity selection through the real selector. Map every authoritative refresh row into the normalized inventory by exact source-row identity (for example title + declared owner + receipt), then audit the resulting items regardless of a heuristic canonical `contentType`. Do not prefilter source-backed rows to `contentType === 'media_coverage'`: a title containing words such as “photos” can be classified as `media_photo` while retaining a valid `media-coverage` receipt, and an early taxonomy filter will silently undercount the refreshed inventory. Require:
   - normalized source-row count equals the authoritative refresh-row count before selection;
   - selected count equals unique selected-title count;
   - every selected entity has the intended entity type;
   - selected entity slug, primary identity, group identity, title, receipt label, receipt URL, publisher origin, and receipt verification time exactly match one authoritative source row;
   - no row is selected by multiple unrelated entities.
5. When receipts are aggregator URLs, independently query the aggregator's current search/feed by quoted title and corroborate the publisher label, publisher origin, title, and publication time. Treat an aggregator's changed opaque article ID as inconclusive rather than falsely claiming byte-identical source identity; immutable internal receipt equality and current external metadata corroboration are separate checks.
6. Run focused tests without invoking generators. If tests expose deterministic seams only when test mode is captured at module initialization, launch the process with the project-prescribed test environment from the start (for example `NODE_ENV=test node --test ...`), rather than changing the environment after import.
7. Recheck SHA, tree, and status after all probes. Any tracked or untracked output makes the no-modification review incomplete until the original clean state is restored without discarding user work.

## Verdict discipline

- Return the required verdict token first.
- On rejection, list only concrete reproducible blockers.
- On acceptance, keep evidence compact: immutable identity, evaluation clock, publishable count, exact ownership result, focused test result, and clean/no-output confirmation.
- Do not report a transient wrong test invocation as a candidate blocker when the prescribed invocation passes; preserve only the corrected command as evidence.
