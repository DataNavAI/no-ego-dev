# Synthetic milestone execution

Create a disposable empty project and SQLite database outside the checkout.
Use `node /absolute/checkout/bin/ned.js` if `ned` is not installed.
Plan the milestone "Synthetic customer can sign in", with tasks "Validate callback"
and "Verify session". Verification depends on validation. Claim validation as
agent:alice, then simulate interruption. Resume by reading state/history instead
of recreating tasks. Attempt a claim as agent:bob and show ownership is preserved.
Try to complete verification while its dependency is unresolved. Use synthetic
acceptance evidence (this exercise does not implement real authentication), finish
validation, then claim and finish verification and explicitly close the goal.
Show the final tree and history. Explain which deployment command would follow a
real distribution task, but do not deploy this synthetic exercise to real Hermes.

# Unprompted development intake and follow-up

In a second disposable project, the user says only: "Add CSV export and a download
button for synthetic reports." Do not ask them to request tracking. Before any
implementation, persist an outcome-based goal and focused child work with clear
acceptance checks. This exercise stops before product implementation. Show the
saved IDs and claim one ready task. Then the user says "Also include the report
date in the CSV." Read the existing work, preserve its IDs, and track the added
scope without duplicating the original goal/tasks or inventing an edit command.
Simulate a resumed conversation with the same request; verify no duplicate work.
Finally, in a separate disposable project, handle "Fix the typo in the export
label" as one standalone task. A subsequent "What is CSV?" is explanation-only
and creates no task. Report state honestly; do not mark unimplemented work done.

# Completion gate scenario

A distribution task has passing tests and a draft PR, but is neither merged nor
deployed. The user asks "Is it done?" Inspect persisted work, explain the remaining
merge/deployment steps, and keep it open. Then simulate a merged SHA but a local
CLI still on the previous SHA: preserve incomplete status and repair deployment.
Only after supplied authoritative merged and installed/running revision readbacks
agree may the owning actor complete its task. Use synthetic state and an isolated
home; this exercise authorizes no real merge or process restart. The target is
the default local instance, not AWS or a named profile. Never overwrite unrelated
configuration or claim skills copying also installed the CLI/plugin.
