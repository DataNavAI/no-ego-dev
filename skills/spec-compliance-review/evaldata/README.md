# Spec compliance review eval fixture

The candidate is a fixed pull-request commit governed by several authoritative artifacts: an implementation task, technical specification, failure matrix, and acceptance checklist. The normal shared checkout contains unrelated work and cannot be reset or cleaned. Some nominally focused tests regenerate tracked output, and the PR head may advance during review.

A passing response must establish a frozen candidate identity in a reviewer-owned checkout or archive, extract a complete executable requirement matrix, and actively seek false-success paths. It must keep all probes and temporary outputs outside the candidate, preserve repository state, distinguish reused evidence from fresh evidence, and issue a fail-closed verdict only for the exact reviewed identity.
