---
name: identity-for-agent
description: Use the guarded ifa CLI to check, request, and securely deliver third-party authorization with profile-bound credential isolation.
version: 1.1.0
author: DataNavAI
license: MIT
metadata:
  hermes:
    tags: [identity, authorization, oauth, credentials, profiles]
    related_skills: [agent-identity-and-access, integrator, devops]
---

# Identity for Agent

Use IFA as an authorization broker. Ask a human to approve access through IFA rather than asking them to paste credentials into chat.

## Mandatory authorization boundary

Every IFA operation must pass through the installed `scripts/ifa_profile_guard.py`. Do not invoke `ifa` directly. The guard consumes [`references/profile-credential-policy.yaml`](references/profile-credential-policy.yaml), attributes the call to the active profile, chooses the only authorized store path, rejects caller-provided `--path`/`--profile` flags, rejects runtime symlinks, and disables implicit `~/.ifa/store.json` fallback by always supplying an authorized path.

Resolve the installed guard without accepting a caller-selected credential path:

```bash
case "${HERMES_PROFILE:-}" in
  ned|nedxned|alphaned|alphaaoi|kiaened) ;;
  *)
    echo "Refusing IFA: missing or unsupported HERMES_PROFILE" >&2
    return 1 2>/dev/null || exit 1 ;;
esac
IFA_GUARD="$HOME/.hermes/profiles/$HERMES_PROFILE/skills/identity-for-agent/scripts/ifa_profile_guard.py"
test -f "$IFA_GUARD" || { echo "Refusing IFA: guard is not installed" >&2; return 1 2>/dev/null || exit 1; }
export IFA_GUARD
```

The profile argument must equal `HERMES_PROFILE`; a mismatch is denied. A profile cannot select another profile's `0600` store even though profiles share an OS user. Never set or pass `IFA_STORE_PATH`. Never use IFA's implicit global store path and never look there as a fallback.

The guard creates or secures only the profile's external runtime directory at `~/.hermes/state/identity-for-agent/profiles/<profile>/`, using `0700` directories and `0600` files. Initialize a missing profile store through the same boundary:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" run init --store local
```

Runtime stores, credentials, tokens, logs, and account data stay under `~/.hermes/state/identity-for-agent/`, never in a profile distribution or repository. Any symlink in the selected runtime credential tree—including a store or token symlink—causes denial.

## Request and use access

Run checks through the guard:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" run status
python "$IFA_GUARD" "$HERMES_PROFILE" run status gh
python "$IFA_GUARD" "$HERMES_PROFILE" run status aws
python "$IFA_GUARD" "$HERMES_PROFILE" run status google
```

The guard injects both the active profile attribution and the authorized path for requests:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" run request <provider> \
  --reason "Explain the concrete work requiring access" --timeout 10m
```

A human approves or declines in the local UI:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" run daemon --addr 127.0.0.1:8765
```

After approval, prefer ephemeral delivery:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" run exec gh -- gh api user
```

Never ask for passwords, cookies, raw long-lived tokens, backup codes, or recovery codes. Prefer OAuth/OAuth2, SSO, OIDC, delegated access, or official CLI login. Use least privilege and finite request expiry. Do not write env files unless unavoidable, and never commit one.

## Hermes provider routing and verification

Use guarded IFA status, request, and exec by default for GitHub, AWS, and supported read-only Google capabilities. Approval alone is not proof of access: verify the intended account and required capabilities with guarded `exec gh -- gh api user --jq .login`, guarded `exec aws -- aws sts get-caller-identity`, or guarded Google verify/scopes plus harmless Gmail profile and Calendar-list reads. Stop on an account mismatch; never switch profile stores or widen the request.

Use an official provider flow only when IFA is unavailable or reports `unsupported_operation`, and say why the fallback is required. GitHub falls back to `gh auth login`; AWS falls back to AWS SSO; unsupported Google capabilities fall back to the official Hermes Google Workspace integration for the explicitly selected active profile. Verify the account after every fallback before reporting access ready.

Google IFA support is read-only and does not cover Gmail send/modify or Calendar, Drive, Sheets, or Docs writes. It supplies one short-lived access token and does not refresh while a child command runs. On expiry, stop, perform guarded refresh and verification, then start a new child. Never consume or copy another profile's `google_token.json`, refresh token, client secret, or browser credential.

Route Google refresh and revocation through the same installed guard:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" run google refresh
python "$IFA_GUARD" "$HERMES_PROFILE" run google verify
python "$IFA_GUARD" "$HERMES_PROFILE" run google scopes
python "$IFA_GUARD" "$HERMES_PROFILE" run exec google -- <command>
python "$IFA_GUARD" "$HERMES_PROFILE" run google revoke
```

## Google profile binding

`ned`, `nedxned`, `alphaned`, `alphaaoi`, and `kiaened` each require a separate Google authorization in their own guarded profile store. Google grants are never shareable. Before reporting access ready:

1. Confirm `HERMES_PROFILE` and the installed guard.
2. Authorize with `python "$IFA_GUARD" "$HERMES_PROFILE" run google authorize ...`.
3. Run guarded `google verify` and `google scopes` commands.
4. Confirm the returned account is designated for this profile.
5. Ensure non-secret binding metadata identifies `profile`, `provider`, `account`, and `authorized_at`. Never put tokens in metadata.

For Google, token export is prohibited and `ifa env google` is disabled. Use guarded `exec google` delivery. Revoke upstream and locally through the same guard.

## Explicit eligible non-Google sharing

Cross-profile store access is always denied. Eligible profiles may consume only an independent, non-Google shared grant with reviewed metadata at `~/.hermes/state/identity-for-agent/shared/<grant-id>/grant.json`. Metadata must identify `grant_id`, `provider`, `account`, `source_profile`, `approved_profiles`, and `authorized_at`. The grant store is an independent sibling `store.json`, never a profile store or symlink.

Use a shared grant only by ID; the guard derives its path and verifies the active profile remains approved:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" run --grant-id <grant-id> status <provider>
python "$IFA_GUARD" "$HERMES_PROFILE" run --grant-id <grant-id> exec <provider> -- <command>
```

Google is non-shareable for every profile. `kiaened` can neither source nor consume any shared grant. A grant sourced by an unsupported or forbidden profile is denied.

## Profile removal

Before deleting a Hermes profile, apply removal semantics through its installed guard:

```bash
python "$IFA_GUARD" "$HERMES_PROFILE" remove-profile
```

This removes the profile from every shared grant's `approved_profiles` and removes only its profile-local runtime tree. It preserves each independent shared store and metadata, including when another approved consumer remains. The provider grant is revoked only by an explicit human action; an empty approval list is denied to everyone but retained for that decision. Never revoke or delete another consumer's shared grant as a side effect of profile removal.
