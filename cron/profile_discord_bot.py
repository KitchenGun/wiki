#!/usr/bin/env python3
"""Discord adapter for weekly profile approval commands."""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import logging
import os
import sys
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Callable, Sequence

from cron.profile_update import CONTROL_CHANNEL_ID, DiscordAsset, ProfileCommandResult, _relative_cache_path, process_profile_command, record_submitted_assets, safe_attachment_cache_path

try:
    import discord
    from discord import app_commands
    from discord.ext import commands
except ImportError:
    discord = None
    app_commands = None
    commands = None

CommandProcessor = Callable[[Path, str, str, str], ProfileCommandResult]
EnvGetter = Callable[[str], str | None]
PROFILE_LOCK_SCOPE = "weekly-profile-discord-bot-token"
DISCORD_COMMAND_GROUP = "weekly-profile"
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DiscordProfileDispatchResult:
    message: str
    processed: bool
    changed: bool = False


def _hermes_agent_path() -> Path:
    configured = os.getenv("HERMES_AGENT_PATH", "").strip()
    return Path(configured).expanduser() if configured else Path.home() / ".hermes" / "hermes-agent"


def _ensure_hermes_agent_import_path() -> None:
    hermes_agent = _hermes_agent_path()
    if os.getenv("HERMES_AGENT_PATH", "").strip() and not hermes_agent.exists():
        raise RuntimeError(
            "Hermes env loader is required to read Discord credentials; "
            "set HERMES_AGENT_PATH if Hermes is not at ~/.hermes/hermes-agent"
        )
    if hermes_agent.exists() and str(hermes_agent) not in sys.path:
        sys.path.insert(0, str(hermes_agent))


def _get_hermes_env_value(key: str) -> str | None:
    _ensure_hermes_agent_import_path()
    try:
        from hermes_cli.config import get_env_value
    except ImportError as exc:
        raise RuntimeError(
            "Hermes env loader is required to read Discord credentials; "
            "set HERMES_AGENT_PATH if Hermes is not at ~/.hermes/hermes-agent"
        ) from exc
    return get_env_value(key)


def read_discord_token(get_env_value: EnvGetter | None = None) -> str:
    getter = get_env_value or _get_hermes_env_value
    token = getter("DISCORD_BOT_TOKEN") or ""
    if not token:
        raise RuntimeError("DISCORD_BOT_TOKEN is required in the Hermes environment")
    return token


def _gateway_status_module():
    _ensure_hermes_agent_import_path()
    try:
        from gateway import status
    except ImportError as exc:
        raise RuntimeError(
            "Hermes gateway status helpers are required for the Discord bot lock; "
            "set HERMES_AGENT_PATH if Hermes is not at ~/.hermes/hermes-agent"
        ) from exc
    return status


@contextlib.contextmanager
def profile_bot_lock(token: str):
    status = _gateway_status_module()
    acquired, existing = status.acquire_scoped_lock(
        PROFILE_LOCK_SCOPE,
        token,
        metadata={"service": "weekly-profile-update-discord"},
    )
    if not acquired:
        owner_pid = existing.get("pid") if isinstance(existing, dict) else None
        detail = f" (PID {owner_pid})" if owner_pid else ""
        raise RuntimeError(f"weekly profile Discord bot already running{detail}")
    try:
        yield
    finally:
        status.release_scoped_lock(PROFILE_LOCK_SCOPE, token)


def profile_command(*parts: str) -> str:
    args = " ".join(part.strip() for part in parts if part and part.strip())
    return f"/profile {args}" if args else "/profile"


def dispatch_profile_command(
    root: Path,
    command: str,
    channel_id: str | int,
    user_id: str | int,
    processor: CommandProcessor = process_profile_command,
) -> DiscordProfileDispatchResult:
    if str(channel_id) != CONTROL_CHANNEL_ID:
        return DiscordProfileDispatchResult(
            f"거부: /{DISCORD_COMMAND_GROUP} 명령은 관리 채널에서만 사용할 수 있습니다.",
            False,
        )
    result = processor(root, command, str(channel_id), str(user_id))
    return DiscordProfileDispatchResult(result.message, True, result.changed)


