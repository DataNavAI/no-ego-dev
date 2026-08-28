from __future__ import annotations

import dataclasses
import html
import json
import os
import re
import shlex
import shutil
import signal
import string
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlsplit

try:
    import yaml
except Exception:  # pragma: no cover
    yaml = None


@dataclasses.dataclass
class EvalSpec:
    path: Path
    prompt: str
    expectations: list[str]
    setup_commands: list[str]
    teardown_commands: list[str]
    parameters: dict[str, Any]
    fixture_path: Path | None
    fixture_text: str | None


@dataclasses.dataclass
class EvalResult:
    eval_path: str
    prompt: str
    expectations: list[str]
    passed: bool
    failure_reasons: list[str]
    elapsed_seconds: float
    token_counts: dict[str, int]
    output: str
    result_path: str
    run_dir: str
    infrastructure_failure: bool = False

    def to_dict(self) -> dict[str, Any]:
        data = dataclasses.asdict(self)
        data["prompt"] = _redact_credentials(data["prompt"])
        data["expectations"] = [_redact_credentials(value) for value in data["expectations"]]
        data["failure_reasons"] = [_redact_credentials(value) for value in data["failure_reasons"]]
        data["output"] = _redact_credentials(data["output"])
        for field in ("eval_path", "result_path", "run_dir"):
            data[field] = _redact_credentials(data[field])
        return data


def _write_private_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            if hasattr(os, "fchmod"):
                os.fchmod(handle.fileno(), 0o600)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
        path.chmod(0o600)
    finally:
        temporary_path.unlink(missing_ok=True)


def discover_eval_files(paths: Iterable[str | Path]) -> list[Path]:
    found: list[Path] = []
    for raw in paths:
        path = Path(raw).expanduser().resolve()
        if path.is_file() and path.match("EVAL*.yaml"):
            found.append(path)
        elif path.is_dir():
            found.extend(sorted(path.rglob("EVAL*.yaml")))
    return sorted(dict.fromkeys(found))


def _ensure_yaml() -> None:
    if yaml is None:
        raise RuntimeError("PyYAML is required to load EVAL.yaml files")


def _eval_package_dir(eval_path: Path) -> Path:
    for candidate in (eval_path.parent, *eval_path.parent.parents):
        if (candidate / "SKILL.md").is_file() or (candidate / "distribution.yaml").is_file():
            return candidate.resolve()
    return eval_path.parent.resolve()


def _load_fixture(eval_path: Path, parameters: dict[str, Any]) -> tuple[Path | None, str | None]:
    if "fixture" not in parameters:
        return None, None
    raw = parameters["fixture"]
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError(f"{eval_path} parameters.fixture must be a non-empty relative path")
    relative_path = Path(raw)
    if relative_path.is_absolute():
        raise ValueError(f"{eval_path} parameters.fixture must stay within the eval package")
    if ".." in relative_path.parts:
        raise ValueError(
            f"{eval_path} parameters.fixture must stay within the eval package "
            "and must not contain traversal components"
        )
    package_dir = _eval_package_dir(eval_path)
    fixture_path = (package_dir / relative_path).resolve()
    try:
        fixture_path.relative_to(package_dir)
    except ValueError as exc:
        raise ValueError(f"{eval_path} parameters.fixture must stay within the eval package") from exc
    if not fixture_path.is_file():
        raise ValueError(f"{eval_path} parameters.fixture must reference an existing file")
    fixture_text = fixture_path.read_text(encoding="utf-8")
    if not fixture_text.strip():
        raise ValueError(f"{eval_path} parameters.fixture must reference a non-empty file")
    return fixture_path, fixture_text


def load_eval(path: str | Path) -> EvalSpec:
    _ensure_yaml()
    eval_path = Path(path).expanduser().resolve()
    data = yaml.safe_load(eval_path.read_text()) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{eval_path} must contain a YAML mapping")
    prompt = data.get("prompt")
    expectations = data.get("expectations")
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError(f"{eval_path} requires non-empty string field: prompt")
    if not isinstance(expectations, list) or not all(isinstance(x, str) and x.strip() for x in expectations):
        raise ValueError(f"{eval_path} requires expectations: string[]")
    setup = data.get("setupCommands", data.get("setup_commands", [])) or []
    teardown = data.get("teardownCommands", data.get("teardown_commands", [])) or []
    parameters = data.get("parameters", {}) or {}
    if not isinstance(setup, list) or not all(
        isinstance(x, str) and x.strip() for x in setup
    ):
        raise ValueError("setupCommands must be a non-empty string array")
    if not isinstance(teardown, list) or not all(
        isinstance(x, str) and x.strip() for x in teardown
    ):
        raise ValueError("teardownCommands must be a non-empty string array")
    if not isinstance(parameters, dict):
        raise ValueError("parameters must be a map")
    fixture_path, fixture_text = _load_fixture(eval_path, parameters)
    return EvalSpec(
        eval_path,
        prompt.strip(),
        [x.strip() for x in expectations],
        [x.strip() for x in setup],
        [x.strip() for x in teardown],
        parameters,
        fixture_path,
        fixture_text,
    )


def _run_shell_commands(
    commands: list[str],
    cwd: Path,
    env: dict[str, str],
    *,
    cleanup_descendants: bool = False,
) -> list[str]:
    outputs: list[str] = []
    for command in commands:
        proc = _run_oneshot_command(
            command,
            cwd=cwd,
            env=env,
            timeout=600,
            cleanup_descendants=cleanup_descendants,
        )
        outputs.append(proc.stdout + proc.stderr)
        if proc.returncode != 0:
            raise RuntimeError(f"Command failed with exit code {proc.returncode}")
    return outputs


