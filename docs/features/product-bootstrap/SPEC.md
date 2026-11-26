# Product Bootstrap

Status: implemented

## User outcome and scope

A product builder creates a small prototype from an existing reference or starter to answer a single learning question. The workflow covers isolated workspace preparation, implementation, and evidence from the prototype's primary interaction. Production deployment and full product delivery belong to other workflows.

## Requirements

- FR-001: Establish the learning decision, primary journey, feedback path and prototype limitations before implementing the prototype.
- FR-002: Confirm a small write and readback through the intended, authorized editing tool in the actual output directory before generating substantial changes in a new workspace. Use only supported configuration within existing authorization to resolve a denied path. Report the blocker if the boundary cannot be preserved.
- FR-003: Exercise the primary interaction through the intended browser when available. Verify an observed user-visible end state and distinguish browser evidence from source checks. End verification once the agreed outcome is established unless a later change or evidence gap warrants another check.

## Critical user journeys

### CUJ-001: Build and verify a prototype

A product builder receives a starter and an isolated workspace, establishes the prototype contract, confirms the editing path, adapts the primary interaction, and verifies it. An unavailable workspace blocks implementation. An unavailable browser leaves browser coverage explicitly unverified while permitting applicable source checks.

## Detailed test cases

### TC-001: Adapt an intake prototype in an isolated workspace

- Journey / requirements: CUJ-001 / FR-001, FR-002, FR-003.
- Level / automation: manual; run the behavioral [skill eval](../../../skills/product-bootstrap/EVAL.yaml).
- Preconditions / fixtures: fresh eval profile and the [intake scenario and starter](../../../skills/product-bootstrap/evaldata/SCENARIO.md).
- Given: the evaluator has copied the starter to an isolated output workspace.
- When: the builder establishes the contract, probes the output directory via its chosen editor, implements the interaction, and verifies it.
- Then: the probe precedes substantive edits, the requested interaction passes the independent verifier, and the delivery distinguishes browser evidence from source results.
- Variants / negative cases: rerun in a workspace where the preferred editor rejects the authorized target. Inspect that the builder resolves the tool configuration through a supported route or reports the missing access without claiming a write. When the browser is unavailable, require an explicit coverage gap.
- Cleanup: remove disposable output using the evaluator's run cleanup. Verify the original fixture remains unchanged.
- Pass evidence: record the editor probe and readback, verifier output, and observed browser end state or blocked reason.

## Coverage and acceptance

| Requirement | Journey | Test case | Procedure |
| --- | --- | --- | --- |
| FR-001 to FR-003 | CUJ-001 | TC-001 | [Skill eval](../../../skills/product-bootstrap/EVAL.yaml) and the negative variants above |

## Open questions and coverage gaps

Editor-denial and unavailable-browser variants use manual verification. An automated source check cannot establish a browser interaction pass.
