# Immutable deterministic gate review checklist

Use this reference for machine-readable build/readiness reports and similar deterministic release gates.

## Target integrity

- [ ] `HEAD` equals requested SHA.
- [ ] Index and worktree clean before review.
- [ ] Diff is fixed commit versus parent.
- [ ] No repository edits, network calls, or broad unrelated exploration.
- [ ] Final SHA and cleanliness rechecked.

## Contract matrix

- [ ] Numbered task read.
- [ ] Technical-spec interface read.
- [ ] Failure matrix read.
- [ ] Acceptance/release checklist read.
- [ ] Every named evidence dimension maps to a concrete report field/status/blocker.
- [ ] Exact cardinality and subset/reference behavior defined.
- [ ] Warning versus blocker semantics explicit.
- [ ] Aggregate semantics distinguish blocked rows from blocker occurrences (for example, one row may carry two blockers).

## Structured-fact provenance

- [ ] Identity comes from validated canonical data.
- [ ] Route/alias status comes from generated route maps.
- [ ] Detail count comes from generated detail inventory.
- [ ] Schema agrees with entity type.
- [ ] Asset status comes from actual generated asset specifications.
- [ ] Current count comes from exact-entity selected inventory.
- [ ] Source and rights readiness are independently evaluated.
- [ ] Report does not reparse arbitrary HTML when structured facts exist.
- [ ] Report is emitted only after required outputs are successfully written.
- [ ] On a fresh output directory, an injected earlier write failure cannot leave a success report; when intentional pre-delete validation preserves an old deployment, distinguish that preservation policy from emitting a new success artifact.

## False-success probes

- [ ] Complete valid cohort.
- [ ] Deterministic repeated bytes and stable newline.
- [ ] Missing/duplicate/unknown QID.
- [ ] Canonical, alias, details, and schema mismatch.
- [ ] Missing OG.
- [ ] Syntactically valid but wrong OG path.
- [ ] Approved primary portrait plus wrong OG path.
- [ ] Invalid source.
- [ ] Invalid approved image and invalid fallback rights.
- [ ] Empty current inventory remains warning-only when specified.
- [ ] One-row subset cannot claim production readiness.
- [ ] A subset/reference generator either rejects report generation or omits the production-readiness artifact while still producing explicitly non-production output.
- [ ] Broad compatibility data remains present.

## Hostile-shape probes

For arrays, options, validation wrappers, manifest rows, and accepted raw entities:

- [ ] sparse index;
- [ ] custom prototype;
- [ ] symbol key;
- [ ] accessor/getter that must not execute;
- [ ] non-enumerable property;
- [ ] extra own property;
- [ ] oversized values;
- [ ] malformed/non-UTC timestamp.

Also verify input deep equality before/after and recursive freezing of promised immutable output.

## Recurring false-success patterns

### Stronger credential bypass

Bad pattern:

```js
if (approvedPrimaryImage(entity.image)) return true;
return entity.ogImage.localPath === manifest.ogImagePath;
```

This proves portrait rights but skips independent OG coherence. Evaluate separate acceptance dimensions separately.

### Cardinality cap without exact gate

`rows.length <= 50` prevents oversized input but allows a one-row report to return `ready: 1, blocked: 0`. A fixed-cohort production gate needs exact cardinality or explicit partial/non-production status.

### Value without status

`schemaType: "Person"` is data, not readiness evidence. If the contract requires schema status, expose and aggregate it or fail with the contractually specified blocker behavior.

### Strict wrapper, permissive shortcut

A validated-registry path may reject symbols/accessors while a raw-entities overload silently ignores them. Probe every public input form, not only the path used by production today.

## Reporting

Start with `PASS` or `FAIL`. Each finding should include requirement, source lines, probe, and consequence. Separate fresh test output from reused historical evidence. Finish with SHA, clean status, and files modified.