def _terminate_posix_process_group(process_group_id: int, grace_seconds: float = 0.2) -> None:
    try:
        os.killpg(process_group_id, signal.SIGTERM)
    except ProcessLookupError:
        return
    except PermissionError:
        # Fail closed: still attempt the stronger signal below. This also
        # avoids surfacing raw platform errors from timeout cleanup.
        pass
    else:
        deadline = time.monotonic() + grace_seconds
        while time.monotonic() < deadline:
            try:
                os.killpg(process_group_id, 0)
            except ProcessLookupError:
                return
            except PermissionError:
                break
            time.sleep(0.01)
    try:
        os.killpg(process_group_id, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass


def _create_windows_kill_job(proc: subprocess.Popen[str]) -> int | None:
    if os.name != "nt":
        return None
    import ctypes
    from ctypes import wintypes

    class IO_COUNTERS(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_ulonglong),
            ("WriteOperationCount", ctypes.c_ulonglong),
            ("OtherOperationCount", ctypes.c_ulonglong),
            ("ReadTransferCount", ctypes.c_ulonglong),
            ("WriteTransferCount", ctypes.c_ulonglong),
            ("OtherTransferCount", ctypes.c_ulonglong),
        ]

    class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_longlong),
            ("PerJobUserTimeLimit", ctypes.c_longlong),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
            ("IoInfo", IO_COUNTERS),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE
    kernel32.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel32.SetInformationJobObject.restype = wintypes.BOOL
    kernel32.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel32.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL
    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        return None
    info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
    info.BasicLimitInformation.LimitFlags = 0x00002000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    configured = kernel32.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info))
    assigned = configured and kernel32.AssignProcessToJobObject(job, wintypes.HANDLE(proc._handle))
    if not assigned:
        kernel32.CloseHandle(job)
        return None
    return int(job)


def _resume_windows_process(proc: subprocess.Popen[str]) -> None:
    import ctypes
    from ctypes import wintypes

    ntdll = ctypes.WinDLL("ntdll", use_last_error=True)
    ntdll.NtResumeProcess.argtypes = [wintypes.HANDLE]
    ntdll.NtResumeProcess.restype = ctypes.c_long
    status = ntdll.NtResumeProcess(wintypes.HANDLE(proc._handle))
    if status != 0:
        raise RuntimeError("unable to resume isolated Windows process")


def _close_windows_kill_job(job: int) -> None:
    import ctypes
    from ctypes import wintypes

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL
    kernel32.CloseHandle(wintypes.HANDLE(job))


def _bounded_kill_and_wait(proc: subprocess.Popen[str]) -> None:
    if proc.poll() is None:
        try:
            proc.kill()
        except OSError:
            pass
    try:
        proc.wait(timeout=1.0)
    except subprocess.TimeoutExpired:
        pass


def _prepare_windows_isolated_process(proc: subprocess.Popen[str]) -> int:
    job = None
    try:
        job = _create_windows_kill_job(proc)
        if job is None:
            raise RuntimeError("unable to create isolated Windows process job")
        _resume_windows_process(proc)
        return job
    except Exception:
        if job is not None:
            try:
                _close_windows_kill_job(job)
            except OSError:
                pass
        _bounded_kill_and_wait(proc)
        raise


def _terminate_windows_process_tree(process_id: int) -> None:
    subprocess.run(
        ["taskkill", "/PID", str(process_id), "/T", "/F"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )


def _run_oneshot_command(
    command: str | list[str],
    *,
    cwd: Path,
    env: dict[str, str],
    timeout: int,
    cleanup_descendants: bool = True,
) -> subprocess.CompletedProcess[str]:
    """Capture a one-shot command without hanging on inherited pipe handles."""
    with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as stdout_file, tempfile.TemporaryFile(
        mode="w+", encoding="utf-8"
    ) as stderr_file:
        windows_isolated = cleanup_descendants and os.name == "nt"
        windows_flags = 0
        if os.name == "nt":
            windows_flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            if windows_isolated:
                windows_flags |= getattr(subprocess, "CREATE_SUSPENDED", 0x00000004)
        proc = subprocess.Popen(
            command,
            cwd=cwd,
            env=env,
            shell=isinstance(command, str),
            text=True,
            stdout=stdout_file,
            stderr=stderr_file,
            start_new_session=os.name == "posix",
            creationflags=windows_flags,
        )
        windows_job = None
        if windows_isolated:
            windows_job = _prepare_windows_isolated_process(proc)
        try:
            returncode = proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            if os.name == "posix":
                _terminate_posix_process_group(proc.pid)
            else:
                if windows_job is None:
                    _terminate_windows_process_tree(proc.pid)
                if proc.poll() is None:
                    proc.kill()
            try:
                proc.wait(timeout=1.0)
            except subprocess.TimeoutExpired:
                # Cleanup may be denied by the OS. Preserve the fixed timeout
                # classification instead of hanging indefinitely.
                pass
            raise RuntimeError(f"One-shot command timed out after {timeout} seconds") from None
        finally:
            if cleanup_descendants and os.name == "posix" and proc.poll() is not None:
                _terminate_posix_process_group(proc.pid)
            elif cleanup_descendants and os.name == "nt":
                if windows_job is not None:
                    _close_windows_kill_job(windows_job)
                else:
                    _terminate_windows_process_tree(proc.pid)
        stdout_file.seek(0)
        stderr_file.seek(0)
        return subprocess.CompletedProcess(
            args=command,
            returncode=returncode,
            stdout=stdout_file.read(),
            stderr=stderr_file.read(),
        )


def _copy_distribution(run_profile: Path) -> None:
    root = Path(__file__).resolve().parents[1]
    for name in ["SOUL.md", "AGENTS.md", "config.yaml", "skills", "evaldata"]:
        src = root / name
        if not src.exists():
            continue
        dst = run_profile / name
        if src.is_dir():
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)


def _runtime_credential_home() -> Path:
    raw_home = os.environ.get("HERMES_EVAL_CREDENTIAL_HOME") or os.environ.get("HERMES_HOME")
    return Path(raw_home).expanduser() if raw_home else Path.home() / ".hermes"


