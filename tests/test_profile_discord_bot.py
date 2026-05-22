import importlib.util
import sys
from dataclasses import dataclass
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "cron" / "profile_discord_bot.py"
SPEC = importlib.util.spec_from_file_location("profile_discord_bot", MODULE_PATH)
profile_discord_bot = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = profile_discord_bot
SPEC.loader.exec_module(profile_discord_bot)

ADMIN_CHANNEL = profile_discord_bot.CONTROL_CHANNEL_ID


@dataclass(frozen=True)
class FakeProfileResult:
    message: str
    state: dict
    changed: bool = False


def test_profile_command_builds_process_profile_command_text():
    assert profile_discord_bot.profile_command("approve", "publish", "linkedin") == "/profile approve publish linkedin"
    assert profile_discord_bot.profile_command(" status ") == "/profile status"


def test_dispatch_ignores_non_admin_channel_without_processing(tmp_path):
    calls = []

    def processor(root, command, channel_id, user_id):
        calls.append((root, command, channel_id, user_id))
        return FakeProfileResult("should not happen", {}, True)

    result = profile_discord_bot.dispatch_profile_command(
        tmp_path,
        "/profile approve draft",
        "not-the-admin-channel",
        "42",
        processor,
    )

    assert result.processed is False
    assert result.changed is False
    assert "관리 채널" in result.message
    assert calls == []


def test_dispatch_admin_channel_calls_profile_processor(tmp_path):
    calls = []

    def processor(root, command, channel_id, user_id):
        calls.append((root, command, channel_id, user_id))
        return FakeProfileResult("초안이 승인되었습니다.", {"ok": True}, True)

    result = profile_discord_bot.dispatch_profile_command(
        tmp_path,
        "/profile approve draft",
        ADMIN_CHANNEL,
        42,
        processor,
    )

    assert result == profile_discord_bot.DiscordProfileDispatchResult("초안이 승인되었습니다.", True, True)
    assert calls == [(tmp_path, "/profile approve draft", ADMIN_CHANNEL, "42")]


def test_read_discord_token_uses_hermes_env_getter():
    calls = []

    def getter(key: str) -> str | None:
        calls.append(key)
        return "token-from-hermes-env"

    assert profile_discord_bot.read_discord_token(getter) == "token-from-hermes-env"
    assert calls == ["DISCORD_BOT_TOKEN"]


def test_read_discord_token_does_not_include_value_in_error():
    def getter(key: str) -> str | None:
        return ""

    try:
        profile_discord_bot.read_discord_token(getter)
    except RuntimeError as exc:
        assert "DISCORD_BOT_TOKEN" in str(exc)
    else:
        raise AssertionError("expected missing token error")


