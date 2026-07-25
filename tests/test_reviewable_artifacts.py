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
    ]
    for marker in required:
        assert marker in skill

    assert evaluation["name"] == "reviewable-artifacts"
    assert (SKILL_DIR / evaluation["parameters"]["fixture"]).is_file()
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