async def _reply(interaction, root: Path, command: str, processor: CommandProcessor = process_profile_command) -> None:
    result = dispatch_profile_command(root, command, interaction.channel_id, interaction.user.id, processor)
    await interaction.response.send_message(result.message, ephemeral=True)


def _asset_from_attachment(attachment, platform: str, user_id: str) -> DiscordAsset:
    return DiscordAsset(
        attachment_id=str(attachment.id),
        filename=str(attachment.filename),
        platform=platform,
        uploaded_by=str(user_id),
        content_type=str(getattr(attachment, "content_type", "") or ""),
        size=getattr(attachment, "size", None),
    )


async def _reply_assets(interaction, root: Path, platform: str | None = None, attachment=None) -> None:
    if attachment is None:
        result = dispatch_profile_command(root, profile_command("assets"), interaction.channel_id, interaction.user.id)
    else:
        asset = _asset_from_attachment(attachment, platform or "general", str(interaction.user.id))
        cache_path = safe_attachment_cache_path(root, asset.attachment_id, asset.filename)
        try:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            await attachment.save(cache_path)
            asset = replace(asset, cache_path=_relative_cache_path(root, cache_path))
        except Exception as exc:
            logger.warning("could not cache Discord attachment %s: %s", asset.attachment_id, exc.__class__.__name__)
        result_data = record_submitted_assets(
            root,
            str(interaction.channel_id),
            str(interaction.user.id),
            [asset],
        )
        result = DiscordProfileDispatchResult(result_data.message, True, result_data.changed)
    await interaction.response.send_message(result.message, ephemeral=True)


def _build_allowed_mentions(discord):
    return discord.AllowedMentions(everyone=False, roles=False, users=True, replied_user=True)


async def _resolve_sync_guild(bot, guild_id: int | None):
    if discord is None:
        raise RuntimeError("discord.py is required. Install it with: python -m pip install discord.py")
    if guild_id is not None:
        return discord.Object(id=guild_id)
    channel = bot.get_channel(int(CONTROL_CHANNEL_ID))
    if channel is None:
        channel = await bot.fetch_channel(int(CONTROL_CHANNEL_ID))
    guild = getattr(channel, "guild", None)
    resolved_guild_id = getattr(guild, "id", None)
    if resolved_guild_id is None:
        raise RuntimeError("Could not resolve Discord guild from the control channel")
    return discord.Object(id=int(resolved_guild_id))


