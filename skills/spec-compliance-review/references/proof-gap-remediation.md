# Remediating proof-only spec-review failures

Use when an immutable spec review finds no implementation or contract defect, but fails because committed tests do not prove required behavior across production seams.

## Classification

Keep these outcomes distinct:

- **Behavior defect:** production behavior violates the contract; add a failing regression test, then fix production code.
- **Proof gap:** production behavior appears correct, but no durable test exercises the required path; add the missing test before touching production code.
- **Harness defect:** the proposed test does not actually traverse production seams or fails because of its own setup; fix the harness, not the product.

Do not manufacture a RED by weakening, deleting, or changing correct production code.

## Workflow

1. Freeze the failed review's exact head and record every finding with file/line evidence.
2. Translate each proof gap into one regression that crosses the named production boundary. Examples:
   - outer `boot` → router → canonical loader → controller → rendered state/robots metadata;
   - pending async load → route close/replacement → stale completion cannot mutate DOM or metadata;
   - source module → static build substitution → hashed emitted asset → browser bundle import → public manifest allowlist.
3. Add tests only. Avoid production edits until the focused tests run.
4. Run the smallest focused suites and classify honestly:
   - **fails for the expected missing behavior:** preserve RED, make the minimum production fix, then rerun GREEN;
   - **passes immediately:** record a proof-only remediation; no production defect was exposed and no production change is warranted;
   - **fails for setup/harness reasons:** correct the harness and rerun before drawing a product verdict.
5. Commit the proof remediation separately when practical, with exact changed paths and focused counts.
6. Reconfirm local/remote/PR SHA parity and cleanliness.
7. Dispatch a fresh independent reviewer against the new immutable head. Give it the prior findings and require a per-finding `resolved|unresolved` disposition plus new-gap scan.
8. Return the disposition to the controller. For ordinary candidates the controller consumes it inside one composite verdict; a distinct specialist exists only when predeclared for a non-overlapping high-risk expertise gap.

## Test quality checks

A regression is meaningful only if it:

- invokes the real production entry point rather than duplicating helper logic;
- asserts both valid and fail-closed paths when the contract names both;
- observes externally meaningful state, not internal implementation trivia;
- proves cancellation/race safety by mutating the replacement state before stale completion;
- verifies build closure in both directions: emitted module identity and consumer import rewrite;
- remains deterministic and does not depend on sleeps when a controlled promise or bounded event-loop drain is sufficient.

## Reporting language

For a pass-immediately proof gap, say explicitly:

> The new regression passed immediately against the existing implementation. This closes a durable evidence gap; it did not expose a production defect, so no production code was changed.

Never label that run RED or imply a bug fix occurred.
