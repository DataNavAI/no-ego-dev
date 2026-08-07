from pathlib import Path
from types import SimpleNamespace
import inspect
import json
import os
import shlex
import subprocess
import sys
import time

import pytest
import yaml

import eval_runner.core as eval_core
from eval_runner.cli import main as eval_runner_main
from eval_runner.core import (
    _build_oneshot_command,
    _redact_credentials,
    _run_oneshot_command,
    EvalResult,
    discover_eval_files,
    load_eval,
    render_reports,
    run_eval,
)


def _base_command_line(argv: list[str]) -> str:
    """Serialize a base command parsed into argv by _build_oneshot_command; never use for shell commands."""
    return subprocess.list2cmdline(argv) if os.name == "nt" else shlex.join(argv)


def _fake_hermes_command(tmp_path: Path, output: str = "done appears") -> str:
    script = tmp_path / "fake_hermes.py"
    script.write_text(
        "import json, os, sys\n"
        "assert os.environ.get('HERMES_HOME'), 'HERMES_HOME must point at the isolated eval profile'\n"
        "assert os.environ.get('HOME') == os.environ['HERMES_HOME'], 'HOME must be isolated with HERMES_HOME'\n"
        "prompt = sys.argv[-1] if sys.argv else ''\n"
        "if 'Return only JSON' in prompt:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
        "else:\n"
        f"    print({output!r})\n"
    )
    return f"{sys.executable} {script}"


def _rate_limited_judge_command(tmp_path: Path) -> str:
    script = tmp_path / "rate_limited_judge.py"
    script.write_text(
        "import sys\n"
        "print('HTTP 429: usage_limit_reached', file=sys.stderr)\n"
        "raise SystemExit(1)\n"
    )
    return f"{sys.executable} {script}"


def _invalid_schema_judge_command(tmp_path: Path) -> str:
    script = tmp_path / "invalid_schema_judge.py"
    script.write_text("print('{\"passed\": \"false\", \"failure_reasons\": []}')\n")
    return f"{sys.executable} {script}"


def _judge_output_command(tmp_path: Path, output: str, *, exit_code: int = 0) -> str:
    script = tmp_path / f"judge_output_{abs(hash((output, exit_code)))}.py"
    script.write_text(
        "import sys\n"
        f"print({output!r}, file=sys.stderr if {exit_code} else sys.stdout)\n"
        f"raise SystemExit({exit_code})\n"
    )
    return f"{sys.executable} {script}"


def _recording_hermes_command(tmp_path: Path) -> tuple[str, Path]:
    script = tmp_path / "recording_hermes.py"
    record_path = tmp_path / "hermes-prompts.json"
    script.write_text(
        "import json, sys\n"
        "from pathlib import Path\n"
        f"record_path = Path({str(record_path)!r})\n"
        "records = json.loads(record_path.read_text()) if record_path.exists() else []\n"
        "prompt = sys.argv[-1] if sys.argv else ''\n"
        "records.append(prompt)\n"
        "record_path.write_text(json.dumps(records))\n"
        "if 'Return only JSON' in prompt:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
        "else:\n"
        "    print('fixture inspected')\n"
    )
    return f"{sys.executable} {script}", record_path


def _judge_prompt_recording_command(tmp_path: Path) -> tuple[str, Path]:
    script = tmp_path / "judge_prompt_recording.py"
    record = tmp_path / "judge-prompt.txt"
    script.write_text(
        "import json, pathlib, sys\n"
        f"pathlib.Path({str(record)!r}).write_text(sys.argv[-1])\n"
        "print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
    )
    return f"{sys.executable} {script}", record


def _environment_recording_hermes_command(tmp_path: Path, variable: str) -> tuple[str, Path]:
    script = tmp_path / "environment_recording_hermes.py"
    record = tmp_path / "environment-record.json"
    script.write_text(
        "import json, os, pathlib, sys\n"
        f"record = pathlib.Path({str(record)!r})\n"
        "rows = json.loads(record.read_text()) if record.exists() else []\n"
        f"rows.append(os.environ.get({variable!r}))\n"
        "record.write_text(json.dumps(rows))\n"
        "if len(rows) == 1:\n"
        "    print('done appears')\n"
        "else:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
    )
    return f"{sys.executable} {script}", record


def _cwd_recording_hermes_command(tmp_path: Path) -> tuple[str, Path]:
    script = tmp_path / "cwd_recording_hermes.py"
    record_path = tmp_path / "cwd-prompts.json"
    script.write_text(
        "import json, os, sys\n"
        "from pathlib import Path\n"
        f"record_path = Path({str(record_path)!r})\n"
        "records = json.loads(record_path.read_text()) if record_path.exists() else []\n"
        "prompt = sys.argv[-1] if sys.argv else ''\n"
        "records.append({'cwd': os.getcwd(), 'prompt': prompt})\n"
        "record_path.write_text(json.dumps(records))\n"
        "if 'Return only JSON' in prompt:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
        "else:\n"
        "    print('done appears')\n"
    )
    return _base_command_line([sys.executable, str(script)]), record_path


def _lingering_child_hermes_command(tmp_path: Path) -> str:
    script = tmp_path / "lingering_child_hermes.py"
    script.write_text(
        "import json, subprocess, sys\n"
        "prompt = sys.argv[-1] if sys.argv else ''\n"
        "if 'Return only JSON' in prompt:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
        "else:\n"
        "    subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(5)'])\n"
        "    print('done appears')\n"
    )
    return f"{sys.executable} {script}"


def test_discovers_eval_yaml_files(tmp_path):
    (tmp_path / "a").mkdir()
    (tmp_path / "a" / "EVAL.yaml").write_text("prompt: hi\nexpectations: [done]\n")
    (tmp_path / "b").mkdir()
    (tmp_path / "b" / "EVAL.yml").write_text("prompt: bye\nexpectations: [done]\n")

    found = discover_eval_files([tmp_path])

    assert found == [tmp_path / "a" / "EVAL.yaml"]


def test_real_eval_default_restricts_hermes_to_skills_toolset():
    default = inspect.signature(run_eval).parameters["hermes_command"].default
    assert default == "hermes -t skills"


def test_windows_oneshot_command_uses_windows_argument_quoting():
    prompt = 'literal & | < > "quoted" %PATH%'

    command = _build_oneshot_command("hermes -t skills", prompt, windows=True)

    assert command == ["hermes", "-t", "skills", "-z", prompt]


def test_loads_every_tracked_repository_eval():
    repo_root = Path(__file__).resolve().parents[1]
    eval_files = discover_eval_files([repo_root])

    assert len(eval_files) >= 29
    for eval_path in eval_files:
        load_eval(eval_path)


def test_load_eval_validates_required_fields(tmp_path):
    path = tmp_path / "EVAL.yaml"
    path.write_text("prompt: Build it\nexpectations:\n  - result exists\nparameters:\n  repo: local\n")

    spec = load_eval(path)

    assert spec.prompt == "Build it"
    assert spec.expectations == ["result exists"]
    assert spec.parameters["repo"] == "local"


def test_load_eval_rejects_fixture_path_escape(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    (tmp_path / "outside.md").write_text("must not be read")
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect fixture\n"
        "expectations: [safe]\n"
        "parameters:\n"
        "  fixture: ../outside.md\n"
    )

    with pytest.raises(ValueError, match="fixture must stay within"):
        load_eval(eval_path)


