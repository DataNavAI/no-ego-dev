"""Native NED tool: publish a checked, expiring reference, never secret bytes."""
import json
import os
from pathlib import Path
import shutil
import subprocess

SCHEMA = {
    "name": "ned",
    "description": (
        "Share a saved secret with the user through a NED COM retrieval card. "
        "First obtain its private export path using NED CLI get --file. "
        "Never read or echo the file contents. Only managed NED vault exports are accepted."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["secure_share_secret"]},
            "path": {"type": "string", "description": "Absolute NED private export path."},
        },
        "required": ["action", "path"],
        "additionalProperties": False,
    },
}


def handle(args, **_kwargs):
    failure = json.dumps({"success": False, "error": "secret_share_unavailable"})
    if (not isinstance(args, dict) or set(args) != {"action", "path"}
            or args["action"] != "secure_share_secret"
            or not isinstance(args["path"], str) or len(args["path"]) > 4096
            or not Path(args["path"]).is_absolute()):
        return failure
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
        completed = subprocess.run(  # noqa: S603 -- argv-only trusted CLI; path is a single validated argument, never a shell command.
            [node, str(cli), "secret", "share", "--path", args["path"], "--json"],
            capture_output=True, timeout=15, check=False,
        )
        if completed.returncode != 0 or len(completed.stdout) > 2048:
            return failure
        result = json.loads(completed.stdout)
        if (not isinstance(result, dict)
                or set(result) != {"success", "action", "share_id", "expires_at"}
                or result["success"] is not True or result["action"] != "secure_share_secret"
                or not isinstance(result["share_id"], str) or len(result["share_id"]) != 64
                or any(char not in "0123456789abcdef" for char in result["share_id"])
                or not isinstance(result["expires_at"], str) or len(result["expires_at"]) > 40):
            return failure
        return json.dumps(result)
    except (OSError, subprocess.SubprocessError, ValueError, TypeError):
        return failure


def register(ctx):
    ctx.register_tool(name="ned", toolset="ned", schema=SCHEMA, handler=handle)
