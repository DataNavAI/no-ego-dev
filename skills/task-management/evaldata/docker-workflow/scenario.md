# Synthetic release readiness

Track and perform this small synthetic workflow using NED goals and tasks:

1. Initialize and inspect the project before creating work. Create the goal
   **Synthetic release readiness**. Under it create **Draft release note** and
   **Verify release note**. Verification depends on drafting.
2. Claim drafting. Create `RELEASE.txt` in the project with exactly one line:
   `Synthetic release is ready.` followed by a newline. Read it back to check
   the actual bytes. Publish a delivery record with impact
   `Operators can review the synthetic release note`, null remainingSeconds and
   estimatedFinish, and one document output: ID `release-note`, title
   `Synthetic release note`, text equal to the actual file contents. Read back
   the record, then complete drafting with evidence of the readback.
3. Claim verification only after drafting is done. Independently check the file
   content and dependency status; complete verification with evidence. Explicitly
   complete the goal after both children are done.
4. Create the standalone task **Publish release**. Block it with reason
   `Awaiting operator approval` and service `release-approval`. Leave it blocked
   and unassigned. There is no approval and no actual publication is authorized.
5. Finish by reading CLI status, tree and task history. Summarize what is done
   and what remains blocked. Never equate a synthetic result with a real release.

Use `agent:workflow-eval` consistently. Use returned IDs, never guessed IDs or
direct database edits. No other goals/tasks, provider calls, external files or
real project changes belong to this scenario. The independent verifier runs
only after your reply and reads persisted state through NED CLI.
