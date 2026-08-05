from __future__ import annotations

import dataclasses
import html
import json
import os
import shlex
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Iterable

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

    def to_dict(self) -> dict[str, Any]:
        return dataclasses.asdict(self)


def discover_eval_files(paths: Iterable[str | Path]) -> list[Path]:
    found: list[Path] = []
    for raw in paths:
        path = Path(raw).expanduser().resolve()
        if path.is_file() and path.name == "EVAL.yaml":
            found.append(path)
        elif path.is_dir():
            found.extend(sorted(path.rglob("EVAL.yaml")))
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
    if not isinstance(setup, list) or not all(isinstance(x, str) for x in setup):
        raise ValueError("setupCommands must be a string array")
    if not isinstance(teardown, list) or not all(isinstance(x, str) for x in teardown):
        raise ValueError("teardownCommands must be a string array")
    if not isinstance(parameters, dict):
        raise ValueError("parameters must be a map")
    fixture_path, fixture_text = _load_fixture(eval_path, parameters)
    return EvalSpec(
        eval_path,
        prompt.strip(),
        [x.strip() for x in expectations],
        setup,
        teardown,
        parameters,
        fixture_path,
        fixture_text,
    )


def _run_shell_commands(commands: list[str], cwd: Path, env: dict[str, str]) -> list[str]:
    outputs: list[str] = []
    for command in commands:
        proc = subprocess.run(command, cwd=cwd, env=env, shell=True, text=True, capture_output=True, timeout=600)
        outputs.append(f"$ {command}\n{proc.stdout}{proc.stderr}")
        if proc.returncode != 0:
            raise RuntimeError(f"Command failed ({proc.returncode}): {command}\n{proc.stderr}")
    return outputs


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


def _copy_runtime_credentials(run_profile: Path) -> None:
    """Copy local Hermes runtime credentials into the isolated eval profile.

    Eval runs must exercise a real Hermes profile, which means provider auth must
    be available in the temporary HERMES_HOME. These files are copied only into
    the per-run directory under .eval-runs/ and must never be committed.
    """
    raw_home = os.environ.get("HERMES_EVAL_CREDENTIAL_HOME") or os.environ.get("HERMES_HOME")
    source_home = Path(raw_home).expanduser() if raw_home else Path.home() / ".hermes"
    for name in ["auth.json", ".env"]:
        src = source_home / name
        if src.exists() and src.is_file():
            shutil.copy2(src, run_profile / name)


