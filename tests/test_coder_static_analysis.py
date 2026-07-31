from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
CODER = ROOT / "skills" / "coder"


def coder_text() -> str:
    return (CODER / "SKILL.md").read_text(encoding="utf-8")


def test_coder_provisions_project_owned_static_analysis_when_missing() -> None:
    content = coder_text()
    required = (
        "## Mandatory static analysis gate",
        "If no project-owned static analysis command exists",
        "development dependency",
        "committed lockfile",
        "project-owned configuration",
        "canonical repository command",
        "Do not rely on a global-only installation",
    )
    for phrase in required:
        assert phrase in content, f"coder missing {phrase!r}"


def test_coder_runs_static_analysis_after_every_code_change() -> None:
    content = coder_text()
    required = (
        "after every code change",
        "changed-file analysis",
        "full-project static analysis",
        "After the final code or test edit",
        "blocks completion",
        "never weaken rules",
        "does not replace tests or independent review",
    )
    for phrase in required:
        assert phrase in content, f"coder missing {phrase!r}"


def test_coder_static_analysis_eval_covers_setup_enforcement_and_fail_closed_behavior() -> None:
    data = yaml.safe_load((CODER / "EVAL.yaml").read_text(encoding="utf-8"))
    expectations = "\n".join(data["expectations"])
    for phrase in (
        "detects whether project-owned static analysis already exists",
        "installs and configures an ecosystem-appropriate static analyzer when absent",
        "runs static analysis after every code change",
        "fails closed on static analysis findings or unavailable required setup",
        "does not weaken rules or add blanket suppressions",
    ):
        assert phrase in expectations

    fixture = (CODER / data["parameters"]["fixture"]).read_text(encoding="utf-8")
    assert "repository has tests but no static-analysis configuration or canonical lint/typecheck script" in fixture
