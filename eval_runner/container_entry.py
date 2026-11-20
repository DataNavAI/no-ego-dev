from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import shlex

import yaml

from eval_runner.core import EvalResult, _provider_env_names, render_reports


def prepare(provider: str, model: str, base_url: str | None, credential_source: str | None) -> None:
    directory = Path("/projects/eval-credentials")
    directory.mkdir(mode=0o700)
    selected = {name: os.environ[name] for name in _provider_env_names(provider)
                if os.environ.get(name)}
    if not selected and not credential_source:
        raise ValueError("Selected provider credential unavailable")
    configuration = {"default": model, "provider": provider}
    if base_url:
        configuration["base_url"] = base_url
    files = {"config.yaml": yaml.safe_dump({"model": configuration})}
    if selected:
        files[".env"] = "\n".join(f"{key}={json.dumps(value)}" for key, value in selected.items()) + "\n"
    for name, text in files.items():
        filename = directory / name
        with filename.open("x") as handle:
            filename.chmod(0o600)
            handle.write(text)
    if credential_source:
        for name in (".env", "auth.json"):
            source = Path(credential_source) / name
            if source.is_file():
                shutil.copyfile(source, directory / name)
                (directory / name).chmod(0o600)


def redact_selected_credentials(data, directory: Path):
    values = set()

    def collect(value):
        if isinstance(value, dict):
            for child in value.values():
                collect(child)
        elif isinstance(value, list):
            for child in value:
                collect(child)
        elif isinstance(value, str) and len(value) >= 8:
            values.add(value)

    auth = directory / "auth.json"
    for filename in (auth, directory / ".env"):
        if filename.is_symlink() or filename.exists() and filename.stat().st_size > 1048576:
            raise ValueError("Credential redaction requires bounded regular source files")
    if auth.is_file():
        collect(json.loads(auth.read_text()))
    dotenv = directory / ".env"
    if dotenv.is_file():
        for line in dotenv.read_text().splitlines():
            _name, separator, value = line.partition("=")
            if separator and value:
                values.add(value)
                parsed = shlex.split(value, comments=True)
                if len(parsed) == 1:
                    values.add(parsed[0])

    def scrub(value):
        if isinstance(value, str):
            for secret in sorted(values, key=len, reverse=True):
                value = value.replace(secret, "[REDACTED]")
            return value
        if isinstance(value, dict):
            return {scrub(key): scrub(child) for key, child in value.items()}
        if isinstance(value, list):
            return [scrub(child) for child in value]
        return value

    return scrub(data)


def export() -> None:
    results = list(Path("/projects/eval-results").glob("*/result.json"))
    if len(results) != 1 or results[0].is_symlink() or results[0].stat().st_size > 8 * 1024 * 1024:
        raise ValueError("Expected one bounded evaluator result")
    data = redact_selected_credentials(json.loads(results[0].read_text()), Path("/projects/eval-credentials"))
    data = redact_selected_credentials(data, results[0].parent / "profile")
    result = EvalResult(**data)
    directory = Path("/projects/eval-export")
    directory.mkdir(mode=0o700)
    filename = directory / "result.json"
    with filename.open("x") as handle:
        filename.chmod(0o600)
        json.dump(result.to_dict(), handle, indent=2)
    render_reports([result], directory / "report", markdown=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("prepare", "export"))
    parser.add_argument("--provider")
    parser.add_argument("--model")
    parser.add_argument("--base-url")
    parser.add_argument("--credential-source")
    args = parser.parse_args()
    try:
        if args.action == "prepare":
            if not args.provider or not args.model:
                raise ValueError("Provider and model required")
            prepare(args.provider, args.model, args.base_url, args.credential_source)
        else:
            export()
        return 0
    except Exception as error:
        print(f"Container evaluation preparation/export failed ({type(error).__name__})")
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
