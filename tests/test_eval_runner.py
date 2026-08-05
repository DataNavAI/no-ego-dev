from pathlib import Path
import json
import sys

import pytest

from eval_runner.core import discover_eval_files, load_eval, render_reports, run_eval


def _fake_hermes_command(tmp_path: Path, output: str = "done appears") -> str:
    script = tmp_path / "fake_hermes.py"
    script.write_text(
        "import json, os, sys\n"
        "assert os.environ.get('HERMES_HOME'), 'HERMES_HOME must point at the isolated eval profile'\n"
        "prompt = sys.argv[-1] if sys.argv else ''\n"
        "if 'Return only JSON' in prompt:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
        "else:\n"
        f"    print({output!r})\n"
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


def test_discovers_eval_yaml_files(tmp_path):
    (tmp_path / "a").mkdir()
    (tmp_path / "a" / "EVAL.yaml").write_text("prompt: hi\nexpectations: [done]\n")
    (tmp_path / "b").mkdir()
    (tmp_path / "b" / "EVAL.yml").write_text("prompt: bye\nexpectations: [done]\n")

    found = discover_eval_files([tmp_path])

    assert found == [tmp_path / "a" / "EVAL.yaml"]


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
