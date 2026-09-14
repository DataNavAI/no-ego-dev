# 5W1H Concise Blocker Examples

Use these examples when a technical blocker message would otherwise force the user to infer the cause or unblock action. Treat 5W1H as a coverage audit, not a six-heading output format.

## Rewrite pattern

### Weak

> The deployment is blocked because OAuth failed. Please check the permissions and let me know.

Why it fails:

- **What/Where** are vague: which release, environment, account, or user journey?
- **Why** stops at an error label rather than the missing capability.
- **Who/When** do not identify the owner or urgency.
- **How** says “check” instead of giving the smallest exact unblock action and the agent’s immediate follow-up.
- It does not say what work continues meanwhile.

### Decision-ready

```markdown
**The requested <active project> production release needs your help to continue.**

**Executive summary:** Customer signup remains on the previous version because the deployment account lacks permission to update the production service. Staging and QA are complete; documentation work can continue. After access is granted, the team will verify it and deploy the tested revision.

**Human action needed:** **Production account admin — by 3 PM:** Grant `Release Manager` to the delivery identity in the production workspace. Only an authorized account admin can grant this privileged role; delivery automation cannot safely authorize itself. This unblocks production deployment.

**Detailed information:**
- <verified access-settings link>
- <verified release issue>
```

## Unknown-cause blocker

Do not disguise a hypothesis as root cause.

```markdown
**The requested checkout release is paused while the team verifies the cause.**

**Executive summary:** The release is paused because the final checkout verification fails in production; the cause is not yet confirmed. Existing checkout remains available, and no failed charges are confirmed. The team is comparing production configuration with the passing staging build and will report the next checkpoint by 4 PM.

**Human action needed:** None

**Detailed information:**
- <verified incident/evidence link>
```

## Risk, not blocker

If a safe workaround permits progress, label it as a risk or constraint rather than a blocker.

```markdown
**The requested <active project> release has a newly discovered QA risk.**

**Executive summary:** Automated screenshot capture is unavailable for one mobile viewport, but manual device verification lets QA continue. This may add one hour to release validation; product behavior is not blocked. The team will complete the manual check and attach evidence before the release decision.

**Human action needed:** None

**Detailed information:**
- <verified QA task>
```

## Compression pass

Before sending:

1. Keep the product outcome, cause/unknown status, scope, owner, urgency, exact action, immediate next step, and what continues.
2. Remove greetings, command chronology, repeated evidence, implementation nouns that do not change the decision, and defensive explanations.
3. Put verified links and deep technical evidence under `Detailed information`.
4. Keep the four-part body at or below 120 words; links do not count toward the body budget.
5. If essential safety/legal/irreversible-loss context does not fit, lead with a ≤120-word decision summary and move the rest into a labeled appendix.

## Final one-read test

A non-technical decision-maker should be able to answer without opening a link:

- What product outcome changed?
- Why did it change, or what remains unknown?
- Who is affected and who acts next?
- When is action or the next checkpoint due?
- Where is the affected journey/environment/account?
- How exactly does work resume, and what continues meanwhile?
