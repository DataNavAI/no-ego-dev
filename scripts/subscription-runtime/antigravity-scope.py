"""NED's profile-only credential scope for the pinned Antigravity plugin.

No launch-environment, home-directory or keyring fallback. Resolves Hermes'
context-local profile on each call without mutating process-global environment.
"""
from pathlib import Path


def token_directory():
    from hermes_constants import get_hermes_home
    from hermes_cli.config import load_config_readonly
    home = get_hermes_home()
    absent = str(home / "ned-subscriptions" / "unconfigured")
    config = load_config_readonly()
    settings = config.get("plugins", {}).get("entries", {}).get(
        "antigravity-subscription-directsdk", {}).get("settings", {})
    value = settings.get("ned_config_dir")
    if not isinstance(value, str):
        return absent
    selected = Path(value)
    if selected.parent != home / "ned-subscriptions" or not selected.name.startswith("credential-"):
        return absent
    for directory in (selected.parent, selected):
        if directory.is_symlink() or not directory.is_dir() or directory.stat().st_mode & 0o077:
            return absent
    return str(selected)
