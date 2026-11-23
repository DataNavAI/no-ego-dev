# First-time model setup — #196

The user requested a full-screen first-use interstitial. This replaces the compact first-use card in setup-1280/setup-320; reuse `public/base.css` neutral Base tokens and existing model form, labels, actions and authentication contract. No extra wizard steps, new provider flow or skip action.

Primary journey: authenticated unconfigured instance → choose provider/model → API key or Hermes device authentication → authoritative configured status → workspace. Configured instances bypass this flow. Provider settings remain reachable through Model provider and may be closed while configuration remains valid.

- Desktop 1280×900: white full-viewport surface, centered 560px column, 32px outer padding, NED wordmark, 32px title, 24px section spacing, provider/model in two columns. Black Connect provider primary; secondary Check connection. Existing setup copy retained.
- Mobile 320×740: one column, 20px padding, full available dynamic viewport, document-like vertical scrolling, 44px controls, wrapping actions/device code, no horizontal overflow. No workspace/navigation visible behind required setup.
- UI-AC-01: one native modal dialog / one form instance; full-screen when configuration is missing or unknown. Covered workspace is inert by native dialog semantics; Escape cannot dismiss required setup. Focus enters the heading; Tab remains in the flow. Checking/error/cancel stay recoverable inside it.
- UI-AC-02: authoritative configured status closes first-use setup and moves focus to the composer without losing drafts. Existing configured profiles bypass it. Optional settings use the same form as a centered modal with Close/Escape and focus return to Model provider.
- UI-AC-03: NED access loss closes the dialog, clears typed key/challenge and returns to access authentication; restored authentication rechecks model status before admitting the workspace. Never store completion in browser storage.
- UI-AC-04: preserve provider/secret/job handling. API keys remain passwords, clear on attempts, and no provider secret/response appears in error text. Device cancellation never bypasses required setup.

Verification: TC-002 served-browser tests own full-screen geometry, required/optional focus, narrow reflow, secret clearing, configured bypass and auth-loss transitions. Capture/inspect desktop/mobile with NED_MODEL_SCREENSHOT_DIR. Existing model API/Hermes tests retain provider boundary coverage; no new live consent or paid inference.

Chat/network failure rechecks model status without forcing optional settings open for an already configured profile; existing chat Reload/recovery remains reachable (communicator TC-038).

# Provider/model picker — #200
Remove the Hub settings link entirely. Keep the existing full-screen/optional modal layout and Provider control. Replace Model text entry with a native select using installed Hermes model IDs for that provider. Select the first supported model for new setup/provider switches; preserve an existing configured model as a disabled current-configuration option if it is outside the list. Empty lists show Models unavailable, explanatory status and disabled Connect; Check connection retries. No editable/custom-model escape hatch in this flow. Reuse existing Base inputs, focus, 44px targets and responsive columns. Capture desktop/mobile actual rendered select and empty/error states. Model access varies by account; UI copy is specified in FR-011.

Updated setup/device desktop/mobile captures use the deterministic model catalog fixture. Actual installed Hermes catalog/transport compatibility is verified separately by TC-003.
