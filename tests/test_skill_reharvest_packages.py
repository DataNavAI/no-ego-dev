from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"


def _text(skill: str, relative: str = "SKILL.md") -> str:
    return (SKILLS / skill / relative).read_text(encoding="utf-8")


def _eval(skill: str) -> dict:
    return yaml.safe_load(_text(skill, "EVAL.yaml"))


def test_play_store_cli_pins_analytics_version_allowlist_and_negative_regression():
    skill = _text("play-store-cli").lower()
    fixture = _text("play-store-cli", "evaldata/README.md").lower()
    expectations = "\n".join(_eval("play-store-cli")["expectations"]).lower()

    for phrase in (
        "analytics-version allowlist",
        "exact release version",
        "reject",
        "red regression",
    ):
        assert phrase in f"{skill}\n{fixture}\n{expectations}"


def test_seo_growth_preserves_timestamped_same_window_sitemap_and_retention_contract():
    corpus = "\n".join(
        [
            _text("seo-growth"),
            _text("seo-growth", "EVAL.yaml"),
            _text("seo-growth", "evaldata/README.md"),
        ]
    ).lower()

    for phrase in (
        "same observation window",
        "observation timestamp",
        "persisted modification timestamp",
        "backfill",
        "tested indexability",
        "reader retention",
        "seo retention",
    ):
        assert phrase in corpus


def test_ui_designer_complete_reharvest_support_files_and_controls():
    package = SKILLS / "ui-designer"
    references = {
        "cdp-viewport-capture-and-image-diagnostics.md": "innerwidth",
        "component-commentable-html-review-apps.md": "component-comments/v1",
        "identity-safe-media-fixtures.md": "identity evidence",
        "mock-to-product-alignment.md": "parity matrix",
        "photo-first-mvp-design-system.md": "meaningful media",
        "exact-reproduction-geometry.md": "geometry ledger",
        "browser-hosted-provisioning-design.md": "typed allowlisted provisioning request",
        "frozen-browser-provisioning-review.md": "manifest digest",
        "truthful-async-mutation-states.md": "lastconfirmedstate",
    }
    skill = _text("ui-designer").lower()

    for filename, marker in references.items():
        path = package / "references" / filename
        assert path.is_file() and path.stat().st_size > 0
        assert marker in path.read_text(encoding="utf-8").lower()
        assert f"references/{filename}" in skill

    assert "concise-user-review-updates.md" not in skill
    assert not (package / "references" / "concise-user-review-updates.md").exists()


def test_ui_designer_evals_cover_harvested_lifecycle_boundaries():
    corpus = "\n".join(
        [_text("ui-designer", "EVAL.yaml"), _text("ui-designer", "evaldata/README.md")]
    ).lower()

    for phrase in (
        "exact reproduction",
        "component-commentable",
        "identity-safe",
        "photo-first",
        "browser-hosted provisioning",
        "frozen candidate",
        "truthful asynchronous mutation",
    ):
        assert phrase in corpus


def test_ui_designer_nested_references_obey_binding_verdict_contract():
    corpus = "\n".join(
        path.read_text(encoding="utf-8").lower()
        for path in (SKILLS / "ui-designer" / "references").glob("*.md")
    )

    assert "needs iteration" not in corpus
    assert "non-blocking residual notes" not in corpus
    assert "omit reversible nits" in corpus


def test_product_communication_has_canonical_provenance_and_complete_restart_example():
    skill = _text("product-communication")
    restart = _text(
        "product-communication", "references/restart-boundary-vs-completion.md"
    ).lower()

    assert "author: NoEgoDev" in skill
    for policy_phrase in (
        "internal planning",
        "not stakeholder approval",
        "verified refreshable token",
        "authoritative readback",
        "queued—not started",
        "complete plain-language sentence",
    ):
        assert policy_phrase in skill
    for phrase in (
        "reporting the noegodev skill-publication restart boundary.",
        "executive summary:",
        "human action needed:",
        "detailed information:",
        "hermes administrator",
        "automation cannot safely restart",
        "now",
    ):
        assert phrase in restart
    assert restart.index("reporting the noegodev") < restart.index("executive summary:")
    assert restart.index("executive summary:") < restart.index("human action needed:")
    assert restart.index("human action needed:") < restart.index("detailed information:")
