"""Actual pinned plugin scope test; synthetic files, no OAuth or inference."""
import importlib
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, os.environ["NED_HERMES_TEST_SOURCE"])
from hermes_constants import set_hermes_home_override, reset_hermes_home_override
from providers import get_provider_profile

root = Path(sys.argv[1])
provider = get_provider_profile("antigravity-subscription-directsdk")
if provider is None:
    raise RuntimeError("pinned plugin did not load")
process = importlib.import_module(provider.__class__.__module__ + ".process")
profiles = []
for index in range(2):
    profile = root / str(index)
    credentials = profile / "ned-subscriptions" / "credential-fixture"
    credentials.mkdir(parents=True, mode=0o700)
    credentials.parent.chmod(0o700)
    config = {"plugins": {"entries": {"antigravity-subscription-directsdk": {
        "settings": {"ned_config_dir": str(credentials)}}}}}
    (profile / "config.yaml").write_text(json.dumps(config))
    token = credentials / "jetski-standalone-oauth-token"
    token.write_text("synthetic-private-token-" + str(index))
    token.chmod(0o600)
    profiles.append((profile, credentials, token))
# Even an explicit launch-profile override must not replace the active scope.
os.environ["ANTIGRAVITY_CONFIG_DIR"] = str(profiles[0][1])
os.environ["CLAUDE_CODE_OAUTH_TOKEN"] = "synthetic-host-oauth"
os.environ["DBUS_SESSION_BUS_ADDRESS"] = "synthetic-host-keyring"
for profile, credentials, token in profiles:
    scope = set_hermes_home_override(str(profile))
    try:
        if process.resolve_real_token_path() != token or not process.is_authenticated():
            raise RuntimeError("cross-profile credential routing")
        environment = process.build_child_env(root / "isolated")
        if environment.get("HOME") != str(root / "isolated"):
            raise RuntimeError("child home leaked")
        for name in ("CLAUDE_CODE_OAUTH_TOKEN", "DBUS_SESSION_BUS_ADDRESS", "ANTIGRAVITY_CONFIG_DIR"):
            if name in environment:
                raise RuntimeError("launch-profile environment leaked")
        token.unlink()
        if process.resolve_real_token_path() is not None or process.is_authenticated():
            raise RuntimeError("missing profile credential fell back to host")
    finally:
        reset_hermes_home_override(scope)
print(json.dumps({"profiles": 2, "scope": "PASS", "hostFallback": "DENIED"}))