def test_load_eval_rejects_lexical_fixture_traversal_inside_package(tmp_path):
    eval_dir = tmp_path / "skill"
    (eval_dir / "subdir").mkdir(parents=True)
    (eval_dir / "fixture.md").write_text("scenario")
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect fixture\n"
        "expectations: [safe]\n"
        "parameters:\n"
        "  fixture: subdir/../fixture.md\n"
    )

    with pytest.raises(ValueError, match="must not contain traversal"):
        load_eval(eval_path)


def test_load_eval_rejects_fixture_symlink_escape(tmp_path):
    eval_dir = tmp_path / "skill"
    fixture_dir = eval_dir / "evaldata"
    fixture_dir.mkdir(parents=True)
    outside_path = tmp_path / "outside.md"
    outside_path.write_text("must not be read")
    (fixture_dir / "scenario.md").symlink_to(outside_path)
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect fixture\n"
        "expectations: [safe]\n"
        "parameters:\n"
        "  fixture: evaldata/scenario.md\n"
    )

    with pytest.raises(ValueError, match="fixture must stay within"):
        load_eval(eval_path)


@pytest.mark.parametrize("fixture_yaml", ["123", "''", "null"])
def test_load_eval_rejects_non_string_or_empty_fixture_parameter(tmp_path, fixture_yaml):
    eval_path = tmp_path / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect fixture\n"
        "expectations: [safe]\n"
        "parameters:\n"
        f"  fixture: {fixture_yaml}\n"
    )

    with pytest.raises(ValueError, match="non-empty relative path"):
        load_eval(eval_path)


def test_load_eval_rejects_absolute_fixture_path(tmp_path):
    fixture_path = tmp_path / "scenario.md"
    fixture_path.write_text("scenario")
    eval_path = tmp_path / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect fixture\n"
        "expectations: [safe]\n"
        "parameters:\n"
        f"  fixture: {json.dumps(str(fixture_path))}\n"
    )

    with pytest.raises(ValueError, match="fixture must stay within"):
        load_eval(eval_path)


@pytest.mark.parametrize("create_empty", [False, True])
def test_load_eval_rejects_missing_or_empty_fixture_file(tmp_path, create_empty):
    fixture_dir = tmp_path / "evaldata"
    fixture_dir.mkdir()
    fixture_path = fixture_dir / "scenario.md"
    if create_empty:
        fixture_path.write_text("")
    eval_path = tmp_path / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect fixture\n"
        "expectations: [safe]\n"
        "parameters:\n"
        "  fixture: evaldata/scenario.md\n"
    )
    expected = "non-empty file" if create_empty else "existing file"

    with pytest.raises(ValueError, match=expected):
        load_eval(eval_path)


def test_run_eval_writes_result_json_using_hermes_oneshot_command(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations:\n  - done appears\nparameters:\n  mode: offline\n")

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=_fake_hermes_command(tmp_path))

    assert result.eval_path == str(eval_path)
    assert result.passed is True
    assert result.elapsed_seconds >= 0
    result_json = Path(result.result_path)
    assert result_json.exists()
    data = json.loads(result_json.read_text())
    assert data["failure_reasons"] == []


def test_run_eval_classifies_agent_provider_failure_as_infrastructure_error(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_rate_limited_judge_command(tmp_path),
    )

    assert result.passed is False
    assert result.infrastructure_failure is True
    assert "HTTP 429: usage_limit_reached" in result.failure_reasons[0]


def test_run_eval_classifies_judge_provider_failure_as_infrastructure_error(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
        judge_command=_rate_limited_judge_command(tmp_path),
    )

    assert result.passed is False
    assert result.infrastructure_failure is True
    assert "HTTP 429: usage_limit_reached" in result.output
    assert "HTTP 429: usage_limit_reached" in result.failure_reasons[0]


def test_run_eval_rejects_invalid_judge_result_schema_as_infrastructure_error(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
        judge_command=_invalid_schema_judge_command(tmp_path),
    )

    assert result.passed is False
    assert result.infrastructure_failure is True
    assert "passed must be a boolean" in result.failure_reasons[0]


@pytest.mark.parametrize(
    "judge_output",
    [
        'Result: {"passed": true, "failure_reasons": []}',
        '{"passed": true, "failure_reasons": []}\ntrailing prose',
        '{"passed": true, "failure_reasons": [], "extra": "not allowed"}',
        '{"passed": true}',
        '{"passed": true, "failure_reasons": ["contradictory"]}',
        '{"passed": false, "failure_reasons": []}',
        '{"passed": false, "failure_reasons": [""]}',
        '{"passed": false, "failure_reasons": ["   "]}',
        '{"passed": true, "passed": false, "failure_reasons": ["duplicate"]}',
    ],
)
def test_run_eval_requires_exact_judge_json_schema(tmp_path, judge_output):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
        judge_command=_judge_output_command(tmp_path, judge_output),
    )

    assert result.passed is False
    assert result.infrastructure_failure is True


def test_run_eval_redacts_semantic_judge_failure_reasons(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    secret = "semantic-secret-value"
    judge_output = json.dumps(
        {"passed": False, "failure_reasons": [f"Authorization: Bearer {secret}"]}
    )

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
        judge_command=_judge_output_command(tmp_path, judge_output),
    )
    html_path, md_path = render_reports([result], tmp_path / "semantic-report", markdown=True)

    assert result.passed is False
    assert result.infrastructure_failure is False
    assert secret not in json.dumps(result.to_dict())
    assert secret not in html_path.read_text()
    assert secret not in md_path.read_text()
    assert "[REDACTED]" in result.failure_reasons[0]


@pytest.mark.parametrize(
    "error_template",
    [
        "HTTP 401 ERROR Authorization: Bearer {secret}",
        "HTTP 401 ERROR Authorization: Basic {secret}",
        'HTTP 401 ERROR {{"Authorization": "Bearer {secret}"}}',
        'HTTP 401 ERROR {{"token": "{secret}"}}',
        "HTTP 401 ERROR api_key={secret}",
    ],
)
def test_run_eval_redacts_credentials_from_reported_provider_error(tmp_path, error_template):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    secret = "secret-token-value"

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
        judge_command=_judge_output_command(
            tmp_path,
            error_template.format(secret=secret),
            exit_code=1,
        ),
    )
    report = tmp_path / "report"
    html_path, md_path = render_reports([result], report, markdown=True)

    assert secret not in "\n".join(result.failure_reasons)
    assert secret not in result.output
    assert secret not in html_path.read_text()
    assert secret not in md_path.read_text()
    assert "[REDACTED]" in result.failure_reasons[0]


def test_run_eval_redacts_candidate_output_before_sending_it_to_the_judge(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    secret = "candidate-secret-value"
    judge_command, judge_prompt_path = _judge_prompt_recording_command(tmp_path)

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_judge_output_command(
            tmp_path,
            f"done appears {'Author' + 'ization'}: {'Bear' + 'er'} {secret}",
        ),
        judge_command=judge_command,
    )
    judge_prompt = judge_prompt_path.read_text()

    assert result.passed is True
    assert secret not in judge_prompt
    assert "[REDACTED]" in judge_prompt


