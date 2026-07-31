# Centralized identity-index audit notes

Use this note when a fixed implementation claims one canonical identity policy for routes, entity IDs, follow keys, schema types, search, sitemap, and release gates.

## Requirement matrix

Verify all of the following independently:

- the index is built once from the complete canonical registry;
- the registry is cloned without invoking accessors, then revalidated against an internally loaded frozen cohort;
- exact cardinality, QID, rank, entity type, slug, canonical path, follow key, and schema type are coherent;
- QID/path/follow lookups return the same frozen identity object;
- backing maps remain private and cannot be replaced or mutated through the public API;
- serializer accepts only authentic indexes, emits deterministic integer-position maps, and recursively freezes its result;
- page models, aliases, gate manifests, search records, and sitemap entries consume the centralized identity rather than independently reconstructing it;
- partial/reference fixtures remain usable but cannot emit a production-ready index or full-cohort gate report.

## Prototype probes

Test outer registry and nested entities separately with:

1. an inherited custom prototype;
2. `Object.create(null)` / `Object.setPrototypeOf(value, null)`;
3. accessors, symbols, non-enumerable properties, extra own properties, and sparse arrays.

Report each result by mutation name, not just an array index. A helper may intentionally classify null-prototype dictionaries as “plain” while rejecting other custom prototypes. Whether that is compliant depends on the written contract: canonical JSON provenance generally requires rejection; an explicitly JSON-like semantic boundary may permit safe normalization.

## Generated-output probe

Generate into a disposable directory outside the immutable checkout. Check all identities against:

- serialized catalog identity maps;
- canonical sitemap inclusion and alias exclusion;
- alias page canonical/noindex metadata;
- search data from one stable shell page that embeds the shared entity payload (do not assume every specialized renderer embeds it);
- full gate-report row count and identity coherence.

Run a partial fixture separately and confirm that full-readiness artifacts are absent. Remove temporary output and reconfirm SHA plus worktree/index cleanliness.
