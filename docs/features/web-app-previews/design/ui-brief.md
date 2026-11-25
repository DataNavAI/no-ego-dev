# Single app private preview

Keep the existing COM chat-first shell and Preview tab. One managed app appears automatically inside Preview; no app selector, user port field, project switch or focus steal. Chat/draft survive all updates.

Toolbar: app name, project name, text state, Reload and Open in new tab (explicit gesture). Canvas is isolated iframe with title Working app; sandbox permits scripts/forms/same-origin/downloads/modals/popups with noopener boundaries, no top navigation. Never mount app content on COM origin.

States and exact copy: No preview yet / NED will show your app here when it is ready.; App is not running / NED needs to restart the app.; Connecting preview…; Preview unavailable / Try again or open the app in a new tab.; Private preview is not supported by this connection. Retry never launches a process. Unknown embedding failure retains Open in new tab. Status does not claim visual correctness merely from iframe load.

Reload reconnects the same bound app; replacement changes only preview content. Stale bootstrap responses are discarded; renewal is serialized. Controls have accessible names, visible focus and44px touch targets, full-width responsive canvas with no page overflow. Existing project .nedcom.json Open app is fallback only when no managed preview exists. Historical A/B mockups are superseded.
