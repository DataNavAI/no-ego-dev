from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "marketer"


def test_marketer_discovery_covers_monitoring_only_requests():
    text = (PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    frontmatter = yaml.safe_load(text.split("---", 2)[1])

    description = frontmatter["description"].lower()
    assert "monitor" in description
    assert "feedback" in description
    assert "seo" in description


def test_google_ads_conversion_diagnostics_require_event_and_live_resource_proof():
    reference = (PACKAGE / "references" / "google-ads-operations-and-validation.md").read_text(
        encoding="utf-8"
    )

    assert "send_to" in reference
    assert "pagead/conversion" in reference
    assert "conversion event snippet" in reference.lower()
    assert "product/domain" in reference.lower()


def test_marketer_eval_exercises_monitoring_and_conversion_diagnostics():
    sections = []
    for eval_path in sorted(PACKAGE.glob("EVAL*.yaml")):
        eval_spec = yaml.safe_load(eval_path.read_text(encoding="utf-8"))
        sections.extend((eval_spec["prompt"], "\n".join(eval_spec["expectations"])))
        fixture = eval_spec.get("parameters", {}).get("fixture")
        if fixture:
            sections.append((PACKAGE / fixture).read_text(encoding="utf-8"))
    combined = "\n".join(sections).lower()

    assert "monitoring-only" in combined
    assert "send_to" in combined
    assert "pagead/conversion" in combined
