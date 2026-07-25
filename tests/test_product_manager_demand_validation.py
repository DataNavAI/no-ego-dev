from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "product-manager" / "SKILL.md"
EVAL = ROOT / "skills" / "product-manager" / "EVAL.yaml"


def test_product_manager_has_google_trends_related_query_workflow():
    body = SKILL.read_text(encoding="utf-8")

    required = [
        "https://trends.google.com/trends/explore",
        "Related queries",
        "Related topics",
        "Top",
        "Rising",
        "Breakout",
        "normalized relative-interest index",
        "not absolute search volume",
        "cluster",
        ".projects/<project>/research/demand-validation.md",
        "Never invent query lists or trend values",
    ]

    for marker in required:
        assert marker in body, f"product-manager is missing Google Trends invariant: {marker}"


def test_product_manager_has_honest_paid_landing_page_smoke_test_gate():
    body = SKILL.read_text(encoding="utf-8")

    required = [
        "Paid Landing-Page Smoke Tests",
        "2-4 materially distinct value-proposition variants",
        "Join the waitlist",
        "coming soon",
        "Do not charge for unavailable functionality",
        "qualified conversion",
        "stop-loss rule",
        "explicit user approval",
        "fabricated testimonials",
        "misrepresentation policies",
        "Do not launch, spend money, create campaigns",
    ]

    for marker in required:
        assert marker in body, f"product-manager is missing smoke-test invariant: {marker}"


def test_product_manager_eval_locks_market_validation_behavior():
    body = EVAL.read_text(encoding="utf-8")

    required = [
        "Google Trends",
        "Top and Rising related queries and topics",
        "relative signal without treating it as absolute demand",
        "paid landing page smoke test",
        "coming soon or early access disclosure",
        "explicit user approval before ad spend or publication",
    ]

    for marker in required:
        assert marker in body, f"product-manager EVAL is missing expectation: {marker}"
