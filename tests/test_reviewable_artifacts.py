import importlib.util
import sys
from pathlib import Path

import pytest

from eval_runner.core import load_eval


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "reviewable-artifacts"
SCRIPT = SKILL_DIR / "scripts" / "github_review_threads.py"


def _module():
    spec = importlib.util.spec_from_file_location("reviewable_artifacts_threads", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _comment(database_id=11, node_id="C_11", body="review"):
    return {
        "id": node_id,
        "databaseId": database_id,
        "body": body,
        "createdAt": "2026-01-01T00:00:00Z",
        "url": f"https://example.invalid/comments/{database_id}",
        "author": {"login": "reviewer"},
    }


def _thread(thread_id="T_1", *, resolved=False, comments=None):
    return {
        "id": thread_id,
        "isResolved": resolved,
        "isOutdated": False,
        "path": "docs/review.md",
        "line": 10,
        "originalLine": 10,
        "comments": {
            "pageInfo": {"hasNextPage": False, "endCursor": None},
            "nodes": comments or [_comment()],
        },
    }


def _page(threads, *, head="a" * 40, has_next=False, cursor=None):
    return {
        "data": {
            "repository": {
                "nameWithOwner": "acme/widgets",
                "pullRequest": {
                    "number": 7,
                    "url": "https://example.invalid/acme/widgets/pull/7",
                    "headRefOid": head,
                    "reviewThreads": {
                        "pageInfo": {"hasNextPage": has_next, "endCursor": cursor},
                        "nodes": threads,
                    },
                },
            }
        }
    }


def test_reviewable_artifacts_curated_package_contract():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    assert "version: 1.3.0" in skill
    for marker in (
        "REVIEW_ONLY",
        "MERGEABLE",
        "stable review IDs",
        "Feedback disposition log",
        "untrusted review data",
        "preserve",
        "close without merge",
        "first-round completeness",
        "cumulative lineage",
        "Round 4",
        "reversible nits",
        "explicit production-first authority",
        "release, security, QA, and readback gates",
    ):
        assert marker in skill
    for support in (
        "EVAL.yaml",
        "evaldata/README.md",
        "scripts/github_review_threads.py",
        "templates/review-index.md",
        "templates/review-only-pr-body.md",
    ):
        assert (SKILL_DIR / support).is_file()
    combined = "\n".join(
        path.read_text(encoding="utf-8")
        for path in SKILL_DIR.rglob("*")
        if path.is_file() and path.suffix in {".md", ".yaml", ".py"}
    ).lower()
    for private_architecture in ("review hub", "shared review-comment api", "private html review surface"):
        assert private_architecture not in combined


def test_eval_loads_as_non_mutating_deterministic_simulation():
    spec = load_eval(SKILL_DIR / "EVAL.yaml")
    contract = f"{spec.prompt}\n{' '.join(spec.expectations)}\n{spec.fixture_text}".lower()
    assert spec.setup_commands == []
    assert spec.teardown_commands == []
    assert "deterministic non-mutating simulation" in contract
    assert "no disposable github coordinates" in contract
    for scenario in (
        "ambiguous approval",
        "production-first",
        "untrusted feedback",
        "wrong thread identity",
        "stale thread identity",
        "cleanup failure",
    ):
        assert scenario in contract


def test_parser_requires_full_identity_for_every_mutation():
    parser = _module().build_parser()
    for command in ("reply", "resolve"):
        with pytest.raises(SystemExit):
            parser.parse_args([command, "--thread-id", "T_1"])
        parsed = parser.parse_args(
            [
                command,
                "--repo",
                "acme/widgets",
                "--pr",
                "7",
                "--thread-id",
                "T_1",
                "--expected-head",
                "a" * 40,
                *(["--body", "addressed"] if command == "reply" else []),
            ]
        )
        assert parsed.thread_id == "T_1"


def test_fetch_threads_paginates_threads_and_comments(monkeypatch):
    module = _module()
    first = _thread("T_1")
    first["comments"] = {
        "pageInfo": {"hasNextPage": True, "endCursor": "comment-cursor"},
        "nodes": [_comment()],
    }
    responses = iter(
        [
            _page([first], has_next=True, cursor="thread-cursor"),
            {
                "data": {
                    "node": {
                        "id": "T_1",
                        "comments": {
                            "pageInfo": {"hasNextPage": False, "endCursor": None},
                            "nodes": [_comment(12, "C_12", "second")],
                        },
                    }
                }
            },
            _page([_thread("T_2")]),
        ]
    )
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: next(responses))

    result = module.fetch_threads(("acme", "widgets"), 7)

    assert [thread["id"] for thread in result["threads"]] == ["T_1", "T_2"]
    assert [comment["databaseId"] for comment in result["threads"][0]["comments"]["nodes"]] == [11, 12]


def test_graphql_rejects_error_payload(monkeypatch):
    module = _module()
    monkeypatch.setattr(module, "run_gh", lambda _args: {"errors": [{"message": "denied"}]})
    with pytest.raises(RuntimeError, match="GitHub GraphQL error: denied"):
        module.graphql("query", {})


@pytest.mark.parametrize(
    "payload,error",
    [
        (_page([], has_next=True, cursor=None), "another page without an end cursor"),
        (
            _page(
                [
                    {
                        **_thread(),
                        "comments": {
                            "pageInfo": {"hasNextPage": True, "endCursor": None},
                            "nodes": [_comment()],
                        },
                    }
                ]
            ),
            "more thread comments without an end cursor",
        ),
    ],
)
def test_fetch_threads_rejects_missing_pagination_cursors(monkeypatch, payload, error):
    module = _module()
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: payload)
    with pytest.raises(RuntimeError, match=error):
        module.fetch_threads(("acme", "widgets"), 7)


