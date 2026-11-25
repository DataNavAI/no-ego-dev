# Single-preview UI boundary

The user chose one active app per instance (#210), superseding menu/tabs DEC-01. Preserve existing COM shell, Preview tab, chat draft, project navigation and mobile behavior. Do not add an app chooser, slot selector or port-entry form.

Current release adds API/CLI/skill registration management only. Existing legacy Open app UI is unchanged; registry success must not imply an embedded frame or private tunnel exists. Future presentation (#157/#81) should show the single registered app automatically with its identity, Reload and Open in new tab only when verified transport exists. Reuse established stopped/unavailable/retry states; retry never starts a server.

Historical A/B mock images are archived exploration, not the selected UI design or runtime evidence. The authoritative contract is [SPEC](../SPEC.md).