def _runtime_provider_names(source_home: Path, commands: tuple[str, ...] = ()) -> set[str]:
    configured_provider: str | None = None
    active_provider: str | None = None
    config_path = source_home / "config.yaml"
    if yaml is not None and config_path.is_file():
        config = yaml.safe_load(config_path.read_text()) or {}
        if isinstance(config, dict) and isinstance(config.get("model"), dict):
            provider = config["model"].get("provider")
            if isinstance(provider, str) and provider.strip():
                configured_provider = provider.strip()
    auth_path = source_home / "auth.json"
    if auth_path.is_file():
        auth = json.loads(auth_path.read_text())
        if isinstance(auth, dict):
            active = auth.get("active_provider")
            if isinstance(active, str) and active.strip():
                active_provider = active.strip()

    default_provider = configured_provider or active_provider
    providers: set[str] = set()
    effective_commands = commands or ("",)
    for command in effective_commands:
        explicit: str | None = None
        arguments = _split_windows_command_line(command) if os.name == "nt" else shlex.split(command)
        index = 0
        while index < len(arguments):
            argument = arguments[index]
            if argument == "--":
                break
            if argument.startswith("--provider="):
                provider = argument.partition("=")[2].strip()
                if provider:
                    explicit = provider
            elif argument == "--provider" and index + 1 < len(arguments):
                provider = arguments[index + 1].strip()
                if provider:
                    explicit = provider
                index += 1
            index += 1
        if explicit:
            providers.add(explicit)
        elif default_provider:
            providers.add(default_provider)
    return providers


# Checked-in fallback mirrors hermes_cli.providers.ALIASES so standalone eval
# runs have the same accepted provider spellings as Hermes itself.
_PROVIDER_ALIASES = {
    "alibaba-cloud": "alibaba",
    "alibaba-coding": "alibaba-coding-plan",
    "alibaba_coding": "alibaba-coding-plan",
    "alibaba_coding_plan": "alibaba-coding-plan",
    "aliyun": "alibaba",
    "amazon": "bedrock",
    "amazon-bedrock": "bedrock",
    "arcee-ai": "arcee",
    "arceeai": "arcee",
    "aws": "bedrock",
    "aws-bedrock": "bedrock",
    "build-nvidia": "nvidia",
    "claude": "anthropic",
    "claude-code": "anthropic",
    "copilot": "github-copilot",
    "dashscope": "alibaba",
    "deep-seek": "deepseek",
    "github": "github-copilot",
    "github-copilot-acp": "copilot-acp",
    "glm": "zai",
    "gmi-cloud": "gmi",
    "gmicloud": "gmi",
    "go": "opencode-go",
    "grok": "xai",
    "grok-oauth": "xai-oauth",
    "hf": "huggingface",
    "hugging-face": "huggingface",
    "huggingface-hub": "huggingface",
    "kilo-code": "kilo",
    "kilo-gateway": "kilo",
    "kilocode": "kilo",
    "kimi": "kimi-for-coding",
    "kimi-coding": "kimi-for-coding",
    "kimi-coding-cn": "kimi-for-coding",
    "llama-cpp": "local",
    "llama.cpp": "local",
    "llamacpp": "local",
    "lm-studio": "lmstudio",
    "lm_studio": "lmstudio",
    "lmstudio": "lmstudio",
    "mimo": "xiaomi",
    "minimax-china": "minimax-cn",
    "minimax_cn": "minimax-cn",
    "moonshot": "kimi-for-coding",
    "nemotron": "nvidia",
    "nim": "nvidia",
    "novita-ai": "novita",
    "novitaai": "novita",
    "nvidia-nim": "nvidia",
    "ollama": "custom",
    "openai": "openrouter",
    "opencode-go-sub": "opencode-go",
    "opencode-zen": "opencode",
    "qwen": "alibaba",
    "step": "stepfun",
    "stepfun-coding-plan": "stepfun",
    "tencent": "tencent-tokenhub",
    "tencent-cloud": "tencent-tokenhub",
    "tencentmaas": "tencent-tokenhub",
    "tokenhub": "tencent-tokenhub",
    "vllm": "local",
    "x-ai": "xai",
    "x-ai-oauth": "xai-oauth",
    "x.ai": "xai",
    "xai-grok-oauth": "xai-oauth",
    "xai-oauth": "xai-oauth",
    "xiaomi-mimo": "xiaomi",
    "z-ai": "zai",
    "z.ai": "zai",
    "zen": "opencode",
    "zhipu": "zai",
}

try:  # Prefer the running Hermes version when the runner is installed with it.
    from hermes_cli.auth import PROVIDER_REGISTRY as _LIVE_HERMES_PROVIDER_REGISTRY
    from hermes_cli.providers import ALIASES as _LIVE_HERMES_PROVIDER_ALIASES
except (ImportError, ModuleNotFoundError):  # Standalone profile-distribution tests.
    _LIVE_HERMES_PROVIDER_ALIASES = {}
    _LIVE_HERMES_PROVIDER_REGISTRY = {}
else:
    _PROVIDER_ALIASES.update(_LIVE_HERMES_PROVIDER_ALIASES)

# Hermes's transport registry uses a few models.dev canonical IDs while its auth
# registry uses these IDs. Credential filtering must join the two registries.
_CREDENTIAL_PROVIDER_CANONICAL = {
    "github-copilot": "copilot",
    "kilo": "kilocode",
    "kimi-for-coding": "kimi-coding",
    "opencode": "opencode-zen",
}
# Region-specific auth must stay distinct even though the transport aliases it.
_PROVIDER_ALIASES["kimi-coding-cn"] = "kimi-coding-cn"
# The auth registry calls Google AI Studio `gemini`; the CLI also accepts google.
_PROVIDER_ALIASES["gemini"] = "google"

