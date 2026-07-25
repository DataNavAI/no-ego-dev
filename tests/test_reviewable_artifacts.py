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
        "Approval and merge are separate user decisions",
    ]
    for marker in required:
        assert marker in skill

    assert evaluation["name"] == "reviewable-artifacts"
    assert (SKILL_DIR / evaluation["parameters"]["fixture"]).is_file()
    assert (SKILL_DIR / "templates" / "review-index.md").is_file()
    assert (SKILL_DIR / "references" / "tool-research.md").is_file()
    assert SCRIPT.is_file()


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
