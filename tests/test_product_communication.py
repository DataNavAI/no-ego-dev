from pathlib import Path
import re

import yaml

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "product-communication"


def _package_text() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(SKILL_DIR.rglob("*"))
        if path.is_file() and path.suffix in {".md", ".yaml"}
    )


def test_product_communication_is_a_complete_production_loadable_package():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    spec = load_eval(SKILL_DIR / "EVAL.yaml")

    assert re.search(r"^name: product-communication$", skill, re.MULTILINE)
    assert re.search(r"^version: 1\.3\.9$", skill, re.MULTILINE)
    assert spec.fixture_path == SKILL_DIR / "evaldata" / "README.md"
    assert spec.fixture_text.strip()
    for reference in (
        "5w1h-concise-blocker-examples.md",
        "decision-ready-message-examples.md",
        "multi-profile-policy-propagation.md",
        "non-engineer-message-evaluation.md",
        "project-context-and-issue-translation.md",
        "restart-boundary-vs-completion.md",
        "progress-and-evidence-language.md",
    ):
        assert (SKILL_DIR / "references" / reference).is_file()


def test_product_communication_preserves_human_action_and_project_anchor_gates():
    contract = _package_text().lower()
    for marker in (
        "human action needed:",
        "human action needed: none",
        "only human-owned tasks",
        "cannot safely perform it",
        "active project",
        "requested outcome",
        "why it appeared now",
        "relationship is not yet verified",
        "do not send a bare list of internal finding names",
        "sudoku",
        "fallback validity",
        "dialog focus containment",
        "false-green smoke gaps",
    ):
        assert marker in contract


def test_product_communication_harvests_reusable_live_variant_controls():
    contract = _package_text().lower()
    for marker in (
        "verified running work",
        "queued—not started",
        "documentation drift",
        "wrong account or wrong destination",
        "source authority",
        "internal planning",
        "authentication state",
        "refreshable token",
        "reader-clarity complaint",
        "unchanged-worker silence",
        "spec / design complete",
        "enabled / live",
        "canonical task/run record",
        "cron `ok`",
        "candidate artifact",
        "production-like checks",
        "interactive flow",
    ):
        assert marker in contract


def test_product_communication_eval_covers_action_rollout_and_sudoku_regressions():
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (SKILL_DIR / evaluation["parameters"]["fixture"]).read_text(encoding="utf-8")
    expectations = "\n".join(evaluation["expectations"])

    assert "Human action needed" in expectations
    assert "exact None" in expectations
    assert "cannot safely perform it" in expectations
    assert "Markdown checklist" in expectations
    assert "all profiles" in expectations
    assert "active project" in expectations
    assert "Sudoku" in fixture
    assert "separately completable checklist" in fixture
    assert "canonical-byte" in fixture


def test_examples_keep_autonomous_work_out_of_human_action_field():
    markdown = "\n".join(
        path.read_text(encoding="utf-8")
        for path in SKILL_DIR.rglob("*.md")
    )
    lines = [line.strip() for line in markdown.splitlines()]
    no_action_lines = [line for line in lines if line.startswith("**Human action needed:** None")]

    assert len(no_action_lines) >= 5
    assert all(line == "**Human action needed:** None" for line in no_action_lines)
    checklist_lines = [line for line in lines if line.startswith("- [ ] **<human owner/role>")]
    assert checklist_lines
    assert all("cannot" in line.lower() for line in checklist_lines)
    assert all("unblock" in line.lower() or "enable" in line.lower() for line in checklist_lines)


def test_package_has_no_private_absolute_paths_or_secret_shaped_fixture_values():
    contract = _package_text()
    assert "/Users/moonk" not in contract
    assert "file:///Users/" not in contract
    assert "ghp_" not in contract
    assert not re.search(r"AKIA[0-9A-Z]{16}", contract)
