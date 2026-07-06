from pathlib import Path
import json
import sys

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


def _recording_hermes_command(tmp_path: Path) -> str:
    script = tmp_path / "recording_hermes.py"
    record = tmp_path / "record.json"
    script.write_text(
        "import json, os, pathlib, sys\n"
        "prompt = sys.argv[-1] if sys.argv else ''\n"
        "if 'Return only JSON' in prompt:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
        "else:\n"
        f"    pathlib.Path({str(record)!r}).write_text(json.dumps({{'cwd': os.getcwd(), 'prompt': prompt}}))\n"
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


def test_load_eval_validates_required_fields(tmp_path):
    path = tmp_path / "EVAL.yaml"
    path.write_text("prompt: Build it\nexpectations:\n  - result exists\nparameters:\n  repo: local\n")

    spec = load_eval(path)

    assert spec.prompt == "Build it"
    assert spec.expectations == ["result exists"]
    assert spec.parameters["repo"] == "local"


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


def test_run_eval_passes_parameters_and_uses_working_directory(tmp_path):
    eval_dir = tmp_path / "skill"
    eval_dir.mkdir()
    workdir = tmp_path / "fixture"
    workdir.mkdir()
    eval_path = eval_dir / "EVAL.yaml"
    eval_path.write_text(
        "prompt: Inspect fixture\n"
        "expectations:\n"
        "  - done appears\n"
        "parameters:\n"
        f"  working_directory: {workdir}\n"
        "  branch: eval/demo\n"
    )

    result = run_eval(eval_path, output_root=tmp_path / "runs", hermes_command=_recording_hermes_command(tmp_path))

    assert result.passed is True
    record = json.loads((tmp_path / "record.json").read_text())
    assert record["cwd"] == str(workdir)
    assert "Eval execution context" in record["prompt"]
    assert "eval/demo" in record["prompt"]
    assert str(workdir) in record["prompt"]
    assert "Eval execution context" in (Path(result.run_dir) / "prompt.txt").read_text()


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
