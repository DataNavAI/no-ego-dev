---
name: ned-provider-identity
description: Use when a user asks to connect, change, verify, or use the GitHub account, AWS role, or GoDaddy Domains identity NED should use.
---

# Connect a provider identity in NED

1. Respect the active profile's credential policy. If it requires guarded IFA for this provider, use the existing identity-for-agent skill and the active profile's guard. Never import or bypass those credentials. Provider connections are available in private native NEDCOM. A Hub-registered standalone container also supports AWS for the Hub owner.
2. Check `ned identity --help` first and use the same release as the running COM. For an authorized source checkout, `node /absolute/path/to/no-ego-dev/bin/ned.js identity …` is the development entry point. Check `ned identity status <provider>`. Ask which account, role, or domain should be used if it is unclear. If an existing connection matches, use it for the requested operation and verify any additional permission required by that operation.
3. As soon as authorization is needed, call the Hermes `ned` tool with `{"action":"request_provider_auth","provider":"aws"}`, substituting the supported provider. On success, ask the user to open the **Review connection** card. The modal collects provider details and guides sign-in. The tool only queues the request. If it is unavailable, direct the user to the supported manual Provider connections screen or explain that the instance lacks this capability. Keep approval links, sign-in codes, and credentials out of Chat.
4. Explain the one applicable flow. Sign-in codes belong only on the provider’s sign-in page. Keep codes and tokens out of chat and tool output.
   - **GitHub** — Enter the intended username, generate a sign-in code from Settings, open GitHub, enter the code, then check approval. Compare the displayed login before confirming. The instance needs a registered, device-enabled GitHub App with expiring user tokens, and that app needs access to any repositories used by subsequent work.
   - **AWS** — Enter the Identity Center access portal URL and region, plus the exact assigned account ID and role. Sign in at the AWS link, check approval, and confirm the displayed account and role. Existing AWS CLI credentials are separate.
   - **GoDaddy** — Create a scoped Domains v3 personal access token on GoDaddy, then enter it and the managed domain in the private Settings form. Verify domain access and confirm. Ask only for the domain in chat if needed. The token belongs exclusively in Settings.
5. Read back `ned identity status <provider>`. Continue only after it shows the intended connected identity. A mismatch, expiry, cancel, or failed check leaves the request unfinished. Have the operator cancel or retry in Settings. For a local disconnect the provider grants remain subject to upstream revocation.

For authorized work, use `ned identity exec github -- gh api user` or `ned identity exec aws -- aws sts get-caller-identity`. Use `ned identity domain` for read-only GoDaddy domain verification. Check capabilities separately where applicable. Never use a bare provider command as fallback or print/export stored credentials. For hosted COM, public tunnels, and non-AWS providers in a standalone container, report that this flow needs a private native instance.
