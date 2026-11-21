"""Private JSON-lines adapter to the installed Hermes model/auth implementation.

Input travels over stdin, never argv. Only public challenge/status leaves stdout;
provider tokens remain inside Hermes. NED authorizes a second commit message.
"""
import contextlib
import json
import os
from pathlib import Path
import re
import sys


def emit(value):
    print(json.dumps(value), flush=True)


def read():
    line = sys.stdin.readline(16385)
    if not line or len(line) > 16384:
        raise ValueError("invalid input")
    return json.loads(line)


def main():
    source = os.environ.get("NED_HERMES_SOURCE")
    if source:
        if not Path(source).is_absolute():
            raise ValueError("invalid source")
        sys.path.insert(0, source)
    quiet = open(os.devnull, "w")
    with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
        from hermes_cli.config import load_config_readonly, save_config, save_env_value_secure, save_anthropic_api_key
        from hermes_cli.auth_codex import (
            _codex_request_device_code, _codex_poll_authorization_code,
            _codex_exchange_authorization_code, _save_codex_tokens,
        )
        from hermes_cli.auth_constants import CODEX_OAUTH_CLIENT_ID
    request = read()
    if request.get("action") == "inspect":
        emit({"type": "available", "deviceLogin": True})
        return
    action, provider, model = (request.get(k) for k in ("action", "provider", "model"))
    if not isinstance(model, str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}", model):
        raise ValueError("invalid model")
    if action == "disconnect" and provider in ("openai-codex", "gemini", "anthropic", "hub"):
        pass
    elif action == "device" and provider == "openai-codex":
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            device = _codex_request_device_code("https://auth.openai.com", CODEX_OAUTH_CLIENT_ID)
        code = device.get("user_code")
        if not isinstance(code, str) or not re.fullmatch(r"[A-Za-z0-9-]{3,32}", code):
            raise ValueError("invalid challenge")
        emit({"type": "challenge", "verificationUri": "https://auth.openai.com/codex/device", "userCode": code})
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            grant = _codex_poll_authorization_code("https://auth.openai.com", device_auth_id=device["device_auth_id"], user_code=code, poll_interval=device["interval"])
            tokens = _codex_exchange_authorization_code("https://auth.openai.com", CODEX_OAUTH_CLIENT_ID, grant)
    elif action == "configure" and provider in ("gemini", "anthropic"):
        key = request.get("apiKey")
        if not isinstance(key, str) or not re.fullmatch(r"[!-~]{16,4096}", key):
            raise ValueError("invalid key")
    else:
        raise ValueError("unsupported operation")
    emit({"type": "authorized"})
    if read() != {"commit": True}:
        raise ValueError("commit denied")
    # The parent holds its instance-profile lock and rechecks current NED API
    # authority/fingerprint immediately before allowing this private commit.
    with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
        config = load_config_readonly()
        selected = dict(config.get("model") or {}) if isinstance(config.get("model"), dict) else {}
        for name in ("api_key", "base_url", "api_mode", "key_env", "api_key_env"):
            selected.pop(name, None)
        if action == "disconnect":
            from hermes_cli.auth import clear_provider_auth
            from hermes_cli.credential_lifecycle import remove_provider_env_credential
            if provider != "hub":
                clear_provider_auth(provider)
                for name in {"gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY"), "anthropic": ("ANTHROPIC_API_KEY", "ANTHROPIC_TOKEN")}.get(provider, ()):
                    remove_provider_env_credential(name)
            config = load_config_readonly()
            marker = config.get("ned_model") or {}
            owned = marker.get("provider")
            if marker.get("kind") in ("local", "hub") and owned in ("ned-model", "ned-hub") and selected.get("provider") == "custom:" + owned:
                config.get("providers", {}).pop(owned, None)
            selected = {"provider": "custom:ned-unconfigured", "default": "", "name": ""}
        elif action == "device":
            _save_codex_tokens(tokens)
        else:
            key_name = "GEMINI_API_KEY" if provider == "gemini" else "ANTHROPIC_API_KEY"
            if provider == "anthropic":
                save_anthropic_api_key(key, save_fn=save_env_value_secure)
            result = save_env_value_secure(key_name, key)
            if not result.get("success", result.get("ok", False)):
                raise ValueError("credential persistence failed")
        if action != "disconnect":
            selected.update(provider=provider, default=model, name=model)
        config["model"] = selected
        config["ned_model"] = {"kind": "instance", "provider": provider, "model": model if action != "disconnect" else ""}
        save_config(config)
        # Verify the selected Hermes config rather than trusting a write that
        # may have been refused by a managed/read-only Hermes installation.
        saved = load_config_readonly().get("model", {})
        if saved.get("provider") != selected["provider"] or saved.get("default") != selected["default"]:
            raise ValueError("configuration persistence failed")
        os.chmod(Path(os.environ["HERMES_HOME"]) / "config.yaml", 0o600)
    emit({"type": "done"})


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        # Never return upstream errors, tokens, auth-file contents or tracebacks.
        emit({"type": "failed"})
        sys.exit(1)
