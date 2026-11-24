"""No personal accounts or vendor inference: private credential boundary tests."""
import importlib.util
from pathlib import Path

import pytest
import unittest

check = unittest.TestCase()

spec = importlib.util.spec_from_file_location(
    "subscription_auth", Path(__file__).parents[1] / "apps/core/src/subscription-auth.py")
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)


@pytest.mark.parametrize("provider,valid", [
    ("claude-subscription-directsdk-experimental", "https://claude.ai/oauth/authorize?opaque-challenge"),
    ("antigravity-subscription-directsdk", "https://accounts.google.com/o/oauth2/auth?state=synthetic"),
])
def test_challenge_rejects_foreign_links_and_terminal_controls(provider, valid):
    check.assertEqual(auth.challenge_url(provider, valid), valid)
    for value in [valid.replace("https:", "http:"), valid + "\x1b", valid + "\n",
                  valid + "#fragment", valid.replace("https://", "https://user@"),
                  "https://attacker.invalid/oauth/authorize?x=y", "https://claude.ai/?x=y"]:
        with pytest.raises(ValueError):
            auth.challenge_url(provider, value)


def test_auth_child_never_inherits_host_credentials_or_keyring(monkeypatch, tmp_path):
    for key in ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN", "GOOGLE_API_KEY",
                "DBUS_SESSION_BUS_ADDRESS", "HTTPS_PROXY", "ANTIGRAVITY_CONFIG_DIR"]:
        monkeypatch.setenv(key, "synthetic-host-value")
    env = auth.isolated_env(tmp_path)
    check.assertEqual(env["HOME"], str(tmp_path))
    check.assertEqual(env["CLAUDE_CONFIG_DIR"], str(tmp_path / ".claude"))
    check.assertEqual(env["BROWSER"], "/bin/false")
    check.assertFalse(any(value == "synthetic-host-value" for value in env.values()))
    check.assertTrue("SSH_CONNECTION" in env)


def test_commit_copies_only_vendor_credential_and_scopes_plugin(monkeypatch, tmp_path):
    import tempfile
    profile = tmp_path / "profile"
    profile.mkdir(mode=0o700)
    monkeypatch.setenv("HERMES_HOME", str(profile))
    temporary = tempfile.TemporaryDirectory()
    source = Path(temporary.name)
    (source / "credential").write_text("synthetic-credential")
    (source / "unrelated-log").write_text("must-not-persist")
    config = {"agent": {"max_turns": 7}}
    provider = "antigravity-subscription-directsdk"
    auth.persist(temporary, source / "credential", provider, config)
    destination = Path(config["plugins"]["entries"][provider]["settings"]["ned_config_dir"])
    check.assertEqual(destination.parent, profile / "ned-subscriptions")
    check.assertEqual([p.name for p in destination.iterdir()], ["credential"])
    check.assertEqual((destination / "credential").read_text(), "synthetic-credential")
    check.assertEqual((destination.stat().st_mode & 0o777), 0o700)
    check.assertEqual(((destination / "credential").stat().st_mode & 0o777), 0o600)
    check.assertEqual(config["agent"], {"max_turns": 7})
    check.assertFalse(source.exists())


def test_commit_refuses_symlink_credential_root(monkeypatch, tmp_path):
    import tempfile
    profile = tmp_path / "profile"
    profile.mkdir(mode=0o700)
    outside = tmp_path / "outside"
    outside.mkdir()
    (profile / "ned-subscriptions").symlink_to(outside, target_is_directory=True)
    monkeypatch.setenv("HERMES_HOME", str(profile))
    with tempfile.TemporaryDirectory() as source:
        credential = Path(source) / "credential"
        credential.write_text("synthetic-credential")
        with pytest.raises(ValueError):
            auth.persist(type("Owner", (), {"cleanup": lambda _: None})(), credential,
                         "antigravity-subscription-directsdk", {})
    check.assertFalse(list(outside.iterdir()))


def test_vendor_prompt_recognizes_terminal_colors_without_forwarding_terminal_input():
    check.assertTrue(auth.at_code_prompt("agy", b"authorization\x1b[0m \x1b[2mcode..."))
    check.assertTrue(auth.at_code_prompt("claude", b"Paste code here if prompted > "))
    check.assertFalse(auth.at_code_prompt("agy", b"Select login method: 1. Google OAuth"))
    check.assertFalse(auth.at_code_prompt("claude", b"Opening browser to sign in"))


def test_official_client_process_boundary_stages_grant_until_authorized_commit(monkeypatch, tmp_path):
    """Synthetic executable exercises PTY/stdin and real private staging, no OAuth."""
    import json
    import os
    client = tmp_path / "synthetic-client"
    client.write_text('''#!/usr/bin/python3
import json,os,pathlib,sys
if sys.argv[1:] == ["--version"]:
    print("2.1.331 (synthetic test client)")
elif sys.argv[1:] == ["auth", "status"]:
    print(json.dumps({"loggedIn":True,"authMethod":"claude.ai","apiProvider":"firstParty","subscriptionType":"pro"}))
else:
    print("https://claude.ai/oauth/authorize?synthetic-challenge",flush=True)
    print("Paste code here if prompted >",flush=True)
    code=input()
    if code != "synthetic-one-use-code":sys.exit(1)
    directory=pathlib.Path(os.environ["CLAUDE_CONFIG_DIR"])
    directory.mkdir(parents=True)
    (directory/".credentials.json").write_text("synthetic-private-grant")
''')
    client.chmod(0o700)
    monkeypatch.setattr(auth.sys, "platform", "linux")
    monkeypatch.setattr(auth.shutil, "which", lambda *args, **kwargs: str(client))
    monkeypatch.setattr(auth, "_owned_child", lambda parent: None)
    input_fd, writer_fd = os.pipe()
    events = []
    profile = tmp_path / "profile"
    profile.mkdir(mode=0o700)
    monkeypatch.setenv("HERMES_HOME", str(profile))
    with os.fdopen(input_fd) as input_file, os.fdopen(writer_fd, "w") as writer:
        monkeypatch.setattr(auth.sys, "stdin", input_file)
        def emit(event):
            events.append(event)
            writer.write(json.dumps({"code": "synthetic-one-use-code"}) + "\n")
            writer.flush()
        temporary, credential = auth.authorize("claude-subscription-directsdk-experimental", emit,
                                               lambda: json.loads(input_file.readline()))
        try:
            check.assertEqual(credential.read_text(), "synthetic-private-grant")
            check.assertEqual(list(profile.iterdir()), [])
            check.assertEqual(len(events), 1)
            check.assertEqual(events[0]["method"], "manual_code")
            check.assertNotIn("synthetic-one-use-code", json.dumps(events))
            check.assertNotIn("synthetic-private-grant", json.dumps(events))
            config = {}
            auth.persist(temporary, credential, "claude-subscription-directsdk-experimental", config)
            target = Path(config["plugins"]["entries"]["claude-subscription-directsdk-experimental"]["settings"]["claude_config_dir"])
            check.assertEqual((target / ".credentials.json").read_text(), "synthetic-private-grant")
            auth.disconnect(config, "claude-subscription-directsdk-experimental")
            check.assertFalse(target.exists())
            check.assertIn("claude-subscription-directsdk-experimental", config["plugins"]["disabled"])
        finally:
            temporary.cleanup()
