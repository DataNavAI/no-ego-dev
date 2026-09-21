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
    assert "version: 1.4.0" in skill
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


def _policy_surfaces():
    spec = load_eval(SKILL_DIR / "EVAL.yaml")
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    fixture = spec.fixture_text
    template = (SKILL_DIR / "templates" / "review-index.md").read_text(encoding="utf-8")
    eval_expectations = "\n".join(spec.expectations)
    return skill, fixture, template, eval_expectations


def test_thread_tooling_policy_is_read_only_and_never_claims_atomic_mutation_safety():
    skill, fixture, template, eval_expectations = _policy_surfaces()
    pr_body = (SKILL_DIR / "templates" / "review-only-pr-body.md").read_text(encoding="utf-8")
    combined = "\n".join((skill, fixture, template, pr_body, eval_expectations))

    for required in (
        "read-only",
        "no atomic exact-head guarantee",
        "immediate revalidation",
        "post-check cannot undo a side effect",
    ):
        assert required in combined
    assert "github_review_threads.py reply" not in combined
    assert "github_review_threads.py resolve" not in combined
    assert "mutates only after match" not in combined


def test_convergence_policy_rejects_reversible_nits_in_every_round_and_follow_up():
    skill, fixture, _template, eval_expectations = _policy_surfaces()
    for surface in (skill, fixture, eval_expectations):
        assert "Omit reversible nits entirely from findings and follow-up in every round" in surface
    assert "a reversible nit reported in round 1 or any follow-up is rejected" in fixture.lower()


def test_cumulative_lineage_carries_material_findings_only_not_reversible_nits():
    skill, fixture, template, eval_expectations = _policy_surfaces()
    for surface in (skill, fixture, eval_expectations):
        assert "active cumulative lineage carries material unresolved findings only" in surface
    assert "Material unresolved finding / ID" in template
    assert "Prior finding / ID" not in template
    assert "a lineage packet that carries a reversible nit from any earlier round is rejected" in fixture.lower()


def test_round_four_without_a_material_blocker_requires_immediate_approval():
    skill, fixture, _template, eval_expectations = _policy_surfaces()
    for surface in (skill, fixture, eval_expectations):
        assert "In Round 4 and later, return `APPROVED` immediately when no material blocker remains" in surface
    assert "requesting another round is rejected" in fixture


def test_material_blockers_never_become_approved_by_exhaustion():
    skill, fixture, _template, eval_expectations = _policy_surfaces()
    for surface in (skill, fixture, eval_expectations):
        assert "Never approve by exhaustion" in surface
        assert "genuine material blocker remains `REQUEST_CHANGES` regardless of round count" in surface
    assert "approval by exhaustion is rejected" in fixture.lower()


@pytest.mark.parametrize("command", ["reply", "resolve"])
def test_mutation_subcommands_are_rejected_before_any_network_call(monkeypatch, command):
    module = _module()
    network_calls = []
    monkeypatch.setattr(module, "run_gh", lambda args: network_calls.append(args))

    arguments = [
        command,
        "--repo",
        "acme/widgets",
        "--pr",
        "7",
        "--thread-id",
        "T_1",
        "--expected-head",
        "a" * 40,
    ]
    if command == "reply":
        arguments.extend(["--body", "addressed"])

    with pytest.raises(SystemExit):
        module.main(arguments)

    assert network_calls == []


def test_helper_contains_only_graphql_queries_not_mutations():
    module = _module()
    graphql_documents = [
        value
        for name, value in vars(module).items()
        if name.endswith(("_QUERY", "_MUTATION")) and isinstance(value, str)
    ]

    assert graphql_documents
    assert all(document.lstrip().startswith("query(") for document in graphql_documents)
    source = SCRIPT.read_text(encoding="utf-8")
    assert "addPullRequestReviewThreadReply" not in source
    assert "resolveReviewThread" not in source


def test_inspect_reads_exact_thread_at_expected_head(monkeypatch):
    module = _module()
    snapshot = {
        "repo": "acme/widgets",
        "pr": 7,
        "head_sha": "a" * 40,
        "threads": [_thread("T_1"), _thread("T_2", resolved=True)],
    }
    monkeypatch.setattr(module, "fetch_threads", lambda *_args, **_kwargs: snapshot)

    result = module.inspect_thread(("acme", "widgets"), 7, "T_1", "a" * 40)

    assert result["repo"] == "acme/widgets"
    assert result["pr"] == 7
    assert result["head_sha"] == "a" * 40
    assert result["thread"]["id"] == "T_1"


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
def test_inspect_rejects_repo_pr_head_and_thread_mismatch(monkeypatch, data, thread_id, expected_head, error):
    module = _module()
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: data)
    with pytest.raises(RuntimeError, match=error):
        module.inspect_thread(("acme", "widgets"), 7, thread_id, expected_head, unresolved_only=True)


def test_inspect_rejects_pr_number_and_repo_identity_mismatch(monkeypatch):
    module = _module()
    wrong_pr = _page([_thread()])
    wrong_pr["data"]["repository"]["pullRequest"]["number"] = 8
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: wrong_pr)
    with pytest.raises(RuntimeError, match="pull request identity"):
        module.inspect_thread(("acme", "widgets"), 7, "T_1", "a" * 40)

    wrong_repo = _page([_thread()])
    wrong_repo["data"]["repository"]["nameWithOwner"] = "other/widgets"
    monkeypatch.setattr(module, "graphql", lambda *_args, **_kwargs: wrong_repo)
    with pytest.raises(RuntimeError, match="repository identity"):
        module.inspect_thread(("acme", "widgets"), 7, "T_1", "a" * 40)