def create_bot(root: Path, guild_id: int | None = None):
    if discord is None or app_commands is None or commands is None:
        raise RuntimeError("discord.py is required. Install it with: python -m pip install discord.py")

    intents = discord.Intents.default()
    bot = commands.Bot(
        command_prefix="!",
        intents=intents,
        allowed_mentions=_build_allowed_mentions(discord),
    )
    tree = bot.tree
    profile = app_commands.Group(name=DISCORD_COMMAND_GROUP, description="Weekly profile approval controls")
    approve = app_commands.Group(name="approve", description="Approve weekly profile artifacts")
    reject = app_commands.Group(name="reject", description="Reject weekly profile artifacts")
    allowlist = app_commands.Group(name="allowlist", description="Configure approval users")
    github = app_commands.Group(name="github", description="Configure GitHub source settings")
    synced = False

    @profile.command(name="status", description="Show weekly profile approval status")
    async def status(interaction: discord.Interaction) -> None:
        await _reply(interaction, root, profile_command("status"))

    @profile.command(name="assets", description="Show or submit Discord-uploaded assets")
    @app_commands.choices(
        platform=[
            app_commands.Choice(name="general", value="general"),
            app_commands.Choice(name="linkedin", value="linkedin"),
            app_commands.Choice(name="facebook", value="facebook"),
            app_commands.Choice(name="instagram", value="instagram"),
            app_commands.Choice(name="instagram-story", value="instagram-story"),
            app_commands.Choice(name="x", value="x"),
        ]
    )
    async def assets(interaction: discord.Interaction, platform: str | None = None, attachment: discord.Attachment | None = None) -> None:
        await _reply_assets(interaction, root, platform, attachment)

    @profile.command(name="preview", description="Preview generated profile drafts")
    @app_commands.choices(
        target=[
            app_commands.Choice(name="all", value="all"),
            app_commands.Choice(name="linkedin", value="linkedin"),
            app_commands.Choice(name="facebook", value="facebook"),
            app_commands.Choice(name="instagram", value="instagram"),
            app_commands.Choice(name="x", value="x"),
        ]
    )
    async def preview(interaction: discord.Interaction, target: str = "all") -> None:
        await _reply(interaction, root, profile_command("preview", target))

    @approve.command(name="draft", description="Approve generated profile drafts")
    async def approve_draft(interaction: discord.Interaction) -> None:
        await _reply(interaction, root, profile_command("approve", "draft"))

    @reject.command(name="draft", description="Reject generated profile drafts")
    async def reject_draft(interaction: discord.Interaction) -> None:
        await _reply(interaction, root, profile_command("reject", "draft"))

    @approve.command(name="assets", description="Approve submitted profile assets")
    async def approve_assets(interaction: discord.Interaction) -> None:
        await _reply(interaction, root, profile_command("approve", "assets"))

    @approve.command(name="publish", description="Approve manual publish for a platform")
    @app_commands.choices(
        target=[
            app_commands.Choice(name="linkedin", value="linkedin"),
            app_commands.Choice(name="facebook", value="facebook"),
            app_commands.Choice(name="instagram", value="instagram"),
            app_commands.Choice(name="x", value="x"),
            app_commands.Choice(name="all", value="all"),
        ]
    )
    async def approve_publish(interaction: discord.Interaction, target: str) -> None:
        await _reply(interaction, root, profile_command("approve", "publish", target))

    @allowlist.command(name="list", description="List profile approval users")
    async def allowlist_list(interaction: discord.Interaction) -> None:
        await _reply(interaction, root, profile_command("allowlist", "list"))

    @allowlist.command(name="add", description="Add a Discord user ID to the approval allowlist")
    async def allowlist_add(interaction: discord.Interaction, user_id: str) -> None:
        await _reply(interaction, root, profile_command("allowlist", "add", user_id))

    @allowlist.command(name="remove", description="Remove a Discord user ID from the approval allowlist")
    async def allowlist_remove(interaction: discord.Interaction, user_id: str) -> None:
        await _reply(interaction, root, profile_command("allowlist", "remove", user_id))

    @github.command(name="username", description="Set GitHub username for weekly collection")
    async def github_username(interaction: discord.Interaction, username: str) -> None:
        await _reply(interaction, root, profile_command("github", "username", username))

    @github.command(name="repos", description="Set comma-separated owner/repo sources")
    async def github_repos(interaction: discord.Interaction, repositories: str) -> None:
        await _reply(interaction, root, profile_command("github", "repos", repositories))

    profile.add_command(approve)
    profile.add_command(reject)
    profile.add_command(allowlist)
    profile.add_command(github)
    tree.add_command(profile)

    @bot.event
    async def on_ready() -> None:
        nonlocal synced
        if synced:
            return
        guild = await _resolve_sync_guild(bot, guild_id)
        tree.copy_global_to(guild=guild)
        await tree.sync(guild=guild)
        synced = True
        user = bot.user.name if bot.user else "unknown"
        logger.info(
            "weekly profile Discord bot connected as %s; command /%s; control channel %s",
            user,
            DISCORD_COMMAND_GROUP,
            CONTROL_CHANNEL_ID,
        )

    return bot


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the weekly profile Discord approval bot.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Wiki repository root")
    parser.add_argument("--guild-id", type=int, default=None, help="Optional Discord guild ID for faster command sync")
    return parser.parse_args(argv)


async def run_bot(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    root = args.root.resolve()
    token = read_discord_token()
    with profile_bot_lock(token):
        bot = create_bot(root, args.guild_id)
        async with bot:
            await bot.start(token)
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    try:
        from hermes_logging import setup_logging
        from hermes_constants import get_hermes_home
        setup_logging(hermes_home=get_hermes_home(), mode="gateway")
    except Exception:
        logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    return asyncio.run(run_bot(argv))


if __name__ == "__main__":
    raise SystemExit(main())
