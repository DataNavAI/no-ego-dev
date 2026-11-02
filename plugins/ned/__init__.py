"""Native NED tool: publish a checked, expiring reference, never secret bytes."""
import json
import os
from pathlib import Path
import shutil
import subprocess

SCHEMA = {
    "name": "ned",
    "description": (
        "Request a secret from the user with request_secret and its key; COM opens a private entry form. "
        "Never ask for values in chat. Share a saved secret through a retrieval card. "
        "First obtain its private export path using NED CLI get --file. "
        "Never read or echo the file contents. Only managed NED vault exports are accepted."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["secure_share_secret", "request_secret"]},
            "key": {"type": "string", "description": "Vault key, e.g. ADMIN_PASSWORD; never a value."},
            "path": {"type": "string", "description": "Absolute NED private export path."},
        },
        "required": ["action"],
        "additionalProperties": False,
    },
}


def handle(args, **_kwargs):
    failure = json.dumps({"success": False, "error": "secret_share_unavailable"})
    if not isinstance(args, dict):
        return failure
    requesting = args.get("action") == "request_secret"
    if requesting:
        import re
        if (set(args) != {"action", "key"} or not isinstance(args["key"], str)
                or re.fullmatch(r"[A-Z][A-Z0-9_]{0,127}", args["key"]) is None):
            return failure
        command = ["request", args["key"], "--json"]
    else:
        if (set(args) != {"action", "path"} or args.get("action") != "secure_share_secret"
                or not isinstance(args["path"], str) or len(args["path"]) > 4096
                or not Path(args["path"]).is_absolute()):
            return failure
        command = ["share", "--path", args["path"], "--json"]
    home = Path.home()
    install = home / ".local/share/ned/current"
    cli = Path(os.environ.get("NED_CLI_PATH", str(install / "app/bin/ned.js")))
    if "NED_CLI_PATH" not in os.environ and not cli.exists():
        executable = shutil.which("ned")
        if executable:
            try:
                target = Path(executable).resolve(strict=True)
                if target.is_file() and target.suffix == ".js":
                    cli = target
            except OSError:
                return failure
    node = os.environ.get("NED_NODE_PATH") or str(install / "runtime/bin/node")
    if not Path(node).is_file():
        node = shutil.which("node")
    if not cli.is_absolute() or not cli.is_file() or not node:
        return failure
    try:
        child_env = os.environ.copy()
        if "NED_AGENT_HOME" not in child_env:
            try:
                from hermes_constants import get_hermes_home
            except ImportError:
                # Fake registration/standalone integrations have no Hermes package.
                # Bind explicitly so inherited Codex markers cannot hijack the vault.
                agent_home = child_env.get("HERMES_HOME", str(home))
            else:
                agent_home = str(get_hermes_home())
            child_env["NED_AGENT_HOME"] = agent_home
        completed = subprocess.run(  # noqa: S603 -- argv-only trusted CLI; path is a single validated argument, never a shell command.
            [node, str(cli), "secret", *command],
            capture_output=True, timeout=15, check=False, env=child_env,
        )
        if completed.returncode != 0 or len(completed.stdout) > 2048:
            return failure
        result = json.loads(completed.stdout)
        id_field = "request_id" if requesting else "share_id"
        expected = {"success", "action", id_field, "expires_at"}
        if requesting:
            expected.add("key")
        if (not isinstance(result, dict)
                or set(result) != expected
                or result["success"] is not True or result["action"] != args["action"]
                or requesting and result.get("key") != args["key"]
                or not isinstance(result[id_field], str) or len(result[id_field]) != 64
                or any(char not in "0123456789abcdef" for char in result[id_field])
                or not isinstance(result["expires_at"], str) or len(result["expires_at"]) > 40):
            return failure
        return json.dumps(result)
    except (OSError, subprocess.SubprocessError, ValueError, TypeError):
        return failure


def register(ctx):
    ctx.register_tool(name="ned", toolset="ned", schema=SCHEMA, handler=handle)
