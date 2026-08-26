from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "seo-growth"


def _skill_text() -> str:
    return (PACKAGE / "SKILL.md").read_text(encoding="utf-8")


def test_seo_growth_package_is_complete_and_loadable():
    required = [
        PACKAGE / "SKILL.md",
        PACKAGE / "EVAL.yaml",
        PACKAGE / "evaldata" / "README.md",
        PACKAGE / "references" / "tooling-and-data-sources.md",
        PACKAGE / "templates" / "seo-strategy.md",
        PACKAGE / "templates" / "technical-audit.md",
        PACKAGE / "templates" / "weekly-report.md",
        PACKAGE / "templates" / "keyword-page-map.csv",
        PACKAGE / "templates" / "seo-experiment-log.csv",
    ]
    assert all(path.is_file() and path.stat().st_size > 0 for path in required)

    skill = _skill_text()
    frontmatter = yaml.safe_load(skill.split("---", 2)[1])
    assert frontmatter["name"] == "seo-growth"
    assert frontmatter["version"] == "0.1.0"
    assert "marketer" in frontmatter["metadata"]["hermes"]["related_skills"]

    spec = yaml.safe_load((PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    assert spec["parameters"]["fixture"] == "evaldata/README.md"
    assert len(spec["expectations"]) >= 15


def test_seo_growth_requires_evidence_based_keyword_to_page_strategy():
    text = _skill_text().lower()
    required_phrases = [
        "search console",
        "bing webmaster tools",
        "keyword-to-page map",
        "search intent",
        "business value",
        "conversion",
        "cannibalization",
        "existing page",
        "new page",
        "do not invent search volume",
        "query-page",
        "country",
        "device",
    ]
    for phrase in required_phrases:
        assert phrase in text


def test_seo_growth_covers_technical_content_and_on_page_implementation():
    text = _skill_text().lower()
    required_phrases = [
        "robots.txt",
        "xml sitemap",
        "canonical",
        "noindex",
        "redirect",
        "core web vitals",
        "structured data",
        "internal link",
        "title",
        "meta description",
        "h1",
        "people-first",
        "rendered html",
        "server-rendered",
        "route precedence",
        "lastmod",
        "json-ld",
        "context-appropriate escaping",
        "hostile",
        "mobile",
    ]
    for phrase in required_phrases:
        assert phrase in text


def test_seo_growth_closes_the_monitoring_and_iteration_loop():
    text = _skill_text().lower()
    required_phrases = [
        "baseline",
        "weekly",
        "28-day",
        "impressions",
        "clicks",
        "ctr",
        "average position",
        "does not guarantee all data rows",
        "rank tracking",
        "experiment log",
        "change date",
        "rollback",
        "seasonality",
        "statistical",
        "6–12 weeks",
    ]
    for phrase in required_phrases:
        assert phrase in text


def test_seo_growth_has_truth_safety_and_search_spam_guardrails():
    text = _skill_text().lower()
    required_phrases = [
        "no fabricated",
        "keyword stuffing",
        "doorway pages",
        "cloaking",
        "link schemes",
        "scaled content abuse",
        "site reputation abuse",
        "expired domain abuse",
        "credentials",
        "explicit authorization",
        "do not claim",
    ]
    for phrase in required_phrases:
        assert phrase in text


def test_seo_growth_handles_ai_search_without_invented_optimization_shortcuts():
    skill = _skill_text().lower()
    reference = (PACKAGE / "references" / "tooling-and-data-sources.md").read_text(encoding="utf-8").lower()
    required_skill_phrases = [
        "ai overviews",
        "ai mode",
        "core search",
        "llms.txt",
        "ai markup",
        "generative ai performance report",
    ]
    for phrase in required_skill_phrases:
        assert phrase in skill
    assert "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" in reference


def test_seo_growth_names_durable_operating_artifacts():
    text = _skill_text()
    required_paths = [
        ".projects/<project>/seo/strategy.md",
        ".projects/<project>/seo/keyword-page-map.csv",
        ".projects/<project>/seo/technical-audit.md",
        ".projects/<project>/seo/experiment-log.csv",
        ".projects/<project>/seo/weekly-report.md",
    ]
    for path in required_paths:
        assert path in text


def test_project_manager_routes_organic_search_work_to_seo_growth():
    project_manager = (ROOT / "skills" / "project-manager" / "SKILL.md").read_text(encoding="utf-8")
    project_eval = yaml.safe_load(
        (ROOT / "skills" / "project-manager" / "EVAL.yaml").read_text(encoding="utf-8")
    )

    assert "version: 0.22.1" in project_manager
    assert "spawn a subagent instructed to use `seo-growth`" in project_manager
    assert any("seo-growth" in expectation for expectation in project_eval["expectations"])
