from pathlib import Path
import importlib.util
import re
import sys

import pytest
import yaml

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "communication-evaluator"
SCORER = SKILL_DIR / "scripts" / "score_evaluation.py"
CASES = SKILL_DIR / "evaldata" / "cases.yaml"


def _scorer_module():
    spec = importlib.util.spec_from_file_location("communication_evaluator_scorer", SCORER)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_communication_evaluator_is_a_complete_production_loadable_package():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    spec = load_eval(SKILL_DIR / "EVAL.yaml")

    assert re.search(r"^name: communication-evaluator$", skill, re.MULTILINE)
    assert re.search(r"^version: 1\.0\.4$", skill, re.MULTILINE)
    assert spec.fixture_path == SKILL_DIR / "evaldata" / "README.md"
    assert spec.fixture_text.strip()
    assert spec.expectations
    assert SCORER.is_file()
    assert CASES.is_file()


def test_rubric_prioritizes_six_question_non_engineer_readback_and_sums_to_100():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    weighted_rows = re.findall(r"^\| [^|]+ \| (\d+) \|", skill, re.MULTILINE)

    assert sum(map(int, weighted_rows)) == 100
    for marker in (
        "Which active project and requested outcome",
        "What changed, failed, completed, or is waiting",
        "Who is affected",
        "Why it matters",
        "What a person must do",
        "What happens next",
        "Active-project context missing",
        "one-read test",
    ):
        assert marker.lower() in skill.lower()


def test_evaluator_has_material_hard_gates_and_fact_preserving_output_schema():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (SKILL_DIR / evaluation["parameters"]["fixture"]).read_text(encoding="utf-8")
    expectations = "\n".join(evaluation["expectations"]).lower()

    for marker in (
        "## Hard-fail Gates",
        "Human action needed:",
        "Sensitive-data exposure",
        "Misleading product state",
        "Verdict:",
        "Score:",
        "Non-engineer readback:",
        "Material findings:",
        "Suggested rewrite:",
    ):
        assert marker.lower() in skill.lower()
    assert "all five messages" in expectations
    assert "does not invent" in expectations
    assert "severity distortion" in expectations
    assert "typography alone is optional polish" in fixture
    assert "core meaning inaccessible; severity distortion" in fixture
    assert "ghp_" not in fixture


def test_candidate_oracles_include_sudoku_and_are_exactly_repeatable():
    module = _scorer_module()
    cases = yaml.safe_load(CASES.read_text(encoding="utf-8"))["cases"]

    assert [case["id"] for case in cases] == ["A", "B", "C", "D", "E"]
    for case in cases:
        first = module.evaluate(
            case["scores"],
            hard_fail_gates=case["hard_fail_gates"],
            one_read_complete=case["one_read_complete"],
        )
        second = module.evaluate(
            case["scores"],
            hard_fail_gates=case["hard_fail_gates"],
            one_read_complete=case["one_read_complete"],
        )
        assert first == second
        assert first.score == case["expected_score"]
        assert first.verdict == case["expected_verdict"]

    sudoku = cases[-1]
    assert "fallback validity" in sudoku["message"]
    assert "dialog focus containment" in sudoku["message"]
    assert "false-green smoke gaps" in sudoku["message"]
    assert "active_project_context_missing" in sudoku["hard_fail_gates"]

    opaque_pause = cases[0]
    assert "severity_distortion" in opaque_pause["hard_fail_gates"]

    approved_completion = cases[1]
    assert "checkout payment-recovery project" in approved_completion["message"].lower()
    assert "goal" in approved_completion["message"].lower()
    assert "monitor" in approved_completion["message"].lower()


def test_score_threshold_hard_gate_and_one_read_gate_fail_closed():
    module = _scorer_module()
    threshold = {
        "product_outcome": 15,
        "non_engineer_comprehension": 25,
        "human_action": 15,
        "context_next_state": 10,
        "structure_status": 10,
        "cognitive_load": 5,
        "evidence_safety": 5,
        "accessible_tone": 0,
    }
    assert sum(threshold.values()) == 85
    assert module.evaluate(threshold).verdict == "APPROVED"
    assert module.evaluate(dict(threshold, cognitive_load=4)).verdict == "CHANGES_REQUIRED"
    assert module.evaluate(threshold, hard_fail_gates=["misleading_product_state"]).verdict == "CHANGES_REQUIRED"
    assert module.evaluate(threshold, one_read_complete=False).verdict == "CHANGES_REQUIRED"

    with pytest.raises(ValueError, match="dimensions mismatch"):
        module.evaluate({"product_outcome": 15})
    with pytest.raises(TypeError, match="must be an integer"):
        module.evaluate(dict(threshold, product_outcome=True))