@pytest.mark.parametrize(
    "data,thread_id,expected_head,error",
    [
        ({**_page([_thread()]), "data": {"repository": None}}, "T_1", "a" * 40, "repository"),
        (_page([_thread()], head="b" * 40), "T_1", "a" * 40, "head mismatch"),
        (_page([_thread("T_other")]), "T_1", "a" * 40, "thread identity"),
        (_page([_thread("T_1", resolved=True)]), "T_1", "a" * 40, "already resolved"),
    ],
)
def test_prefetch_rejects_repo_pr_head_and_thread_mismatch(monkeypatch, data, thread_id, expected_head, error):
    module = _module()
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: data)
    with pytest.raises(RuntimeError, match=error):
        module.prefetch_unresolved_thread(("acme", "widgets"), 7, thread_id, expected_head)


def test_prefetch_rejects_pr_number_and_repo_identity_mismatch(monkeypatch):
    module = _module()
    wrong_pr = _page([_thread()])
    wrong_pr["data"]["repository"]["pullRequest"]["number"] = 8
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: wrong_pr)
    with pytest.raises(RuntimeError, match="pull request identity"):
        module.prefetch_unresolved_thread(("acme", "widgets"), 7, "T_1", "a" * 40)

    wrong_repo = _page([_thread()])
    wrong_repo["data"]["repository"]["nameWithOwner"] = "other/widgets"
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: wrong_repo)
    with pytest.raises(RuntimeError, match="repository identity"):
        module.prefetch_unresolved_thread(("acme", "widgets"), 7, "T_1", "a" * 40)


def test_reply_prefetches_mutates_and_rereads_exact_thread_and_counts(monkeypatch):
    module = _module()
    before = {
        "repo": "acme/widgets",
        "pr": 7,
        "head_sha": "a" * 40,
        "threads": [_thread("T_1"), _thread("T_2")],
    }
    after = {
        **before,
        "threads": [_thread("T_1", comments=[_comment(), _comment(12, "C_12", "addressed")]), _thread("T_2")],
    }
    fetches = iter([before, after])
    monkeypatch.setattr(module, "fetch_threads", lambda *_args, **_kwargs: next(fetches))
    monkeypatch.setattr(
        module,
        "graphql",
        lambda query, variables: {
            "data": {"addPullRequestReviewThreadReply": {"comment": _comment(12, "C_12", variables["body"])}}
        },
    )

    result = module.reply(("acme", "widgets"), 7, "T_1", "a" * 40, "addressed")

    assert result["thread_id"] == "T_1"
    assert result["before_unresolved"] == result["after_unresolved"] == 2
    assert result["comment"]["id"] == "C_12"


def test_reply_fails_closed_when_readback_does_not_contain_mutated_comment(monkeypatch):
    module = _module()
    snapshot = {"repo": "acme/widgets", "pr": 7, "head_sha": "a" * 40, "threads": [_thread()]}
    monkeypatch.setattr(module, "fetch_threads", lambda *_args, **_kwargs: snapshot)
    monkeypatch.setattr(
        module,
        "graphql",
        lambda *_args, **_kwargs: {
            "data": {"addPullRequestReviewThreadReply": {"comment": _comment(99, "C_99", "addressed")}}
        },
    )
    with pytest.raises(RuntimeError, match="reply readback"):
        module.reply(("acme", "widgets"), 7, "T_1", "a" * 40, "addressed")


def test_resolve_prefetches_mutates_and_verifies_exact_target_and_counts(monkeypatch):
    module = _module()
    before = {
        "repo": "acme/widgets",
        "pr": 7,
        "head_sha": "a" * 40,
        "threads": [_thread("T_1"), _thread("T_2")],
    }
    after = {
        **before,
        "threads": [_thread("T_1", resolved=True), _thread("T_2")],
    }
    fetches = iter([before, after])
    monkeypatch.setattr(module, "fetch_threads", lambda *_args, **_kwargs: next(fetches))
    monkeypatch.setattr(
        module,
        "graphql",
        lambda *_args, **_kwargs: {
            "data": {"resolveReviewThread": {"thread": {"id": "T_1", "isResolved": True}}}
        },
    )

    result = module.resolve(("acme", "widgets"), 7, "T_1", "a" * 40)

    assert result == {
        "thread_id": "T_1",
        "head_sha": "a" * 40,
        "before_unresolved": 2,
        "after_unresolved": 1,
        "isResolved": True,
    }


@pytest.mark.parametrize(
    "mutation_id,readback,error",
    [
        ("T_wrong", _thread("T_1", resolved=True), "mutation returned wrong thread"),
        ("T_1", _thread("T_1", resolved=False), "resolve readback"),
    ],
)
def test_resolve_rejects_wrong_mutation_id_or_failed_readback(monkeypatch, mutation_id, readback, error):
    module = _module()
    before = {"repo": "acme/widgets", "pr": 7, "head_sha": "a" * 40, "threads": [_thread()]}
    after = {**before, "threads": [readback]}
    fetches = iter([before, after])
    monkeypatch.setattr(module, "fetch_threads", lambda *_args, **_kwargs: next(fetches))
    monkeypatch.setattr(
        module,
        "graphql",
        lambda *_args, **_kwargs: {
            "data": {"resolveReviewThread": {"thread": {"id": mutation_id, "isResolved": True}}}
        },
    )
    with pytest.raises(RuntimeError, match=error):
        module.resolve(("acme", "widgets"), 7, "T_1", "a" * 40)
