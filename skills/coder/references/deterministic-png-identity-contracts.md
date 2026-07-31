# Deterministic PNG identity contracts

Use this when a static generator creates entity-specific PNGs whose bytes, embedded identity, and social metadata are part of a release contract.

## Generator contract

1. Derive Open Graph type from the canonical entity class. Use `profile` only for people; use a neutral valid type such as `website` for groups unless a supported namespace is intentionally implemented. Do not emit namespace-specific types without their required namespace properties.
2. Preserve two separate identity paths:
   - **Machine identity:** write one standards-valid PNG `tEXt` chunk with keyword `Title` and the exact canonical display name.
   - **Visible bitmap identity:** uppercase by Unicode code point and map only known glyphs; unknown glyphs become `?`. Do not normalize with NFKD or strip combining marks globally when an approved accented glyph must remain visible.
3. Encode `tEXt` only after proving the exact display name is bounded, contains no forbidden controls, and is representable byte-for-byte in Latin-1. Fail closed with a stable error instead of allowing `Buffer.from(value, 'latin1')` to truncate unsupported code points.
4. Put the textual identity chunk after `IHDR` and before contiguous `IDAT` chunks.
5. Precompute and validate every PNG specification and buffer before destructive output cleanup. Reject malformed declarations, duplicate paths, duplicate bytes, and unrepresentable titles before `rmSync` or equivalent output mutation.
6. Keep generation deterministic: fixed pixel construction, fixed chunk order, fixed compression settings, no timestamps, random values, host paths, or process-specific metadata.

## Test contract

Use a bounds-checked parser in the dedicated generator test; do not assert only the eight-byte signature and dimensions.

For every generated PNG:

1. Verify the PNG signature.
2. Parse every chunk using its declared length; prove header, data, and CRC are in bounds.
3. Validate every chunk CRC over `type || data`.
4. Require exactly one first `IHDR`, at least one contiguous `IDAT`, exactly one empty final `IEND`, and no trailing bytes.
5. Concatenate and inflate all `IDAT` payloads. For an RGB/no-filter generator, assert the exact byte count `(width * 3 + 1) * height` and each row's expected filter byte.
6. Require exactly one `tEXt` chunk whose keyword is `Title`; assert keyword bounds and the exact Latin-1 display name, including representative accented identities.
7. Generate the complete cohort twice into separate isolated output roots. Compare each corresponding file byte-for-byte and compare hashes; also retain within-run uniqueness assertions.
8. Clean both temporary roots in `finally`.

## TDD and verification sequence

1. Add the structural, identity, entity-semantic, and second-run assertions first.
2. Run the focused metadata test and capture an expected RED caused by missing behavior (for example, no `Title` chunk), not fixture-path setup.
3. Implement the smallest renderer/generator change and rerun focused GREEN.
4. Run the related feature suite, then the bare canonical full test and build commands.
5. If canonical commands rewrite checked-in output, restore only the known generated tree after recording successful evidence.
6. Confirm exact file scope and a clean worktree before committing.

## Pitfalls

- Isolated output overrides may require both a fixed basename and a pre-existing parent. Build each run as `<temp>/<run>/required-basename` and create `<run>` before invoking the generator.
- Shell static-scan commands with nested quote-heavy regexes can fail while an outer `!` masks the error. Prefer a small Python scan or inspect the command status explicitly; a scanner error is not a clean result.
- Comparing only hashes is weaker evidence than byte equality plus hashes. Assert both when byte identity is the requirement.
- Testing every cohort member already covers named examples, but explicit assertions for high-risk accented identities make regressions easier to diagnose.