def test_run_eval_redacts_backslash_escaped_json_across_all_boundaries(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    secret = "ESCAPED_JSON_END_TO_END_SENTINEL"
    escaped_json = rf'\"{{\\\"password\\\":\\\"{secret}\\\"}}\"'
    candidate_output = f"done appears {escaped_json}"
    judge_command, judge_prompt_path = _judge_prompt_recording_command(tmp_path)

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_judge_output_command(tmp_path, candidate_output),
        judge_command=judge_command,
    )
    html_path, md_path = render_reports([result], tmp_path / "escaped-report", markdown=True)

    assert result.passed is True
    surfaces = (
        judge_prompt_path.read_text(),
        result.output,
        json.dumps(result.to_dict()),
        Path(result.result_path).read_text(),
        html_path.read_text(),
        md_path.read_text(),
    )
    assert all(secret not in surface for surface in surfaces)
    assert all("[REDACTED]" in surface for surface in surfaces[:4])


def test_redaction_preserves_json_and_covers_common_credential_names():
    raw = json.dumps(
        {
            "Authorization": "Basic auth-value",
            "password": "password-value",
            "AWS_SECRET_ACCESS_KEY": "aws-value",
            "AWS_ACCESS_KEY_ID": "access-value",
            "session_id": "session-value",
            "client_credential": "credential-value",
            "safe": "keep-me",
        }
    )

    redacted = json.loads(_redact_credentials(raw))

    assert redacted["Authorization"] == "[REDACTED]"
    assert redacted["password"] == "[REDACTED]"
    assert redacted["AWS_SECRET_ACCESS_KEY"] == "[REDACTED]"
    assert redacted["AWS_ACCESS_KEY_ID"] == "[REDACTED]"
    assert redacted["session_id"] == "[REDACTED]"
    assert redacted["client_credential"] == "[REDACTED]"
    assert redacted["safe"] == "keep-me"


def test_redaction_covers_unquoted_multiword_and_cli_credentials():
    secrets = ["correct horse battery staple", "cli-secret-value", "credential words"]
    raw = (
        f"password: {secrets[0]}\n"
        f"tool --api-key {secrets[1]}\n"
        f"credential '{secrets[2]}'\n"
        "safe line"
    )

    redacted = _redact_credentials(raw)

    assert all(secret not in redacted for secret in secrets)
    assert redacted.count("[REDACTED]") == 3
    assert "safe line" in redacted


def test_redaction_handles_escaped_json_credentials_and_digest_authorization():
    escaped_secret = 'alpha"OMEGA_SENTINEL'
    structured = json.dumps({"password": escaped_secret, "safe": "keep"})
    embedded = f"provider error: {structured}"
    digest_secret = "DIGEST_SENTINEL"
    digest = (
        'Proxy-Authorization: Digest username="user", realm="private", '
        f'response="{digest_secret}"'
    )
    url_secret = "URL_PASSWORD_SENTINEL"
    credential_url = f"postgresql://db-user:{url_secret}@database.invalid/app"
    private_key_secret = "PRIVATE_KEY_SENTINEL"
    begin_private_key = "-----BEGIN " + "PRIVATE KEY-----"
    end_private_key = "-----END " + "PRIVATE KEY-----"
    private_key = f"{begin_private_key}\n{private_key_secret}\n{end_private_key}"

    structured_redacted = _redact_credentials(structured)
    embedded_redacted = _redact_credentials(embedded)
    digest_redacted = _redact_credentials(digest)
    url_redacted = _redact_credentials(credential_url)
    private_key_redacted = _redact_credentials(private_key)

    assert json.loads(structured_redacted) == {"password": "[REDACTED]", "safe": "keep"}
    assert "OMEGA_SENTINEL" not in embedded_redacted
    assert digest_secret not in digest_redacted
    assert digest_redacted == "Proxy-Authorization: [REDACTED]"
    assert url_secret not in url_redacted
    assert url_redacted == "postgresql://[REDACTED]@database.invalid/app"
    assert private_key_secret not in private_key_redacted
    assert private_key_redacted == "[REDACTED PRIVATE KEY]"


def test_redaction_preserves_multiline_json_with_authorization_fields():
    authorization_secret = "AUTHORIZATION_JSON_SENTINEL"
    proxy_secret = "PROXY_AUTHORIZATION_JSON_SENTINEL"
    document = json.dumps(
        {
            "Authorization": authorization_secret,
            "nested": {
                "Proxy-Authorization": proxy_secret,
                "safe": {"value": "keep"},
            },
        },
        indent=2,
    )

    redacted = _redact_credentials(document)
    parsed = json.loads(redacted)

    assert parsed == {
        "Authorization": "[REDACTED]",
        "nested": {
            "Proxy-Authorization": "[REDACTED]",
            "safe": {"value": "keep"},
        },
    }
    assert authorization_secret not in redacted
    assert proxy_secret not in redacted


def test_redaction_preserves_json_when_authorization_is_inside_string_values():
    auth_secret = "AUTH_MESSAGE_SENTINEL"
    proxy_secret = "PROXY_MESSAGE_SENTINEL"
    complete = json.dumps(
        {"message": f"Authorization: Bearer {auth_secret}", "safe": "keep"},
        indent=2,
    )
    jsonl = "\n".join(
        [
            json.dumps({"message": f"Authorization: Bearer {auth_secret}", "safe": 1}),
            json.dumps(
                {
                    "message": f'Proxy-Authorization: Digest response="{proxy_secret}"',
                    "safe": 2,
                }
            ),
        ]
    )
    nested = json.dumps(
        {
            "diagnostic": json.dumps(
                {
                    "message": f'Proxy-Authorization: Digest response="{proxy_secret}"',
                    "safe": "nested-keep",
                }
            ),
            "safe": "outer-keep",
        }
    )

    complete_redacted = _redact_credentials(complete)
    jsonl_redacted = _redact_credentials(jsonl)
    nested_redacted = _redact_credentials(nested)

    assert json.loads(complete_redacted)["safe"] == "keep"
    assert [json.loads(line)["safe"] for line in jsonl_redacted.splitlines()] == [1, 2]
    nested_outer = json.loads(nested_redacted)
    nested_inner = json.loads(nested_outer["diagnostic"])
    assert nested_outer["safe"] == "outer-keep"
    assert nested_inner["safe"] == "nested-keep"
    assert auth_secret not in complete_redacted + jsonl_redacted + nested_redacted
    assert proxy_secret not in complete_redacted + jsonl_redacted + nested_redacted


def test_redaction_removes_credentials_from_json_keys_at_every_encoding_layer():
    key_secret = "JSON_KEY_CREDENTIAL_SENTINEL"
    record = {
        f"Authorization: Bearer {key_secret}": "error",
        f"Proxy-Authorization: Digest response={key_secret}": "nested-error",
        "safe": "keep",
    }
    complete = json.dumps(record, indent=2)
    jsonl = "\n".join((json.dumps(record), json.dumps({"safe": 2})))
    nested = json.dumps({"encoded": json.dumps(record), "safe": "outer-keep"})

    complete_redacted = _redact_credentials(complete)
    jsonl_redacted = _redact_credentials(jsonl)
    nested_redacted = _redact_credentials(nested)

    complete_parsed = json.loads(complete_redacted)
    jsonl_parsed = [json.loads(line) for line in jsonl_redacted.splitlines()]
    nested_parsed = json.loads(nested_redacted)
    nested_inner = json.loads(nested_parsed["encoded"])
    assert complete_parsed["safe"] == "keep"
    assert len(complete_parsed) == 3
    assert jsonl_parsed[0]["safe"] == "keep"
    assert jsonl_parsed[1]["safe"] == 2
    assert nested_parsed["safe"] == "outer-keep"
    assert nested_inner["safe"] == "keep"
    assert key_secret not in complete_redacted + jsonl_redacted + nested_redacted