_PROVIDER_ENV_NAMES = {
    # Snapshot of Hermes's provider credential registry. OAuth/external-process
    # providers intentionally have empty sets: their auth.json entries are copied,
    # but unrelated API keys are not.
    "alibaba": frozenset({"DASHSCOPE_API_KEY"}),
    "alibaba-coding-plan": frozenset(
        {"ALIBABA_CODING_PLAN_API_KEY", "DASHSCOPE_API_KEY"}
    ),
    "anthropic": frozenset(
        {"ANTHROPIC_API_KEY", "ANTHROPIC_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN"}
    ),
    "arcee": frozenset({"ARCEEAI_API_KEY"}),
    "azure-foundry": frozenset({"AZURE_FOUNDRY_API_KEY"}),
    "bedrock": frozenset(
        {
            "AWS_ACCESS_KEY_ID",
            "AWS_SECRET_ACCESS_KEY",
            "AWS_SESSION_TOKEN",
            "AWS_PRIVATE_KEY",
            "AWS_PASSPHRASE",
        }
    ),
    "cerebras": frozenset({"CEREBRAS_API_KEY"}),
    "copilot": frozenset({"COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"}),
    "copilot-acp": frozenset(),
    "custom": frozenset(),
    "deepseek": frozenset({"DEEPSEEK_API_KEY"}),
    "fireworks": frozenset({"FIREWORKS_API_KEY"}),
    "gmi": frozenset({"GMI_API_KEY"}),
    "google": frozenset({"GEMINI_API_KEY", "GOOGLE_API_KEY"}),
    "groq": frozenset({"GROQ_API_KEY"}),
    "huggingface": frozenset({"HF_TOKEN"}),
    "kilocode": frozenset({"KILOCODE_API_KEY"}),
    "local": frozenset(),
    "kimi-coding": frozenset({"KIMI_API_KEY", "KIMI_CODING_API_KEY"}),
    "kimi-coding-cn": frozenset({"KIMI_CN_API_KEY"}),
    "lmstudio": frozenset({"LM_API_KEY"}),
    "minimax": frozenset({"MINIMAX_API_KEY"}),
    "minimax-cn": frozenset({"MINIMAX_CN_API_KEY"}),
    "minimax-oauth": frozenset(),
    "mistral": frozenset({"MISTRAL_API_KEY"}),
    "nous": frozenset(),
    "novita": frozenset({"NOVITA_API_KEY"}),
    "nvidia": frozenset({"NVIDIA_API_KEY"}),
    "ollama-cloud": frozenset({"OLLAMA_API_KEY"}),
    "openai-api": frozenset({"OPENAI_API_KEY"}),
    "openai-codex": frozenset(),
    "opencode-go": frozenset({"OPENCODE_GO_API_KEY"}),
    "opencode-zen": frozenset({"OPENCODE_ZEN_API_KEY"}),
    "openrouter": frozenset({"OPENROUTER_API_KEY"}),
    "qwen-oauth": frozenset(),
    "stepfun": frozenset({"STEPFUN_API_KEY"}),
    "tencent-tokenhub": frozenset({"TOKENHUB_API_KEY"}),
    "together": frozenset({"TOGETHER_API_KEY"}),
    "xai": frozenset({"XAI_API_KEY"}),
    "xai-oauth": frozenset(),
    "xiaomi": frozenset({"XIAOMI_API_KEY"}),
    "zai": frozenset({"GLM_API_KEY", "ZAI_API_KEY", "Z_AI_API_KEY"}),
}


def _canonical_provider_name(provider: str) -> str:
    normalized = provider.strip().lower()
    transport_canonical = _PROVIDER_ALIASES.get(normalized, normalized)
    return _CREDENTIAL_PROVIDER_CANONICAL.get(transport_canonical, transport_canonical)


def _provider_has_credential_policy(provider: str) -> bool:
    canonical = _canonical_provider_name(provider)
    registry_name = "gemini" if canonical == "google" else canonical
    return (
        registry_name in _LIVE_HERMES_PROVIDER_REGISTRY
        or canonical in _PROVIDER_ENV_NAMES
    )


def _provider_env_names(provider: str) -> frozenset[str]:
    canonical = _canonical_provider_name(provider)
    registry_name = "gemini" if canonical == "google" else canonical
    live_config = _LIVE_HERMES_PROVIDER_REGISTRY.get(registry_name)
    if live_config is not None:
        live_names = frozenset(str(name) for name in live_config.api_key_env_vars)
        if getattr(live_config, "auth_type", "") == "aws_sdk":
            return _PROVIDER_ENV_NAMES["bedrock"]
        return live_names
    known = _PROVIDER_ENV_NAMES.get(canonical)
    if known is not None:
        return known
    # Unknown providers are fail-closed. Never infer a credential name from an
    # unreviewed slug: a coincidentally named environment variable may be unrelated.
    return frozenset()


