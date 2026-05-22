import importlib.util
import sys
from pathlib import Path

import yaml

MODULE_PATH = Path(__file__).resolve().parents[1] / "cron" / "profile_update.py"
SPEC = importlib.util.spec_from_file_location("profile_update", MODULE_PATH)
profile_update = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = profile_update
SPEC.loader.exec_module(profile_update)

ADMIN_CHANNEL = profile_update.CONTROL_CHANNEL_ID
ALLOWED_USER = "42"
OTHER_USER = "84"


def base_state() -> dict:
    return {
        "status": "waiting_for_draft_review",
        "current_step": "generating_drafts",
        "platforms": {
            "linkedin": {"enabled": True, "publish_enabled": False},
            "facebook": {"enabled": True, "publish_enabled": False},
            "instagram": {"enabled": True, "publish_enabled": False},
            "x": {"enabled": True, "publish_enabled": False},
        },
        "approval": {
            "discord_user_allowlist": [ALLOWED_USER],
            "draft_approved": False,
            "assets_approved": False,
            "publish_approved": {
                "linkedin": False,
                "facebook": False,
                "instagram": False,
                "x": False,
            },
        },
        "secrets": {
            "discord_bot_token": "env:DISCORD_BOT_TOKEN",
            "linkedin_access_token": "env:LINKEDIN_ACCESS_TOKEN",
            "x_access_token": "env:X_ACCESS_TOKEN",
        },
    }


def approval_after(command: str, state: dict | None = None):
    return profile_update.handle_profile_command(state or base_state(), command, ADMIN_CHANNEL, ALLOWED_USER)


def assert_publish_disabled(state: dict) -> None:
    for platform in profile_update.PUBLISH_PLATFORMS:
        assert state["platforms"][platform]["publish_enabled"] is False


def test_profile_status_reports_state_without_changing_it_or_leaking_tokens():
    state = base_state()
    result = profile_update.handle_profile_command(state, "/profile status", ADMIN_CHANNEL, OTHER_USER)

    assert result.changed is False
    assert "status: waiting_for_draft_review" in result.message
    assert "draft_approved: False" in result.message
    assert "DISCORD_BOT_TOKEN" not in result.message
    assert "LINKEDIN_ACCESS_TOKEN" not in result.message
    assert result.state == state


def test_profile_commands_are_rejected_outside_control_channel():
    state = base_state()
    result = profile_update.handle_profile_command(state, "/profile approve draft", "not-admin", ALLOWED_USER)

    assert result.changed is False
    assert "관리 채널" in result.message
    assert result.state["approval"]["draft_approved"] is False


def test_approval_commands_require_allowlisted_user():
    state = base_state()
    result = profile_update.handle_profile_command(state, "/profile approve draft", ADMIN_CHANNEL, OTHER_USER)

    assert result.changed is False
    assert "승인 권한" in result.message
    assert result.state["approval"]["draft_approved"] is False


def test_profile_approve_draft_updates_state():
    result = approval_after("/profile approve draft")

    assert result.changed is True
    assert result.state["approval"]["draft_approved"] is True
    assert result.state["status"] == "waiting_for_assets"
    assert result.state["current_step"] == "draft_approved"
    assert_publish_disabled(result.state)


def test_profile_reject_draft_clears_publish_approvals():
    state = base_state()
    state["approval"]["draft_approved"] = True
    state["approval"]["publish_approved"] = {platform: True for platform in profile_update.PUBLISH_PLATFORMS}

    result = approval_after("/profile reject draft", state)

    assert result.changed is True
    assert result.state["approval"]["draft_approved"] is False
    assert result.state["approval"]["publish_approved"] == {
        "linkedin": False,
        "facebook": False,
        "instagram": False,
        "x": False,
    }
    assert result.state["status"] == "waiting_for_draft_review"
    assert result.state["current_step"] == "draft_rejected"