@pytest.mark.parametrize("key_kind", ["RSA ", "EC ", "DSA ", "OPENSSH ", "ENCRYPTED "])
def test_redaction_fails_closed_for_truncated_private_keys(key_kind):
    private_material = "TRUNCATED_PRIVATE_MATERIAL_SENTINEL"
    diagnostic = (
        "safe prefix\n"
        f"-----BEGIN {key_kind}PRIVATE KEY-----\n"
        f"{private_material}\n"
        "truncated diagnostic"
    )

    redacted = _redact_credentials(diagnostic)

    assert redacted == "safe prefix\n[REDACTED TRUNCATED PRIVATE KEY]"
    assert private_material not in redacted


def test_redaction_handles_backslash_escaped_json_credentials():
    secret = "ESCAPED_JSON_CROSS_BOUNDARY_SENTINEL"
    escaped_json = rf'\"{{\\\"password\\\":\\\"{secret}\\\"}}\"'

    redacted = _redact_credentials(escaped_json)

    assert secret not in redacted
    assert "[REDACTED]" in redacted


def test_redaction_preserves_nested_json_string_structure():
    secret = "NESTED_JSON_STRING_SENTINEL"
    encoded = json.dumps(json.dumps({"password": secret, "safe": "keep"}))

    redacted_outer = json.loads(_redact_credentials(encoded))
    redacted_inner = json.loads(redacted_outer)

    assert redacted_inner == {"password": "[REDACTED]", "safe": "keep"}


def test_redaction_preserves_three_consecutive_json_encoding_layers():
    secret = "TRIPLE_ENCODED_JSON_SENTINEL"
    encoded = {"password": secret, "safe": "keep"}
    for _ in range(3):
        encoded = json.dumps(encoded)

    redacted = _redact_credentials(encoded)
    decoded = redacted
    for _ in range(3):
        decoded = json.loads(decoded)

    assert decoded == {"password": "[REDACTED]", "safe": "keep"}


def test_redaction_bounds_deep_json_structure_without_leaking_or_raising():
    secret = "DEEP_JSON_SENTINEL"
    nested = {"password": secret}
    for _ in range(500):
        nested = {"child": nested}
    raw = json.dumps(nested)

    redacted = _redact_credentials(raw)

    assert secret not in redacted
    assert json.loads(redacted)


def test_redaction_handles_token_only_url_userinfo():
    secret = "TOKEN_ONLY_URL_SENTINEL"
    raw = f"provider endpoint: https://{secret}@example.invalid/v1"

    redacted = _redact_credentials(raw)

    assert secret not in redacted
    assert redacted == "provider endpoint: https://[REDACTED]@example.invalid/v1"


def test_final_boundaries_redact_credential_shaped_paths(tmp_path):
    secret = "PATH_SENTINEL"
    result = EvalResult(
        eval_path=f"/tmp/api_key={secret}/EVAL.yaml",
        prompt="safe",
        expectations=["safe"],
        passed=True,
        failure_reasons=[],
        elapsed_seconds=0.1,
        token_counts={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        output="safe",
        result_path=f"/tmp/password={secret}/result.json",
        run_dir=f"/tmp/token={secret}/run",
    )

    serialized = json.dumps(result.to_dict())
    html_path, md_path = render_reports([result], tmp_path / "path-report", markdown=True)

    assert secret not in serialized
    assert secret not in html_path.read_text()
    assert secret not in md_path.read_text()


def test_persisted_results_and_reports_redact_prompt_and_expectation_credentials(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    prompt_secret = "prompt-secret-value"
    expectation_secret = "expectation secret words"
    eval_path.write_text(
        f"prompt: 'Say done api_key={prompt_secret}'\n"
        f"expectations: ['password: {expectation_secret}']\n"
    )

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
    )
    html_path, md_path = render_reports([result], tmp_path / "credential-report", markdown=True)
    persisted = Path(result.result_path).read_text()
    serialized = json.dumps(result.to_dict())

    for secret in (prompt_secret, expectation_secret):
        assert secret not in persisted
        assert secret not in serialized
        assert secret not in html_path.read_text()
        assert secret not in md_path.read_text()


def test_run_eval_can_use_a_separate_judge_command(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    judge_command, _ = _recording_hermes_command(tmp_path)

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path, "candidate output"),
        judge_command=judge_command,
    )

    assert result.passed is True
    assert result.infrastructure_failure is False


def test_cli_uses_separate_judge_command_and_returns_three_for_infrastructure_failure(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    report = tmp_path / "report"

    exit_code = eval_runner_main(
        [
            str(eval_path),
            "--output-root",
            str(tmp_path / "runs"),
            "--report",
            str(report),
            "--hermes-command",
            _fake_hermes_command(tmp_path),
            "--judge-command",
            _rate_limited_judge_command(tmp_path),
            "--markdown",
        ]
    )

    assert exit_code == 3
    assert "ERROR" in report.with_suffix(".md").read_text()


def test_cli_returns_three_when_report_generation_fails(tmp_path, monkeypatch, capsys):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    def fail_report(*_args, **_kwargs):
        raise PermissionError("report path denied")

    monkeypatch.setattr("eval_runner.cli.render_reports", fail_report)

    exit_code = eval_runner_main(
        [
            str(eval_path),
            "--output-root",
            str(tmp_path / "runs"),
            "--hermes-command",
            _fake_hermes_command(tmp_path),
        ]
    )

    assert exit_code == 3
    assert "report generation failed" in capsys.readouterr().err


def test_cli_returns_three_without_echoing_unexpected_execution_error(tmp_path, monkeypatch, capsys):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    secret = "unexpected-secret-value"

    def fail_run(*_args, **_kwargs):
        raise RuntimeError(secret)

    monkeypatch.setattr("eval_runner.cli.run_eval", fail_run)

    exit_code = eval_runner_main([str(eval_path), "--output-root", str(tmp_path / "runs")])
    stderr = capsys.readouterr().err

    assert exit_code == 3
    assert "Eval execution failed (RuntimeError)" in stderr
    assert secret not in stderr


def test_cli_continues_after_an_unexpected_per_eval_failure(tmp_path, monkeypatch):
    root = tmp_path / "evals"
    first_dir = root / "a-first"
    second_dir = root / "b-second"
    first_dir.mkdir(parents=True)
    second_dir.mkdir(parents=True)
    first = first_dir / "EVAL.yaml"
    second = second_dir / "EVAL.yaml"
    content = "prompt: Say done\nexpectations: [done appears]\n"
    first.write_text(content)
    second.write_text(content)
    visited: list[Path] = []
    original_run = run_eval

    def fail_first(path, **kwargs):
        path = Path(path)
        visited.append(path)
        if path == first:
            raise RuntimeError("first failed")
        return original_run(path, **kwargs)

    monkeypatch.setattr("eval_runner.cli.run_eval", fail_first)

    exit_code = eval_runner_main(
        [
            str(root),
            "--output-root",
            str(tmp_path / "runs"),
            "--hermes-command",
            _fake_hermes_command(tmp_path),
        ]
    )

    assert exit_code == 3
    assert visited == [first, second]


def test_run_eval_classifies_preflight_copy_failure_as_infrastructure_error(tmp_path, monkeypatch):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    secret = "preflight-secret-value"

    def fail_copy(_run_profile):
        raise PermissionError(f"distribution copy denied Authorization: Bearer {secret}")

    monkeypatch.setattr("eval_runner.core._copy_distribution", fail_copy)

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=_fake_hermes_command(tmp_path))

    assert result.passed is False
    assert result.infrastructure_failure is True
    assert result.failure_reasons[0] == "eval preflight failed (PermissionError)"
    assert secret not in result.failure_reasons[0]


