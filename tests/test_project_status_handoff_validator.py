import importlib.util
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = (
    ROOT
    / "skills"
    / "project-manager"
    / "scripts"
    / "validate_status_handoff.py"
)
spec = importlib.util.spec_from_file_location("validate_status_handoff", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)
validate_packet = module.validate_packet


def valid_remote_packet() -> dict:
    return {
        "completion_kind": "milestone_complete",
        "status_update": {
            "committed_or_in_landing_pr": True,
            "expected_revision": "release-42",
            "observed_revision": "release-42",
        },
        "handoff": {
            "kind": "default_branch",
            "awaiting_merge": False,
            "target": "https://github.com/acme/widget/blob/main/STATUS.md",
            "target_ref": "main",
            "default_branch_ref": "main",
            "resolves": True,
            "points_to_status_md": True,
            "content_verified": True,
            "access_verified": True,
            "remote_ref_contains_update": True,
            "blob_hash": "0123456789abcdef0123456789abcdef01234567",
            "checked_at": "2026-07-25T23:00:00-07:00",
        },
    }


def test_status_handoff_validator_accepts_verified_default_branch_packet():
    assert validate_packet(valid_remote_packet()) == []


@pytest.mark.parametrize(
    ("mutate", "expected_error"),
    [
        (
            lambda p: p["status_update"].update(
                committed_or_in_landing_pr=False
            ),
            "committed_or_in_landing_pr must be true",
        ),
        (
            lambda p: p["handoff"].update(
                target="https://github.com/acme/widget/blob/main/README.md"
            ),
            "remote handoff URL must point specifically to STATUS.md",
        ),
        (
            lambda p: p["handoff"].update(remote_ref_contains_update=False),
            "remote_ref_contains_update must be true",
        ),
        (
            lambda p: p["handoff"].update(
                awaiting_merge=True,
                kind="default_branch",
            ),
            "awaiting-merge completion cannot link the default branch",
        ),
        (
            lambda p: p["handoff"].update(access_verified=False),
            "access_verified must be true",
        ),
        (
            lambda p: p["status_update"].update(observed_revision="stale"),
            "observed STATUS.md revision must equal the expected completed revision",
        ),
    ],
)
def test_status_handoff_validator_rejects_invalid_completion_packets(
    mutate, expected_error
):
    packet = valid_remote_packet()
    mutate(packet)
    assert expected_error in validate_packet(packet)


def test_status_handoff_validator_accepts_verified_pr_and_commit_packets():
    pr_packet = valid_remote_packet()
    pr_packet["handoff"].update(
        kind="pr_branch",
        awaiting_merge=True,
        target="https://github.com/acme/widget/blob/feature/status/STATUS.md",
        target_ref="feature/status",
        pushed_ref_contains_update=True,
    )
    assert validate_packet(pr_packet) == []

    commit_hash = "abcdef0123456789abcdef0123456789abcdef01"
    commit_packet = valid_remote_packet()
    commit_packet["handoff"].update(
        kind="commit",
        awaiting_merge=True,
        target=f"https://github.com/acme/widget/blob/{commit_hash}/STATUS.md",
        target_ref=commit_hash,
        pushed_ref_contains_update=True,
    )
    assert validate_packet(commit_packet) == []


def test_status_handoff_validator_rejects_kind_and_url_ref_mismatches():
    mislabeled_pr = valid_remote_packet()
    mislabeled_pr["handoff"].update(
        kind="pr_branch",
        awaiting_merge=True,
        pushed_ref_contains_update=True,
    )
    assert (
        "pr_branch handoff target_ref must differ from default_branch_ref"
        in validate_packet(mislabeled_pr)
    )

    url_ref_mismatch = valid_remote_packet()
    url_ref_mismatch["handoff"].update(
        kind="pr_branch",
        awaiting_merge=True,
        target_ref="feature/status-update",
        pushed_ref_contains_update=True,
    )
    assert "remote handoff URL ref must equal target_ref" in validate_packet(
        url_ref_mismatch
    )

    mislabeled_default = valid_remote_packet()
    mislabeled_default["handoff"].update(
        target="https://github.com/acme/widget/blob/feature/status/STATUS.md",
        target_ref="feature/status",
    )
    assert (
        "default_branch handoff target_ref must equal default_branch_ref"
        in validate_packet(mislabeled_default)
    )


def test_status_handoff_validator_rejects_unknown_completion_kind():
    packet = valid_remote_packet()
    packet["completion_kind"] = "milestone-complete"
    assert "completion_kind must be" in validate_packet(packet)[0]


def test_status_handoff_validator_allows_explicit_blocker_progress_packet():
    assert validate_packet({"completion_kind": "progress_blocked"}) == []


def test_status_handoff_validator_requires_pushed_ref_while_awaiting_merge():
    packet = valid_remote_packet()
    packet["handoff"].update(
        kind="pr_branch",
        awaiting_merge=True,
        target="https://github.com/acme/widget/blob/status-update/STATUS.md",
        target_ref="status-update",
        pushed_ref_contains_update=False,
    )
    errors = validate_packet(packet)
    assert "pushed_ref_contains_update must be true" in errors
