# Pure bounded Wikidata/Commons candidate materialization

Use this pattern when already-fetched Wikidata and Commons API responses must be converted into review-only candidate records. Keep fetching, retries, filesystem access, and promotion outside the materializer.

## Boundary and API

- Export one pure function that accepts a single Wikidata entity, a Commons image-info response, and an injected exact UTC `checkedAt` instant.
- Do not read environment variables, files, clocks, or the network in the module.
- Accept only own data properties on plain or null-prototype records. Never invoke getters or consume inherited identity/source fields.
- Require the Wikidata entity's own data `type` to be exactly `item`; reject missing, wrong, or accessor-backed types with a stable entity-type error. Preserve existing QID error precedence when both identity and type are invalid.
- Distinguish an absent optional container from a malformed present container by inspecting its own property descriptor. For relationship qualifiers, no own `qualifiers` descriptor means genuinely absent (`unknown`), while an own accessor, scalar, array, or custom-prototype value invalidates that statement without invoking accessors.
- Bound every consumed response array before iteration: statements per property, qualifiers, references, Commons pages, and image-info entries. Require dense standard-prototype arrays when hostile input is in scope.
- Return fresh nested output graphs. Mutating a result must not mutate either source response or change a repeated call's output.

## Deterministic property conversion

Use a fixed property order rather than object enumeration:

- `P434` → `https://musicbrainz.org/artist/<validated UUID>`
- `P2003` → `https://www.instagram.com/<validated username>/`
- `P2397` → `https://www.youtube.com/channel/<validated channel ID>`
- `P856` → preserve only already-canonical safe HTTPS URLs

Each converted link carries the injected `checkedAt` and exact `sourceProperty`. Validate external IDs lexically before interpolation; omit malformed alternatives without normalizing them into apparently valid IDs.

For every response-derived HTTPS URL (`P856`, `P854`, Commons original, Commons description, and license URLs), validate the original lexical string before URL construction and require exact serialization afterward. Reject credentials, literal controls (C0/C1/DEL), whitespace, backslashes, and malformed `%` escapes. Make decoded-escape checks component-aware: recursively reject percent-decoded controls through nested `%25` at every depth; also reject encoded or double-encoded slash, backslash, and percent in authority/path because they can alter routing after decoding. Query/fragment escapes are data rather than path separators, so route-stable values such as an encoded nested URL or `100%25` may pass, while encoded controls still fail. Decode contiguous escape runs as UTF-8 so legitimate encoded non-ASCII text (for example Korean) remains valid rather than rejecting all high bytes. Reject `%` anywhere in a `P18` filename, and independently validate the exact Commons description URL as safe HTTPS before issuing a rights receipt.

## Relationship conversion

For group `P527` statements:

- emit `has_part` with the exact related QID;
- a single valid day-precision `P582` qualifier yields `status: former` plus a normalized UTC `endAt`;
- a valid year- or month-precision `P582` still yields `status: former`, but `endAt: null` rather than an invented instant;
- absent `P582` yields `status: unknown`, never `current`;
- malformed or ambiguous end qualifiers fail closed for that statement;
- include the Wikidata entity URL and preserve safe HTTPS `P854` reference URLs as statement-reference evidence;
- distinguish no own `references` property from malformed present references: absence retains the relationship with entity evidence alone, while accessor-backed, custom-prototype, sparse, or oversized present references invalidate the statement without invoking getters.

Do not infer missing start dates, current membership, slugs, names, or biographies.

## Commons rights candidate

Resolve `P18` only when exactly one valid P18 filename maps to exactly one Commons page with the exact `File:` title and exact Commons description URL. Require positive dimensions, canonical HTTPS original/description/license URLs, and trustworthy own-data extmetadata for creator/credit and license.

Materialize a review receipt with:

- filename, Commons description URL, original URL, and dimensions;
- creator/credit, license, license URL;
- usage terms and a tri-state attribution-required flag when available: trusted exact `"true"`/`"false"` become booleans, while missing evidence remains `null` and must not be collapsed to `false`;
- explicit attribution text;
- `approvalStatus: pending`.

A response-derived candidate must not contain a local asset path or an approved timestamp/status. If metadata is missing or ambiguous, emit `imageCandidate: null` so downstream UI uses a non-likeness fallback. Verify directly that the candidate fails the production image publishability predicate.

## Focused TDD fixture

Commit compact raw-style fixtures containing only the representative fields needed to establish the contract:

- one entity with safe and malformed official-link statements;
- two `P527` statements, one with `P582` and one without;
- `P854` reference evidence;
- one `P18` filename;
- one matching Commons page with image-info and rights metadata.

In one focused test, assert the exact candidate graph, repeat-call determinism, source non-mutation, result independence, absence of invented biography/local paths, pending image non-publishability, missing/ambiguous Commons behavior, accessor non-invocation, custom-prototype rejection, bounded-array rejection, and stable malformed-identity failure. Add a compact hostile matrix across every URL-bearing field for encoded controls/delimiters (`%0A`, `%00`, `%7F`, encoded C1, `%2f`, `%5c`), nested controls through `%25`, encoded percent/double encoding, malformed escapes (`%`, `%zz`), plus one valid percent-encoded UTF-8 case. Add accepted query/fragment controls showing that route-stable escaped data (an encoded nested URL, literal-percent data) is preserved exactly without relaxing authority/path checks. Probe a literal-percent `P18` filename, malformed/accessor/custom own `qualifiers` versus truly absent qualifiers, missing versus malformed/accessor/custom `references`, valid year/month/day `P582` precision versus malformed calendar values, missing/true/false attribution metadata, and missing/wrong/accessor-backed entity `type`; assert getter counts remain zero and no relationship, link, or rights evidence is emitted from malformed input.

Run the focused feature test, related reviewed-reference tests, then the repository's canonical full suite. If canonical generation dirties a known tracked output tree, restore only that pre-baselined tree and confirm the final commit/worktree contains exactly the intended module, fixtures, and test changes.