def test_run_eval_converts_result_persistence_failure_to_infrastructure_error(tmp_path, monkeypatch):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    original_write = eval_core._write_private_text

    def fail_result(path, content):
        if path.name == "result.json":
            raise PermissionError("result path denied")
        return original_write(path, content)

    monkeypatch.setattr(eval_core, "_write_private_text", fail_result)

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=_fake_hermes_command(tmp_path))

    assert result.passed is False
    assert result.infrastructure_failure is True
    assert result.result_path == ""
    assert result.failure_reasons[-1] == "result persistence failed (PermissionError)"


def test_run_eval_uses_declared_working_directory_and_includes_parameters_in_prompt(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Build it\n"
        "expectations: [done appears]\n"
        "setupCommands: ['mkdir -p workspace']\n"
        "parameters:\n"
        "  working_directory: workspace\n"
        "  repo: local\n"
    )
    command, record_path = _cwd_recording_hermes_command(tmp_path)

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=command)

    assert result.passed is True
    records = json.loads(record_path.read_text())
    assert records[0]["cwd"] == str(eval_dir / "workspace")
    assert '"repo": "local"' in records[0]["prompt"]
    assert Path(result.run_dir, "prompt.txt").read_text() == records[0]["prompt"]


def test_run_eval_expands_working_directory_against_isolated_home(tmp_path):
    test_root = tmp_path / "path with spaces & %UNSET_EVAL_VAR% shell-safe"
    test_root.mkdir()
    eval_dir = test_root / "skill"
    eval_dir.mkdir()
    setup_command = 'mkdir "%HOME%\\workspace"' if os.name == "nt" else 'mkdir -p "$HOME/workspace"'
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Build it\n"
        "expectations: [done appears]\n"
        f"setupCommands: [{json.dumps(setup_command)}]\n"
        "parameters:\n"
        "  working_directory: ~/workspace\n"
    )
    command, record_path = _cwd_recording_hermes_command(test_root)

    result = run_eval(eval_path, output_root=test_root / "runs", hermes_command=command)

    assert result.passed is True
    records = json.loads(record_path.read_text())
    assert records[0]["cwd"] == str(Path(result.run_dir) / "profile" / "workspace")


def test_run_eval_does_not_hang_on_descendant_holding_output_pipes(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    started = time.monotonic()
    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_lingering_child_hermes_command(tmp_path),
    )

    assert result.passed is True
    assert time.monotonic() - started < 2


def test_oneshot_escalates_when_descendant_ignores_sigterm(tmp_path):
    if os.name != "posix":
        pytest.skip("POSIX process-group behavior")
    ready = tmp_path / "ready"
    survived = tmp_path / "survived"
    script = tmp_path / "stubborn_descendant.py"
    child_code = (
        "import pathlib,signal,time;"
        "signal.signal(signal.SIGTERM, signal.SIG_IGN);"
        f"pathlib.Path({str(ready)!r}).write_text('ready');"
        "time.sleep(0.5);"
        f"pathlib.Path({str(survived)!r}).write_text('survived')"
    )
    script.write_text(
        "import pathlib,subprocess,sys,time\n"
        f"subprocess.Popen([sys.executable, '-c', {child_code!r}])\n"
        f"ready = pathlib.Path({str(ready)!r})\n"
        "while not ready.exists(): time.sleep(0.01)\n"
    )

    _run_oneshot_command(
        f"{sys.executable} {script}",
        cwd=tmp_path,
        env=os.environ.copy(),
        timeout=2,
    )
    time.sleep(0.7)

    assert survived.exists() is False


@pytest.mark.skipif(os.name != "posix", reason="POSIX process-group behavior")
def test_posix_group_cleanup_escalates_when_initial_sigterm_is_permission_denied(monkeypatch):
    calls = []

    def fake_killpg(process_group_id, sig):
        calls.append((process_group_id, sig))
        if sig == eval_core.signal.SIGTERM:
            raise PermissionError("denied")

    monkeypatch.setattr(eval_core.os, "killpg", fake_killpg)

    eval_core._terminate_posix_process_group(12345)

    assert calls == [
        (12345, eval_core.signal.SIGTERM),
        (12345, eval_core.signal.SIGKILL),
    ]


def test_run_eval_setup_does_not_hang_on_descendant_holding_output_pipes(tmp_path):
    setup_script = tmp_path / "setup_with_lingering_child.py"
    setup_script.write_text(
        "import subprocess, sys\n"
        "subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(5)'])\n"
        "print('setup complete')\n"
    )
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Say done\n"
        "expectations: [done appears]\n"
        f"setupCommands: [{json.dumps(f'{sys.executable} {setup_script}')} ]\n"
    )

    started = time.monotonic()
    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=_fake_hermes_command(tmp_path))

    assert result.passed is True
    assert time.monotonic() - started < 2


def test_oneshot_timeout_does_not_expose_the_full_command(tmp_path):
    command = f"{sys.executable} -c {json.dumps('import time; time.sleep(5)')} SUPERSECRET"

    with pytest.raises(RuntimeError) as exc_info:
        _run_oneshot_command(command, cwd=tmp_path, env=dict(os.environ), timeout=0.01)

    message = str(exc_info.value)
    assert "timed out after" in message
    assert "SUPERSECRET" not in message


@pytest.mark.skipif(os.name != "posix", reason="POSIX mocked cleanup path")
def test_oneshot_timeout_uses_bounded_post_cleanup_wait(tmp_path, monkeypatch):
    wait_calls = []

    class FakeProcess:
        pid = 12345

        def wait(self, timeout=None):
            wait_calls.append(timeout)
            raise eval_core.subprocess.TimeoutExpired(["fake"], timeout)

        def poll(self):
            return None

        def kill(self):
            return None

    monkeypatch.setattr(eval_core.subprocess, "Popen", lambda *args, **kwargs: FakeProcess())
    monkeypatch.setattr(eval_core, "_terminate_posix_process_group", lambda _pid: None)

    with pytest.raises(RuntimeError, match="timed out after"):
        _run_oneshot_command(
            ["fake"],
            cwd=tmp_path,
            env={},
            timeout=0.01,
        )

    assert wait_calls == [0.01, 1.0]


@pytest.mark.skipif(os.name != "posix", reason="POSIX process-group behavior")
def test_run_oneshot_timeout_sends_sigterm_before_sigkill(tmp_path):
    marker = tmp_path / "term-received"
    script = tmp_path / "term_handler.py"
    script.write_text(
        "import pathlib, signal, time\n"
        f"marker = pathlib.Path({str(marker)!r})\n"
        "signal.signal(signal.SIGTERM, lambda *_: marker.write_text('term'))\n"
        "while True:\n"
        "    time.sleep(0.05)\n"
    )

    with pytest.raises(RuntimeError, match="timed out after"):
        _run_oneshot_command(
            [sys.executable, str(script)],
            cwd=tmp_path,
            env=os.environ.copy(),
            timeout=1,
        )

    assert marker.read_text() == "term"


