"""Bounded official-client subscription login. Never exposes a terminal or token API."""
import contextlib
import ctypes
import errno
import fcntl
import json
import os
from pathlib import Path
import pty
import re
import select
import shutil
import signal
import subprocess
import struct
import termios
import sys
import tempfile
import time
from urllib.parse import urlsplit

PROVIDERS = {
    "claude-subscription-directsdk-experimental": {
        "command": "claude", "args": ["auth", "login", "--claudeai"],
        "origin": "claude.ai", "path": "/oauth/authorize",
        "credential": ".claude/.credentials.json", "version": "2.1.331",
    },
    "antigravity-subscription-directsdk": {
        "command": "agy", "args": [], "origin": "accounts.google.com",
        "path": "/o/oauth2/auth",
        "credential": ".gemini/antigravity-cli/jetski-standalone-oauth-token",
        "version": "1.5.16",
    },
}


def challenge_url(provider, value):
    """Only this client's HTTPS consent page, not arbitrary terminal links."""
    if not isinstance(value, str) or len(value) > 4096 or re.search(r"[\s\x00-\x20\x7f]", value):
        raise ValueError("invalid challenge")
    parsed = urlsplit(value)
    spec = PROVIDERS[provider]
    if (parsed.scheme != "https" or parsed.netloc != spec["origin"]
            or parsed.path != spec["path"] or parsed.username or parsed.fragment
            or not parsed.query):
        raise ValueError("invalid challenge")
    return value


def at_code_prompt(command, buffer):
    prompts = {"claude": b"Paste code here", "agy": b"authorization code"}
    plain = re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", buffer)
    return prompts[command].lower() in plain.lower()


