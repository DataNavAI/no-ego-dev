# Whole-container JPEG structural probe recipe

Use this when strict JPEG decode and dimension parity are already present, but the remaining question is whether validation covers the complete byte container rather than stopping at the first EOI.

## Candidate binding

- Freeze the exact PR head, tree, and base before probes; re-query the moving PR after all verification.
- If an existing reviewer checkout is on an earlier remediation SHA, do not update or reuse it. Create a fresh reviewer-owned exact-head checkout, verify detached `HEAD` and tree, and remove it after the final clean-state proof.
- Keep the authoritative historical receipt files byte-unchanged. Treat their old review disposition separately from any issue-authorized production-eligibility decision.

## Static scanner audit

Trace the scanner as a state machine and verify:

1. Initial SOI is mandatory.
2. Length-delimited marker payloads are skipped by their declared length, so embedded `FFD9`, `FFD8`, `FF00`, or restart-looking bytes are data rather than structure.
3. Entropy mode distinguishes `FF00` stuffing and `FFD0..FFD7` restart markers from structural markers.
4. Marker fill bytes are handled without mistaking an early `FF` for the marker code.
5. Every SOS can re-enter entropy mode, including progressive/multi-scan files.
6. A second SOI, malformed/truncated length, missing EOI, or any byte after the first structural EOI fails closed.
7. The structural scanner and strict decoder are both used through one shared validation function at source ingestion and emitted-public verification.

Do not infer support from comments alone. Independently inventory the committed cohort's marker structure: count SOS segments, `FF00` stuffing, restart markers, fill bytes, terminal EOI, and trailing-byte count. This often proves that ordinary production files already exercise progressive/multi-scan and stuffing paths.

## Minimum behavioral matrix

Start with a known-valid committed JPEG and preserve declared dimensions.

Positive cases:

- canonical committed JPEG;
- APP/COM segment containing marker-like payload bytes;
- marker fill before an ordinary marker;
- progressive or multi-scan JPEG;
- restart-marker JPEG.

Negative cases:

- missing SOI;
- second SOI;
- malformed segment length (`< 2`);
- truncated segment/container;
- missing EOI;
- valid JPEG plus trailing text and binary;
- two concatenated valid JPEGs under the byte cap.

Require the trailing and concatenated cases at **both** boundaries with all attacker-controlled identities updated: full digest, byte count, content-addressed path, public manifest row, canonical media contract, and credits projection where applicable. Otherwise an earlier hash mismatch can hide the whole-container defect.

## Generating restart coverage

When the committed cohort has no restart markers, Pillow can generate a disposable positive fixture without changing the repository:

```python
from PIL import Image
im = Image.new("RGB", (64, 64), (12, 34, 56))
im.save("/tmp/jpeg-restart.jpg", "JPEG", quality=85, restart_marker_blocks=1)
```

Before using it as evidence, count `FFD0..FFD7`, assert terminal `FFD9`, and pass it through the exact production validator with declared dimensions `64x64`. Remove the fixture afterward.

## Evidence and interpretation

- Report separately: focused source/public regressions, direct structural probe counts, full canonical suite, build/public scan, and final artifact inventory.
- A clean pass should include exact raster count, MIME classification, maximum bytes/dimensions, digest parity, review-only composite exclusion, and unavailable publication state.
- If the scanner rejects a rare shape, check whether the strict decoder accepts that shape before classifying it. A fail-closed scanner need not support syntax the selected strict decoder cannot decode, but it must not accept a decoder-consumed prefix with unvalidated trailing bytes.
- Cleanup is part of the proof: remove generated dependencies/build output and temporary fixtures, then reconfirm exact SHA/tree, empty status, and unchanged moving PR head.
