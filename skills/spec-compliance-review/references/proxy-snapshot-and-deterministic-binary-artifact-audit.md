# Proxy snapshot and deterministic binary-artifact audit

Use this when an exact-SHA candidate accepts a caller object, validates it, and then emits a deterministic image/archive/document containing caller-derived values.

## 1. Audit validation-to-use closure

Descriptor checks do **not** prove a safe snapshot. A Proxy can report ordinary prototypes, own keys, and data descriptors while changing values on later `get` operations.

Trace every caller read across:

1. shape/prototype checks;
2. semantic validation;
3. rendering/encoding;
4. metadata and filename generation.

Flag any path that validates a live object and later rereads it. The renderer, filename builder, and metadata builder must all consume one bounded, immutable snapshot—not the caller object.

### Stateful Proxy reproducer

Wrap a valid plain record in a Proxy, count reads per key, return canonical values through validation, then substitute a sentinel on the first rendering read. Verify all three outcomes:

- whether the call is rejected;
- whether the sentinel appears in the rendered artifact;
- whether metadata/filename still reflects the earlier canonical identity.

Separately replace a validated short string with a very large string after validation. Acceptance proves that length/CPU bounds are not closed even if the fixed-size output remains bounded.

Do not rely on `Object.getPrototypeOf`, `Reflect.ownKeys`, or `Object.getOwnPropertyDescriptor` to identify a Proxy: those operations themselves invoke Proxy traps. If zero-trap hostile-object rejection is contractual, prefer bounded JSON text or another input boundary that excludes live objects. Otherwise, explicitly document Proxy acceptance and copy exactly once before validation, understanding that copying invokes traps and therefore is not zero-trap rejection.

### Bounded JSON-text replacement review

When a replacement candidate closes a live-object/Proxy bypass by changing the public boundary to JSON text, verify the closure rather than merely observing the type check:

1. Reproduce the superseded-head exploit first with a stateful Proxy that returns canonical values through validation and a sentinel afterward. Record acceptance, changed pixels/bytes, and filename or metadata drift.
2. On the replacement, pass ordinary objects, accessors, mutable and alternating Proxies, revoked Proxies, boxed strings, Proxy-wrapped strings, arrays, buffers, and `null` directly. Require rejection before every trap/getter (`0` invocations).
3. Exercise malformed, primitive, missing/extra-key, symbol-equivalent string-key, noncanonical, control-character, unpaired-surrogate, decomposed-Unicode, deeply nested, whitespace-padded, exact-boundary, and over-boundary JSON text.
4. Instrument the parse seam to confirm one parse per call, then trace that one parsed snapshot through validation, rendering, metadata, and filename construction. A real built-in JSON parse excludes caller accessors/Proxies; freezing the parsed object prevents internal mutation but is not a substitute for proving exclusive downstream use.
5. Probe duplicate keys explicitly. Standard `JSON.parse` uses the final occurrence. Record this as accepted-last-value behavior and inject a forbidden sentinel into an earlier duplicate; verify it reaches neither pixels nor metadata. Treat duplicate-key acceptance as a blocker only when the contract requires unique textual provenance or duplicate rejection—not merely because duplicates are undesirable.
6. Check escaped canonical Unicode against literal Unicode for byte identity, and reject visually similar but noncanonical normalization forms unless normalization is expressly supported.

Keep the replacement probe outside the immutable checkout. A disposable script may import the exact-SHA module by absolute path, generate artifacts under the system temporary directory, and be deleted after the final identity check.

## 2. Independent deterministic PNG checks

Do not stop at the implementation's own test parser. For PNG, independently verify:

- 8-byte signature;
- exact chunk ordering and final `IEND` with no trailing bytes;
- chunk bounds and CRC-32;
- IHDR width, height, bit depth, color type, compression, filter, and interlace fields;
- zlib header, DEFLATE block lengths/complements, decompression, and Adler-32;
- expected scanline length and filter bytes;
- decoding with at least two external decoders.

For a frozen label catalog, derive the complete used-character set, require glyph coverage, detect duplicate glyph shapes, generate every catalog label, and compare label-region hashes for collisions. Prove clipping geometrically by recording minimum left edge, maximum right edge, and maximum bottom edge across the cohort; visually inspect representative longest and non-ASCII labels.

Use genuinely independent decoders where available (for example Pillow plus FFmpeg or the platform image service), not two wrappers around the implementation parser. OCR should be machine-checkable as well as visual: on macOS, a disposable Swift script using `Vision.VNRecognizeTextRequest` and `ImageIO` can transcribe exact generated PNGs without adding project dependencies. OCR at least the longest catalog label and every non-ASCII label, and compare the transcript with the authoritative strings.

When hashing rendered labels, hash a fixed pixel region from **inflated scanlines**, not compressed PNG bytes. Require unique region hashes across the complete frozen catalog, and separately scan compressed bytes and inflated scanlines for forbidden textual markers. Region uniqueness proves distinct raster output; it does not by itself prove correct text, so retain OCR/visual checks.

## 3. Privacy checks must include pixels

Searching compressed or inflated bytes for forbidden ASCII is useful but insufficient for raster output: visible text is encoded as pixels. Combine byte-marker scans with visual/OCR inspection and hostile substitution probes. A clean textual scan does not establish privacy closure if a post-validation value can be rasterized.

## 4. Performance evidence

Report separately:

- artifact byte size;
- synchronous generation latency after warmup (report min/median/max over repeated calls, not one cold observation);
- retained ArrayBuffer/external memory before and after returning one defensive byte copy, with GC requested when the runtime exposes it;
- a separate bounded repeated-generation run with wall time and maximum RSS/peak footprint;
- host CPU/runtime;
- a constrained-runtime probe when available.

Do not infer per-artifact retention from maximum RSS during a repeated run: allocator reuse, runtime heaps, and transient encoder buffers make those different measurements. Keep fixed artifact size, retained defensive-copy delta, warm latency, and process-level peak memory separate.

Do not declare a mobile blocker from a desktop multiplier alone. Bind a blocker to an explicit product budget or real supported-device evidence. Without that, report measured desktop/constrained evidence as a residual release risk and require supported-interface gating.

## 5. Authority drift

Search for duplicated score bands, personas, enums, filename identity rules, and catalog mappings. Distinguish:

- **current contradiction**: blocking logic/spec defect;
- **matching duplicate authority**: drift risk unless the contract requires one shared owner;
- **single authoritative import/projection**: preferred.

## Verdict evidence

Record exact base/head/tree identities at start and end, canonical and focused test results, external decoder results, hostile-probe outcomes, repository preservation, and whether the moving PR head changed. A green suite never overrides a demonstrated validation-to-use bypass.