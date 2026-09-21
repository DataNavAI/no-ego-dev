# Immutable specialist review

Use when independent specialist verdicts must bind to one exact visual, document, or runnable candidate.

## Candidate separation

Keep three layers distinct:

1. mutable canonical source where corrections occur;
2. an immutable read-only candidate containing every claimed artifact; and
3. specialist reports outside the candidate so review cannot mutate its subject.

Before freeze, assert every referenced file/URI exists, run domain verifiers, and regenerate convenience summaries from authoritative final bytes. Copy explicitly into a newly named staging directory, reject symlinks/unlisted/writable/cache residue, generate a sorted per-file digest manifest, and verify both file-set completeness and hashes before and after review. Serve the staged tree, never a mutable workspace.

## Specialist authority

Each report records candidate commit/tree or manifest digest, artifact scope, review kind, exact verdict vocabulary, evidence inspected, and authority boundary. Keep copy truth, UI direction, implementation readiness, security, rights, and release approval distinct; one specialist cannot silently override another.

For multi-round work, preserve complete prior reports and historical manifests, a stable finding-disposition ledger, remediation-path map, and digest-bound prior context. A summary is not a substitute for exact reports. Any source change creates a new candidate; rerun affected gates.

## Layered approvals on one mergeable PR

A bounded earlier-layer approval may survive later appended commits only when:

- the approval receipt names the exact full commit and approved paths;
- later commits do not change any approved byte;
- the current head is compared against the approved commit for that path set; and
- the receipt states that it does not authorize later layers, merge, deployment, or release.

If an approved byte changes, invalidate that layer's approval. Tests do not preserve approval across changed reviewed bytes. Never amend an approved commit to change only its message.

## Remediation

Preserve rejected reports, fix mutable source, build a new immutable candidate, re-run package completeness and affected specialist gates, and keep the accepted/rejected identities explicit. Do not patch a reviewed candidate in place.
