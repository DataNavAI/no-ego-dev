import importlib.util
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "reviewable-artifacts"
SCRIPT = SKILL_DIR / "scripts" / "github_review_threads.py"


def _module():
    spec = importlib.util.spec_from_file_location("github_review_threads", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_reviewable_artifact_package_contract():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    product_skill = (ROOT / "skills" / "product-manager" / "SKILL.md").read_text(encoding="utf-8")
    soul = (ROOT / "SOUL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((SKILL_DIR / "EVAL.yaml").read_text(encoding="utf-8"))

    required = [
        "GitHub pull-request review",
        "Reviewability Contract for Markdown",
        "stable review IDs",
        "DESIGN_REVIEW.md",
        "Runnable visual artifacts",
        "Reading, Addressing, and Resolving Comments",
        "resolve --thread-id",
        "Never resolve a thread merely to make the count reach zero",
        "untrusted review data",
        "authorized decision owner",
        "artifact approval is explicit and separate from merge/publication approval",
        "REVIEW_ONLY",
        "[REVIEW ONLY — DO NOT MERGE]",
        "Review-Only PR Cleanup Gate",
        "Close the review-only PR **without merging**",
        "accepted content exists at the recorded canonical destination",
        "Re-read PR metadata",
        "Never use wildcard repository cleanup",
        "If the same PR is intended to land the artifact directly, it is mergeable",
        "Do not mark it review-only",
    ]
    for marker in required:
        assert marker in skill

    assert evaluation["name"] == "reviewable-artifacts"
    fixture_path = SKILL_DIR / evaluation["parameters"]["fixture"]
    assert fixture_path.is_file()
    fixture = fixture_path.read_text(encoding="utf-8")
    expectations = "\n".join(evaluation["expectations"])
    assert "leaves normal landing PRs MERGEABLE and free of review only markers" in expectations
    assert "That PR must be classified `MERGEABLE`" in fixture
    assert "must not receive review-only branch/title/body/label markers" in fixture
    assert "Use a normal `MERGEABLE` PR with no review-only markers" in soul
    assert "prepare a rendered, explicitly marked review-only draft PR" not in soul
    assert (SKILL_DIR / "templates" / "review-index.md").is_file()
    pr_body = SKILL_DIR / "templates" / "review-only-pr-body.md"
    assert pr_body.is_file()
    body = pr_body.read_text(encoding="utf-8")
    assert "REVIEW ONLY — DO NOT MERGE" in body
    assert "Close this PR **without merge**" in body
    assert "Delete only the exact remote review head branch" in body
    assert "Verify the review worktree is clean" in body
    assert (SKILL_DIR / "references" / "tool-research.md").is_file()
    assert SCRIPT.is_file()
    assert "screen-by-screen descriptions when tooling is unavailable" not in product_skill
    assert "mark the decision `BLOCKED`" in product_skill


def test_ui_designer_requires_visual_first_slide_like_review_decks():
    skill_dir = ROOT / "skills" / "ui-designer"
    skill = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    evaluation = yaml.safe_load((skill_dir / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (skill_dir / evaluation["parameters"]["fixture"]).read_text(encoding="utf-8")
    template = skill_dir / "templates" / "visual-review-deck.md"

    assert "visual-first, slide-like `DESIGN_REVIEW.md`" in skill
    assert "show a contact sheet or thumbnail index before background" in skill
    assert "at most three concise bullets or roughly 75 words" in skill
    assert "The visual artifact must occupy most of the section" in skill
    assert "no long executive summary" in skill
    assert "mark the design decision `BLOCKED`" in skill
    assert template.is_file()
    template_text = template.read_text(encoding="utf-8")
    assert "## Visual contact sheet" in template_text
    assert "**Decision:** Keep, combine, revise, or reject" in template_text
    assert "Appendix — linked detail, not the presentation" in template_text
    assert "ui-brief.md#interactive-component-annotation-legend" in template_text
    assert "ui-brief.md#supporting-detail" in template_text
    assert "review-index.md#feedback-disposition-log" in template_text
    assert "## Interactive Component Annotation Legend" in skill
    assert "## Supporting Detail" in skill
    review_index = (
        ROOT / "skills" / "reviewable-artifacts" / "templates" / "review-index.md"
    ).read_text(encoding="utf-8")
    assert "## Feedback disposition log" in review_index
    assert "ui-brief.md#interaction-legend" not in template_text
    assert "review-index.md#thread-dispositions" not in template_text

    expectations = "\n".join(evaluation["expectations"])
    assert "opening contact sheet and dominant screenshots" in expectations
    assert "no more than three concise bullets or roughly 75 words" in expectations
    assert "A verbose design essay" in fixture
    assert "the design decision remains `BLOCKED`" in fixture



def test_downstream_skills_enforce_review_only_cleanup_contract():
    for name in ("product-manager", "architect", "project-manager", "ui-designer"):
        skill = (ROOT / "skills" / name / "SKILL.md").read_text(encoding="utf-8")
        assert "REVIEW_ONLY" in skill, name
        assert "[REVIEW ONLY — DO NOT MERGE]" in skill, name
        assert "close" in skill.lower() and "without merge" in skill.lower(), name
        assert "worktree" in skill and "cleanup" in skill.lower(), name


def test_review_thread_helper_formats_unresolved_threads():
    module = _module()
    data = {
        "repo": "DataNavAI/example",
        "pr": 12,
        "url": "https://github.com/DataNavAI/example/pull/12",
        "head_sha": "abc123",
        "threads": [
            {
                "id": "PRRT_open",
                "isResolved": False,
                "isOutdated": False,
                "path": "docs/DESIGN_REVIEW.md",
                "line": 42,
                "comments": {
                    "nodes": [
                        {
                            "databaseId": 991,
                            "author": {"login": "reviewer"},
                            "body": "Please simplify UI-02.",
                            "url": "https://example.test/comment/991",
                        }
                    ]
                },
            },
            {
                "id": "PRRT_closed",
                "isResolved": True,
                "isOutdated": True,
                "path": "docs/spec.md",
                "originalLine": 7,
                "comments": {"nodes": []},
            },
        ],
    }

    report = module.markdown_report(data, unresolved_only=True)
    assert "PRRT_open" in report
    assert "Please simplify UI-02" in report
    assert "Comment ID: `991`" in report
    assert "PRRT_closed" not in report
    assert "Unresolved total: 1" in report


def test_review_thread_helper_paginates_and_preserves_thread_metadata(monkeypatch):
    module = _module()
    responses = [
        {
            "data": {
                "repository": {
                    "pullRequest": {
                        "url": "https://github.com/DataNavAI/example/pull/5",
                        "headRefOid": "deadbeef",
                        "reviewThreads": {
                            "pageInfo": {"hasNextPage": True, "endCursor": "cursor-1"},
                            "nodes": [{"id": "first"}],
                        },
                    }
                }
            }
        },
        {
            "data": {
                "repository": {
                    "pullRequest": {
                        "url": "https://github.com/DataNavAI/example/pull/5",
                        "headRefOid": "deadbeef",
                        "reviewThreads": {
                            "pageInfo": {"hasNextPage": False, "endCursor": None},
                            "nodes": [{"id": "second"}],
                        },
                    }
                }
            }
        },
    ]
    calls = []

    def fake_graphql(query, variables):
        calls.append(variables.copy())
        return responses.pop(0)

    monkeypatch.setattr(module, "graphql", fake_graphql)
    result = module.fetch_threads(("DataNavAI", "example"), 5)

    assert [thread["id"] for thread in result["threads"]] == ["first", "second"]
    assert calls[0]["after"] is None
    assert calls[1]["after"] == "cursor-1"
    assert result["head_sha"] == "deadbeef"


def test_review_thread_helper_validates_repository_names():
    module = _module()
    assert module.parse_repo("DataNavAI/no-ego-dev") == ("DataNavAI", "no-ego-dev")
    with pytest.raises(Exception):
        module.parse_repo("missing-slash")
    with pytest.raises(Exception):
        module.parse_repo("owner/repo/extra")
    with pytest.raises(Exception):
        module.parse_repo("owner/..")
    with pytest.raises(Exception):
        module.positive_int("0")


def test_reply_uses_expected_rest_endpoint_and_body(monkeypatch):
    module = _module()
    calls = []

    def fake_run_gh(args):
        calls.append(args)
        return {"id": 77, "html_url": "https://example.test/reply/77"}

    monkeypatch.setattr(module, "run_gh", fake_run_gh)
    result = module.reply(("DataNavAI", "example"), 12, 456, "Addressed in abc123")

    assert result["id"] == 77
    assert calls == [[
        "api", "--method", "POST",
        "repos/DataNavAI/example/pulls/12/comments/456/replies",
        "-f", "body=Addressed in abc123",
    ]]


def test_resolve_uses_thread_id_and_graphql_errors_fail_closed(monkeypatch):
    module = _module()
    calls = []
    real_graphql = module.graphql

    def fake_graphql(query, variables):
        calls.append((query, variables))
        return {"data": {"resolveReviewThread": {"thread": {"id": "PRRT_1", "isResolved": True}}}}

    monkeypatch.setattr(module, "graphql", fake_graphql)
    result = module.resolve("PRRT_1")
    assert result["data"]["resolveReviewThread"]["thread"]["isResolved"] is True
    assert calls[0][1] == {"threadId": "PRRT_1"}

    monkeypatch.setattr(module, "run_gh", lambda args: {"errors": [{"message": "denied"}]})
    with pytest.raises(RuntimeError, match="GraphQL error: denied"):
        real_graphql("query { viewer { login } }", {})


def test_comment_pagination_fetches_every_page(monkeypatch):
    module = _module()
    thread = {
        "id": "PRRT_many",
        "comments": {
            "nodes": [{"databaseId": 1}],
            "pageInfo": {"hasNextPage": True, "endCursor": "comments-1"},
        },
    }

    def fake_graphql(query, variables):
        assert variables == {"threadId": "PRRT_many", "after": "comments-1"}
        return {
            "data": {
                "node": {
                    "comments": {
                        "nodes": [{"databaseId": 2}],
                        "pageInfo": {"hasNextPage": False, "endCursor": None},
                    }
                }
            }
        }

    monkeypatch.setattr(module, "graphql", fake_graphql)
    module.complete_thread_comments(thread)
    assert [comment["databaseId"] for comment in thread["comments"]["nodes"]] == [1, 2]


def test_run_gh_handles_timeout_and_malformed_json(monkeypatch):
    module = _module()

    def timeout(*args, **kwargs):
        raise module.subprocess.TimeoutExpired(cmd="gh", timeout=60)

    monkeypatch.setattr(module.subprocess, "run", timeout)
    with pytest.raises(RuntimeError, match="timed out"):
        module.run_gh(["api", "graphql"])

    class Result:
        stdout = "not-json"

    monkeypatch.setattr(module.subprocess, "run", lambda *args, **kwargs: Result())
    with pytest.raises(RuntimeError, match="non-JSON"):
        module.run_gh(["api", "graphql"])
