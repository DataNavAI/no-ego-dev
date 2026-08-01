from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "skills" / "play-store-publisher"


def test_daily_closed_testing_release_contract_is_complete() -> None:
    skill = (PACKAGE / "SKILL.md").read_text(encoding="utf-8")
    eval_spec = yaml.safe_load((PACKAGE / "EVAL.yaml").read_text(encoding="utf-8"))
    fixture = (PACKAGE / eval_spec["parameters"]["fixture"]).read_text(encoding="utf-8")
    expectations = "\n".join(eval_spec["expectations"])

    assert "Daily Closed-Testing Release Loop" in skill
    assert "latest uploaded Play versionCode" in skill
    assert "max(local versionCode, latest uploaded Play versionCode) + 1" in skill
    assert "source commit before the release-only version bump" in skill
    assert "closed testing track" in skill
    assert "Never upload this daily build to production" in skill
    assert "No releasable changes" in skill
    assert "release-only version bump" in skill
    assert "persist the successful source commit" in skill.lower()
    assert "daily" in skill.lower()

    lowered = expectations.lower()
    assert "daily" in lowered
    assert "closed testing" in lowered
    assert "versioncode" in lowered
    assert "production" in lowered
    assert "no releasable changes" in lowered

    assert "daily release monitor" in fixture.lower()
    assert "closed testing" in fixture.lower()
    assert "new source commit" in fixture.lower()