def _extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[4:].strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"Judge did not return a JSON object: {text[:500]}")
    data = json.loads(stripped[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("Judge JSON must be an object")
    return data


def _fixture_text(spec: EvalSpec) -> str | None:
    return spec.fixture_text


def _prompt_with_fixture(spec: EvalSpec) -> str:
    fixture = _fixture_text(spec)
    if fixture is None:
        return spec.prompt
    return (
        f"{spec.prompt}\n\n"
        "Eval fixture:\n"
        "--- BEGIN EVAL FIXTURE ---\n"
        f"{fixture}\n"
        "--- END EVAL FIXTURE ---"
    )


def _judge_with_hermes(output: str, spec: EvalSpec, hermes_command: str, env: dict[str, str]) -> tuple[bool, list[str], str]:
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
    command = f"{hermes_command} -z {shlex.quote(judge_prompt)}"
    proc = subprocess.run(command, cwd=Path(env["HERMES_HOME"]).parent, shell=True, text=True, capture_output=True, timeout=1800, env=env)
    judge_output = proc.stdout + proc.stderr
    if proc.returncode != 0:
        return False, [f"Hermes judge command failed with exit code {proc.returncode}"], judge_output
    data = _extract_json_object(judge_output)
    passed = bool(data.get("passed"))
    raw_reasons = data.get("failure_reasons", [])
    if not isinstance(raw_reasons, list):
        raw_reasons = [str(raw_reasons)]
    return passed, [str(reason) for reason in raw_reasons], judge_output


def run_eval(eval_path: str | Path, output_root: str | Path = ".eval-runs", hermes_command: str = "hermes") -> EvalResult:
    if not hermes_command or not hermes_command.strip():
        raise ValueError("hermes_command is required; evals must run through a real Hermes-compatible oneshot command")
    spec = load_eval(eval_path)
    started = time.monotonic()
    stamp = time.strftime("%Y%m%d-%H%M%S")
    run_dir = Path(output_root).expanduser().resolve() / f"{spec.path.parent.name}-{stamp}-{abs(hash(str(spec.path))) % 100000}"
    run_profile = run_dir / "profile"
    run_dir.mkdir(parents=True, exist_ok=True)
    run_profile.mkdir(parents=True, exist_ok=True)
    _copy_distribution(run_profile)
    _copy_runtime_credentials(run_profile)
    env = os.environ.copy()
    env["HERMES_HOME"] = str(run_profile)
    output_parts: list[str] = []
    failure_reasons: list[str] = []
    token_counts = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    try:
        output_parts.extend(_run_shell_commands(spec.setup_commands, spec.path.parent, env))
        agent_prompt = _prompt_with_fixture(spec)
        prompt_file = run_dir / "prompt.txt"
        prompt_file.write_text(agent_prompt)
        # Hermes one-shot mode uses the active HERMES_HOME as the isolated profile.
        # The historical shorthand is `hermes -z PROMPT`.
        command = f"{hermes_command} -z {shlex.quote(agent_prompt)}"
        proc = subprocess.run(command, cwd=run_dir, shell=True, text=True, capture_output=True, timeout=1800, env=env)
        output_parts.append(proc.stdout + proc.stderr)
        if proc.returncode != 0:
            failure_reasons.append(f"Hermes command failed with exit code {proc.returncode}")
            passed = False
        else:
            passed, expectation_failures, judge_output = _judge_with_hermes("\n".join(output_parts), spec, hermes_command, env)
            output_parts.append("\n--- JUDGE OUTPUT ---\n" + judge_output)
            failure_reasons.extend(expectation_failures)
    except Exception as exc:
        passed = False
        failure_reasons.append(str(exc))
    finally:
        try:
            output_parts.extend(_run_shell_commands(spec.teardown_commands, spec.path.parent, env))
        except Exception as exc:
            passed = False
            failure_reasons.append(f"teardown failed: {exc}")
    elapsed = time.monotonic() - started
    result = EvalResult(
        eval_path=str(spec.path),
        prompt=spec.prompt,
        expectations=spec.expectations,
        passed=passed,
        failure_reasons=failure_reasons,
        elapsed_seconds=elapsed,
        token_counts=token_counts,
        output="\n".join(output_parts),
        result_path=str(run_dir / "result.json"),
        run_dir=str(run_dir),
    )
    Path(result.result_path).write_text(json.dumps(result.to_dict(), indent=2))
    return result


def render_reports(results: list[EvalResult], output_prefix: str | Path, markdown: bool = False) -> tuple[Path, Path | None]:
    prefix = Path(output_prefix).expanduser().resolve()
    prefix.parent.mkdir(parents=True, exist_ok=True)
    html_path = prefix.with_suffix(".html")
    rows = []
    for r in results:
        rows.append(
            "<tr>"
            f"<td>{html.escape(Path(r.eval_path).parent.name)}</td>"
            f"<td>{'PASS' if r.passed else 'FAIL'}</td>"
            f"<td>{r.elapsed_seconds:.2f}s</td>"
            f"<td><pre>{html.escape(r.prompt)}</pre></td>"
            f"<td><pre>{html.escape(chr(10).join(r.failure_reasons))}</pre></td>"
            f"<td>{html.escape(r.result_path)}</td>"
            "</tr>"
        )
    html_path.write_text("""<!doctype html><meta charset='utf-8'><title>NED Eval Results</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:.5rem;vertical-align:top}pre{white-space:pre-wrap}</style>
<h1>NoEgoDev Eval Results</h1><table><thead><tr><th>Eval</th><th>Status</th><th>Elapsed</th><th>Prompt</th><th>Failure reasons</th><th>Result JSON</th></tr></thead><tbody>""" + "\n".join(rows) + "</tbody></table>")
    md_path = None
    if markdown:
        md_path = prefix.with_suffix(".md")
        lines = ["# NoEgoDev Eval Results", ""]
        for r in results:
            lines.extend([
                f"## {Path(r.eval_path).parent.name}: {'PASS' if r.passed else 'FAIL'}",
                f"- Eval: `{r.eval_path}`",
                f"- Elapsed: {r.elapsed_seconds:.2f}s",
                f"- Result JSON: `{r.result_path}`",
                "- Prompt:", f"  {r.prompt}",
                "- Failure reasons:", *(f"  - {reason}" for reason in (r.failure_reasons or ["None"])), "",
            ])
        md_path.write_text("\n".join(lines))
    return html_path, md_path
