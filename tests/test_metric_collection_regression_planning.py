from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = (
    "mvp-planning",
    "product-manager",
    "architect",
    "project-manager",
    "coder",
    "devops",
    "qa",
    "technical-design-reviewer",
)


def test_production_service_plans_require_metric_collection_regression_tasks():
    for name in SKILLS:
        skill = (ROOT / "skills" / name / "SKILL.md").read_text(encoding="utf-8").lower()
        assert "metric-collection regression" in skill, name
        assert "production service" in skill, name
        assert "emission" in skill, name
        assert "collection" in skill, name
        assert "destination" in skill or "backend" in skill, name
        assert "transport" in skill, name
        assert "ingestion" in skill, name
        assert "storage" in skill, name
        assert "aggregation" in skill, name
        assert "reporting" in skill, name
        assert "missing" in skill, name
        assert "release-blocking" in skill, name


def test_metric_collection_regression_requirement_is_behaviorally_evaluated():
    for name in SKILLS:
        evaluation = yaml.safe_load(
            (ROOT / "skills" / name / "EVAL.yaml").read_text(encoding="utf-8")
        )
        expectations = "\n".join(evaluation["expectations"]).lower()
        assert "metric collection regression" in expectations, name
        assert "production service" in expectations, name
        assert "emission" in expectations, name
        assert "collection" in expectations, name
        assert "destination" in expectations or "backend" in expectations, name
        assert "transport" in expectations, name
        assert "ingestion" in expectations, name
        assert "storage" in expectations, name
        assert "aggregation" in expectations, name
        assert "reporting" in expectations, name
        assert "missing" in expectations, name
        assert "release" in expectations, name