@pytest.mark.skipif(os.name != "nt", reason="actual Windows argv behavior")
def test_windows_oneshot_preserves_shell_metacharacter_prompt_bytes(tmp_path):
    recorder = tmp_path / "record_windows_prompt.py"
    recorded = tmp_path / "windows-prompt.txt"
    recorder.write_text(
        "import pathlib, sys\n"
        "pathlib.Path(sys.argv[1]).write_text(sys.argv[-1], encoding='utf-8')\n"
    )
    prompt = "literal & | < > ^ % ! ; $ ` quote=\" apostrophe=' newline\n한국어"
    base_command = f'"{sys.executable}" "{recorder}" "{recorded}"'
    command = eval_core._build_oneshot_command(base_command, prompt)

    completed = _run_oneshot_command(
        command,
        cwd=tmp_path,
        env=os.environ.copy(),
        timeout=5,
    )

    assert completed.returncode == 0
    assert recorded.read_text(encoding="utf-8") == prompt


def test_windows_job_creation_failure_kills_suspended_process_with_bounded_wait(monkeypatch):
    wait_calls = []

    class FakeProcess:
        killed = False

        def poll(self):
            return None

        def kill(self):
            self.killed = True

        def wait(self, timeout=None):
            wait_calls.append(timeout)
            return -9

    proc = FakeProcess()
    monkeypatch.setattr(
        eval_core,
        "_create_windows_kill_job",
        lambda _proc: (_ for _ in ()).throw(OSError("job setup failed")),
    )

    with pytest.raises(OSError, match="job setup failed"):
        eval_core._prepare_windows_isolated_process(proc)

    assert proc.killed is True
    assert wait_calls == [1.0]


@pytest.mark.skipif(os.name != "nt", reason="actual Windows Job Object behavior")
def test_windows_job_kills_descendant_after_successful_parent_exit(tmp_path):
    marker = tmp_path / "windows-child-survived"
    child = tmp_path / "windows_child.py"
    child.write_text(
        "import pathlib, time\n"
        "time.sleep(2)\n"
        f"pathlib.Path({str(marker)!r}).write_text('survived')\n"
    )
    parent = tmp_path / "windows_parent.py"
    parent.write_text(
        "import subprocess, sys\n"
        f"subprocess.Popen([sys.executable, {str(child)!r}])\n"
    )

    started = time.monotonic()
    _run_oneshot_command(
        [sys.executable, str(parent)],
        cwd=tmp_path,
        env=os.environ.copy(),
        timeout=5,
    )
    assert time.monotonic() - started < 2
    time.sleep(2.5)

    assert marker.exists() is False


@pytest.mark.skipif(os.name != "nt", reason="actual Windows Job Object behavior")
def test_windows_timeout_kills_descendant_tree(tmp_path):
    marker = tmp_path / "windows-timeout-child-survived"
    child = tmp_path / "windows_timeout_child.py"
    child.write_text(
        "import pathlib, time\n"
        "time.sleep(2)\n"
        f"pathlib.Path({str(marker)!r}).write_text('survived')\n"
    )
    parent = tmp_path / "windows_timeout_parent.py"
    parent.write_text(
        "import subprocess, sys, time\n"
        f"subprocess.Popen([sys.executable, {str(child)!r}])\n"
        "time.sleep(10)\n"
    )

    with pytest.raises(RuntimeError, match="timed out after"):
        _run_oneshot_command(
            [sys.executable, str(parent)],
            cwd=tmp_path,
            env=os.environ.copy(),
            timeout=1,
        )
    time.sleep(2.5)

    assert marker.exists() is False


def test_run_eval_does_not_inherit_host_credential_environment(tmp_path, monkeypatch):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    variable = "OPENAI_API_KEY"
    monkeypatch.setenv(variable, "host-secret-value")
    command, record = _environment_recording_hermes_command(tmp_path, variable)

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=command)

    assert result.passed is True
    assert json.loads(record.read_text()) == [None, None]


def test_run_eval_overlays_runtime_model_selection_into_isolated_profile(tmp_path, monkeypatch):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        "model:\n"
        "  default: gpt-test-model\n"
        "  provider: openai-codex\n"
        "  base_url: https://example.invalid/codex\n"
        "agent:\n"
        "  max_turns: 999\n"
    )
    (credential_home / "auth.json").write_text('{"credential": "test-only"}')
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))

    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
    )

    isolated = yaml.safe_load((Path(result.run_dir) / "profile" / "config.yaml").read_text())
    assert isolated["model"] == {
        "default": "gpt-test-model",
        "provider": "openai-codex",
        "base_url": "https://example.invalid/codex",
    }
    assert isolated["agent"]["max_turns"] != 999
    assert (Path(result.run_dir) / "profile" / "auth.json").is_file()


def test_run_eval_copies_only_active_provider_credentials(tmp_path, monkeypatch):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        "model:\n  default: gpt-test-model\n  provider: openai-codex\n"
    )
    (credential_home / "auth.json").write_text(
        json.dumps(
            {
                "version": 1,
                "active_provider": "openai-codex",
                "providers": {
                    "openai-codex": {"token": "active"},
                    "anthropic": {"token": "judge"},
                    "copilot": {"token": "unrelated"},
                },
                "credential_pool": {
                    "openai-codex": [{"token": "active"}],
                    "anthropic": [{"token": "judge"}],
                    "copilot": [{"token": "unrelated"}],
                },
            }
        )
    )
    (credential_home / ".env").write_text(
        "OPENAI_API_KEY=active-provider\nANTHROPIC_API_KEY=judge-provider\n"
        "GITHUB_TOKEN=unrelated-provider\nPASSWORD=unrelated\n"
    )
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
        judge_command=_judge_output_command(
            tmp_path, json.dumps({"passed": True, "failure_reasons": []})
        )
        + " --provider anthropic",
    )

    profile = Path(result.run_dir) / "profile"
    isolated_auth = json.loads((profile / "auth.json").read_text())
    assert set(isolated_auth["providers"]) == {"openai-codex", "anthropic"}
    assert set(isolated_auth["credential_pool"]) == {"openai-codex", "anthropic"}
    isolated_env = (profile / ".env").read_text()
    assert "OPENAI_API_KEY=active-provider" not in isolated_env
    assert "ANTHROPIC_API_KEY=judge-provider" in isolated_env
    assert "unrelated-provider" not in isolated_env
    assert "PASSWORD" not in isolated_env


def test_explicit_candidate_and_judge_providers_replace_unrelated_defaults(tmp_path, monkeypatch):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        "model:\n  default: gpt-test-model\n  provider: openai-codex\n"
    )
    (credential_home / "auth.json").write_text(
        json.dumps(
            {
                "active_provider": "openai-codex",
                "providers": {
                    "openai-codex": {"token": "unrelated-default"},
                    "anthropic": {"token": "selected"},
                },
            }
        )
    )
    (credential_home / ".env").write_text(
        "OPENAI_API_KEY=unrelated-default\nANTHROPIC_API_KEY=selected\n"
    )
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path) + " --provider anthropic",
        judge_command=_judge_output_command(
            tmp_path, json.dumps({"passed": True, "failure_reasons": []})
        )
        + " --provider anthropic",
    )

    profile = Path(result.run_dir) / "profile"
    isolated_auth = json.loads((profile / "auth.json").read_text())
    assert set(isolated_auth["providers"]) == {"anthropic"}
    isolated_env = (profile / ".env").read_text()
    assert "ANTHROPIC_API_KEY=selected" in isolated_env
    assert "unrelated-default" not in isolated_env


