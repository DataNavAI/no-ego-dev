# Delegation reliability eval fixture

This fixture exercises recovery and continuation when background workers stop without a trustworthy end-to-end handoff.

The scenario deliberately separates five facts that must not be collapsed: process lifecycle, active-agent visibility, remote repository state, durable review artifacts, and authorization to start dependent work. A passing response must recover and verify available artifacts before replacement dispatch, preserve attempt-specific provenance, keep immutable targets stable during review, and resume runnable work without inventing success.

The user has explicitly rejected a second persistent queue, so the response should use lifecycle-delivered hook-only continuation with the external tracker as canonical while stating its restart limitation. A quiet watchdog may alert on missing starts, interruption, or staleness, but it must not recursively launch agents.

Boundary cases:

- a visible completion excerpt omits a blocking middle finding and names a complete saved summary; the full artifact must be read before remediation;
- every terminal completion emits one content-free scheduling wake; the authoritative reconciler—not the hook—selects and dispatches at most one eligible successor;
- `/agents` is empty or misleading while a gateway child may still be active; the controller must prefer Hermes runtime/completion evidence, answer a queued runtime-status request, distinguish confirmed/unknown/terminal state, and use an optional hook projection only for cross-surface or restart history;
- repository bytes are already committed and pushed but PR/tracker metadata is incomplete; finish only missing idempotent metadata rather than launching another writer;
- plugin discoverability is newer than the running gateway; report activation pending without firing the hook or restarting over a live child;
- child-controlled hook payload fields never enter executable argv, shell text, job identity, or profile selection.
