from pathlib import Path
import json

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "website-qa"


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def parse_frontmatter(text: str) -> dict:
    assert text.startswith("---\n")
    _, frontmatter, body = text.split("---", 2)
    assert body.strip()
    return yaml.safe_load(frontmatter)


def test_website_qa_package_has_guidance_assets_and_no_executable_checker():
    for path in (
        PACKAGE / "SKILL.md",
        PACKAGE / "EVAL.yaml",
        PACKAGE / "evaldata" / "README.md",
        PACKAGE / "templates" / "core-qa.md",
    ):
        assert path.is_file() and path.stat().st_size > 0

    legacy_script = PACKAGE / "scripts" / ("validate_" + "core_qa.py")
    legacy_fixtures = (
        PACKAGE / "evaldata" / ("valid-" + "core-qa.md"),
        PACKAGE / "evaldata" / ("invalid-" + "core-qa.md"),
    )
    assert not legacy_script.exists()
    assert all(not path.exists() for path in legacy_fixtures)


def test_skill_frontmatter_and_eval_yaml_are_loadable():
    frontmatter = parse_frontmatter(read("skills/website-qa/SKILL.md"))
    assert frontmatter["name"] == "website-qa"
    assert frontmatter["description"]
    assert "qa" in frontmatter["metadata"]["hermes"]["related_skills"]

    evaluation = yaml.safe_load(read("skills/website-qa/EVAL.yaml"))
    assert isinstance(evaluation["prompt"], str)
    assert evaluation["parameters"]["fixture"] == "evaldata/README.md"
    assert evaluation["setupCommands"] == []
    assert evaluation["teardownCommands"] == []
    assert evaluation["expectations"]


def test_skill_preserves_durable_website_qa_policy():
    skill = read("skills/website-qa/SKILL.md").lower()

    for marker in (
        ".projects/<project>/qa/core-qa.md",
        "cuj-<n>",
        "tc-<n>.<case number>",
        "never renumber",
        "test criticality",
        "bug/issue priority",
        "only p0",
        "fail",
        "blocked",
        "pass",
        "no applicable active p0",
        "all active p0, p1, and p2",
        "first launch",
        "major cuj redesign",
        "auth, payment, privacy, or data migration",
        "cross-cutting or platform change",
        "scheduled regression cadence",
        "real ui evidence",
        "exact build",
    ):
        assert marker in skill


def test_eval_promotes_honest_guidance_without_claiming_execution():
    evaluation = yaml.safe_load(read("skills/website-qa/EVAL.yaml"))
    expectations = "\n".join(evaluation["expectations"]).lower()
    fixture = read("skills/website-qa/evaldata/README.md").lower()

    for marker in ("planning-only", "intentionally unreachable", "blocked", "not run"):
        assert marker in fixture
    for marker in ("invented pass/fail", "fabricated screenshots", "risk-based", "real ui evidence"):
        assert marker in expectations


def test_package_and_ci_scripts_have_no_website_qa_hook():
    scripts = json.loads(read("package.json"))["scripts"]
    workflow_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / ".github" / "workflows").glob("*")
        if path.is_file()
    )
    command_surfaces = "\n".join([*scripts.values(), workflow_text]).lower()
    assert "website-qa" not in command_surfaces
    assert "core-qa.md" not in command_surfaces


def test_general_qa_and_readmes_route_website_work_to_the_specialist_skill():
    qa = read("skills/qa/SKILL.md").lower()
    qa_eval = yaml.safe_load(read("skills/qa/EVAL.yaml"))
    readme = read("README.md").lower()
    readme_ko = read("README.ko.md").lower()

    assert "website-qa" in qa and "core-qa.md" in qa
    assert any("website-qa" in item.lower() for item in qa_eval["expectations"])
    assert "website-qa" in readme
    assert "website-qa" in readme_ko
