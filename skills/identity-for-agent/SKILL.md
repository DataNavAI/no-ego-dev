---
name: identity-for-agent
description: Use the ifa CLI to check, request, and securely deliver third-party authorization to AI agents with profile-bound credential isolation.
version: 1.0.0
author: DataNavAI
license: MIT
metadata:
  hermes:
    tags: [identity, authorization, oauth, credentials, profiles]
    related_skills: [agent-identity-and-access, integrator, devops]
---

# Identity for Agent

Use IFA as an authorization broker. Ask a human to approve access through IFA rather than asking them to paste credentials into chat.

## Resolve the profile and store first

Every IFA invocation must use the deterministic store for the active Hermes profile. Supported bindings are defined in [`references/profile-credential-policy.yaml`](references/profile-credential-policy.yaml).

```bash
case "${HERMES_PROFILE:-}" in
  ned|nedxned|alphaned|alphaaoi|kiaened)
    IFA_STORE_PATH="$HOME/.hermes/state/identity-for-agent/profiles/$HERMES_PROFILE/store.json" ;;
  *)
    echo "Refusing IFA: missing or unsupported HERMES_PROFILE" >&2
    return 1 2>/dev/null || exit 1 ;;
esac
export IFA_STORE_PATH
```

Refuse to create a request when `HERMES_PROFILE` is empty. Never use IFA's implicit global store path (`~/.ifa/store.json`) and never look there as a fallback. Pass `--path "$IFA_STORE_PATH"` on every command. Do not symlink store files, token files, or secure-store material between profiles.

On first use, create only the profile's external runtime directory and store:

```bash
(umask 077 && mkdir -p "$(dirname "$IFA_STORE_PATH")")
chmod 700 "$(dirname "$IFA_STORE_PATH")"
ifa init --store local --path "$IFA_STORE_PATH"
chmod 600 "$IFA_STORE_PATH"
```

Runtime stores, credentials, tokens, logs, and account data belong under `~/.hermes/state/identity-for-agent/`, never in a profile distribution or repository. The OS user owns directories and files; directories are `0700` and files are `0600`.

## Request and use access

Check access using the explicit store:

```bash
ifa status --path "$IFA_STORE_PATH"
ifa status gh --path "$IFA_STORE_PATH"
ifa status aws --path "$IFA_STORE_PATH"
ifa status google --path "$IFA_STORE_PATH"
```

Every request must record its originating profile. Always provide both flags even though IFA can read `HERMES_PROFILE`:

```bash
ifa request <provider> --profile "$HERMES_PROFILE" --path "$IFA_STORE_PATH" \
  --reason "Explain the concrete work requiring access" --timeout 10m
```

A human approves or declines in the local UI:

```bash
ifa daemon --addr 127.0.0.1:8765 --path "$IFA_STORE_PATH"
```

After approval, prefer ephemeral delivery:

```bash
ifa exec gh --path "$IFA_STORE_PATH" -- gh api user
```

Never ask for passwords, cookies, raw long-lived tokens, backup codes, or recovery codes. Prefer OAuth/OAuth2, SSO, OIDC, delegated access, or official CLI login. Use least privilege and finite request expiry. Do not write env files unless unavoidable, and never commit one.

## Google profile binding

`ned`, `nedxned`, `alphaned`, `alphaaoi`, and `kiaened` each require a separate Google authorization in their own store. Google grants are never shareable. Before reporting access ready:

1. Confirm the active profile and explicit store path.
2. Authorize Google with that path: `ifa google authorize ... --path "$IFA_STORE_PATH"`.
3. Run `ifa google verify --path "$IFA_STORE_PATH"` and `ifa google scopes --path "$IFA_STORE_PATH"`.
4. Confirm the returned account is the designated account for this profile.
5. Ensure non-secret binding metadata identifies `profile`, `provider`, `account`, and `authorized_at`. Never put tokens in metadata.

For Google, token export is prohibited and `ifa env google` is disabled. Use `ifa exec google --path "$IFA_STORE_PATH" -- <command>`. Revoke upstream and locally with the same explicit path.

## Sharing and profile removal

Cross-profile access is deny-by-default. A profile must never open another profile's store. Google cannot be shared, and `kiaened` can neither provide nor consume shared credentials.

For a non-Google provider, sharing requires an explicit, reviewed policy naming a grant ID, provider, account, approved profiles, and authorization time. Store such a grant independently at `~/.hermes/state/identity-for-agent/shared/<grant-id>/store.json`; do not point to or symlink a profile store. The caller must pass that exact path and remain listed in the policy.

Profile deletion removes only that profile's approval and profile-local metadata. It must not revoke or delete an independent shared grant while another approved profile remains. Revoke the provider grant only when no approved consumer remains or a human explicitly revokes it. `kiaened` is always isolated.