def _copy_runtime_credentials(run_profile: Path, commands: tuple[str, ...] = ()) -> None:
    """Copy only credentials for each command's exact effective provider."""
    source_home = _runtime_credential_home()
    providers = _runtime_provider_names(source_home, commands)
    canonical_providers = {
        _canonical_provider_name(provider)
        for provider in providers
        if _provider_has_credential_policy(provider)
    }

    def provider_selected(provider: object) -> bool:
        return isinstance(provider, str) and _canonical_provider_name(provider) in canonical_providers

    auth_source = source_home / "auth.json"
    if auth_source.is_file():
        source_auth = json.loads(auth_source.read_text())
        filtered_auth: dict[str, Any] = {}
        if isinstance(source_auth, dict):
            for key in ("version", "updated_at"):
                if key in source_auth:
                    filtered_auth[key] = source_auth[key]
            active = source_auth.get("active_provider")
            if provider_selected(active):
                filtered_auth["active_provider"] = active
            provider_data = source_auth.get("providers")
            if isinstance(provider_data, dict):
                filtered_auth["providers"] = {
                    key: value for key, value in provider_data.items() if provider_selected(key)
                }
            credential_pool = source_auth.get("credential_pool")
            if isinstance(credential_pool, dict):
                filtered_auth["credential_pool"] = {
                    key: value for key, value in credential_pool.items() if provider_selected(key)
                }
        _write_private_text(run_profile / "auth.json", json.dumps(filtered_auth, indent=2))

    dotenv_source = source_home / ".env"
    if dotenv_source.is_file():
        selected_env_names = {
            env_name for provider in providers for env_name in _provider_env_names(provider)
        }
        retained: list[str] = []
        for line in dotenv_source.read_text().splitlines():
            match = re.match(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
            if not match:
                continue
            if match.group(1).upper() in selected_env_names:
                retained.append(line)
        _write_private_text(run_profile / ".env", "\n".join(retained) + ("\n" if retained else ""))


def _overlay_runtime_model_selection(run_profile: Path) -> None:
    """Use the authenticated runtime model without importing its full config."""
    raw_home = os.environ.get("HERMES_EVAL_CREDENTIAL_HOME") or os.environ.get("HERMES_HOME")
    source_home = Path(raw_home).expanduser() if raw_home else Path.home() / ".hermes"
    source_config = source_home / "config.yaml"
    target_config = run_profile / "config.yaml"
    if yaml is None or not source_config.is_file() or not target_config.is_file():
        return

    source_data = yaml.safe_load(source_config.read_text()) or {}
    target_data = yaml.safe_load(target_config.read_text()) or {}
    source_model = source_data.get("model")
    if not isinstance(source_model, dict) or not isinstance(target_data, dict):
        return

    model: dict[str, str] = {}
    for key in ("default", "provider", "base_url"):
        value = source_model.get(key)
        if isinstance(value, str) and value.strip():
            model[key] = value.strip()
    if "default" not in model or "provider" not in model:
        return
    if "base_url" in model:
        parsed = urlsplit(model["base_url"])
        # Opaque path segments are preserved for providers that route by path;
        # userinfo, query strings, and fragments are rejected because those are
        # the URL components that can unambiguously carry credentials.
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            model.pop("base_url")

    target_data["model"] = model
    _write_private_text(target_config, yaml.safe_dump(target_data, sort_keys=False))


def _extract_json_object(text: str) -> dict[str, Any]:
    def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"Judge result contains duplicate key: {key}")
            result[key] = value
        return result

    stripped = text.strip()
    try:
        data = json.loads(stripped, object_pairs_hook=reject_duplicate_keys)
    except json.JSONDecodeError as exc:
        raise ValueError("Judge must return only one JSON object with no surrounding text") from exc
    if not isinstance(data, dict):
        raise ValueError("Judge JSON must be an object")
    return data


def _fixture_text(spec: EvalSpec) -> str | None:
    return spec.fixture_text


def _prompt_with_fixture(spec: EvalSpec) -> str:
    parts = [spec.prompt]
    if spec.parameters:
        parts.extend(
            [
                "Eval parameters:",
                json.dumps(spec.parameters, indent=2, sort_keys=True),
            ]
        )
    fixture = _fixture_text(spec)
    if fixture is not None:
        parts.extend(
            [
                "Eval fixture:",
                "--- BEGIN EVAL FIXTURE ---",
                fixture,
                "--- END EVAL FIXTURE ---",
            ]
        )
    return "\n\n".join(parts)


def _credential_key_name(value: str) -> bool:
    normalized = value.lower().lstrip("-")
    return "authorization" in normalized or any(
        marker in normalized
        for marker in (
            "api_key",
            "api-key",
            "access_key",
            "access-key",
            "private_key",
            "private-key",
            "token",
            "secret",
            "password",
            "passwd",
            "passphrase",
            "credential",
            "cookie",
            "session_id",
            "session-id",
        )
    )