def test_profile_approve_assets_updates_state():
    result = approval_after("/profile approve assets")

    assert result.changed is True
    assert result.state["approval"]["assets_approved"] is True
    assert result.state["status"] == "waiting_for_final_publish_approval"
    assert result.state["current_step"] == "assets_approved"


def test_profile_approve_publish_platform_updates_only_that_platform():
    result = approval_after("/profile approve publish linkedin")

    assert result.changed is True
    assert result.state["approval"]["publish_approved"] == {
        "linkedin": True,
        "facebook": False,
        "instagram": False,
        "x": False,
    }
    assert result.state["status"] == "ready_for_manual_publish"
    assert result.state["current_step"] == "publish_approved_linkedin"
    assert_publish_disabled(result.state)


def test_profile_approve_publish_all_updates_all_platforms():
    result = approval_after("/profile approve publish all")

    assert result.changed is True
    assert result.state["approval"]["publish_approved"] == {
        "linkedin": True,
        "facebook": True,
        "instagram": True,
        "x": True,
    }
    assert result.state["current_step"] == "publish_approved_all"
    assert_publish_disabled(result.state)


def test_save_and_process_profile_command_updates_00_state_yaml(tmp_path):
    state = base_state()
    state["platforms"]["linkedin"]["publish_enabled"] = True
    profile_update.ensure_output_tree(tmp_path)
    profile_update.save_state(tmp_path, state)

    saved_before = yaml.safe_load((tmp_path / "weekly-profile-update/00_state.yaml").read_text(encoding="utf-8"))
    assert saved_before["platforms"]["linkedin"]["publish_enabled"] is False

    result = profile_update.process_profile_command(tmp_path, "/profile approve publish all", ADMIN_CHANNEL, ALLOWED_USER)
    saved_after = yaml.safe_load((tmp_path / "weekly-profile-update/00_state.yaml").read_text(encoding="utf-8"))

    assert result.changed is True
    assert saved_after["approval"]["publish_approved"] == {
        "linkedin": True,
        "facebook": True,
        "instagram": True,
        "x": True,
    }
    assert_publish_disabled(saved_after)
    assert saved_after["secrets"] == state["secrets"]


def test_save_state_redacts_literal_token_values(tmp_path):
    state = base_state()
    state["secrets"]["discord_bot_token"] = "literal-token-value"

    profile_update.save_state(tmp_path, state)
    saved = yaml.safe_load((tmp_path / "weekly-profile-update/00_state.yaml").read_text(encoding="utf-8"))

    assert saved["secrets"]["discord_bot_token"] == "redacted"
    assert "literal-token-value" not in (tmp_path / "weekly-profile-update/00_state.yaml").read_text(encoding="utf-8")


def test_allowlist_can_be_bootstrapped_then_requires_allowed_user():
    state = base_state()
    state["approval"]["discord_user_allowlist"] = []

    bootstrap = profile_update.handle_profile_command(state, "/profile allowlist add 99", ADMIN_CHANNEL, OTHER_USER)
    assert bootstrap.changed is True
    assert bootstrap.state["approval"]["discord_user_allowlist"] == ["99"]

    denied = profile_update.handle_profile_command(bootstrap.state, "/profile allowlist add 100", ADMIN_CHANNEL, OTHER_USER)
    assert denied.changed is False
    assert "allowlist 설정 권한" in denied.message


def test_allowlisted_user_can_configure_github_sources():
    state = base_state()

    username = approval_after("/profile github username ViSekEr", state)
    repos = approval_after("/profile github repos owner/one, owner/two", username.state)

    assert username.changed is True
    assert repos.changed is True
    assert repos.state["sources"]["github_username"] == "ViSekEr"
    assert repos.state["sources"]["github_repositories"] == ["owner/one", "owner/two"]
    assert_publish_disabled(repos.state)


