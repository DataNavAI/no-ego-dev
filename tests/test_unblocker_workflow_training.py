import json
from pathlib import Path
import shlex
import sys

import pytest
import yaml

from eval_runner.core import load_eval, run_eval


ROOT = Path(__file__).resolve().parents[1]


def _package(name: str) -> Path:
    return ROOT / "skills" / name


def _text(name: str, relative: str = "SKILL.md") -> str:
    return (_package(name) / relative).read_text(encoding="utf-8")


def test_unblocker_package_encodes_safe_evidence_first_recovery():
    package = _package("unblocker")
    required = [package / "SKILL.md", package / "EVAL.yaml", package / "evaldata" / "scenario.md"]
    assert all(path.is_file() and path.stat().st_size > 0 for path in required)

    text = _text("unblocker").lower()
    for phrase in (
        "evidence-first",
        "one causal action",
        "red → green",
        "authoritative retry readback",
        "task or domain owner",
        "owning helper",
        "owner token",
        "nonce",
        "command",
        "ancestry",
        "race-safe revalidation",
        "never delete a shared or controller lock",
        "deterministic simulation",
        "never evidence of real ci side effects",
    ):
        assert phrase in text


def test_unblocker_recovery_limit_never_caps_canonical_review_rounds():
    text = _text("unblocker").lower()
    assert "recovery-attempt limit" in text
    assert "must never cap canonical review rounds" in text
    assert "review until approval" in text


def test_workflow_training_is_a_parameterized_safety_router():
    package = _package("workflow-training")
    required = [package / "SKILL.md", package / "EVAL.yaml", package / "evaldata" / "scenario.md"]
    assert all(path.is_file() and path.stat().st_size > 0 for path in required)

    skill = _text("workflow-training")
    lower = skill.lower()
    frontmatter = yaml.safe_load(skill.split("---", 2)[1])
    assert set(frontmatter["metadata"]["hermes"]["related_skills"]) == {
        "eval-creator",
        "skill-creator",
        "third-party-skill-integration",
        "profile-skill-harvester",
    }
    for phrase in (
        "thin router",
        "source_root",
        "target_roots",
        "independently reviewed",
        "remote default branch",
        "skill-only hot-load",
        "argv-safe literal transport",
        "pinned commit",
        "license",
        "attribution",
        "old-skill baseline",
        "no-skill baseline",
        "multi-prompt regression",
    ):
        assert phrase in lower
    for forbidden in (
        "/users/moonk",
        "rsync -a --delete",
        "restart the gateway after",
        "shell=true",
    ):
        assert forbidden not in lower


def _recording_command(tmp_path: Path) -> tuple[str, Path]:
    recorder = tmp_path / "record_prompts.py"
    records = tmp_path / "prompts.json"
    recorder.write_text(
        "import json, pathlib, sys\n"
        f"path = pathlib.Path({str(records)!r})\n"
        "rows = json.loads(path.read_text()) if path.exists() else []\n"
        "rows.append(sys.argv[-1])\n"
        "path.write_text(json.dumps(rows))\n"
        "if 'Return only JSON' in sys.argv[-1]:\n"
        "    print(json.dumps({'passed': True, 'failure_reasons': []}))\n"
        "else:\n"
        "    print('deterministic candidate output')\n",
        encoding="utf-8",
    )
    return shlex.join([sys.executable, str(recorder)]), records


@pytest.mark.parametrize(
    ("name", "sentinel"),
    [
        ("unblocker", "UNBLOCKER_FIXTURE_SENTINEL_417"),
        ("workflow-training", "WORKFLOW_TRAINING_FIXTURE_SENTINEL"),
    ],
)
def test_real_eval_loader_delivers_package_fixture_to_agent_and_judge(tmp_path, name, sentinel):
    eval_path = _package(name) / "EVAL.yaml"
    spec = load_eval(eval_path)
    assert spec.fixture_text is not None
    assert sentinel in spec.fixture_text

    command, records = _recording_command(tmp_path)
    result = run_eval(
        eval_path,
        output_root=tmp_path / "runs",
        hermes_command=command,
        judge_command=command,
    )

    assert result.passed is True
    prompts = json.loads(records.read_text(encoding="utf-8"))
    assert len(prompts) == 2
    assert all(sentinel in prompt for prompt in prompts)
