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
**The production release needs your help to continue.**

**Executive summary:** Customer signup remains on the previous version because the deployment account lacks permission to update the production service. Staging and QA are complete; documentation work can continue.

**Human action needed:** By 3 PM, an account admin should grant `Release Manager` to `agent@example.com` in the production workspace. I will verify access, deploy the tested revision, and report the result immediately.

**Detailed information:**
- <verified access-settings link>
- <verified release issue>
```

## Unknown-cause blocker

Do not disguise a hypothesis as root cause.

```markdown
**Reporting why the checkout release is paused.**

**Executive summary:** The release is paused because the final checkout verification fails in production; the cause is not yet confirmed. Existing checkout remains available, and no failed charges are confirmed. I am comparing production configuration with the passing staging build now.

**Human action needed:** None. I will report the confirmed cause or next bounded diagnostic step by 4 PM.

**Detailed information:**
- <verified incident/evidence link>
```

## Risk, not blocker

If a safe workaround permits progress, label it as a risk or constraint rather than a blocker.

```markdown
**Reporting a release risk.**

**Executive summary:** Automated screenshot capture is unavailable for one mobile viewport, but manual device verification lets QA continue. This may add one hour to release validation; product behavior is not blocked.

**Human action needed:** None. I will complete the manual check and attach evidence before the release decision.

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
