# Connection readiness audit — #296

The supplied screenshot shows the first-use model-readiness interstitial. The page opens the native dialog and focuses its heading. The global focus-visible rule uses Base's blue focus token; keyboard entry reproduces the rectangular outline on that noninteractive heading.

Correction: scope outline removal to the focused heading only. Retain heading focus, dialog semantics, required-setup trapping, and interactive focus indicators. Add a decorative neutral progress ring beside the existing loading status while initial discovery is pending; use a static ring with reduced motion. Unavailable and configured states remove it. Provider and authentication interfaces are unchanged.

The existing design authority remains [the interstitial brief](interstitial.md). No new wizard, dismiss/skip action, provider consent, or loading copy is introduced.

## Verification

The served-browser TC-002 delayed-status scenario reproduces the original heading outline with keyboard entry (the new outline-style assertion fails on the parent). The corrected case checks loading geometry at 1280×900, 666×334 and 320×740, reduced motion and authoritative configured bypass. The unavailable/retry scenario checks that the progress state ends, required setup cannot be dismissed, and Check connection retains visible keyboard focus. Existing cases retain setup, draft/secret clearing, optional-dialog return, device cancellation and authentication-loss coverage.

Run `NED_MODEL_SCREENSHOT_DIR=/absolute/private/output node --test docs/features/model-setup/tests/TC-002.test.js` for screenshots and behavioral verification. Inspect loading at all three sizes plus setup, unavailable-keyboard and device captures. This is synthetic local browser evidence; it does not establish hosted image publication, live vendor consent, screen-reader speech output or paid inference.
