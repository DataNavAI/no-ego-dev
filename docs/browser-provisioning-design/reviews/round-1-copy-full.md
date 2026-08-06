## English copy verdict

**Status: NEEDS ITERATION**

**One-line verdict:** The direction is clear and avoids a raw Daytona-key form, but unresolved compute ownership, unsupported timing/trust claims, contradictory failure recovery, and a simulated first-request success prevent approval.

## Critical blockers

1. **`SCREEN-01` mixes two mutually exclusive compute models.**
   Users should never see “Platform-managed beta or delegated Daytona authorization.” Resolve `DEC-01`, then show one concrete provider, consequence, and action.

2. **Identity is missing from the visible flow.**
   Issue #23 requires sign-in before provider authorization. Add a stable sign-in state/action, such as **`Sign in to continue`**.

3. **`SCREEN-04` contradicts itself.**
   It says the incomplete workspace was cleaned up, then offers **`Retry health check`**. A deleted workspace cannot have its health check retried.

4. **`SCREEN-05` shows a completed NED response before the user sends anything.**
   The response must appear only after a real pending → successful-request transition.

5. **Trust, cost, and timing language exceeds current evidence.**
   “Ready in a few minutes,” “about 4 minutes,” “Usually under 3 minutes,” “Stops when idle,” and absolute cleanup/privacy claims require backend and legal/security validation.

---

## Minimum-text pass

### Remove or replace with design

- **Global hero:** Remove `Private AI product partner`—it does not help complete setup.
- **Global header:** Remove `Private workspace setup` if the page heading already establishes context.
- **Prototype state navigation:** `Entry / Auth / Progress / Failure / Ready / Resume / Destroy` must remain prototype-only.
- **`SCREEN-01`:** Remove `Setup overview`.
- **`SCREEN-01`:** Remove the three trust tiles:
  - `Private by default / Tenant-isolated workspace`
  - `Stops when idle / Clear lifecycle status`
  - `Recoverable / Resume or retry safely`
  They duplicate later states, contain jargon, and make unsupported lifecycle claims.
- **`SCREEN-01`, UI-01 side panel:** Remove the entire `Why this is safe` panel. It duplicates the main card and claims verified cleanup before that contract exists.
- **`SCREEN-02`:** Remove `Provider authorization`; the connected rows establish the state.
- **`SCREEN-03`:** Remove visible `Done` pills when the completed checkmark and text already communicate completion. Preserve an accessible status name.
- **`SCREEN-03`:** Remove the percentage-style progress bar unless it represents measured backend progress.
- **`SCREEN-04`:** Remove `What happened`; the error sentence can stand alone.
- **`SCREEN-04`:** Remove `No credentials or request content were logged` from the primary error. If proven and needed, put it with diagnostic details.
- **`SCREEN-05`:** Remove either `NED is ready` or `Healthy`; both are unnecessary together.
- **`SCREEN-06`:** Remove `Welcome back`, `Projects saved`, and static `Last used yesterday`; none changes the next action.
- **`SCREEN-07`:** Remove `Permanent action`; the title, consequence, checkbox, and destructive button already communicate severity.

### Keep

- **`Create my NED`** — clear, distinctive primary action.
- **`Send to NED`** — clear and consistent.
- **`Resume NED`** — clear and confirms reuse of the same object.
- Provider purpose and revocation guidance.
- Safe-to-leave/progress persistence language, once reduced to one evidence-backed sentence.
- Explicit deletion consequence and acknowledgement.

---

## Exact screen-level changes

### Global / variant heroes

- **`UI-01`**
  - `Your NED, ready in a few minutes.` → **`Create your private NED`**
  - `Connect the services NED needs, then create one private workspace with safe defaults.` → **`Connect the required services, then create your workspace.`**

- **`UI-02`**
  - Remove `NED setup · about 4 minutes`.
  - `One clear step at a time.` → **`Create your private NED`**
  - Remove `A focused setup that reveals only the decision needed now.`

- **`UI-03`**, if retained as a future direction
  - Remove `NED control room`.
  - `Provision, work, and return from one place.` → **`Create and return to your NED workspace`**
  - Remove `A persistent workspace lobby for builders who want lifecycle visibility from day one.`
  “Provision,” “control room,” “lobby,” and “lifecycle visibility” create an admin-tool frame that conflicts with the zero-infrastructure CUJ.

### `SCREEN-01` — entry and authorization

- `Create one private NED workspace` → **`Connect services`**
- `Authorize model access with OAuth PKCE` → **`Lets NED use models for your requests.`**
- `Connect` on OpenRouter → **`Connect OpenRouter`**
- Replace:
  - `No infrastructure choices. Tokens stay server-side and never enter chat, URLs, analytics, or browser storage.`
  - With: **`Your provider credentials are stored securely on NED’s servers—not in chat, URLs, or analytics.`**
  - This still requires legal/security approval.

Resolve compute wording based on `DEC-01`:

- **Platform-managed beta**
  - Provider: **`NED compute`**
  - Detail: **`Managed by NED during the beta.`**
  - Action: **`Check beta access`**
  - Add evidence-backed limits/cost copy before authorization.

- **User-owned Daytona**
  - Provider: **`Daytona`**
  - Detail: **`Runs your NED workspace in your Daytona account.`**
  - Action: **`Connect Daytona`**
  - Add: **`Daytona may charge your account while the workspace is running.`** if accurate.

Do not present both models in one row.

`Continue to authorization` currently duplicates the provider `Connect` actions. Use one of these structures:

- If identity is not established: **`Sign in to continue`**, followed by provider-specific actions.
- If identity is established: remove the continue button and let **`Connect Daytona` / `Connect OpenRouter`** drive the flow.

### `SCREEN-02` — providers authorized