def test_hermes_env_loader_error_does_not_leak_values(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_AGENT_PATH", str(tmp_path / "missing-hermes"))

    try:
        profile_discord_bot._get_hermes_env_value("DISCORD_BOT_TOKEN")
    except RuntimeError as exc:
        assert "Hermes env loader" in str(exc)
        assert "token" not in str(exc).lower().replace("discord bot token", "")
    else:
        raise AssertionError("expected Hermes import error")


def test_profile_bot_lock_uses_hermes_scoped_lock(monkeypatch):
    calls = []

    class FakeStatus:
        @staticmethod
        def acquire_scoped_lock(scope, identity, metadata=None):
            calls.append(("acquire", scope, identity, metadata))
            return True, None

        @staticmethod
        def release_scoped_lock(scope, identity):
            calls.append(("release", scope, identity))

    monkeypatch.setattr(profile_discord_bot, "_gateway_status_module", lambda: FakeStatus)

    with profile_discord_bot.profile_bot_lock("token-value"):
        calls.append(("inside",))

    assert calls == [
        (
            "acquire",
            profile_discord_bot.PROFILE_LOCK_SCOPE,
            "token-value",
            {"service": "weekly-profile-update-discord"},
        ),
        ("inside",),
        ("release", profile_discord_bot.PROFILE_LOCK_SCOPE, "token-value"),
    ]


def test_profile_bot_lock_reports_duplicate_without_token(monkeypatch):
    class FakeStatus:
        @staticmethod
        def acquire_scoped_lock(scope, identity, metadata=None):
            return False, {"pid": 123}

        @staticmethod
        def release_scoped_lock(scope, identity):
            raise AssertionError("release should not run")

    monkeypatch.setattr(profile_discord_bot, "_gateway_status_module", lambda: FakeStatus)

    try:
        with profile_discord_bot.profile_bot_lock("sensitive-token"):
            pass
    except RuntimeError as exc:
        assert "PID 123" in str(exc)
        assert "sensitive-token" not in str(exc)
    else:
        raise AssertionError("expected duplicate lock error")

import asyncio


class FakeAttachment:
    id = 777
    filename = "discord-upload.png"
    content_type = "image/png"
    size = 4096


class FakeUser:
    id = 42


class FakeResponse:
    def __init__(self):
        self.message = None
        self.ephemeral = None

    async def send_message(self, message, ephemeral=False):
        self.message = message
        self.ephemeral = ephemeral


class FakeInteraction:
    channel_id = ADMIN_CHANNEL
    user = FakeUser()

    def __init__(self):
        self.response = FakeResponse()


def test_asset_from_attachment_records_metadata_without_url():
    asset = profile_discord_bot._asset_from_attachment(FakeAttachment(), "linkedin", "42")

    assert asset.attachment_id == "777"
    assert asset.filename == "discord-upload.png"
    assert asset.platform == "linkedin"
    assert asset.uploaded_by == "42"
    assert asset.content_type == "image/png"
    assert asset.size == 4096
    assert not hasattr(asset, "url")


def test_reply_assets_records_attachment_without_discord_network(monkeypatch, tmp_path):
    calls = []

    def fake_record(root, channel_id, user_id, assets):
        calls.append((root, channel_id, user_id, assets))
        return FakeProfileResult("이미지 첨부 1건을 submitted-assets.md에 기록했습니다.", {}, True)

    monkeypatch.setattr(profile_discord_bot, "record_submitted_assets", fake_record)
    interaction = FakeInteraction()

    asyncio.run(profile_discord_bot._reply_assets(interaction, tmp_path, "instagram", FakeAttachment()))

    assert interaction.response.ephemeral is True
    assert "이미지 첨부 1건" in interaction.response.message
    assert calls[0][0] == tmp_path
    assert calls[0][1] == ADMIN_CHANNEL
    assert calls[0][2] == "42"
    assert calls[0][3][0].filename == "discord-upload.png"


def test_create_bot_registers_profile_commands_without_network(tmp_path):
    try:
        bot = profile_discord_bot.create_bot(tmp_path)
    except RuntimeError as exc:
        if "discord.py is required" in str(exc):
            return
        raise
    command_names = {command.name for command in bot.tree.get_commands()}
    assert profile_discord_bot.DISCORD_COMMAND_GROUP in command_names
    assert "profile" not in command_names
    profile_group = next(command for command in bot.tree.get_commands() if command.name == profile_discord_bot.DISCORD_COMMAND_GROUP)
    assert "preview" in profile_group._children


def test_create_bot_registers_x_preview_and_publish_choices(tmp_path):
    try:
        bot = profile_discord_bot.create_bot(tmp_path)
    except RuntimeError as exc:
        if "discord.py is required" in str(exc):
            return
        raise
    profile_group = next(command for command in bot.tree.get_commands() if command.name == profile_discord_bot.DISCORD_COMMAND_GROUP)
    preview = profile_group._children["preview"]
    approve_group = profile_group._children["approve"]
    publish = approve_group._children["publish"]
    assert any(choice.value == "x" for choice in preview._params["target"].choices)
    assert any(choice.value == "x" for choice in publish._params["target"].choices)