def test_profile_assets_reports_submitted_and_approved_counts():
    state = base_state()
    state["assets"] = {
        "submitted": [{"attachment_id": "a1", "filename": "one.png", "platform": "linkedin", "uploaded_by": ALLOWED_USER}],
        "approved": [],
    }

    result = profile_update.handle_profile_command(state, "/profile assets", ADMIN_CHANNEL, OTHER_USER)

    assert result.changed is False
    assert "submitted_count: 1" in result.message
    assert "filename=one.png" in result.message
    assert "approved_count: 0" in result.message


def test_process_preview_reads_generated_post_markdown(tmp_path):
    profile_update.ensure_output_tree(tmp_path)
    profile_update.save_state(tmp_path, base_state())
    post = tmp_path / "weekly-profile-update/posts/linkedin.md"
    post.write_text("# LinkedIn Draft\n\n상태: `draft`\n\nhello preview\n\n게시 전 확인: internal", encoding="utf-8")

    result = profile_update.process_profile_command(tmp_path, "/profile preview linkedin", ADMIN_CHANNEL, ALLOWED_USER)

    assert result.changed is False
    assert result.message == "hello preview"
    assert "hello preview" in result.message
    assert "LinkedIn Draft" not in result.message
    assert "상태" not in result.message
    assert "게시 전 확인" not in result.message


def test_record_submitted_assets_writes_only_discord_attachment_metadata(tmp_path):
    profile_update.ensure_output_tree(tmp_path)
    profile_update.save_state(tmp_path, base_state())

    result = profile_update.record_submitted_assets(
        tmp_path,
        ADMIN_CHANNEL,
        OTHER_USER,
        [
            profile_update.DiscordAsset(
                attachment_id="123",
                filename="profile.png",
                platform="instagram",
                uploaded_by=OTHER_USER,
                content_type="image/png",
                size=2048,
            )
        ],
    )

    submitted = tmp_path / "weekly-profile-update/assets/submitted-assets.md"
    saved = yaml.safe_load((tmp_path / "weekly-profile-update/00_state.yaml").read_text(encoding="utf-8"))
    assert result.changed is True
    assert saved["assets"]["submitted"][0]["filename"] == "profile.png"
    assert "profile.png" in submitted.read_text(encoding="utf-8")
    assert "http" not in submitted.read_text(encoding="utf-8").lower()
    assert_publish_disabled(saved)


def test_process_approve_assets_copies_submitted_assets_to_approved_file(tmp_path):
    state = base_state()
    state["assets"] = {
        "submitted": [{"attachment_id": "asset-1", "filename": "approved.png", "platform": "linkedin", "uploaded_by": ALLOWED_USER}],
        "approved": [],
    }
    profile_update.ensure_output_tree(tmp_path)
    profile_update.save_state(tmp_path, state)

    result = profile_update.process_profile_command(tmp_path, "/profile approve assets", ADMIN_CHANNEL, ALLOWED_USER)
    saved = yaml.safe_load((tmp_path / "weekly-profile-update/00_state.yaml").read_text(encoding="utf-8"))

    assert result.changed is True
    assert saved["approval"]["assets_approved"] is True
    assert saved["assets"]["approved"] == saved["assets"]["submitted"]
    assert saved["status"] == "waiting_for_final_publish_approval"
    assert "approved.png" in (tmp_path / "weekly-profile-update/assets/approved-assets.md").read_text(encoding="utf-8")
    assert_publish_disabled(saved)



def test_profile_approve_publish_x_updates_only_x_platform():
    result = approval_after("/profile approve publish x")
    assert result.changed is True
    assert result.state["approval"]["publish_approved"] == {"linkedin": False, "facebook": False, "instagram": False, "x": True}
    assert result.state["status"] == "ready_for_manual_publish"
    assert result.state["current_step"] == "publish_approved_x"
    assert_publish_disabled(result.state)


def test_process_preview_reads_x_post_markdown_without_internal_metadata(tmp_path):
    profile_update.ensure_output_tree(tmp_path)
    profile_update.save_state(tmp_path, base_state())
    post = tmp_path / "weekly-profile-update/posts/x.md"
    post.write_text("# X Draft\n\n상태: `draft`\n\nactual x post\n\n게시 전 확인: internal", encoding="utf-8")
    result = profile_update.process_profile_command(tmp_path, "/profile preview x", ADMIN_CHANNEL, ALLOWED_USER)
    assert result.changed is False
    assert result.message == "actual x post"