- `Connected without sharing keys` → **`Access authorized`**
- `Beta access approved for this prototype` → production-specific status; never expose `prototype` to users.
- `OAuth access can be revoked from your provider` → **`Model access authorized. Revoke it in OpenRouter.`**
- Replace:
  - `What NED can do: create your private workspace and call models for your requests. It cannot read unrelated provider data.`
  - With: **`NED can create your workspace and use OpenRouter for your requests. It cannot access other OpenRouter data.`**
  - Keep only if the final scopes support the claim.
- `Back` → **`Change connections`**
- Keep **`Create my NED`**.

### `SCREEN-03` — resumable progress

- `Provisioning · safe to leave` → **`Safe to close`**
- Keep `Creating your NED`.
- `Authorization verified / Provider access is active.` → **`Provider access confirmed`**
- `Private workspace created / Fixed safe defaults applied.` → **`Workspace created`**
- Replace:
  - `Installing NED / Usually under 3 minutes. You can close this page.`
  - With: **`Installing NED`**
- Replace:
  - `Health check / Workspace, profile, and model inference.`
  - With: **`Checking that NED can respond`**
- Replace:
  - `Progress is saved. Returning to this page resumes the latest verified stage.`
  - With: **`You can close this page. We’ll save your progress.`**
- `Preview failure` and `Preview ready` are prototype controls and must not ship.

### `SCREEN-04` — failure and cleanup

Choose one truthful state.

**If cleanup completed:**

- `Setup paused` → **`Setup failed`**
- `Health check could not finish` → **`We couldn’t create your NED`**
- Banner → **`The health check failed, so we deleted the incomplete workspace. No compute is running.`**
- Cause → **`OpenRouter didn’t respond during the model check.`**
- `View diagnostic details` → **`View details`**
- `Retry health check` → **`Create NED again`**

**If the workspace still exists:**

- Heading → **`NED isn’t ready yet`**
- Banner → **`The health check failed. Your workspace is still running.`**
- Keep **`Retry health check`**.

Also add unrepresented cleanup states:

- Pending: **`Cleaning up the incomplete workspace…`**
- Cleanup failure: **`We couldn’t finish cleanup. Your workspace may still be running.`**
- Actions: **`Try cleanup again`** and **`Contact support`**

### `SCREEN-05` — ready and first successful request

- Replace `What should we build?` with **`Send your first request`**.
- Remove the duplicate `Your first request` label, or shorten the field label to **`Request`**.
- Do not prefill a request. Use placeholder: **`Describe what you want to build`**.
- Keep **`Send to NED`**.
- `Private workspace · auto-stops when idle` → **`Workspace stops when idle`**, only if operationally verified.
- Hide the NED response until the request succeeds.
- Pending state: **`NED is working…`**
- Success state: **`Request completed`**, followed by the actual response.
- Failure state: **`NED couldn’t complete this request. Try again.`**

The mobile screenshot visibly clips the prefilled request, reinforcing the need for a placeholder rather than a long default value.

### `SCREEN-06` — resume

- Keep `Your workspace is stopped`.
- Replace the body and notice with one sentence:
  - **`Resume this workspace to continue where you left off. This won’t create a new one.`**
- `Workspace options` → **`Delete NED`**
- Keep **`Resume NED`**.

### `SCREEN-07` — permanent deletion

- `Destroy this NED?` → **`Delete this NED?`**
- Replace body with:
  - **`This permanently deletes this workspace and all projects in it. This can’t be undone. Your provider connections won’t be revoked.`**
- Checkbox:
  - `I understand that workspace files cannot be recovered.`
  - → **`I understand this permanently deletes all workspace files and projects.`**
- `Keep workspace` → **`Cancel`**
- `Destroy permanently` → **`Delete NED permanently`**

Add required deletion lifecycle copy:

- Pending: **`Deleting NED… Keep this page open while we delete the workspace.`**
- Failure: **`We couldn’t delete your NED. Your workspace and provider connections are unchanged.`**
- Actions: **`Try again`**, **`Contact support`**
- Success: **`NED deleted. Your provider connections are still active.`**
- Optional next action: **`Manage provider connections`**

---

## Copy-system notes

- **Voice:** Calm, direct, concrete; avoid prototype language and infrastructure terminology.
- **CTA convention:** Use verb + named object: `Connect OpenRouter`, `Create my NED`, `Send to NED`, `Resume NED`, `Delete NED permanently`.
- **Use:** `connect`, `workspace`, `create`, `resume`, `delete`, `provider access`.
- **Avoid:** `provision`, `lifecycle`, `control room`, `PKCE`, `model inference`, `environment`, `sharing keys`.
- **Errors:** State what failed, whether compute/workspace still exists, and the one safe recovery action.
- **Trust:** Make only specific, technically and legally validated claims.
- **Cost:** Explain who pays and when compute can incur cost at authorization and deletion—not through vague “stops when idle” reassurance.

## Ready bar for the next pass

- Resolve `DEC-01` and remove the mixed compute-mode copy.
- Add the missing identity/sign-in state.
- Correct the cleanup/retry contradiction in `SCREEN-04`.
- Add pending/success/failure states for the first request.
- Add deletion pending/failure/success copy.
- Remove unsupported duration and cost implications.
- Re-capture `UI-01` desktop/mobile and verify no clipped input or CTA text.
- Obtain technical and legal/security approval for trust, scope, cleanup, and billing claims.

## Review summary

- **Reviewed:** GitHub issue #23, `UI_GUIDELINES.md`, `UI_BRIEF.md`, `DESIGN_REVIEW.md`, `prototype/app.js`, and all six desktop/mobile variant screenshots.
- **Files created or modified:** None; read-only review.
- **Issues encountered:** None.
