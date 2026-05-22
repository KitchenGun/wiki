import datetime as dt
import importlib.util
import os
import sys
from pathlib import Path

import yaml

MODULE_PATH = Path(__file__).resolve().parents[1] / "cron" / "profile_update.py"
SPEC = importlib.util.spec_from_file_location("profile_update", MODULE_PATH)
profile_update = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = profile_update
SPEC.loader.exec_module(profile_update)


def write_markdown(path: Path, title: str, mtime: dt.datetime) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"---\ntitle: {title}\nvisibility: public\n---\n\n# {title}\n", encoding="utf-8")
    timestamp = mtime.timestamp()
    os.utime(path, (timestamp, timestamp))


def test_collect_recent_public_changes_filters_by_window(tmp_path):
    now = dt.datetime(2026, 5, 18, tzinfo=dt.timezone.utc)
    recent = tmp_path / "src/content/publish/wiki/recent-note.md"
    old = tmp_path / "src/content/publish/wiki/old-note.md"
    private = tmp_path / "src/content/private/secret.md"
    write_markdown(recent, "Recent Note", now - dt.timedelta(days=1))
    write_markdown(old, "Old Note", now - dt.timedelta(days=10))
    write_markdown(private, "Private Note", now)

    changes = profile_update.collect_recent_public_changes(tmp_path, days=7, now=now)

    assert [change.path.as_posix() for change in changes] == ["src/content/publish/wiki/recent-note.md"]
    assert changes[0].title == "Recent Note"


def test_sensitive_public_paths_are_marked_for_review(tmp_path):
    now = dt.datetime(2026, 5, 18, tzinfo=dt.timezone.utc)
    secret_note = tmp_path / "src/content/publish/wiki/token-rotation.md"
    write_markdown(secret_note, "Token Rotation", now)

    changes = profile_update.collect_recent_public_changes(tmp_path, days=7, now=now)

    assert len(changes) == 1
    assert changes[0].needs_review is True


def test_write_report_creates_expected_tree(tmp_path, monkeypatch):
    now = dt.datetime(2026, 5, 18, tzinfo=dt.timezone.utc)
    write_markdown(tmp_path / "src/content/publish/wiki/public-note.md", "Public Note", now)
    monkeypatch.setattr(profile_update, "run_command", lambda args, cwd: "- mocked command output")

    written = profile_update.write_report(tmp_path, days=7)
    relative = {path.relative_to(tmp_path).as_posix() for path in written}

    assert "weekly-profile-update/00_state.yaml" in relative
    assert "weekly-profile-update/profile-update/source-evidence.md" in relative
    assert "weekly-profile-update/posts/linkedin.md" in relative
    assert "weekly-profile-update/github-summary/commits.md" in relative
    linkedin = (tmp_path / "weekly-profile-update/posts/linkedin.md").read_text(encoding="utf-8")
    publish_plan = (tmp_path / "weekly-profile-update/publishing/publish-plan.md").read_text(encoding="utf-8")
    assert "핵심 작업" in linkedin
    assert "커밋 근거" in linkedin
    assert "## LinkedIn" in publish_plan
    assert "### Body" in publish_plan
    assert "### Images" in publish_plan
    assert "핵심 작업" in publish_plan
    assert "DISCORD_BOT_TOKEN" in (tmp_path / "weekly-profile-update/00_state.yaml").read_text(encoding="utf-8")


def test_initial_state_yaml_contains_single_x_platform_with_publish_disabled(tmp_path):
    state = yaml.safe_load(profile_update.state_yaml(tmp_path))

    assert list(state["platforms"].keys()) == ["linkedin", "facebook", "instagram", "x"]
    assert state["platforms"]["x"] == {"enabled": True, "publish_enabled": False, "target": "profile"}
    assert state["approval"]["publish_approved"]["x"] is False


def test_instagram_draft_describes_work_instead_of_listing_paths(tmp_path):
    now = dt.datetime(2026, 5, 18, tzinfo=dt.timezone.utc)
    write_markdown(tmp_path / "src/content/publish/wiki/personal-hermes-agent.md", "Personal Hermes Agent", now)
    monkeypatch = None
    changes = profile_update.collect_recent_public_changes(tmp_path, days=7, now=now)

    draft = profile_update.instagram_feed_draft(changes)

    assert "개인 Hermes Agent 운영 기록" in draft
    assert "src/content" not in draft


def test_main_rejects_non_positive_days(tmp_path):
    try:
        profile_update.main(["--root", str(tmp_path), "--days", "0"])
    except SystemExit as exc:
        assert "--days must be a positive integer" in str(exc)
    else:
        raise AssertionError("expected SystemExit")
