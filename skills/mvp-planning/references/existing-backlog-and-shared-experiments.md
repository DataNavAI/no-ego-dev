# Existing-backlog audits and shared-site experiments

Use this reference when an MVP already has substantial backlog/implementation or when several hypotheses share one site or platform.

## Existing-backlog audit

The goal is the shortest honest path to first real-user value, not a redesign from stale documents.

1. Read the live issue/milestone graph first; status documents are context, not proof.
2. Pin the current default-branch revision and inspect its product contracts, implementation, and tests.
3. Run the canonical verification command on that exact revision in an isolated checkout when the working tree must remain untouched.
4. Compare open work with what already exists and passes. Existing behavior can supersede planned migrations, refactors, or duplicate QA.
5. Identify provider/external gates and whether they block the primary CUJ or only analytics, hardening, or a future operating model.

Classify every open child exactly once:

- `MUST BEFORE USER TESTING`: reviewed content/data, primary-CUJ completion, trust/privacy, feedback, minimum operability, real deployment, candidate smoke, or rollback.
- `SIMPLIFY/MERGE`: retain only the necessary slice in a consolidated launch task or gate.
- `DEFER POST-VALIDATION`: hardening justified only by traffic, incidents, scale, retention, or contract evidence.
- `CLOSE/SUPERSEDE`: duplicate work, inactive boundaries, wrong architecture, or work replaced by a simpler mechanism.

For each child, state the retained outcome, removed work, simpler replacement, and evidence trigger for reintroduction. Rewrite dependencies: break optional gates that serialize unrelated launch work, remove checks for closed architecture, consolidate QA without dropping primary-CUJ/privacy/accessibility/deployment/rollback proof, and retain one owner for exclusive provider reconciliation.

Before retaining security or operations work, name the active boundary it protects. Do not cut source rights, correctness, privacy, secret handling, public-boundary checks, feedback safety, accessibility, basic health visibility, or reversible deployment.

## Shared-site multi-hypothesis MVP

Frame the release as one shared experimental product platform with independently measurable journeys—not several equal MVPs on one homepage. Exactly one primary CUJ and no more than two necessary supporting CUJs still govern the release.

Classify every idea as:

- primary value loop;
- necessary supporting engagement/trust/recovery loop;
- shared foundation;
- beta entry/exit feature;
- reserve vertical.

Prefer one codebase/deployment when candidates share audience, brand, data/taxonomy, design system, identity, attribution, domain authority, and operator. Separate experiments with dedicated routes and landing promises, one completion event per route, immutable experiment revision, source attribution, feature flags, and separate completion/share/return/fulfillment reporting. Never pool panel, founder/friend, incentivized, creator-paid, and organic traffic.

The homepage must express one coherent promise and begin the dominant journey. Direct campaign/community/search routes may enter the relevant module, but users should receive promised value before cross-navigation. Secondary modules must not visually compete with the primary CUJ.

For SEO, use substantial canonical pages, noindex unsupported/duplicate/experiment-only pages, separate ambiguous taxonomy, and expose source/update/correction state. Split into separate products only for material audience, compliance, billing/identity, operational ownership, scaling, SEO-quality, or cross-navigation boundaries.

## Delivery and validation

1. Build shared contracts, trust/source rules, search, canonical pages, minimum measurement, and flags.
2. Complete the primary acquisition-to-value journey.
3. Add the strongest necessary support/share/repeat loop.
4. Add constrained modules only for supported scope; refactor duplication before milestone close.
5. Compare two or three rough UX stances on first-viewport job, action count, trust, mobile behavior, and portal risk before architecture.
6. Require route-specific acquisition, no forced cross-navigation, comparable prototype effort, immutable attribution, recipient-open/share completion, and `INCONCLUSIVE` for sparse or biased evidence.

The plan must state which idea is primary, which are supporting/foundation/beta/reserve, the unifying promise, indexability, trust/data obligations, completion events, and evidence needed to promote or split a module.