def test_runtime_provider_parsing_uses_last_option_and_stops_at_double_dash(tmp_path):
    (tmp_path / "config.yaml").write_text(
        "model:\n  default: test-model\n  provider: openrouter\n"
    )

    assert eval_core._runtime_provider_names(
        tmp_path,
        ("hermes --provider anthropic --provider=openai-api -t skills",),
    ) == {"openai-api"}
    assert eval_core._runtime_provider_names(
        tmp_path,
        ("hermes -t skills -- --provider anthropic",),
    ) == {"openrouter"}


def test_unknown_provider_credential_selection_fails_closed(tmp_path, monkeypatch):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        "model:\n  default: test-model\n  provider: definitely-unsupported-provider\n"
    )
    (credential_home / ".env").write_text(
        "DEFINITELY_UNSUPPORTED_PROVIDER_API_KEY=unrelated\n"
    )
    (credential_home / "auth.json").write_text(
        json.dumps(
            {
                "active_provider": "definitely-unsupported-provider",
                "providers": {
                    "definitely-unsupported-provider": {"token": "UNKNOWN_SECRET"}
                },
                "credential_pool": {
                    "definitely-unsupported-provider": [{"token": "POOL_SECRET"}]
                },
            }
        )
    )
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))
    run_profile = tmp_path / "isolated"
    run_profile.mkdir()

    eval_core._copy_runtime_credentials(run_profile, ("hermes -t skills",))

    assert (run_profile / ".env").read_text() == ""
    isolated_auth_text = (run_profile / "auth.json").read_text()
    isolated_auth = json.loads(isolated_auth_text)
    assert "active_provider" not in isolated_auth
    assert isolated_auth["providers"] == {}
    assert isolated_auth["credential_pool"] == {}
    assert "UNKNOWN_SECRET" not in isolated_auth_text
    assert "POOL_SECRET" not in isolated_auth_text


@pytest.mark.parametrize(
    ("provider", "selected_line", "unrelated_line"),
    [
        ("huggingface", "HF_TOKEN=selected", "HUGGINGFACE_OTHER_TOKEN=unrelated"),
        ("google", "GEMINI_API_KEY=selected", "OPENAI_API_KEY=unrelated"),
        ("zai", "GLM_API_KEY=selected", "OPENAI_API_KEY=unrelated"),
        ("z-ai", "Z_AI_API_KEY=selected", "OPENAI_API_KEY=unrelated"),
        ("kimi-coding", "KIMI_CODING_API_KEY=selected", "KIMI_CN_API_KEY=unrelated"),
        ("anthropic", "ANTHROPIC_TOKEN=selected", "OPENAI_API_KEY=unrelated"),
        ("openai-api", "OPENAI_API_KEY=selected", "ANTHROPIC_API_KEY=unrelated"),
        ("novita-ai", "NOVITA_API_KEY=selected", "OPENAI_API_KEY=unrelated"),
        ("novitaai", "NOVITA_API_KEY=selected", "OPENAI_API_KEY=unrelated"),
        ("nim", "NVIDIA_API_KEY=selected", "NIM_API_KEY=unrelated"),
        ("qwen", "DASHSCOPE_API_KEY=selected", "QWEN_API_KEY=unrelated"),
        ("step", "STEPFUN_API_KEY=selected", "STEP_API_KEY=unrelated"),
        ("github", "COPILOT_GITHUB_TOKEN=selected", "GITHUB_API_KEY=unrelated"),
        ("deep-seek", "DEEPSEEK_API_KEY=selected", "DEEP_SEEK_API_KEY=unrelated"),
        ("lm-studio", "LM_API_KEY=selected", "LM_STUDIO_API_KEY=unrelated"),
        ("x.ai", "XAI_API_KEY=selected", "X_AI_API_KEY=unrelated"),
        ("arcee-ai", "ARCEEAI_API_KEY=selected", "ARCEE_AI_API_KEY=unrelated"),
        ("gmi-cloud", "GMI_API_KEY=selected", "GMI_CLOUD_API_KEY=unrelated"),
        ("tencent", "TOKENHUB_API_KEY=selected", "TENCENT_API_KEY=unrelated"),
        ("opencode-go", "OPENCODE_GO_API_KEY=selected", "OPENCODE_ZEN_API_KEY=unrelated"),
        ("minimax-cn", "MINIMAX_CN_API_KEY=selected", "MINIMAX_API_KEY=unrelated"),
    ],
)
def test_provider_registry_copies_exact_supported_credentials(
    tmp_path, monkeypatch, provider, selected_line, unrelated_line
):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        f"model:\n  default: test-model\n  provider: {provider}\n"
    )
    (credential_home / ".env").write_text(f"{selected_line}\n{unrelated_line}\n")
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))
    run_profile = tmp_path / "isolated"
    run_profile.mkdir()

    eval_core._copy_runtime_credentials(run_profile, ("hermes -t skills",))

    isolated_env = (run_profile / ".env").read_text()
    assert selected_line in isolated_env
    assert unrelated_line not in isolated_env


def test_openai_codex_copies_oauth_state_without_openai_api_key(tmp_path, monkeypatch):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        "model:\n  default: gpt-test-model\n  provider: openai-codex\n"
    )
    (credential_home / "auth.json").write_text(
        json.dumps(
            {
                "active_provider": "openai-codex",
                "providers": {"openai-codex": {"token": "oauth-test-value"}},
            }
        )
    )
    (credential_home / ".env").write_text("OPENAI_API_KEY=unrelated-api-key\n")
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))
    run_profile = tmp_path / "isolated"
    run_profile.mkdir()

    eval_core._copy_runtime_credentials(run_profile, ("hermes -t skills",))

    isolated_auth = json.loads((run_profile / "auth.json").read_text())
    assert set(isolated_auth["providers"]) == {"openai-codex"}
    assert (run_profile / ".env").read_text() == ""


@pytest.mark.parametrize(
    ("provider_alias", "canonical_provider", "synthetic_env"),
    [
        ("x-ai-oauth", "xai-oauth", "X_AI_OAUTH_API_KEY"),
        ("grok-oauth", "xai-oauth", "GROK_OAUTH_API_KEY"),
        ("xai-grok-oauth", "xai-oauth", "XAI_GROK_OAUTH_API_KEY"),
        ("github-copilot-acp", "copilot-acp", "GITHUB_COPILOT_ACP_API_KEY"),
    ],
)
def test_oauth_and_external_aliases_copy_auth_without_synthetic_api_keys(
    tmp_path, monkeypatch, provider_alias, canonical_provider, synthetic_env
):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        f"model:\n  default: test-model\n  provider: {provider_alias}\n"
    )
    (credential_home / "auth.json").write_text(
        json.dumps(
            {
                "active_provider": canonical_provider,
                "providers": {canonical_provider: {"token": "oauth-test-value"}},
            }
        )
    )
    (credential_home / ".env").write_text(f"{synthetic_env}=unrelated\n")
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))
    run_profile = tmp_path / "isolated"
    run_profile.mkdir()

    eval_core._copy_runtime_credentials(run_profile, ("hermes -t skills",))

    isolated_auth = json.loads((run_profile / "auth.json").read_text())
    assert set(isolated_auth["providers"]) == {canonical_provider}
    assert (run_profile / ".env").read_text() == ""


