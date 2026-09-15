# Identity-safe third-party media fixtures

Use this process when a runnable design prototype needs photographs of named people, performers, teams, or groups but production media rights have not been approved.

## Core boundary

A freely licensed file is not automatically the named subject, a suitable representation, or production-safe. Keep these decisions independent:

1. **Identity evidence** — does the file depict the exact named subject?
2. **Representation integrity** — for a group/set, does it depict the intended lineup rather than one member, a mixed group, fans, merchandise, a tribute act, or an unrelated object?
3. **Copyright license** — are the exact terms and required attribution known?
4. **Excluded-source policy** — does retained metadata indicate a forbidden upstream source?
5. **Placement/crop quality** — does the image still identify the subject at every required viewport?
6. **Production approval** — a separate explicit disposition; never inferred from design review.

Persistent prototype label:

```text
fixture_status: REVIEW_ONLY
rights_status: NOT_PRODUCTION_APPROVED
production_approved: false
```

## Identity-first discovery

For every named subject, establish a canonical identity before searching images:

- canonical display name and type;
- Wikidata QID and verified description;
- Commons category from `P373`, when present;
- optional Wikidata lead image `P18` as a discovery hint only.

Search Wikimedia Commons in this order:

1. Structured `depicts (P180)` exact-QID match.
2. Canonical `P373` category or relevant event subcategory.
3. Exact name plus event/role discriminator.

A filename or search-term match alone is insufficient. Ambiguous names require a QID before candidate acquisition.

For Commons candidates, retain `pageid`, MediaInfo ID, filename, description URL, original/thumbnail URL, MIME, dimensions, SHA-1, timestamp, uploader, and full `extmetadata`. Important metadata includes `Artist`, `Credit`, `ImageDescription`, `Categories`, `LicenseShortName`, `LicenseUrl`, `UsageTerms`, `AttributionRequired`, `Copyrighted`, and `Restrictions`.

### Collector mechanics and API pitfalls

- When filtering Commons `imageinfo` results by MIME, explicitly include `mime` in `iiprop` (for example, `iiprop=url|size|mime|sha1|timestamp|user|extmetadata`). If MIME is omitted from the request but required by the filter, every valid result can be misclassified as missing.
- Cache discovery responses and selected metadata. Use bounded concurrency, multi-second throttling, and exponential backoff for `429` and transient `5xx` responses; retry only unresolved identities rather than restarting the whole batch.
- Download 2–5 candidates per exact identity into scratch space, then promote only contact-sheet/source-verified selections into the canonical prototype asset directory.
- Preserve raw provider metadata separately from normalized identity/license/credit fields so later review can audit what the source actually returned.
- After a tile is rejected, remove its candidate bytes from the canonical prototype directory and mark the slot unresolved. Do not leave rejected media available for accidental rendering.

## Source and license policy

Prefer candidates with canonical license URLs for CC0 1.0, CC BY 4.0, or CC BY-SA 4.0. Older or jurisdiction-ported CC BY/BY-SA versions require individual review and exact-version attribution. Reject `NC`, `ND`, GFDL-only, custom/contradictory terms, unclear public-domain rationale, failed-license markers, and agency/social/press copies without auditable compatible terms.

Do not trust a lead image merely because it appears on Wikidata or Commons. Inspect URL, creator, credit, description, and categories for excluded upstream sources such as YouTube; reject on any positive indicator. Cache API responses, throttle broad acquisition, and use bounded retry/backoff for `429` and transient `5xx` responses.

A copyright license does not clear personality, publicity, privacy, trademark, endorsement, or moral-rights concerns. Keep production promotion separate.

## Human visual identity gate

Automated candidate ranking is acquisition assistance, not identity approval. Before a fixture enters a named card:

1. Generate a contact sheet with stable item IDs and adjacent subject/file labels.
2. Review every tile fail-closed for:
   - non-person objects, signatures, logos, album art, screenshots, ads, stock models, or unrelated performers;
   - homonyms and stage-name ambiguity;
   - mixed acts, partial groups, outdated or unclear lineups;
   - distant stage shots, occlusion, poor recognition, or unusable crops.
3. For every flagged or uncertain tile, generate 2–5 candidates for the same exact QID and review again.
4. Open the source page for the selected candidate and confirm description/category/structured identity evidence.
5. Record reviewer, time, identity evidence type/URL, outcome, lineup/event context, and crop disposition.

A vision model can efficiently flag obvious mismatches and uncertainty, but it must not infer a celebrity identity from appearance alone. Source evidence plus human/authorized review remains required.

## Group/set integrity

A card named for a group or set must not silently use:

- one or two members;
- a mixed photo with another group;
- an incomplete lineup presented as the full current group;
- a crowd, venue, merchandise, logo, or promotional graphic.

If a partial/event lineup is intentionally used, label it accurately and record the event/date. Otherwise acquire another image or substitute a reserve subject with its own verified QID. Never fill the slot with initials, a generated face, or an unrelated stock portrait.

## Failure and substitution

1. Reject the candidate that failed identity, source, license, quality, or crop review.
2. Try another file for the same QID.
3. Search the canonical category and event descendants.
4. Substitute a reserve subject only with its own verified identity and media evidence.
5. If no subject passes, omit it from the review surface and report the media blocker.

Contextual crowd/venue imagery may appear only when labeled as atmosphere and must never occupy the named-subject identity slot.

## Fixture-ledger minimum

Record:

- stable asset ID, subject name/type, Wikidata QID/description, Commons category;
- all source/file/license metadata and normalized attribution;
- source-domain and excluded-source checks;
- identity evidence, reviewer, date, and outcome;
- group lineup/event context where applicable;
- local retained-byte checksum, source-byte checksum when available, crop/focal point, alt decision, visible credit, takedown owner;
- explicit `REVIEW_ONLY`/`NOT_PRODUCTION_APPROVED` state.

If acquisition or normalization transcodes/resizes the source, never copy the provider/source digest into the retained-byte field. Preserve the original as `sourceSha256` (or provider-native SHA-1) and compute `sha256`, byte length, dimensions, and file signature from the exact bytes committed to the prototype. Verification must hash the retained file and compare it to that retained-byte digest.

Verification should prove record count, unique subjects/assets, local-byte presence/signatures, required provenance, exclusion checks, and persistent review-only labeling. It must not claim production rights.

## Review wording

Prototype notice:

> **REVIEW PROTOTYPE — Third-party reference imagery. Identity and rights have not been approved for production use.**

Credit pattern:

> Photo fixture: [creator], [exact license], via Wikimedia Commons. Used for design review only; production rights and identity require separate approval.

Avoid `official`, `partner`, `endorsed`, or `approved` unless independently true and authorized.
