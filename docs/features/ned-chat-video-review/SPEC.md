# Feature: NED chat video review

Status: implemented as skill instructions; live acceptance pending
Related work: NED task `ned-7bd947fa-5174-4d90-8e15-49f449c23517`

## User outcome and scope

NED operators can see where desktop and mobile chat become awkward or unusable, and prioritize fixes using replayable evidence and Meta Muse as a reference. The skills exercise an authorized NED Communicator instance with fictional text prompts. Chat implementation changes, provider benchmarking and release certification are outside scope.

## Requirements

- FR-001: Each device skill opens Communicator in its documented browser profile and records a fresh conversation of at most ten user sends.
- FR-002: Each review inspects the resulting playable recording and reports reproducible, timestamped UI observations, user impact and proposed acceptance checks.
- FR-003: Each review inspects real Meta Muse chat footage, cites comparable moments and declares coverage limits. Missing evidence produces a partial or blocked result. Store capture artifacts privately outside the checkout.

## Critical user journeys

### CUJ-001: Desktop chat walkthrough

An operator with access to Communicator launches the desktop skill, records a short conversation while exercising composer, scrolling and pane layout, and receives a prioritized report with playable evidence. This catches defects in the primary workspace flow. If capture or access fails, retain suitable partial evidence and report the affected steps.

### CUJ-002: Mobile chat walkthrough

An operator launches a separate mobile run in the same environment, uses touch emulation and a narrow viewport, and receives a device-specific report. This catches layout issues that desktop resizing alone can miss. An unavailable soft keyboard requires a documented coverage gap.

## Detailed test cases

### TC-001: Desktop footage and bounded reporting
- Journey / requirements: CUJ-001 / FR-001, FR-002, FR-003
- Level / automation: manual; [desktop evaluation](../../../skills/ned-chat-desktop-review/EVAL.yaml).
- Preconditions / fixtures: authorized disposable Communicator chat, browser recorder, private output folder, public Muse clip and the fictional picnic script in the skill.
- Given: a fresh desktop chat with no previous sends.
- When: run the skill from opening chat through video replay and comparison.
- Then: the report names the desktop profile, counts all sends, cites observed NED and Muse timestamps and links playable footage when available.
- Steps and assertions: confirm a 1440 × 900 desktop viewport; record empty state, first send, a long reply and return to composer; verify the recording plays; match two report observations to the relevant frames.
- Variants / negative cases: interrupt after send one, finalize partial footage, and verify reported coverage and count. Repeat in a fresh context and verify artifacts are distinct. Missing login or video yields a blocked or partial report.
- Cleanup: close context and discard temporary authentication state; retain approved private evidence only.
- Pass evidence: redacted report, playback evidence and send tally tied to the examined build.

### TC-002: Touch-emulated layout and comparison limits
- Journey / requirements: CUJ-002 / FR-001, FR-002, FR-003
- Level / automation: manual; [mobile evaluation](../../../skills/ned-chat-mobile-review/EVAL.yaml).
- Preconditions / fixtures: same as TC-001, with a separate iPhone 13 emulation context.
- Given: a fresh mobile chat.
- When: tap the composer, send and read a long reply, scroll back and resume composing.
- Then: the recording shows the mobile journey, counts up to ten sends, and the report ties visible issues to timestamps and identifies keyboard or baseline gaps.
- Steps and assertions: confirm portrait 390 × 664 CSS px with touch emulation; inspect composer access and overflow while interacting; replay the recording and verify cited observations.
- Variants / negative cases: with a desktop-only Muse clip, mark mobile-specific comparisons unobserved. Disconnect the test session or withhold a playable baseline and verify the partial result. Concurrent runs use separate contexts and artifact folders.
- Cleanup: close context and discard temporary authentication state; retain approved private evidence only.
- Pass evidence: redacted report, playback evidence, actual emulation profile and explicit keyboard coverage.

## Coverage and acceptance

| Requirement | Journey | Cases |
| --- | --- | --- |
| FR-001, FR-002, FR-003 | CUJ-001, CUJ-002 | TC-001, TC-002 |

Acceptance requires two playable recordings and reports meeting the case assertions. Re-run on a fresh build to verify a fix.

## Open questions and coverage gaps

Emulation covers browser viewport and input settings. Native keyboard, safe-area and browser chrome behavior require device footage. Public Muse demos may omit device-specific states and waiting time.