def _redact_json_tree(
    value: Any,
    *,
    encoded_depth: int = 0,
    structural_depth: int = 0,
    node_budget: list[int] | None = None,
) -> Any:
    if node_budget is None:
        node_budget = [10_000]
    if structural_depth >= 100 or node_budget[0] <= 0:
        return "[REDACTED OVER-LIMIT JSON]"
    node_budget[0] -= 1
    if isinstance(value, dict):
        redacted_dict: dict[Any, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            sanitized_key = _redact_unstructured_credentials(key_text)
            credential_field = _credential_key_name(key_text)
            sensitive_key = sanitized_key != key_text
            output_key: Any = "[REDACTED KEY]" if sensitive_key else key
            if output_key in redacted_dict:
                base = str(output_key)
                suffix = 2
                while f"{base} {suffix}" in redacted_dict:
                    suffix += 1
                output_key = f"{base} {suffix}"
            redacted_dict[output_key] = (
                "[REDACTED]"
                if credential_field or sensitive_key
                else _redact_json_tree(
                    item,
                    encoded_depth=encoded_depth,
                    structural_depth=structural_depth + 1,
                    node_budget=node_budget,
                )
            )
        return redacted_dict
    if isinstance(value, list):
        return [
            _redact_json_tree(
                item,
                encoded_depth=encoded_depth,
                structural_depth=structural_depth + 1,
                node_budget=node_budget,
            )
            for item in value
        ]
    if isinstance(value, str):
        try:
            nested = json.loads(value)
        except (json.JSONDecodeError, RecursionError, TypeError):
            return _redact_unstructured_credentials(value)
        if isinstance(nested, (dict, list)):
            if encoded_depth >= 5:
                return "[REDACTED ENCODED JSON]"
            return json.dumps(
                _redact_json_tree(
                    nested,
                    encoded_depth=encoded_depth + 1,
                    structural_depth=structural_depth + 1,
                    node_budget=node_budget,
                )
            )
        if isinstance(nested, str):
            if encoded_depth >= 5:
                return "[REDACTED ENCODED JSON]"
            redacted_nested = _redact_json_tree(
                nested,
                encoded_depth=encoded_depth + 1,
                structural_depth=structural_depth + 1,
                node_budget=node_budget,
            )
            if redacted_nested != nested:
                return json.dumps(redacted_nested)
    return value


def _redact_json_lines(text: str) -> str:
    # Preserve complete valid JSON documents as JSON. Physical-line parsing is
    # only a fallback for logs/JSONL; applying header regexes to pretty-printed
    # objects can otherwise consume commas and closing delimiters.
    try:
        parsed_document = json.loads(text)
    except RecursionError:
        ending = "\n" if text.endswith(("\n", "\r")) else ""
        return json.dumps("[REDACTED OVER-LIMIT JSON]") + ending
    except (json.JSONDecodeError, TypeError):
        pass
    else:
        indent = 2 if "\n" in text.rstrip("\r\n") else None
        ending = "\n" if text.endswith(("\n", "\r")) else ""
        return json.dumps(_redact_json_tree(parsed_document), indent=indent) + ending

    redacted_lines: list[str] = []
    for line in text.splitlines(keepends=True):
        body = line.rstrip("\r\n")
        ending = line[len(body) :]
        stripped = body.strip()
        if not stripped:
            redacted_lines.append(line)
            continue
        try:
            parsed = json.loads(stripped)
        except RecursionError:
            prefix = body[: len(body) - len(body.lstrip())]
            redacted_lines.append(prefix + json.dumps("[REDACTED OVER-LIMIT JSON]") + ending)
            continue
        except (json.JSONDecodeError, TypeError):
            # This is not a complete JSONL stream. Redact the original text as
            # one logical diagnostic so multiline PEM/header material remains intact.
            return _redact_unstructured_credentials(text)
        prefix = body[: len(body) - len(body.lstrip())]
        redacted_lines.append(prefix + json.dumps(_redact_json_tree(parsed)) + ending)
    return "".join(redacted_lines)


def _redact_unstructured_credentials(text: str) -> str:
    credential_key = (
        r"[A-Za-z0-9_-]*(?:api[_-]?key|access[_-]?key|private[_-]?key|token|secret|password|passwd|"
        r"passphrase|credential|authorization|cookie|session[_-]?id)[A-Za-z0-9_-]*"
    )
    redacted = text
    redacted = re.sub(
        r"(?is)-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----.*?-----END (?:[A-Z0-9]+ )?PRIVATE KEY-----",
        "[REDACTED PRIVATE KEY]",
        redacted,
    )
    redacted = re.sub(
        r"(?is)-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----.*\Z",
        "[REDACTED TRUNCATED PRIVATE KEY]",
        redacted,
    )

    # Authorization is a complete logical header. Redact every scheme and all
    # comma-delimited parameters rather than attempting to parse individual tokens.
    redacted = re.sub(
        r'''(?ix)(["']?[A-Za-z0-9_-]*authorization[A-Za-z0-9_-]*["']?\s*[:=])'''
        r'''(?![ \t]*["']?\[REDACTED\]["']?)[^\r\n]+''',
        lambda match: f"{match.group(1)} [REDACTED]",
        redacted,
    )

    def redact_double_quoted(match: re.Match[str]) -> str:
        return f'{match.group(1)}"[REDACTED]"'

    def redact_single_quoted(match: re.Match[str]) -> str:
        return f"{match.group(1)}'[REDACTED]'"

    def redact_unquoted(match: re.Match[str]) -> str:
        return f"{match.group(1)}[REDACTED]"

    # Logs can contain JSON that has itself been escaped one or more times.
    # Once an escaped credential key is found, fail closed by redacting the
    # remainder of that logical line rather than attempting another fragile decode.
    redacted = re.sub(
        rf'''(?ix)((?:\\+["']){credential_key}(?:\\+["'])\s*[:=])'''
        r'''(?![ \t]*(?:\\+["'])\[REDACTED\](?:\\+["']))[^\r\n]+''',
        redact_unquoted,
        redacted,
    )

    for prefix in (
        rf'''(?ix)(["']?{credential_key}["']?\s*[:=])'''
        r'''(?![ \t]*["']?\[REDACTED\]["']?)[ \t]*''',
        rf'''(?ix)(?<![\w-])((?:--)?{credential_key}\s+)''',
    ):
        redacted = re.sub(prefix + r'''"(?:\\.|[^"\\])*"''', redact_double_quoted, redacted)
        redacted = re.sub(prefix + r'''(?:'(?:\\.|[^'\\])*')''', redact_single_quoted, redacted)
        redacted = re.sub(prefix + r'''(?!["'])[^\r\n,;}}]+''', redact_unquoted, redacted)

    redacted = re.sub(
        r"(?i)(\bbearer\s+)[^\s,;]+",
        r"\1[REDACTED]",
        redacted,
    )
    return re.sub(
        r"(?i)(\b[a-z][a-z0-9+.-]*://)(?:[^/@\s]+)@",
        r"\1[REDACTED]@",
        redacted,
    )


def _redact_credentials(text: str) -> str:
    return _redact_json_lines(text)


def _safe_error_excerpt(output: str) -> str:
    for line in output.splitlines():
        if any(marker in line.lower() for marker in ("http ", "error", "failed", "rate", "quota", "usage_limit", "unauthorized")):
            return _redact_credentials(line.strip())[:500]
    return ""


def _split_windows_command_line(command: str) -> list[str]:
    if os.name != "nt":
        return [part.strip('"') for part in shlex.split(command, posix=False)]
    import ctypes
    from ctypes import wintypes

    count = ctypes.c_int()
    shell32 = ctypes.WinDLL("shell32", use_last_error=True)
    shell32.CommandLineToArgvW.argtypes = [wintypes.LPCWSTR, ctypes.POINTER(ctypes.c_int)]
    shell32.CommandLineToArgvW.restype = ctypes.POINTER(wintypes.LPWSTR)
    argv = shell32.CommandLineToArgvW(command, ctypes.byref(count))
    if not argv:
        raise ValueError("invalid Windows command line")
    try:
        return [argv[index] for index in range(count.value)]
    finally:
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.LocalFree.argtypes = [wintypes.HLOCAL]
        kernel32.LocalFree.restype = wintypes.HLOCAL
        kernel32.LocalFree(argv)


def _build_oneshot_command(
    base_command: str,
    prompt: str,
    *,
    windows: bool | None = None,
) -> list[str]:
    use_windows_parsing = os.name == "nt" if windows is None else windows
    base_args = _split_windows_command_line(base_command) if use_windows_parsing else shlex.split(base_command)
    if not base_args:
        raise ValueError("oneshot command must not be empty")
    return [*base_args, "-z", prompt]


def _judge_with_hermes(
    output: str,
    spec: EvalSpec,
    judge_command: str,
    env: dict[str, str],
) -> tuple[bool, list[str], str, bool]:
    judge_prompt = f"""You are judging a NoEgoDev EVAL.yaml run.

Eval prompt:
{_prompt_with_fixture(spec)}

Expectations, interpreted as semantic criteria rather than literal substrings:
{json.dumps(spec.expectations, indent=2)}

Candidate output:
{output}

Return only JSON with this exact schema:
{{"passed": boolean, "failure_reasons": string[]}}
"""
    command = _build_oneshot_command(judge_command, judge_prompt)
    proc = _run_oneshot_command(
        command,
        cwd=Path(env["HERMES_HOME"]).parent,
        env=env,
        timeout=1800,
    )
    judge_output = proc.stdout + proc.stderr
    if proc.returncode != 0:
        reason = f"Hermes judge command failed with exit code {proc.returncode}"
        excerpt = _safe_error_excerpt(judge_output)
        if excerpt:
            reason += f": {excerpt}"
        return False, [reason], judge_output, True
    try:
        data = _extract_json_object(judge_output)
        expected_keys = {"passed", "failure_reasons"}
        if set(data) != expected_keys:
            raise ValueError("Judge result must contain exactly passed and failure_reasons")
        passed = data.get("passed")
        if not isinstance(passed, bool):
            raise ValueError("Judge result field passed must be a boolean")
        raw_reasons = data.get("failure_reasons")
        if (
            not isinstance(raw_reasons, list)
            or not all(isinstance(reason, str) and reason.strip() for reason in raw_reasons)
        ):
            raise ValueError("Judge result field failure_reasons must be a non-empty string array")
        raw_reasons = [reason.strip() for reason in raw_reasons]
        if passed and raw_reasons:
            raise ValueError("Judge result cannot pass with non-empty failure_reasons")
        if not passed and not raw_reasons:
            raise ValueError("Judge result must explain a failed verdict")
    except (ValueError, json.JSONDecodeError) as exc:
        return False, [str(exc)], judge_output, True
    return passed, raw_reasons, judge_output, False


def _isolated_runtime_env(run_profile: Path) -> dict[str, str]:
    allowed = {
        "COMSPEC",
        "LANG",
        "LC_ALL",
        "LC_CTYPE",
        "PATH",
        "PATHEXT",
        "PYTHONIOENCODING",
        "PYTHONUTF8",
        "SSL_CERT_DIR",
        "SSL_CERT_FILE",
        "SYSTEMROOT",
        "TEMP",
        "TMP",
        "TMPDIR",
        "TZ",
        "WINDIR",
    }
    env = {key: value for key, value in os.environ.items() if key in allowed}
    env["HERMES_HOME"] = str(run_profile)
    env["HOME"] = str(run_profile)
    return env


def run_eval(
    eval_path: str | Path,
    output_root: str | Path = ".eval-runs",
    hermes_command: str = "hermes -t skills",
    judge_command: str | None = None,
) -> EvalResult:
    if not hermes_command or not hermes_command.strip():
        raise ValueError("hermes_command is required; evals must run through a real Hermes-compatible oneshot command")
    judge_command = judge_command or hermes_command
    if not judge_command.strip():
        raise ValueError("judge_command must be a real Hermes-compatible oneshot command")
    started = time.monotonic()
    spec: EvalSpec | None = None
    run_dir: Path | None = None
    try:
        spec = load_eval(eval_path)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        output_root_path = Path(output_root).expanduser().resolve()
        output_root_path.mkdir(parents=True, mode=0o700, exist_ok=True)
        for _ in range(10):
            attempt_id = uuid.uuid4().hex
            candidate = output_root_path / f"{spec.path.parent.name}-{stamp}-{attempt_id}"
            try:
                candidate.mkdir(mode=0o700, exist_ok=False)
            except FileExistsError:
                continue
            run_dir = candidate
            break
        else:
            raise RuntimeError("unable to allocate a unique eval run directory")
        run_profile = run_dir / "profile"
        run_dir.chmod(0o700)
        run_profile.mkdir(parents=True, mode=0o700)
        run_profile.chmod(0o700)
        _copy_distribution(run_profile)
        _copy_runtime_credentials(run_profile, (hermes_command, judge_command))
        _overlay_runtime_model_selection(run_profile)
    except Exception as exc:
        result_path = str(run_dir / "result.json") if run_dir is not None else ""
        result = EvalResult(
            eval_path=str(spec.path) if spec is not None else str(Path(eval_path).expanduser()),
            prompt=spec.prompt if spec is not None else "",
            expectations=spec.expectations if spec is not None else [],
            passed=False,
            failure_reasons=[f"eval preflight failed ({type(exc).__name__})"],
            elapsed_seconds=time.monotonic() - started,
            token_counts={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            output="",
            result_path=result_path,
            run_dir=str(run_dir) if run_dir is not None else "",
            infrastructure_failure=True,
        )
        if result_path:
            try:
                _write_private_text(Path(result_path), json.dumps(result.to_dict(), indent=2))
            except OSError:
                pass
        return result
    env = _isolated_runtime_env(run_profile)
    output_parts: list[str] = []
    failure_reasons: list[str] = []
    infrastructure_failure = False
    token_counts = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    try:
        output_parts.extend(_run_shell_commands(spec.setup_commands, spec.path.parent, env))
        agent_cwd = run_dir
        raw_working_directory = spec.parameters.get("working_directory")
        if raw_working_directory is not None:
            if not isinstance(raw_working_directory, str) or not raw_working_directory.strip():
                raise ValueError("parameters.working_directory must be a non-empty path string")
            expanded_working_directory = string.Template(raw_working_directory).safe_substitute(env)
            if expanded_working_directory == "~":
                configured_cwd = Path(env["HOME"])
            elif expanded_working_directory.startswith("~/"):
                configured_cwd = Path(env["HOME"]) / expanded_working_directory[2:]
            elif expanded_working_directory.startswith("~"):
                raise ValueError("parameters.working_directory must not reference another user's home")
            else:
                configured_cwd = Path(expanded_working_directory)
            if not configured_cwd.is_absolute():
                configured_cwd = spec.path.parent / configured_cwd
            agent_cwd = configured_cwd.resolve()
            if not agent_cwd.is_dir():
                raise ValueError(f"parameters.working_directory is not an existing directory: {agent_cwd}")
        agent_prompt = _prompt_with_fixture(spec)
        prompt_file = run_dir / "prompt.txt"
        _write_private_text(prompt_file, agent_prompt)
        # Hermes one-shot mode uses the active HERMES_HOME as the isolated profile.
        # The historical shorthand is `hermes -z PROMPT`.
        command = _build_oneshot_command(hermes_command, agent_prompt)
        proc = _run_oneshot_command(command, cwd=agent_cwd, env=env, timeout=1800)
        output_parts.append(proc.stdout + proc.stderr)
        if proc.returncode != 0:
            reason = f"Hermes command failed with exit code {proc.returncode}"
            excerpt = _safe_error_excerpt(proc.stdout + proc.stderr)
            if excerpt:
                reason += f": {excerpt}"
            failure_reasons.append(reason)
            passed = False
            infrastructure_failure = True
        else:
            passed, expectation_failures, judge_output, judge_infrastructure_failure = _judge_with_hermes(
                _redact_credentials("\n".join(output_parts)), spec, judge_command, env
            )
            output_parts.append("\n--- JUDGE OUTPUT ---\n" + judge_output)
            failure_reasons.extend(expectation_failures)
            infrastructure_failure = judge_infrastructure_failure
    except Exception as exc:
        passed = False
        infrastructure_failure = True
        failure_reasons.append(f"eval execution failed ({type(exc).__name__})")
    finally:
        try:
            output_parts.extend(
                _run_shell_commands(spec.teardown_commands, spec.path.parent, env, cleanup_descendants=True)
            )
        except Exception as exc:
            passed = False
            infrastructure_failure = True
            failure_reasons.append(f"teardown failed ({type(exc).__name__})")
    elapsed = time.monotonic() - started
    failure_reasons = [_redact_credentials(reason)[:500] for reason in failure_reasons]
    result = EvalResult(
        eval_path=str(spec.path),
        prompt=spec.prompt,
        expectations=spec.expectations,
        passed=passed,
        failure_reasons=failure_reasons,
        elapsed_seconds=elapsed,
        token_counts=token_counts,
        output=_redact_credentials("\n".join(output_parts)),
        result_path=str(run_dir / "result.json"),
        run_dir=str(run_dir),
        infrastructure_failure=infrastructure_failure,
    )
    try:
        _write_private_text(Path(result.result_path), json.dumps(result.to_dict(), indent=2))
    except OSError as exc:
        result.passed = False
        result.infrastructure_failure = True
        result.failure_reasons.append(f"result persistence failed ({type(exc).__name__})")
        result.result_path = ""
    return result


def render_reports(results: list[EvalResult], output_prefix: str | Path, markdown: bool = False) -> tuple[Path, Path | None]:
    prefix = Path(output_prefix).expanduser().resolve()
    prefix.parent.mkdir(parents=True, exist_ok=True)
    html_path = prefix.with_suffix(".html")
    rows = []
    for r in results:
        status = "ERROR" if r.infrastructure_failure else ("PASS" if r.passed else "FAIL")
        safe_reasons = [_redact_credentials(reason) for reason in r.failure_reasons]
        safe_prompt = _redact_credentials(r.prompt)
        safe_eval_path = _redact_credentials(r.eval_path)
        safe_result_path = _redact_credentials(r.result_path)
        rows.append(
            "<tr>"
            f"<td>{html.escape(Path(safe_eval_path).parent.name)}</td>"
            f"<td>{status}</td>"
            f"<td>{r.elapsed_seconds:.2f}s</td>"
            f"<td><pre>{html.escape(safe_prompt)}</pre></td>"
            f"<td><pre>{html.escape(chr(10).join(safe_reasons))}</pre></td>"
            f"<td>{html.escape(safe_result_path)}</td>"
            "</tr>"
        )
    _write_private_text(html_path, """<!doctype html><meta charset='utf-8'><title>NED Eval Results</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:.5rem;vertical-align:top}pre{white-space:pre-wrap}</style>
<h1>NoEgoDev Eval Results</h1><table><thead><tr><th>Eval</th><th>Status</th><th>Elapsed</th><th>Prompt</th><th>Failure reasons</th><th>Result JSON</th></tr></thead><tbody>""" + "\n".join(rows) + "</tbody></table>")
    md_path = None
    if markdown:
        md_path = prefix.with_suffix(".md")
        lines = ["# NoEgoDev Eval Results", ""]
        for r in results:
            status = "ERROR" if r.infrastructure_failure else ("PASS" if r.passed else "FAIL")
            safe_reasons = [_redact_credentials(reason) for reason in r.failure_reasons]
            safe_prompt = _redact_credentials(r.prompt)
            safe_eval_path = _redact_credentials(r.eval_path)
            safe_result_path = _redact_credentials(r.result_path)
            lines.extend([
                f"## {Path(safe_eval_path).parent.name}: {status}",
                f"- Eval: `{safe_eval_path}`",
                f"- Elapsed: {r.elapsed_seconds:.2f}s",
                f"- Result JSON: `{safe_result_path}`",
                "- Prompt:", f"  {safe_prompt}",
                "- Failure reasons:", *(f"  - {reason}" for reason in (safe_reasons or ["None"])), "",
            ])
        _write_private_text(md_path, "\n".join(lines))
    return html_path, md_path