def test_process_preview_all_groups_hashtags_with_instagram_section(tmp_path):
    profile_update.ensure_output_tree(tmp_path)
    profile_update.save_state(tmp_path, base_state())
    (tmp_path / "weekly-profile-update/posts/instagram-feed.md").write_text("# Instagram Feed Draft\n\n상태: `draft`\n\ninsta body", encoding="utf-8")
    (tmp_path / "weekly-profile-update/posts/hashtags.md").write_text("# Hashtags\n\n상태: `draft`\n\n#dev", encoding="utf-8")

    result = profile_update.process_profile_command(tmp_path, "/profile preview all", ADMIN_CHANNEL, ALLOWED_USER)

    assert "Instagram Feed\ninsta body\n\n#dev" in result.message
    assert "---\n\n#dev\n\n---" not in result.message


def test_save_state_redacts_literal_x_token_and_preserves_publish_disabled(tmp_path):
    state = base_state()
    state["platforms"]["x"]["publish_enabled"] = True
    state["secrets"]["x_access_token"] = "literal-x-token"
    profile_update.save_state(tmp_path, state)
    path = tmp_path / "weekly-profile-update/00_state.yaml"
    saved = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert saved["platforms"]["x"]["publish_enabled"] is False
    assert saved["secrets"]["x_access_token"] == "redacted"
    assert "literal-x-token" not in path.read_text(encoding="utf-8")


def test_cache_discord_attachment_bytes_uses_safe_attachment_id_filename(tmp_path):
    cached = profile_update.cache_discord_asset_bytes(tmp_path, "123/../../bad", "My Token Image.png", b"png-bytes")
    assert cached.relative_to(tmp_path).as_posix() == "weekly-profile-update/assets/cache/123bad.png"
    assert cached.read_bytes() == b"png-bytes"


def test_assets_message_marks_approved_asset_cache_status():
    state = base_state()
    state["assets"] = {"submitted": [], "approved": [
        {"attachment_id": "asset-1", "filename": "approved.png", "platform": "x", "cache_path": "assets/cache/asset-1.png"},
        {"attachment_id": "asset-2", "filename": "missing.png", "platform": "linkedin"},
    ]}
    result = profile_update.handle_profile_command(state, "/profile assets", ADMIN_CHANNEL, OTHER_USER)
    assert "cache=cached" in result.message
    assert "cache=missing" in result.message
    assert "http" not in result.message.lower()


def test_publish_plan_and_results_are_manual_ready_for_all_platforms_without_secret_values(tmp_path):
    profile_update.ensure_output_tree(tmp_path)
    profile_update.save_state(tmp_path, base_state())
    (tmp_path / "weekly-profile-update/posts/x.md").write_text("# X Draft\n\nx body", encoding="utf-8")
    written = profile_update.write_dry_run_publish_documents(tmp_path)
    plan = (tmp_path / "weekly-profile-update/publishing/publish-plan.md").read_text(encoding="utf-8")
    results = (tmp_path / "weekly-profile-update/publishing/publish-results.md").read_text(encoding="utf-8")
    failed = tmp_path / "weekly-profile-update/publishing/failed-publishes.md"
    assert written == [tmp_path / "weekly-profile-update/publishing/publish-plan.md", tmp_path / "weekly-profile-update/publishing/publish-results.md"]
    for name in ["LinkedIn", "Facebook", "Instagram", "X"]:
        assert name in plan
        assert name in results
    assert "manual-ready" in results
    assert "not called" in results
    assert "ACCESS_TOKEN" not in plan + results
    assert "env:" not in plan + results
    assert failed.read_text(encoding="utf-8").strip() == "# Failed Publishes\n\n상태: `none`"