def isolated_env(home):
    # No provider tokens, proxy URLs, browser commands, host keyring or settings.
    return {
        "HOME": str(home), "CLAUDE_CONFIG_DIR": str(home / ".claude"),
        "PATH": "/usr/local/bin:/usr/bin:/bin", "TERM": "xterm",
        "BROWSER": "/bin/false", "DISABLE_AUTOUPDATER": "1",
        "AGY_CLI_DISABLE_AUTO_UPDATE": "true",
        "SSH_CONNECTION": "127.0.0.1 10000 127.0.0.1 22",
        "DISABLE_TELEMETRY": "1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    }


def _owned_child(parent):
    # Bind to the pre-fork owner, including a death before this child starts.
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(1, signal.SIGKILL, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "cannot bind login child lifetime")
    if os.getppid() != parent:
        os.kill(os.getpid(), signal.SIGKILL)


def stop(child):
    if child.poll() is None:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(child.pid, signal.SIGTERM)
    try:
        child.wait(timeout=1)
    except subprocess.TimeoutExpired:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(child.pid, signal.SIGKILL)
        child.wait()


def authorize(provider, emit, read):
    """Returns a staged private credential and cleanup owner after official login.

    Linux file-based storage only. macOS global keychain storage is deliberately
    not borrowed or copied into an instance. The caller commits after its current
    authority/profile check. Nothing in this function changes the live profile.
    """
    if sys.platform != "linux" or provider not in PROVIDERS:
        raise ValueError("unsupported subscription login")
    spec = PROVIDERS[provider]
    binary = shutil.which(spec["command"], path="/usr/local/bin:/usr/bin:/bin")
    if not binary:
        raise ValueError("client unavailable")
    temporary = tempfile.TemporaryDirectory(prefix="ned-subscription-")
    home = Path(temporary.name)
    env = isolated_env(home)
    child = None
    master = None
    owner_pid = os.getpid()
    try:
        version = subprocess.run([binary, "--version"], env=env, cwd=home,  # noqa: S603 - fixed allowlisted client, no shell
                                 stdin=subprocess.DEVNULL, capture_output=True,
                                 timeout=5, check=True, start_new_session=True, preexec_fn=lambda: _owned_child(owner_pid))
        if not re.search(rb"(?<![\d.])" + re.escape(spec["version"].encode()) + rb"(?![\d.])", version.stdout):
            raise ValueError("unqualified client")
        master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 35, 110, 0, 0))
        try:
            child = subprocess.Popen([binary, *spec["args"]], cwd=home, env=env,  # noqa: S603 - fixed provider/client arguments, no shell
                                     stdin=slave, stdout=slave, stderr=slave,
                                     start_new_session=True, preexec_fn=lambda: _owned_child(owner_pid))
        finally:
            os.close(slave)
        deadline = time.monotonic() + 900
        buffer = b""
        selected = False
        offered = False
        submitted = False
        credential = home / spec["credential"]
        while time.monotonic() < deadline:
            if credential.is_file() and credential.stat().st_size > 10:
                # The login must end before an interactive agent can accept input.
                stop(child)
                child = None
                if not offered or not submitted or credential.is_symlink() or credential.stat().st_size > 1048576:
                    raise ValueError("unexpected credential")
                command = [binary, "auth", "status"] if spec["command"] == "claude" else [binary, "models"]
                result = subprocess.run(command, env=env, cwd=home, stdin=subprocess.DEVNULL,  # noqa: S603 - fixed non-inference vendor status command
                                        capture_output=True, timeout=10, check=True, start_new_session=True, preexec_fn=lambda: _owned_child(owner_pid))
                if spec["command"] == "claude":
                    status = json.loads(result.stdout)
                    if status.get("loggedIn") is not True or status.get("authMethod") in {"api_key", "api_key_helper", "third_party"} or status.get("apiProvider", "firstParty") != "firstParty" or not status.get("subscriptionType"):
                        raise ValueError("subscription authentication not confirmed")
                elif not re.search(rb"(?m)^\s*gemini-[a-zA-Z0-9.-]+", re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", result.stdout)):
                    raise ValueError("subscription authentication not confirmed")
                return temporary, credential
            if child.poll() is not None:
                raise ValueError("login failed")
            watched = [master] + ([sys.stdin] if offered and not submitted else [])
            ready, _, _ = select.select(watched, [], [], .1)
            if sys.stdin in ready:
                message = read()
                code = message.get("code") if isinstance(message, dict) and set(message) == {"code"} else None
                if not isinstance(code, str) or not re.fullmatch(r"[!-~]{6,4096}", code):
                    raise ValueError("invalid authorization code")
                submitted = True
                os.write(master, code.encode() + b"\r")
            if master in ready:
                try:
                    chunk = os.read(master, 4096)
                except OSError as error:
                    if error.errno == errno.EIO and credential.is_file():
                        continue  # A fast auth-only CLI can close its PTY after writing.
                    raise
                if not chunk:
                    if credential.is_file():
                        continue
                    raise ValueError("login ended")
                buffer += chunk
                if len(buffer) > 131072:
                    raise ValueError("login output limit")
                if spec["command"] == "agy" and not selected and b"Select login method" in buffer:
                    os.write(master, b"\r")
                    selected = True
                if not offered:
                    # OSC8 hyperlinks terminate in ESC; plain URLs in whitespace.
                    for raw in re.findall(rb"https://[^\s\x1b\x07]+", buffer):
                        try:
                            url = challenge_url(provider, raw.decode("ascii"))
                        except (ValueError, UnicodeError):
                            continue
                        if at_code_prompt(spec["command"], buffer):
                            emit({"type": "challenge", "method": "manual_code", "verificationUri": url})
                            offered = True
                            break
        raise ValueError("login expired")
    except BaseException:
        if child is not None:
            stop(child)
            child = None
        temporary.cleanup()
        raise
    finally:
        if child is not None:
            stop(child)
        if master is not None:
            os.close(master)


def persist(temporary, credential, provider, config):
    """Copy only the vendor-owned credential, under the parent's profile lock."""
    profile = Path(os.environ["HERMES_HOME"])
    directory = profile / "ned-subscriptions"
    directory.mkdir(mode=0o700, exist_ok=True)
    if directory.is_symlink() or directory.stat().st_mode & 0o077:
        raise ValueError("unsafe subscription directory")
    destination = Path(tempfile.mkdtemp(prefix="credential-", dir=directory))
    name = ".credentials.json" if PROVIDERS[provider]["command"] == "claude" else credential.name
    target = destination / name
    try:
        with credential.open("rb") as source, os.fdopen(os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb") as output:
            os.chmod(target, 0o600)
            value = source.read(1048577)
            if len(value) > 1048576:
                raise ValueError("credential size")
            output.write(value)
        plugins = config.setdefault("plugins", {})
        enabled = plugins.setdefault("enabled", [])
        if provider not in enabled:
            enabled.append(provider)
        disabled = plugins.get("disabled", [])
        if provider in disabled:
            disabled.remove(provider)
        settings = plugins.setdefault("entries", {}).setdefault(provider, {})
        settings["enabled"] = True
        setting = "claude_config_dir" if PROVIDERS[provider]["command"] == "claude" else "ned_config_dir"
        settings.setdefault("settings", {})[setting] = str(destination)
    except BaseException:
        shutil.rmtree(destination)
        raise
    finally:
        temporary.cleanup()


def disconnect(config, provider):
    """Remove only this NED-owned provider credential, never another login home."""
    profile = Path(os.environ["HERMES_HOME"])
    plugins = config.get("plugins", {})
    settings = plugins.get("entries", {}).get(provider, {}).get("settings", {})
    key = "claude_config_dir" if PROVIDERS[provider]["command"] == "claude" else "ned_config_dir"
    value = settings.get(key)
    if not isinstance(value, str):
        raise ValueError("owned credential location unavailable")
    directory = Path(value)
    parent = profile / "ned-subscriptions"
    if directory.parent != parent or not directory.name.startswith("credential-"):
        raise ValueError("refusing unrelated credential directory")
    for part in (parent, directory):
        if part.is_symlink() or not part.is_dir() or part.stat().st_mode & 0o077:
            raise ValueError("unsafe credential directory")
    name = ".credentials.json" if PROVIDERS[provider]["command"] == "claude" else "jetski-standalone-oauth-token"
    credential = directory / name
    if credential.is_symlink():
        raise ValueError("unsafe credential")
    credential.unlink(missing_ok=True)
    with contextlib.suppress(OSError):
        directory.rmdir()
    if provider in plugins.get("enabled", []):
        plugins["enabled"].remove(provider)
    disabled = plugins.setdefault("disabled", [])
    if provider not in disabled:
        disabled.append(provider)
