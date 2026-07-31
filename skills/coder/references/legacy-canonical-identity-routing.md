# Legacy catalog → canonical identity routing

Use this when broad legacy records are enriched from a reviewed canonical registry and generated links may be selected from canonical identities.

## Threat model

A legacy record can accidentally or maliciously carry a canonical QID belonging to another slug or entity type. A QID-only lookup then silently routes that unrelated record to the canonical entity page. Duplicate claims can make behavior depend on iteration order.

## Projection preflight

1. Safely clone legacy arrays/records without invoking accessors.
2. Fully validate registry identities and build a QID → `{slug, entityType, canonicalPath}` map.
3. Before mutating projected records, scan both legacy collections for own, non-empty QIDs matching the registry.
4. A matching QID is valid only when it occurs exactly once and its legacy slug and collection/type match the registry identity.
5. Reject wrong-slug, cross-collection/type, and duplicate claims with one stable fail-closed error code.
6. Preserve unrelated non-cohort QIDs unchanged.
7. Only after the QID preflight and existing slug-collision preflight pass may projection mutate cloned output.

## Canonical href policy

Centralize route selection in a pure helper. Require all of:

- an authentic/branded canonical index,
- an exact own-data record identity shape,
- matching QID,
- matching slug,
- matching expected entity type.

A QID match alone is never enough. On mismatch, return a bounded canonical legacy fallback derived from the safely validated slug and expected type (or accept a supplied fallback only when it equals that exact expected path). Never return an arbitrary or external fallback URL.

Pass the expected type explicitly at every callsite, including search indexes, embedded entity data, and sitemap generation. Do not duplicate lookup logic across generator callsites.

## Regression matrix

Capture RED before implementation, then cover:

- unrelated legacy slug carrying a canonical QID;
- correct slug in the wrong collection/type;
- two legacy records claiming one canonical QID;
- one valid matching legacy identity;
- unrelated non-cohort QIDs retained;
- QID and slug accessors never invoked;
- inherited, accessor-backed, malformed, and extra-key href identities;
- valid QID + wrong slug falls back rather than canonical-routing;
- valid QID + wrong expected type falls back to the type-correct path;
- malformed fallback cannot escape the canonical route namespace;
- caller catalog and registry remain unchanged after rejection.

## Verification and generated output hygiene

Run the focused identity tests, the whole feature file, the canonical full suite, and the build. If generation rewrites a tracked output tree, restore tracked generated files and remove only generator-created untracked files under that known output root. Finish by proving the intended exact file count and a clean generated tree.