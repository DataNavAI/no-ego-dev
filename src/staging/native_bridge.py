"""Credential-free adapter to the installed native Hermes distribution and loaders.

Never reads normal profiles, auth stores or environment secret values. Requests are
owned staging paths supplied by the controller; diagnostics deliberately omit values.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import re
import stat

request = json.loads(os.environ.pop("NED_STAGING_REQUEST"))
root = Path(request["root"])
if root.resolve() != root:
    raise ValueError("Noncanonical staging root")
profile = root / "hermes" / "profiles" / "ned-staging"
def check_mutable_path(path):
    try:
        mode = path.lstat().st_mode
    except FileNotFoundError:
        return
    if stat.S_ISLNK(mode) or not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)):
        raise ValueError("Unsafe staging mutable entry")
    if stat.S_ISDIR(mode):
        for child in path.iterdir():
            check_mutable_path(child)


for parent in [root, root / "hermes", root / "hermes/profiles"]:
    if parent.exists() and (parent.is_symlink() or not parent.is_dir()):
        raise ValueError("Unsafe staging parent")
check_mutable_path(profile)
check_mutable_path(root / "data")
sys.path.insert(0, request["hermes_source"])
import yaml  # noqa: E402
from hermes_cli.profile_distribution import (  # noqa: E402
    install_distribution, update_distribution, read_manifest, read_manifest as load_manifest,
    write_manifest, plan_install,
)


def dump(value):
    print(json.dumps(value, sort_keys=True))


def config():
    check_mutable_path(profile)
    value = yaml.safe_load((profile / "config.yaml").read_text())
    if not isinstance(value, dict):
        raise ValueError("Malformed staging configuration")
    from hermes_cli.config import _normalize_root_model_keys
    value = _normalize_root_model_keys(value)
    # This profile is staging-owned. Output only settings, never arbitrary config
    # values that could contain embedded credentials.
    env_file = profile / ".env"
    env_keys = []
    if env_file.exists():
        if env_file.is_symlink() or not env_file.is_file():
            raise ValueError("Unsafe staging environment file")
        for line in env_file.open():
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            match = re.match(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
            if not match:
                raise ValueError("Unsupported staging dotenv syntax")
            env_keys.append(match.group(1))
    return {
        "env_present": env_file.exists(),
        "env_keys": env_keys,
        "op_env_present": (profile / ".op.env").exists(),
        "external_secrets": any(isinstance(v, dict) and v.get("enabled") for v in value.get("secrets", {}).values()),
        "model": {key: (bool(value.get("model", {}).get(key)) if key in ("api_key", "base_url", "api_base", "api_key_env", "api_mode") else value.get("model", {}).get(key)) for key in ("provider", "base_url", "api_base", "api_key", "key_env", "api_key_env", "api_mode") if value.get("model", {}).get(key) is not None},
        "toolsets": value.get("toolsets", []),
        "providers": {"configured": True} if value.get("providers") else {},
        "custom_providers": {"configured": True} if value.get("custom_providers") else {},
        "fallback_model": bool(value.get("fallback_model")),
        "fallback_providers": [True] if value.get("fallback_providers") else [],
        "auxiliary": {key: {"provider": item.get("provider"), "override": any(item.get(field) for field in ("base_url", "api_base", "api_key", "key_env", "api_key_env", "api_mode"))} for key, item in value.get("auxiliary", {}).items() if isinstance(item, dict)},
        "terminal": {key: value.get("terminal", {}).get(key) for key in ("backend", "cwd", "auto_source_bashrc", "shell_init_files")},
        "skills": {"external_dirs": value.get("skills", {}).get("external_dirs", [])},
        "mcp_servers": {"configured": True} if value.get("mcp_servers") else {},
    }


try:
    action = sys.argv[1]
    if action == "owned":
        manifest = load_manifest(Path(request["source"]))
        if manifest is None or not manifest.distribution_owned:
            raise ValueError("Explicit distribution ownership required")
        # plan_install performs supported native version/symlink/source validation.
        import tempfile
        with tempfile.TemporaryDirectory() as work:
            plan_install(request["source"], Path(work), override_name="ned-staging")
        dump(manifest.distribution_owned)
    elif action == "install":
        install_distribution(request["source"], name="ned-staging", create_alias=False)
        dump({"installed": True})
    elif action == "retarget":
        manifest = read_manifest(profile)
        manifest.source = request["source"]
        write_manifest(profile, manifest)
        dump({"retargeted": True})
    elif action == "update":
        update_distribution("ned-staging", force_config=False)
        dump({"updated": True})
    elif action == "metadata":
        manifest = read_manifest(profile)
        dump({"name": manifest.name, "source": manifest.source})
    elif action == "config":
        dump(config())
    elif action == "isolate":
        file = profile / "config.yaml"
        value = yaml.safe_load(file.read_text())
        value.setdefault("terminal", {}).update({"backend": "local", "cwd": str(root / "projects"), "auto_source_bashrc": False, "shell_init_files": []})
        value.setdefault("skills", {})["external_dirs"] = []
        value["mcp_servers"] = {}
        value["toolsets"] = ["terminal", "file", "skills", "memory"]
        # Credential-bearing settings are never inherited. Model selection remains
        # the distribution's OpenRouter default; grants are added by owner later.
        value["model"]["provider"] = "openrouter"
        value["model"]["key_env"] = "OPENROUTER_API_KEY"
        value["fallback_providers"] = []
        value.pop("fallback_model", None)
        file.write_text(yaml.safe_dump(value, sort_keys=False))
        file.chmod(0o600)
        profile.chmod(0o700)
        dump({"isolated": True})
    elif action == "probe":
        from agent.prompt_builder import load_soul_md, build_skills_system_prompt, build_context_files_prompt
        soul = load_soul_md(home_override=profile) or ""
        agents = build_context_files_prompt(cwd=str(root / "projects"), skip_soul=True, home_override=profile) or ""
        skills = build_skills_system_prompt(skills_dir_override=profile / "skills") or ""
        dump({"soul_loaded": bool(soul), "agents_loaded": (profile / "AGENTS.md").read_text().strip()[:80] in agents, "skills_loaded": "project-manager" in skills,
              "soul_digest": hashlib.sha256(soul.encode()).hexdigest(),
              "agents_digest": hashlib.sha256(agents.encode()).hexdigest(),
              "skills_digest": hashlib.sha256(skills.encode()).hexdigest()})
    else:
        raise ValueError("Unsupported staging native action")
except Exception:
    # Native exceptions may contain config/auth values. Return no exception text.
    print("Native staging operation failed; inspect stage-only configuration and ownership.", file=sys.stderr)
    sys.exit(1)