def test_run_eval_preserves_complete_aws_credential_tuple_for_bedrock(tmp_path, monkeypatch):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        "model:\n  default: bedrock-test-model\n  provider: amazon-bedrock\n"
    )
    (credential_home / ".env").write_text(
        "AWS_ACCESS_KEY_ID=test-access-id\n"
        "AWS_SECRET_ACCESS_KEY=test-secret-value\n"
        "AWS_SESSION_TOKEN=test-session-value\n"
        "AWS_PRIVATE_KEY=test-private-value\n"
        "AWS_PASSPHRASE=test-passphrase-value\n"
        "OPENAI_API_KEY=unrelated-provider\n"
    )
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
    )

    isolated_env = (Path(result.run_dir) / "profile" / ".env").read_text()
    assert "AWS_ACCESS_KEY_ID=test-access-id" in isolated_env
    assert "AWS_SECRET_ACCESS_KEY=test-secret-value" in isolated_env
    assert "AWS_SESSION_TOKEN=test-session-value" in isolated_env
    assert "AWS_PRIVATE_KEY=test-private-value" in isolated_env
    assert "AWS_PASSPHRASE=test-passphrase-value" in isolated_env
    assert "unrelated-provider" not in isolated_env


@pytest.mark.skipif(os.name == "nt", reason="POSIX permission mode bits")
def test_run_eval_restricts_isolated_profile_and_credential_permissions(tmp_path, monkeypatch):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    auth = credential_home / "auth.json"
    dotenv = credential_home / ".env"
    auth.write_text('{"credential": "test-only"}')
    dotenv.write_text("TEST_ONLY=value\n")
    auth.chmod(0o644)
    dotenv.chmod(0o644)
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))

    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=_fake_hermes_command(tmp_path))

    profile = Path(result.run_dir) / "profile"
    assert profile.stat().st_mode & 0o777 == 0o700
    assert (profile / "auth.json").stat().st_mode & 0o777 == 0o600
    assert (profile / ".env").stat().st_mode & 0o777 == 0o600
    assert (Path(result.run_dir) / "prompt.txt").stat().st_mode & 0o777 == 0o600
    assert Path(result.result_path).stat().st_mode & 0o777 == 0o600
    html_path, md_path = render_reports([result], tmp_path / "private-report", markdown=True)
    assert html_path.stat().st_mode & 0o777 == 0o600
    assert md_path.stat().st_mode & 0o777 == 0o600


def test_run_eval_uses_a_unique_directory_for_each_attempt(tmp_path, monkeypatch):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    monkeypatch.setattr("eval_runner.core.time.strftime", lambda _format: "20260806-080000")
    command = _fake_hermes_command(tmp_path)

    first = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=command)
    second = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=command)

    assert first.run_dir != second.run_dir
    assert Path(first.result_path).is_file()
    assert Path(second.result_path).is_file()


def test_run_eval_retries_an_atomic_run_directory_collision(tmp_path, monkeypatch):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    output_root = tmp_path / "runs"
    output_root.mkdir()
    stamp = "20260806-080000"
    colliding_id = "a" * 32
    replacement_id = "b" * 32
    collision = output_root / f"skill-{stamp}-{colliding_id}"
    collision.mkdir()
    sentinel = collision / "sentinel"
    sentinel.write_text("preserve")
    ids = iter([colliding_id, replacement_id])
    monkeypatch.setattr("eval_runner.core.time.strftime", lambda _format: stamp)
    monkeypatch.setattr("eval_runner.core.uuid.uuid4", lambda: SimpleNamespace(hex=next(ids)))

    result = run_eval(eval_path, output_root=output_root, hermes_command=_fake_hermes_command(tmp_path))

    assert result.run_dir.endswith(replacement_id)
    assert sentinel.read_text() == "preserve"


@pytest.mark.parametrize(
    "base_url",
    [
        "https://example.invalid/v1?api_key=do-not-copy",
        "https://user:do-not-copy@example.invalid/v1",
        "https://example.invalid/v1#token=do-not-copy",
    ],
)
def test_run_eval_does_not_copy_credentials_embedded_in_runtime_base_url(tmp_path, monkeypatch, base_url):
    credential_home = tmp_path / "runtime-home"
    credential_home.mkdir()
    (credential_home / "config.yaml").write_text(
        "model:\n"
        "  default: gpt-test-model\n"
        "  provider: custom\n"
        f"  base_url: {json.dumps(base_url)}\n"
    )
    monkeypatch.setenv("HERMES_EVAL_CREDENTIAL_HOME", str(credential_home))

    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations: [done appears]\n")
    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=_fake_hermes_command(tmp_path),
    )

    config_path = Path(result.run_dir) / "profile" / "config.yaml"
    isolated = yaml.safe_load(config_path.read_text())
    assert "base_url" not in isolated["model"]
    assert "do-not-copy" not in config_path.read_text()


def test_run_eval_delivers_package_fixture_text_to_agent_and_judge(tmp_path):
    eval_dir = tmp_path / "skill"
    fixture_dir = eval_dir / "evaldata"
    fixture_dir.mkdir(parents=True)
    fixture_text = "SENTINEL_FIXTURE_TEXT: inspect this exact scenario"
    (fixture_dir / "scenario.md").write_text(fixture_text)
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect the supplied scenario\n"
        "expectations:\n"
        "  - fixture inspected\n"
        "parameters:\n"
        "  fixture: evaldata/scenario.md\n"
    )
    hermes_command, record_path = _recording_hermes_command(tmp_path)

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=hermes_command)

    assert result.passed is True
    prompts = json.loads(record_path.read_text())
    assert len(prompts) == 2
    assert all(fixture_text in prompt for prompt in prompts)
    assert fixture_text in (Path(result.run_dir) / "prompt.txt").read_text()


def test_run_eval_treats_fixture_shell_syntax_as_literal_prompt_text(tmp_path):
    eval_dir = tmp_path / "skill"
    fixture_dir = eval_dir / "evaldata"
    fixture_dir.mkdir(parents=True)
    injected_path = tmp_path / "fixture-shell-injection"
    fixture_text = f"literal syntax: $(touch {injected_path})"
    (fixture_dir / "scenario.md").write_text(fixture_text)
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect literal fixture text\n"
        "expectations: [fixture inspected]\n"
        "parameters:\n"
        "  fixture: evaldata/scenario.md\n"
    )
    hermes_command, record_path = _recording_hermes_command(tmp_path)

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=hermes_command)

    assert result.passed is True
    assert injected_path.exists() is False
    prompts = json.loads(record_path.read_text())
    assert all(fixture_text in prompt for prompt in prompts)


def test_run_eval_rejects_missing_hermes_command(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Say done\nexpectations:\n  - done\n")

    try:
        run_eval(eval_path, output_root=tmp_path / "runs", hermes_command="")
    except ValueError as exc:
        assert "hermes_command is required" in str(exc)
    else:
        raise AssertionError("run_eval should reject a missing Hermes command")


def test_render_reports_outputs_html_and_markdown(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text("prompt: Echo done\nexpectations:\n  - done\n")
    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=_fake_hermes_command(tmp_path, "done"))

    html, md = render_reports([result], tmp_path / "report", markdown=True)

    assert html.exists()
    assert md is not None and md.exists()
    assert "Echo done" in html.read_text()
    assert "Echo done" in md.read_text()
