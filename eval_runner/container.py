from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import stat
import subprocess
import tempfile
import time
from urllib.parse import urlsplit

import yaml

from .core import _provider_env_names, _candidate_skill_name, _copy_runtime_credentials, load_eval

ROOT = Path(__file__).resolve().parents[1]
LABEL = "ned.eval.run"


def credential_text(filename: Path, provider: str) -> str:
    info = filename.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_size > 16384:
        raise ValueError("Credential file must be a bounded regular file")
    if os.name != "nt" and (info.st_mode & 0o077 or info.st_uid != os.getuid()):
        raise ValueError("Credential file must be private and owned by the current user")
    allowed = _provider_env_names(provider)
    retained = {}
    for line in filename.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        name, separator, value = line.partition("=")
        if not separator or name not in allowed or name in retained or not value or "\x00" in value:
            raise ValueError("Provide only nonempty selected-provider credential variables")
        retained[name] = value
    if not retained:
        raise ValueError("Selected provider credential required")
    return "\n".join(f"{name}={value}" for name, value in retained.items()) + "\n"


def run_container(eval_path: Path, output_root: Path, env_file: Path | None = None, *, credential_home=None, credential_file=None, context=None,
                  image=None, provider=None, model=None, base_url=None, timeout=3600,
                  execute=subprocess.run, clock=time.monotonic, pause=time.sleep) -> tuple[int, Path]:
    spec = load_eval(eval_path / 'EVAL.yaml' if eval_path.is_dir() else eval_path)
    package = spec.path.parent
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", package.name):
        raise ValueError("Unsafe evaluation package name")
    packages = []
    if (package / "SKILL.md").is_file():
        if _candidate_skill_name(package / "SKILL.md") != package.name:
            raise ValueError("Select an EVAL beside its canonically named skill")
        container_package = "/opt/ned/skills/" + package.name
    elif package.parent == ROOT / "workflows":
        container_package = "/opt/ned/workflows/" + package.name
        required = spec.parameters.get("skills")
        if not isinstance(required, list) or not required or len(required) > 10:
            raise ValueError("Workflow must declare its candidate skill dependencies")
        for name in required:
            if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", name):
                raise ValueError("Invalid workflow skill dependency")
            source = ROOT / "skills" / name
            if _candidate_skill_name(source / "SKILL.md") != name:
                raise ValueError("Invalid workflow skill package")
            packages.append((source, "/opt/ned/skills/" + name))
    else:
        raise ValueError("Select a canonical skill or repository workflow EVAL")
    packages.append((package, container_package))
    if sum(source is not None for source in (env_file, credential_home, credential_file)) != 1:
        raise ValueError("Select exactly one private credential source")
    auth_text = None
    if credential_file is not None:
        credential_file = Path(credential_file).expanduser()
        info = credential_file.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_size > 1048576 or os.name != "nt" and (info.st_uid != os.getuid() or info.st_mode & 0o077):
            raise ValueError("Credential file must be private, bounded, regular and owned by the current user")
        text = credential_file.read_text()
        if text.lstrip().startswith("{"):
            if not isinstance(json.loads(text), dict):
                raise ValueError("Provider auth JSON must be an object")
            auth_text = text
        else:
            env_file = credential_file
    if credential_home is not None:
        credential_home = Path(credential_home).expanduser()
        if credential_home.is_symlink() or not credential_home.is_dir():
            raise ValueError("Credential home must be an existing nonsymlink directory")
        credential_home = credential_home.resolve()
        for name in (".env", "auth.json"):
            filename = credential_home / name
            if filename.exists() or filename.is_symlink():
                info = filename.lstat()
                if not stat.S_ISREG(info.st_mode) or info.st_size > 1048576 or os.name != "nt" and (info.st_uid != os.getuid() or info.st_mode & 0o077):
                    raise ValueError("Runtime credential files must be private regular files")
    source_model = yaml.safe_load(((credential_home or ROOT) / "config.yaml").read_text())["model"]
    provider_changed = provider is not None and provider != source_model.get("provider")
    if provider_changed and not model:
        raise ValueError("Changing provider requires an explicit compatible model")
    provider = provider or source_model["provider"]
    if not isinstance(provider, str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}", provider):
        raise ValueError("Select a canonical provider name")
    model = model or source_model["default"]
    if not isinstance(model, str) or not model.strip() or len(model) > 256:
        raise ValueError("Select a bounded nonempty model")
    base_url = base_url if base_url is not None else (None if provider_changed else source_model.get("base_url"))
    if base_url:
        parsed = urlsplit(base_url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("Provider base URL cannot contain credentials, query or fragment")
    credentials = credential_text(env_file, provider) if env_file is not None else ""
    for source, _target in packages:
        for filename in source.rglob("*"):
            if filename.is_symlink() or filename.name in {".env", "auth.json", ".git", "node_modules", "__pycache__"} or re.search(r"\.(sqlite|db)(?:$|[-.])", filename.name):
                raise ValueError("Evaluation package cannot contain symlinks or runtime state")
    output_root = output_root.expanduser().resolve()
    if output_root == ROOT or ROOT in output_root.parents:
        raise ValueError("Evaluation reports must stay outside the checkout")
    output_root.mkdir(mode=0o700, parents=True, exist_ok=True)
    identity = "ned-eval-" + secrets.token_hex(12)
    directory = output_root / identity
    directory.mkdir(mode=0o700)
    docker = shutil.which("docker")
    if not docker:
        raise RuntimeError("Docker required; no behavioral evaluation was run")
    command = [docker] + (["--context", context] if context else [])
    volumes = [identity + "-" + kind for kind in ("profile", "database", "projects")]
    selected_image = image or identity + ":candidate"
    deadline = clock() + timeout
    receipt = {"schema": 1, "run": identity, "container": identity, "volumes": volumes,
               "image": selected_image, "context": context, "status": "infrastructure_failed",
               "cleanup_verified": False, "exit_code": 3, "behavioral_evaluation": True}

    def call(*arguments, check=True, bounded=True):
        remaining = deadline - clock() if bounded else 60
        if remaining <= 0:
            raise TimeoutError("Container evaluation deadline exceeded")
        result = execute(command + list(arguments), cwd=ROOT, capture_output=True, text=True,
                         timeout=min(remaining, 1800), check=False)
        if check and result.returncode:
            raise RuntimeError("Docker evaluation operation failed")
        return result

    def cleanup():
        for kind, expected in (("container", {identity}), ("volume", set(volumes))):
            arguments = [kind, "ls", "--filter", f"label={LABEL}={identity}", "--format", "{{.Names}}" if kind == "container" else "{{.Name}}"]
            if kind == "container":
                arguments.insert(2, "-a")
            found = set(call(*arguments, bounded=False).stdout.split())
            if found - expected:
                raise RuntimeError("Unexpected resource in evaluation ownership scope")
            for name in sorted(found):
                call(kind, "rm", *( ["-f"] if kind == "container" else []), name, bounded=False)
            if call(*arguments, bounded=False).stdout.strip():
                raise RuntimeError("Evaluation resource cleanup incomplete")
        if not image:
            inspected = call("image", "inspect", selected_image, "--format", '{{index .Config.Labels "ned.eval.run"}}', check=False, bounded=False)
            if inspected.returncode == 0:
                if inspected.stdout.strip() != identity:
                    raise RuntimeError("Candidate image ownership mismatch")
                call("image", "rm", selected_image, bounded=False)

    try:
        if call("info", "--format", "{{.OSType}}").stdout.strip() != "linux":
            raise RuntimeError("A Linux Docker daemon is required")
        if not image:
            call("build", "--label", f"{LABEL}={identity}", "-t", selected_image, ".")
        image_id = call("image", "inspect", selected_image, "--format", "{{.Id}}").stdout.strip()
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", image_id):
            raise RuntimeError("Immutable image identity unavailable")
        receipt["image_id"] = image_id
        for name in volumes:
            call("volume", "create", "--label", f"{LABEL}={identity}", name)
        with tempfile.TemporaryDirectory(prefix="ned-eval-env-") as temporary:
            credential_source = None
            selected_home = credential_home
            if auth_text is not None:
                selected_home = Path(temporary) / "input"
                selected_home.mkdir(mode=0o700)
                auth_input = selected_home / "auth.json"
                auth_input.write_text(auth_text)
                auth_input.chmod(0o600)
            if selected_home is not None:
                filtered = Path(temporary) / "credentials"
                filtered.mkdir(mode=0o700)
                selected_command = "hermes chat --provider " + provider
                _copy_runtime_credentials(filtered, (selected_command,), source_home=selected_home)
                auth = json.loads((filtered / "auth.json").read_text()) if (filtered / "auth.json").is_file() else {}
                dotenv = (filtered / ".env").read_text() if (filtered / ".env").is_file() else ""
                if not auth.get("providers") and not auth.get("credential_pool") and not dotenv.strip():
                    raise ValueError("Selected provider credentials unavailable")
                credential_source = filtered
            private_env = Path(temporary) / "runtime.env"
            with private_env.open("x") as handle:
                private_env.chmod(0o600)
                handle.write(credentials + "HERMES_DASHBOARD_BASIC_AUTH_USERNAME=eval\n"
                             + "HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=" + secrets.token_urlsafe(32) + "\n")
            call("run", "-d", "--init", "--entrypoint", "/bin/sh",
                 "--health-cmd", "PYTHONPATH=/opt/ned /opt/ned/python/bin/python /opt/ned/eval_runner/container_entry.py runtime-health",
                 "--health-interval", "2s", "--health-timeout", "20s", "--health-retries", "3", "--name", identity, "--label", f"{LABEL}={identity}",
                 "--env-file", str(private_env), "--shm-size=512m",
                 "-v", volumes[0] + ":/opt/data", "-v", volumes[1] + ":/var/lib/ned",
                 "-v", volumes[2] + ":/projects", image_id, "-c",
                 "chown hermes:hermes /opt/data /var/lib/ned /projects && chmod 700 /opt/data /var/lib/ned /projects && exec sleep infinity")
            if credential_source:
                call("cp", str(credential_source), identity + ":/opt/ned-eval-credentials")
                call("exec", identity, "chown", "-R", "hermes:hermes", "/opt/ned-eval-credentials")
        health_deadline = min(deadline, clock() + 180)
        while True:
            health = call("inspect", identity, "--format", "{{.State.Health.Status}}").stdout.strip()
            if health == "healthy":
                break
            if health == "unhealthy" or clock() >= health_deadline:
                raise RuntimeError("Evaluation runtime toolchain did not become ready")
            pause(1)
        call("exec", identity, "mkdir", "-p", "/opt/ned-eval")
        call("exec", identity, "mkdir", "-p", "/opt/ned/workflows")
        for source, target in packages:
            call("exec", identity, "rm", "-rf", target)
            call("cp", str(source), identity + ":" + target)
            call("exec", identity, "chmod", "-R", "a+rX", target)
        call("cp", str(ROOT / "eval_runner/container_entry.py"), identity + ":/opt/ned-eval/entry.py")
        call("exec", identity, "chmod", "0644", "/opt/ned-eval/entry.py")
        entry = ["exec", "--user", "hermes", "-e", "PYTHONPATH=/opt/ned", identity,
                 "/opt/ned/python/bin/python", "/opt/ned-eval/entry.py"]
        call(*entry, "prepare", "--provider", provider, "--model", model,
             *(["--base-url", base_url] if base_url else []),
             *(["--credential-source", "/opt/ned-eval-credentials"] if credential_home or auth_text is not None else []))
        if credential_home or auth_text is not None:
            call("exec", identity, "rm", "-rf", "/opt/ned-eval-credentials")
        evaluated = call("exec", "--user", "hermes", "-w", "/opt/ned",
                         "-e", "HERMES_EVAL_CREDENTIAL_HOME=/projects/eval-credentials",
                         "-e", "HERMES_HOME=/opt/data", identity,
                         "/opt/ned/python/bin/python", "-m", "eval_runner.cli",
                         container_package + "/" + spec.path.name,
                         "--output-root", "/projects/eval-results", "--report", "/projects/eval-results/report",
                         "--hermes-command", "hermes chat -t terminal,skills",
                         "--judge-command", "hermes chat -t skills", "--markdown", check=False)
        call(*entry, "export")
        for name in ("result.json", "report.html", "report.md"):
            call("cp", identity + ":/projects/eval-export/" + name, str(directory / name))
            (directory / name).chmod(0o600)
        result = json.loads((directory / "result.json").read_text())
        if evaluated.returncode == 0 and result.get("passed") is True and result.get("infrastructure_failure") is False:
            receipt.update(status="passed", exit_code=0)
        else:
            receipt.update(status="infrastructure_failed" if result.get("infrastructure_failure") else "failed",
                           exit_code=3 if result.get("infrastructure_failure") else 2)
    except (KeyboardInterrupt, InterruptedError):
        receipt.update(status="interrupted", exit_code=130)
    except Exception as error:
        receipt["failure"] = type(error).__name__
    finally:
        try:
            cleanup()
            receipt["cleanup_verified"] = True
        except BaseException as error:
            receipt.update(cleanup_failure=type(error).__name__, exit_code=3, status="infrastructure_failed")
        filename = directory / "receipt.json"
        with filename.open("x") as handle:
            filename.chmod(0o600)
            json.dump(receipt, handle, indent=2)
    return receipt["exit_code"], directory


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Real Hermes workflow evaluation in a disposable NED container")
    parser.add_argument("eval_path", type=Path)
    credentials = parser.add_mutually_exclusive_group()
    credentials.add_argument("--env-file", type=Path)
    credentials.add_argument("--credential-home", type=Path)
    credentials.add_argument("--credential-file", type=Path, help="Private provider dotenv or auth JSON file; defaults to NED_EVAL_CREDENTIAL_FILE")
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--context")
    parser.add_argument("--image")
    parser.add_argument("--provider")
    parser.add_argument("--model")
    parser.add_argument("--base-url")
    parser.add_argument("--timeout", type=int, default=3600)
    args = parser.parse_args(argv)
    if not any((args.env_file, args.credential_home, args.credential_file)):
        if os.environ.get("NED_EVAL_CREDENTIAL_FILE"):
            args.credential_file = Path(os.environ["NED_EVAL_CREDENTIAL_FILE"])
        else:
            parser.error("Provide --credential-file or NED_EVAL_CREDENTIAL_FILE (legacy --env-file/--credential-home also supported)")
    if args.timeout < 1 or args.timeout > 7200:
        parser.error("timeout must be between 1 and 7200 seconds")
    def interrupt(_signum, _frame):
        raise InterruptedError("Evaluation interrupted")
    original = {name: signal.signal(name, interrupt) for name in (signal.SIGTERM, signal.SIGINT)}
    try:
        options = vars(args)
        code, directory = run_container(**options)
        print(json.dumps({"exit_code": code, "report_directory": str(directory)}))
        return code
    except Exception as error:
        print(f"Container eval prerequisite failed ({type(error).__name__}); no pass claimed")
        return 3
    finally:
        for name, handler in original.items():
            signal.signal(name, handler)


if __name__ == "__main__":
    raise SystemExit(main())
