#!/usr/bin/env python3
"""Weekly profile update job for the public Wiki workspace."""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Sequence

import yaml

CONTROL_CHANNEL_ID = "1504020211194662994"
DEFAULT_WINDOW_DAYS = 7
JOB_DIR_NAME = "weekly-profile-update"
PUBLIC_COMMAND_PREFIX = "/weekly-profile"
STATE_FILE_NAME = "00_state.yaml"
PUBLISH_PLATFORMS = ("linkedin", "facebook", "instagram", "x")
PREVIEW_FILES = {
    "linkedin": ("posts/linkedin.md",),
    "facebook": ("posts/facebook.md",),
    "instagram": ("posts/instagram-feed.md", "posts/hashtags.md"),
    "instagram-story": ("posts/instagram-story.md",),
    "x": ("posts/x.md",),
    "all": ("posts/linkedin.md", "posts/facebook.md", "posts/instagram-feed.md", "posts/hashtags.md", "posts/instagram-story.md", "posts/x.md"),
}
PREVIEW_LABELS = {
    "posts/linkedin.md": "LinkedIn",
    "posts/facebook.md": "Facebook",
    "posts/instagram-feed.md": "Instagram Feed",
    "posts/instagram-story.md": "Instagram Story",
    "posts/x.md": "X",
}
DISCORD_MESSAGE_LIMIT = 1900
PUBLIC_CONTENT_DIRS = (
    Path("src/content/publish/blog"),
    Path("src/content/publish/wiki"),
    Path("src/content/publish/pages"),
)
SENSITIVE_MARKERS = (
    "secret",
    "token",
    "password",
    "private",
    "internal",
    "credential",
    "api_key",
    "apikey",
    "client_secret",
)
OUTPUT_FILES = (
    "profile-update/source-evidence.md",
    "profile-update/public-claims.md",
    "profile-update/needs-review.md",
    "profile-update/asset-requests.md",
    "github-summary/commits.md",
    "github-summary/pull-requests.md",
    "github-summary/issues.md",
    "github-summary/repositories.md",
    "github-summary/weekly-summary.md",
    "github-summary/public-post-candidates.md",
    "posts/linkedin.md",
    "posts/facebook.md",
    "posts/instagram-feed.md",
    "posts/instagram-story.md",
    "posts/x.md",
    "posts/hashtags.md",
    "assets/requested-assets.md",
    "assets/submitted-assets.md",
    "assets/approved-assets.md",
    "discord-status-check.md",
    "schedule/systemd-service.md",
    "schedule/systemd-timer.md",
    "publishing/publish-plan.md",
    "publishing/publish-results.md",
    "publishing/failed-publishes.md",
    "checklists/review-checklist.md",
    "checklists/fallback-manual-posting.md",
)


@dataclass(frozen=True)
class ChangedFile:
    path: Path
    title: str
    changed_at: dt.datetime
    needs_review: bool = False


@dataclass(frozen=True)
class GitCommit:
    repo: str
    date: str
    sha: str
    subject: str


@dataclass(frozen=True)
class ProfileCommandResult:
    message: str
    state: dict[str, Any]
    changed: bool = False


@dataclass(frozen=True)
class DiscordAsset:
    attachment_id: str
    filename: str
    platform: str = "general"
    uploaded_by: str = ""
    uploaded_at: str = ""
    content_type: str = ""
    size: int | None = None
    cache_path: str = ""


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def job_dir(root: Path) -> Path:
    return root / JOB_DIR_NAME


def state_path(root: Path) -> Path:
    return job_dir(root) / STATE_FILE_NAME


def load_state(root: Path) -> dict[str, Any]:
    path = state_path(root)
    if not path.exists():
        ensure_output_tree(root)
    loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    if loaded is None:
        return {}
    if not isinstance(loaded, dict):
        raise ValueError(f"state file must contain a mapping: {path}")
    return loaded


def save_state(root: Path, state: dict[str, Any]) -> Path:
    path = state_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    sanitized = _state_for_persistence(state)
    path.write_text(yaml.safe_dump(sanitized, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return path


def _state_for_persistence(state: dict[str, Any]) -> dict[str, Any]:
    sanitized = _state_with_publish_disabled(state)
    secrets = sanitized.get("secrets", {})
    if isinstance(secrets, dict):
        for key, value in list(secrets.items()):
            key_l = str(key).lower()
            if any(marker in key_l for marker in SENSITIVE_MARKERS) and isinstance(value, str) and not value.startswith("env:"):
                secrets[key] = "redacted"
    return sanitized


def _state_with_publish_disabled(state: dict[str, Any]) -> dict[str, Any]:
    sanitized = copy.deepcopy(state)
    platforms = sanitized.setdefault("platforms", {})
    for platform in PUBLISH_PLATFORMS:
        platform_state = platforms.setdefault(platform, {})
        if isinstance(platform_state, dict):
            platform_state["publish_enabled"] = False
    return sanitized


def _approval_state(state: dict[str, Any]) -> dict[str, Any]:
    approval = state.setdefault("approval", {})
    approval.setdefault("discord_user_allowlist", [])
    approval.setdefault("draft_approved", False)
    approval.setdefault("assets_approved", False)
    publish = approval.setdefault("publish_approved", {})
    for platform in PUBLISH_PLATFORMS:
        publish.setdefault(platform, False)
    return approval


def _is_allowlisted(state: dict[str, Any], user_id: str) -> bool:
    allowlist = _approval_state(state).get("discord_user_allowlist", [])
    return str(user_id) in {str(allowed) for allowed in allowlist}


def _configuration_allowed(state: dict[str, Any], user_id: str) -> bool:
    allowlist = _approval_state(state).get("discord_user_allowlist", [])
    return not allowlist or _is_allowlisted(state, user_id)


def _sources_state(state: dict[str, Any]) -> dict[str, Any]:
    sources = state.setdefault("sources", {})
    sources.setdefault("github_username", None)
    sources.setdefault("github_repositories", [])
    return sources


def _assets_state(state: dict[str, Any]) -> dict[str, Any]:
    assets = state.setdefault("assets", {})
    assets.setdefault("submitted", [])
    assets.setdefault("approved", [])
    return assets


def _asset_key(asset: dict[str, Any]) -> tuple[str, str]:
    return (str(asset.get("attachment_id", "")), str(asset.get("filename", "")))


def safe_attachment_cache_path(root: Path, attachment_id: str, filename: str) -> Path:
    safe_id = "".join(ch for ch in str(attachment_id) if ch.isalnum() or ch in {"_", "-"}) or "attachment"
    suffix = Path(filename).suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        suffix = ".bin"
    return job_dir(root) / "assets" / "cache" / f"{safe_id}{suffix}"


def cache_discord_asset_bytes(root: Path, attachment_id: str, filename: str, content: bytes) -> Path:
    path = safe_attachment_cache_path(root, attachment_id, filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def _relative_cache_path(root: Path, path: Path) -> str:
    return path.relative_to(job_dir(root)).as_posix()


def _format_asset(asset: dict[str, Any]) -> str:
    platform = asset.get("platform") or "general"
    filename = asset.get("filename") or "unnamed"
    attachment_id = asset.get("attachment_id") or "unknown"
    uploaded_by = asset.get("uploaded_by") or "unknown"
    uploaded_at = asset.get("uploaded_at") or "unknown"
    cache_status = "cached" if asset.get("cache_path") else "missing"
    return f"- platform={platform} id={attachment_id} filename={filename} uploaded_by={uploaded_by} uploaded_at={uploaded_at} cache={cache_status}"


def _assets_message(state: dict[str, Any]) -> str:
    assets = _assets_state(copy.deepcopy(state))
    submitted = assets.get("submitted", [])
    approved = assets.get("approved", [])
    submitted_lines = "\n".join(_format_asset(asset) for asset in submitted) or "- submitted assets 없음"
    approved_lines = "\n".join(_format_asset(asset) for asset in approved) or "- approved assets 없음"
    return "\n".join([
        "requested: LinkedIn 1, Facebook 1, Instagram feed 1-3, Instagram Story 1",
        f"submitted_count: {len(submitted)}",
        submitted_lines,
        f"approved_count: {len(approved)}",
        approved_lines,
    ])


def _write_assets_files(root: Path, state: dict[str, Any]) -> list[Path]:
    base = job_dir(root) / "assets"
    base.mkdir(parents=True, exist_ok=True)
    assets = _assets_state(state)
    submitted = assets.get("submitted", [])
    approved = assets.get("approved", [])
    submitted_text = "# Submitted Assets\n\n상태: `submitted`\n\nDiscord에 사용자가 업로드한 첨부 메타데이터만 기록한다. 승인 플로우용 로컬 캐시는 attachment id 기반 안전 파일명만 저장하며 원본 URL은 저장하지 않는다.\n\n## Assets\n\n"
    submitted_text += "\n".join(_format_asset(asset) for asset in submitted) or "- 없음"
    approved_text = "# Approved Assets\n\n상태: `approved`\n\n사용자가 Discord에서 승인한 이미지 첨부만 기록한다.\n\n## Assets\n\n"
    approved_text += "\n".join(_format_asset(asset) for asset in approved) or "- 없음"
    submitted_path = base / "submitted-assets.md"
    approved_path = base / "approved-assets.md"
    submitted_path.write_text(submitted_text.rstrip() + "\n", encoding="utf-8")
    approved_path.write_text(approved_text.rstrip() + "\n", encoding="utf-8")
    return [submitted_path, approved_path]


def record_submitted_assets(root: Path, channel_id: str, user_id: str, assets: Sequence[DiscordAsset]) -> ProfileCommandResult:
    state = _state_with_publish_disabled(load_state(root))
    if str(channel_id) != CONTROL_CHANNEL_ID:
        return ProfileCommandResult(f"거부: {PUBLIC_COMMAND_PREFIX} assets는 관리 채널에서만 사용할 수 있습니다.", state)
    if not assets:
        return ProfileCommandResult(_assets_message(state), state)
    assets_state = _assets_state(state)
    existing_keys = {_asset_key(asset) for asset in assets_state["submitted"]}
    added = 0
    for asset in assets:
        item = {
            "platform": asset.platform or "general",
            "attachment_id": str(asset.attachment_id),
            "filename": asset.filename,
            "uploaded_by": str(asset.uploaded_by or user_id),
            "uploaded_at": asset.uploaded_at or utc_now().isoformat(),
            "content_type": asset.content_type,
            "size": asset.size,
        }
        if asset.cache_path:
            item["cache_path"] = asset.cache_path
        key = _asset_key(item)
        if key in existing_keys:
            continue
        assets_state["submitted"].append(item)
        existing_keys.add(key)
        added += 1
    state["status"] = "waiting_for_assets"
    state["current_step"] = "assets_submitted"
    save_state(root, state)
    _write_assets_files(root, state)
    return ProfileCommandResult(f"이미지 첨부 {added}건을 submitted-assets.md에 기록했습니다.", state, added > 0)


def _write_discord_status_check(root: Path) -> Path:
    path = job_dir(root) / "discord-status-check.md"
    path.write_text("""# Discord Status Check

## Procedure

1. Discord 관리 채널 `1504020211194662994`에서 `/weekly-profile status`를 실행한다.
2. 응답에 `status`, `current_step`, `draft_approved`, `assets_approved`, `publish_approved`가 보이는지 확인한다.
3. 응답 또는 로그에 토큰/secret 값이 없는지 확인한다.
4. 실패 시 `journalctl --user -u weekly-profile-discord-bot.service --since \"10 minutes ago\" --no-pager`와 Hermes `gateway.log`의 오류만 확인한다.

## Expected

- 봇이 ephemeral 응답을 반환한다.
- 자동 게시 API는 호출되지 않는다.
- `publish_enabled`는 모든 플랫폼에서 `false`다.
""", encoding="utf-8")
    return path


def _write_schedule_docs(root: Path) -> list[Path]:
    base = job_dir(root) / "schedule"
    base.mkdir(parents=True, exist_ok=True)
    service = base / "systemd-service.md"
    timer = base / "systemd-timer.md"
    service.write_text("""# Weekly Profile Update Service

`weekly-profile-update.service` runs:

```bash
/mnt/e/Wiki/cron/profile_update.py --root /mnt/e/Wiki
```

The job only generates drafts and approval files. It does not call publishing APIs.
""", encoding="utf-8")
    timer.write_text("""# Weekly Profile Update Timer

`weekly-profile-update.timer` runs the draft generation service weekly.

Manage with:

```bash
python scripts/profile_weekly_scheduler.py install
python scripts/profile_weekly_scheduler.py start
python scripts/profile_weekly_scheduler.py status
```
""", encoding="utf-8")
    return [service, timer]


def _profile_status_message(state: dict[str, Any]) -> str:
    snapshot = copy.deepcopy(state)
    approval = _approval_state(snapshot)
    publish = approval.get("publish_approved", {})
    sources = _sources_state(snapshot)
    assets = _assets_state(snapshot)
    return "\n".join(
        [
            f"status: {state.get('status', 'unknown')}",
            f"current_step: {state.get('current_step', 'unknown')}",
            f"github_username: {sources.get('github_username') or 'unset'}",
            "github_repositories: " + (", ".join(str(repo) for repo in sources.get("github_repositories", [])) or "unset"),
            f"draft_approved: {bool(approval.get('draft_approved'))}",
            f"assets_approved: {bool(approval.get('assets_approved'))}",
            f"submitted_assets: {len(assets.get('submitted', []))}",
            f"approved_assets: {len(assets.get('approved', []))}",
            "publish_approved: "
            + ", ".join(f"{platform}={bool(publish.get(platform))}" for platform in PUBLISH_PLATFORMS),
        ]
    )


def _truncate_discord_message(message: str, limit: int = DISCORD_MESSAGE_LIMIT) -> str:
    if len(message) <= limit:
        return message
    return message[: limit - 40].rstrip() + "\n\n[truncated: open posts/*.md for full draft]"


def _platform_post_text(markdown: str) -> str:
    lines: list[str] = []
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if line.startswith("# "):
            continue
        if line.startswith("상태:") or line.startswith("?곹깭:"):
            continue
        if line.startswith("게시 전 확인:") or line.startswith("寃뚯떆"):
            break
        if not line and not lines:
            continue
        lines.append(raw_line.rstrip())
    text = "\n".join(lines).strip()
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text


def _preview_posts_message(root: Path, target: str) -> str:
    files = PREVIEW_FILES.get(target)
    if files is None:
        return "error: supported preview targets are linkedin, facebook, instagram, instagram-story, x, all"
    sections = []
    for rel in files:
        path = job_dir(root) / rel
        if not path.exists():
            continue
        text = _platform_post_text(path.read_text(encoding="utf-8"))
        if not text:
            continue
        if target == "all":
            label = PREVIEW_LABELS.get(rel)
            if label:
                sections.append(f"{label}\n{text}")
            elif sections:
                sections[-1] = sections[-1].rstrip() + "\n\n" + text
            else:
                sections.append(text)
        else:
            sections.append(text)
    separator = "\n\n---\n\n" if target == "all" else "\n\n"
    return _truncate_discord_message(separator.join(sections) or "preview content is empty")


def handle_profile_command(
    state: dict[str, Any],
    command: str,
    channel_id: str,
    user_id: str,
) -> ProfileCommandResult:
    """Return the state transition for a Discord /profile command without side effects."""
    next_state = _state_with_publish_disabled(state)
    if str(channel_id) != CONTROL_CHANNEL_ID:
        return ProfileCommandResult(f"거부: {PUBLIC_COMMAND_PREFIX} 명령은 관리 채널에서만 사용할 수 있습니다.", next_state)

    parts = command.strip().split()
    if not parts or parts[0] != "/profile":
        return ProfileCommandResult("거부: 지원하지 않는 명령입니다.", next_state)
    args = parts[1:]

    if args == ["status"]:
        return ProfileCommandResult(_profile_status_message(next_state), next_state)

    if args == ["assets"]:
        return ProfileCommandResult(_assets_message(next_state), next_state)

    if args[:1] == ["allowlist"]:
        if args == ["allowlist", "list"]:
            users = _approval_state(next_state).get("discord_user_allowlist", [])
            return ProfileCommandResult("allowlist: " + (", ".join(str(user) for user in users) or "empty"), next_state)
        if not _configuration_allowed(next_state, user_id):
            return ProfileCommandResult("거부: allowlist 설정 권한이 없는 사용자입니다.", next_state)
        approval = _approval_state(next_state)
        if len(args) == 3 and args[1] == "add":
            target = str(args[2])
            if target not in {str(value) for value in approval["discord_user_allowlist"]}:
                approval["discord_user_allowlist"].append(target)
            next_state["current_step"] = "allowlist_updated"
            return ProfileCommandResult(f"승인자 allowlist에 {target} 사용자를 추가했습니다.", next_state, True)
        if len(args) == 3 and args[1] == "remove":
            target = str(args[2])
            approval["discord_user_allowlist"] = [value for value in approval["discord_user_allowlist"] if str(value) != target]
            next_state["current_step"] = "allowlist_updated"
            return ProfileCommandResult(f"승인자 allowlist에서 {target} 사용자를 제거했습니다.", next_state, True)
        return ProfileCommandResult(
            f"거부: 사용법 {PUBLIC_COMMAND_PREFIX} allowlist add|remove <discord_user_id> "
            f"또는 {PUBLIC_COMMAND_PREFIX} allowlist list",
            next_state,
        )

    if args[:1] == ["github"]:
        if not _configuration_allowed(next_state, user_id):
            return ProfileCommandResult("거부: GitHub 설정 권한이 없는 사용자입니다.", next_state)
        sources = _sources_state(next_state)
        if len(args) == 3 and args[1] == "username":
            sources["github_username"] = args[2]
            next_state["current_step"] = "github_username_updated"
            return ProfileCommandResult(f"GitHub username을 {args[2]}로 설정했습니다.", next_state, True)
        if len(args) >= 3 and args[1] == "repos":
            repos = []
            for item in " ".join(args[2:]).replace(",", " ").split():
                cleaned = item.strip()
                if cleaned:
                    repos.append(cleaned)
            sources["github_repositories"] = repos
            next_state["current_step"] = "github_repositories_updated"
            return ProfileCommandResult(f"GitHub repository {len(repos)}건을 설정했습니다.", next_state, True)
        return ProfileCommandResult(
            f"거부: 사용법 {PUBLIC_COMMAND_PREFIX} github username <name> "
            f"또는 {PUBLIC_COMMAND_PREFIX} github repos <owner/repo,...>",
            next_state,
        )

    is_approval_command = bool(args) and args[0] in {"approve", "reject"}
    if is_approval_command and not _is_allowlisted(next_state, user_id):
        return ProfileCommandResult("거부: 승인 권한이 없는 사용자입니다.", next_state)

    approval = _approval_state(next_state)
    if args == ["approve", "draft"]:
        approval["draft_approved"] = True
        next_state["status"] = "waiting_for_assets"
        next_state["current_step"] = "draft_approved"
        return ProfileCommandResult("초안이 승인되었습니다.", next_state, True)

    if args == ["reject", "draft"]:
        approval["draft_approved"] = False
        for platform in PUBLISH_PLATFORMS:
            approval["publish_approved"][platform] = False
        next_state["status"] = "waiting_for_draft_review"
        next_state["current_step"] = "draft_rejected"
        return ProfileCommandResult("초안이 반려되었습니다.", next_state, True)

    if args == ["approve", "assets"]:
        approval["assets_approved"] = True
        assets = _assets_state(next_state)
        assets["approved"] = list(assets.get("submitted", []))
        next_state["status"] = "waiting_for_final_publish_approval"
        next_state["current_step"] = "assets_approved"
        return ProfileCommandResult("이미지 자산이 승인되었습니다.", next_state, True)

    if len(args) == 3 and args[:2] == ["approve", "publish"]:
        target = args[2]
        if target == "all":
            targets = PUBLISH_PLATFORMS
        elif target in PUBLISH_PLATFORMS:
            targets = (target,)
        else:
            return ProfileCommandResult("거부: 지원하지 않는 게시 대상입니다.", next_state)
        for platform in targets:
            approval["publish_approved"][platform] = True
        next_state["status"] = "ready_for_manual_publish"
        next_state["current_step"] = f"publish_approved_{target}"
        return ProfileCommandResult(f"게시 승인이 기록되었습니다: {target}", next_state, True)

    return ProfileCommandResult(f"거부: 지원하지 않는 {PUBLIC_COMMAND_PREFIX} 명령입니다.", next_state)


def process_profile_command(root: Path, command: str, channel_id: str, user_id: str) -> ProfileCommandResult:
    parts = command.strip().split()
    if str(channel_id) == CONTROL_CHANNEL_ID and len(parts) in {2, 3} and parts[:2] == ["/profile", "preview"]:
        state = _state_with_publish_disabled(load_state(root))
        if not _is_allowlisted(state, user_id):
            return ProfileCommandResult("error: preview requires an allowlisted user", state)
        target = parts[2] if len(parts) == 3 else "all"
        return ProfileCommandResult(_preview_posts_message(root, target), state)
    result = handle_profile_command(load_state(root), command, channel_id, user_id)
    if result.changed:
        save_state(root, result.state)
        parts = command.strip().split()
        if parts[1:3] == ["approve", "assets"] or parts[1:2] == ["assets"]:
            _write_assets_files(root, result.state)
    return result


def state_yaml(root: Path, days: int = DEFAULT_WINDOW_DAYS) -> str:
    return f"""job_id: weekly_profile_update
schedule: weekly
control_channel_id: "{CONTROL_CHANNEL_ID}"
status: waiting_for_user
current_step: start_weekly_job

sources:
  wiki_path: "{root.as_posix()}"
  windows_wiki_path: "E:\\\\Wiki"
  github_window_days: {days}
  github_username: null
  github_repositories: []
  include_private_repositories: false

platforms:
  linkedin:
    enabled: true
    publish_enabled: false
    target: null
  facebook:
    enabled: true
    publish_enabled: false
    target: page
    page_id: null
  instagram:
    enabled: true
    publish_enabled: false
    account_type_required: business_or_creator
    publish_feed: true
    publish_story: false
  x:
    enabled: true
    publish_enabled: false
    target: profile

image_policy:
  agent_selects_images: false
  user_upload_required: true
  require_user_approval: true

publish_policy:
  require_final_approval: true
  allow_platform_partial_publish: true
  prevent_duplicate_publish: true

scheduler:
  enabled: true
  systemd_timer: weekly-profile-update.timer
  on_calendar: weekly

assets:
  submitted: []
  approved: []

approval:
  discord_user_allowlist: []
  draft_approved: false
  assets_approved: false
  publish_approved:
    linkedin: false
    facebook: false
    instagram: false
    x: false

secrets:
  discord_bot_token: env:DISCORD_BOT_TOKEN
  github_token: env:GITHUB_TOKEN
  linkedin_access_token: env:LINKEDIN_ACCESS_TOKEN
  meta_page_access_token: env:META_PAGE_ACCESS_TOKEN
  x_access_token: env:X_ACCESS_TOKEN
"""


def ensure_output_tree(root: Path, days: int = DEFAULT_WINDOW_DAYS) -> list[Path]:
    base = job_dir(root)
    base.mkdir(parents=True, exist_ok=True)
    paths = [base / STATE_FILE_NAME]
    if not paths[0].exists():
        paths[0].write_text(state_yaml(root, days), encoding="utf-8")
    for relative in OUTPUT_FILES:
        path = base / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_text(f"# {path.stem.replace('-', ' ').title()}\n\n상태: `pending`\n", encoding="utf-8")
        paths.append(path)
    return paths


def title_from_markdown(path: Path) -> str:
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("# "):
                return stripped[2:].strip()
            if stripped.startswith("title:"):
                return stripped.split(":", 1)[1].strip().strip('"\'')
    except UnicodeDecodeError:
        pass
    return path.stem.replace("-", " ").title()


def is_sensitive_path(path: Path) -> bool:
    lowered = path.as_posix().lower()
    return any(marker in lowered for marker in SENSITIVE_MARKERS)


def public_markdown_files(root: Path) -> Iterable[Path]:
    for content_dir in PUBLIC_CONTENT_DIRS:
        directory = root / content_dir
        if directory.exists():
            yield from sorted(directory.rglob("*.md"))
            yield from sorted(directory.rglob("*.mdx"))


def collect_recent_public_changes(
    root: Path,
    days: int = DEFAULT_WINDOW_DAYS,
    now: dt.datetime | None = None,
) -> list[ChangedFile]:
    current = now or utc_now()
    cutoff = current - dt.timedelta(days=days)
    changes = []
    for path in public_markdown_files(root):
        changed_at = dt.datetime.fromtimestamp(path.stat().st_mtime, tz=dt.timezone.utc)
        if changed_at < cutoff:
            continue
        relative = path.relative_to(root)
        changes.append(ChangedFile(relative, title_from_markdown(path), changed_at, is_sensitive_path(relative)))
    return sorted(changes, key=lambda change: change.changed_at, reverse=True)


def run_command(args: Sequence[str], cwd: Path) -> str:
    try:
        completed = subprocess.run(
            args,
            cwd=cwd,
            check=False,
            text=True,
            encoding="utf-8",
            errors="replace",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        return f"사용 불가: {exc.__class__.__name__}"
    output = completed.stdout.strip() or completed.stderr.strip()
    if completed.returncode != 0:
        return output or f"명령 실패: exit {completed.returncode}"
    return output or "결과 없음"


def collect_git_commits(root: Path, days: int) -> str:
    return run_command(["git", "log", f"--since={days} days ago", "--date=short", "--pretty=format:- %ad %h %s"], root)


def collect_local_commit_items(root: Path, days: int) -> list[GitCommit]:
    output = run_command(
        ["git", "log", f"--since={days} days ago", "--date=short", "--pretty=format:%ad%x09%h%x09%s"],
        root,
    )
    commits: list[GitCommit] = []
    if output.startswith("사용 불가") or output.startswith("명령 실패") or output == "결과 없음":
        return commits
    for line in output.splitlines():
        parts = line.split("\t", 2)
        if len(parts) != 3:
            continue
        commits.append(GitCommit("local/wiki", parts[0], parts[1], parts[2]))
    return commits


def collect_github_commit_items(root: Path, repositories: Sequence[str], days: int) -> list[GitCommit]:
    since = (utc_now() - dt.timedelta(days=days)).isoformat().replace("+00:00", "Z")
    commits: list[GitCommit] = []
    for repo in repositories:
        repo_name = str(repo).strip()
        if not repo_name or "/" not in repo_name:
            continue
        endpoint = f"/repos/{repo_name}/commits?since={since}&per_page=50"
        try:
            completed = subprocess.run(
                ["gh", "api", endpoint],
                cwd=root,
                check=False,
                text=True,
                encoding="utf-8",
                errors="replace",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=30,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
        if completed.returncode != 0 or not completed.stdout.strip():
            continue
        try:
            payload = json.loads(completed.stdout)
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, list):
            continue
        for item in payload:
            if not isinstance(item, dict):
                continue
            commit = item.get("commit", {})
            if not isinstance(commit, dict):
                continue
            message = str(commit.get("message", "")).splitlines()[0].strip()
            if not message:
                continue
            committer = commit.get("committer") if isinstance(commit.get("committer"), dict) else {}
            author = commit.get("author") if isinstance(commit.get("author"), dict) else {}
            date = str(committer.get("date") or author.get("date") or "")[:10]
            commits.append(GitCommit(repo_name, date or "unknown", str(item.get("sha", ""))[:7], message))
    return commits


def format_commit_evidence(commits: Sequence[GitCommit]) -> str:
    if not commits:
        return "- 최근 7일 커밋 없음"
    return "\n".join(f"- {commit.date} `{commit.repo}` {commit.sha}: {commit.subject}" for commit in commits[:30])


def collect_github_activity(root: Path, days: int) -> dict[str, str]:
    since = (utc_now() - dt.timedelta(days=days)).date().isoformat()
    return {
        "pull-requests": run_command(["gh", "pr", "list", "--state", "all", "--search", f"updated:>={since}", "--limit", "30"], root),
        "issues": run_command(["gh", "issue", "list", "--state", "all", "--search", f"updated:>={since}", "--limit", "30"], root),
        "repositories": run_command(["gh", "repo", "view", "--json", "nameWithOwner,url,description"], root),
    }


def bullet_changes(changes: Sequence[ChangedFile]) -> str:
    if not changes:
        return "- 최근 변경된 공개 Markdown 후보 없음"
    lines = []
    for change in changes:
        marker = " NEEDS_REVIEW" if change.needs_review else ""
        lines.append(f"- {change.changed_at.date().isoformat()} `{change.path.as_posix()}`: {change.title}{marker}")
    return "\n".join(lines)


def public_work_themes(changes: Sequence[ChangedFile]) -> list[str]:
    titles = " ".join(change.title.lower() for change in changes)
    paths = " ".join(change.path.as_posix().lower() for change in changes)
    text = f"{titles} {paths}"
    themes: list[str] = []
    if "hermes" in text or "agent" in text:
        themes.append("개인 Hermes Agent 운영 기록과 공개 가능한 지식 베이스를 정리했습니다.")
    if "about" in text or "cv" in text or "portfolio" in text:
        themes.append("포트폴리오와 자기소개 페이지를 최신 작업 흐름에 맞게 다듬었습니다.")
    if "wiki" in text or "note" in text:
        themes.append("Wiki 노트를 단순 기록이 아니라 재사용 가능한 공개 문서 후보로 정리했습니다.")
    if not themes:
        themes.append("이번 주 공개 가능한 작업 기록을 선별하고 게시 가능한 형태로 정리했습니다.")
    return themes[:3]


def commit_work_themes(commits: Sequence[GitCommit], changes: Sequence[ChangedFile]) -> list[str]:
    subjects = " ".join(commit.subject.lower() for commit in commits)
    themes: list[str] = []

    def add(theme: str) -> None:
        if theme not in themes:
            themes.append(theme)

    if "reuse-first" in subjects or "discovery" in subjects:
        add("Hermes 작업 흐름에서 기존 구현과 도구를 먼저 찾는 reuse-first 절차를 정리했습니다.")
    if "company operations" in subjects or "operations workflow" in subjects:
        add("회사/운영 업무를 에이전트가 처리할 수 있도록 operations workflow를 추가했습니다.")
    if "job registry" in subjects or "안전장치" in subjects:
        add("반복 자동화 작업을 Job Registry로 추적하고 안전장치를 두는 구조를 보강했습니다.")
    if "readme" in subjects or "document" in subjects or "문서" in subjects:
        add("README와 운영 문서를 갱신해 나중에 같은 작업을 재현하기 쉽게 만들었습니다.")
    if "discord" in subjects or "approval" in subjects or "preview" in subjects:
        add("Discord 승인과 미리보기 흐름을 개선해 게시 전 검토 단계를 더 명확하게 만들었습니다.")
    if "test" in subjects or "pytest" in subjects or "build" in subjects:
        add("테스트와 빌드 검증을 보강해 자동화가 조용히 실패하지 않도록 했습니다.")

    if themes:
        return themes[:4]
    return public_work_themes(changes)


def commit_work_summary(commits: Sequence[GitCommit], changes: Sequence[ChangedFile]) -> str:
    return "\n".join(f"- {theme}" for theme in commit_work_themes(commits, changes))


def commit_evidence_summary(commits: Sequence[GitCommit]) -> str:
    if not commits:
        return "- 최근 7일 커밋 없음"
    return "\n".join(f"- {commit.repo}: {commit.subject}" for commit in commits[:6])


def public_work_summary(changes: Sequence[ChangedFile]) -> str:
    return "\n".join(f"- {theme}" for theme in public_work_themes(changes))


def evidence_summary(changes: Sequence[ChangedFile]) -> str:
    if not changes:
        return "- 최근 공개 후보 문서 변경 없음"
    return "\n".join(f"- {change.title}" for change in changes[:5])


def write_text(path: Path, content: str, dry_run: bool) -> Path:
    if not dry_run:
        path.write_text(content.rstrip() + "\n", encoding="utf-8")
    return path


def write_report(root: Path, days: int, dry_run: bool = False) -> list[Path]:
    paths = ensure_output_tree(root, days)
    base = job_dir(root)
    state = load_state(root)
    sources = _sources_state(state)
    repositories = [str(repo) for repo in sources.get("github_repositories", [])]
    changes = collect_recent_public_changes(root, days)
    generated_at = utc_now().strftime("%Y-%m-%d %H:%M UTC")
    public_changes = [change for change in changes if not change.needs_review]
    review_changes = [change for change in changes if change.needs_review]
    gh_activity = collect_github_activity(root, days)
    local_commits = collect_local_commit_items(root, days)
    github_commits = collect_github_commit_items(root, repositories, days)
    commits = github_commits or local_commits

    reports = {
        "profile-update/source-evidence.md": f"""# Source Evidence

상태: `collected`
생성: {generated_at}

## Wiki

- 경로: `{root.as_posix()}`
- Windows 경로: `E:\\Wiki`
- 수집 범위: 최근 {days}일 변경분

## Recent Public Wiki Changes

{bullet_changes(changes)}

## Evidence Rules

- 게시문에 쓰는 주장은 이 파일 또는 GitHub 요약에 근거가 있어야 한다.
- 근거가 약한 문구는 `needs-review.md`로 보낸다.
""",
        "profile-update/public-claims.md": f"# Public Claims\n\n상태: `draft`\n\n## Approved Public Claims\n\n{bullet_changes(public_changes)}\n",
        "profile-update/needs-review.md": f"# Needs Review\n\n상태: `pending_review`\n\n## Review Items\n\n{bullet_changes(review_changes)}\n",
        "github-summary/commits.md": f"# Commits\n\n상태: `collected`\n\n## Analyzed Commits\n\n{format_commit_evidence(commits)}\n\n## Local Wiki Git\n\n{collect_git_commits(root, days)}\n",
        "github-summary/pull-requests.md": f"# Pull Requests\n\n상태: `collected`\n\n{gh_activity['pull-requests']}\n",
        "github-summary/issues.md": f"# Issues\n\n상태: `collected`\n\n{gh_activity['issues']}\n",
        "github-summary/repositories.md": f"# Repositories\n\n상태: `collected`\n\n{gh_activity['repositories']}\n",
        "github-summary/weekly-summary.md": weekly_summary(public_changes, commits, days),
        "github-summary/public-post-candidates.md": post_candidates(public_changes, commits),
        "posts/linkedin.md": linkedin_draft(public_changes, commits),
        "posts/facebook.md": facebook_draft(public_changes, commits),
        "posts/instagram-feed.md": instagram_feed_draft(public_changes, commits),
        "posts/instagram-story.md": instagram_story_draft(public_changes, commits),
        "posts/x.md": x_draft(public_changes, commits),
        "posts/hashtags.md": "# Hashtags\n\n상태: `draft`\n\n#개발 #위키 #포트폴리오 #기술기록 #프로젝트\n",
        "profile-update/asset-requests.md": asset_requests(),
        "assets/requested-assets.md": asset_requests(title="# Requested Assets"),
        "publishing/publish-plan.md": publish_plan(),
        "publishing/publish-results.md": publish_results(),
        "publishing/failed-publishes.md": failed_publishes(),
        "discord-status-check.md": discord_status_check(),
        "schedule/systemd-service.md": schedule_service_doc(),
        "schedule/systemd-timer.md": schedule_timer_doc(),
        "checklists/review-checklist.md": review_checklist(),
        "checklists/fallback-manual-posting.md": fallback_manual_posting(),
    }
    written = [write_text(base / relative, content, dry_run) for relative, content in reports.items()]
    if not dry_run:
        written.extend(write_dry_run_publish_documents(root))
    return sorted(set(paths + written))


def weekly_summary(changes: Sequence[ChangedFile], days: int) -> str:
    return f"""# Weekly Summary

상태: `draft`

최근 {days}일 동안 공개 Wiki 후보 {len(changes)}건을 점검했다. 변경된 공개 글은 개인 Wiki와 포트폴리오에서 재사용할 수 있는 작업 기록 후보로 정리했다.

## Highlights

{bullet_changes(changes[:8])}
"""


def post_candidates(changes: Sequence[ChangedFile]) -> str:
    return f"# Public Post Candidates\n\n상태: `draft`\n\n## Candidate Topics\n\n{bullet_changes(changes[:10])}\n"


def linkedin_draft(changes: Sequence[ChangedFile]) -> str:
    return f"""# LinkedIn Draft

상태: `draft`

이번 주에는 개인 Hermes Agent 운영과 공개 포트폴리오를 연결하는 정리 작업을 진행했습니다. 단순히 파일을 고친 것이 아니라, 흩어진 작업 기록을 외부에 설명 가능한 문맥으로 바꾸는 데 초점을 맞췄습니다.

핵심 작업:

{public_work_summary(changes)}

이번 정리는 앞으로 프로젝트 업데이트를 더 일관되게 공유하기 위한 기반 작업입니다. 공개 가능한 Wiki, 포트폴리오, 작업 회고를 같은 흐름 안에서 다루면 “무엇을 만들었는지”뿐 아니라 “왜 만들었고 어디에 재사용할 수 있는지”까지 남길 수 있습니다.

검토 근거:

{evidence_summary(changes)}

게시 전 확인: 고객사명, 내부 구현 세부사항, 계정/토큰/IP가 포함되지 않았는지 최종 검토가 필요합니다.
"""


def facebook_draft(changes: Sequence[ChangedFile]) -> str:
    return f"""# Facebook Draft

상태: `draft`

이번 주에는 개인 Wiki와 포트폴리오 쪽을 정리했습니다. 작업 기록을 그냥 쌓아두는 대신, 나중에 다시 읽거나 공유해도 의미가 보이도록 공개 가능한 문장과 구조로 다듬는 중입니다.

{public_work_summary(changes)}

조금씩이지만 “작업한 것”과 “설명할 수 있는 것” 사이의 간격을 줄이는 방향으로 정리하고 있습니다.
"""


def instagram_feed_draft(changes: Sequence[ChangedFile]) -> str:
    first = public_work_themes(changes)[0]
    return f"""# Instagram Feed Draft

상태: `draft`

이번 주 작업 기록 정리.

{first}

흩어진 노트와 포트폴리오 내용을 다시 읽히는 형태로 정리하면서, 공개 가능한 작업 흐름을 조금 더 선명하게 만들고 있습니다.

#개발 #위키 #포트폴리오 #기술기록
"""


def instagram_story_draft(changes: Sequence[ChangedFile]) -> str:
    first = public_work_themes(changes)[0]
    return f"# Instagram Story Draft\n\n상태: `draft`\n\n이번 주 기록\n{first}\n\n공개 전 최종 검토 중.\n"


def weekly_summary(changes: Sequence[ChangedFile], commits: Sequence[GitCommit], days: int) -> str:
    return f"""# Weekly Summary

상태: `draft`

최근 {days}일 동안 커밋 {len(commits)}건과 공개 Wiki 후보 {len(changes)}건을 확인했습니다. 이번 주 요약은 파일 목록이 아니라 커밋 메시지에서 드러난 실제 작업 주제를 기준으로 정리했습니다.

## Highlights

{commit_work_summary(commits, changes)}

## Commit Evidence

{commit_evidence_summary(commits)}
"""


def post_candidates(changes: Sequence[ChangedFile], commits: Sequence[GitCommit]) -> str:
    return f"""# Public Post Candidates

상태: `draft`

## Candidate Topics

{commit_work_summary(commits, changes)}

## Commit Evidence

{commit_evidence_summary(commits)}
"""


def linkedin_draft(changes: Sequence[ChangedFile], commits: Sequence[GitCommit] = ()) -> str:
    return f"""# LinkedIn Draft

상태: `draft`

이번 주에는 커밋 기록을 기준으로 Hermes Agent 운영 workflow와 자동화 안전장치를 정리했습니다. 단순히 파일을 고친 것이 아니라, 반복 작업을 더 재현 가능하고 검토 가능한 형태로 만드는 데 초점을 맞췄습니다.

핵심 작업:

{commit_work_summary(commits, changes)}

이번 정리는 앞으로 에이전트가 작업을 수행할 때 기존 구현을 먼저 찾고, 운영 절차를 문서화하며, 자동화 작업을 안전하게 추적하기 위한 기반 작업입니다.

커밋 근거:

{commit_evidence_summary(commits)}

게시 전 확인: 고객사명, 내부 구현 세부사항, 계정/토큰/IP가 포함되지 않았는지 최종 검토가 필요합니다.
"""


def facebook_draft(changes: Sequence[ChangedFile], commits: Sequence[GitCommit] = ()) -> str:
    return f"""# Facebook Draft

상태: `draft`

이번 주에는 Hermes Agent 관련 작업 흐름과 자동화 안전장치를 정리했습니다. 커밋을 다시 보니 핵심은 “작업을 더 잘 반복하고, 더 안전하게 운영하고, 나중에 다시 설명할 수 있게 만드는 것”이었습니다.

{commit_work_summary(commits, changes)}

작업 기록을 그냥 남기는 데서 끝내지 않고, 다음 작업자가 따라올 수 있는 운영 문서와 workflow로 바꾸는 중입니다.
"""


def instagram_feed_draft(changes: Sequence[ChangedFile], commits: Sequence[GitCommit] = ()) -> str:
    return f"""# Instagram Feed Draft

상태: `draft`

이번 주 커밋 기록을 다시 보니, 핵심은 Hermes Agent 운영 흐름을 더 안전하고 재사용 가능하게 다듬는 작업이었습니다.

{commit_work_summary(commits, changes)}

겉으로는 문서와 workflow 수정이지만, 목표는 에이전트가 같은 실수를 줄이고 작업 흐름을 더 안정적으로 반복하게 만드는 것입니다.
"""


def instagram_story_draft(changes: Sequence[ChangedFile], commits: Sequence[GitCommit] = ()) -> str:
    first = commit_work_themes(commits, changes)[0]
    return f"# Instagram Story Draft\n\n상태: `draft`\n\n이번 주 커밋 요약\n{first}\n\n공개 전 최종 검토 중.\n"


def x_draft(changes: Sequence[ChangedFile], commits: Sequence[GitCommit] = ()) -> str:
    first = commit_work_themes(commits, changes)[0]
    return f"# X Draft\n\n상태: `draft`\n\n이번 주에는 Hermes Agent 운영 workflow와 자동화 안전장치를 정리했습니다.\n\n{first}\n\n반복 작업을 더 재현 가능하고 안전하게 만들기 위한 기록입니다.\n"


def asset_requests(title: str = "# Asset Requests") -> str:
    return f"""{title}

상태: `pending`

에이전트는 이미지를 직접 고르지 않는다.

## Requested Assets

- LinkedIn 대표 프로젝트 스크린샷 1장
- Facebook Page 이미지 1장
- Instagram feed 정사각형/세로 이미지 1~3장
- Instagram Story 세로 이미지 1장
- X 게시용 이미지 1장(선택)

## Rule

Discord에 사용자가 업로드하고 승인한 이미지만 사용한다.
"""


def discord_status_check() -> str:
    return """# Discord Status Check

## Procedure

1. Discord 관리 채널 `1504020211194662994`에서 `/weekly-profile status`를 실행한다.
2. 응답에 `status`, `current_step`, 승인 상태, GitHub 설정, asset count가 포함되는지 확인한다.
3. 응답과 로그에 토큰/secret 값이 없는지 확인한다.
4. 실패 시 service 상태와 journal 오류만 확인한다.
"""


def schedule_service_doc() -> str:
    return """# Weekly Profile Update Service

`weekly-profile-update.service`는 `/mnt/e/Wiki`에서 초안 생성 작업만 실행한다.

자동 게시 API는 호출하지 않는다.
"""


def schedule_timer_doc() -> str:
    return """# Weekly Profile Update Timer

`weekly-profile-update.timer`가 주 1회 `weekly-profile-update.service`를 실행한다.

관리 명령:

```bash
python scripts/profile_weekly_scheduler.py install
python scripts/profile_weekly_scheduler.py start
python scripts/profile_weekly_scheduler.py status
```
"""


def publish_plan() -> str:
    return """# Publish Plan

상태: `manual-ready`

자동 게시 API는 호출하지 않는다. LinkedIn/Facebook/Instagram/X 모두 수동 게시 준비까지만 기록한다.

## Current Policy

- LinkedIn: manual-ready, API not called
- Facebook Page: manual-ready, API not called
- Instagram feed: manual-ready, API not called
- X: manual-ready, API not called
- Instagram Story: manual only
"""


def _platform_display_name(platform: str) -> str:
    return {"linkedin": "LinkedIn", "facebook": "Facebook", "instagram": "Instagram", "x": "X"}.get(platform, platform)


def _post_text_for_platform(root: Path, platform: str) -> str:
    rels = PREVIEW_FILES.get(platform, ())
    return "\n\n".join(_platform_post_text((job_dir(root) / rel).read_text(encoding="utf-8")) for rel in rels if (job_dir(root) / rel).exists()).strip()


def _asset_mapping_for_platform(state: dict[str, Any], platform: str) -> list[str]:
    approved = _assets_state(copy.deepcopy(state)).get("approved", [])
    mapped = []
    for asset in approved:
        asset_platform = str(asset.get("platform") or "general")
        if asset_platform in {"general", platform}:
            mapped.append(str(asset.get("cache_path") or "cache:missing"))
    return mapped


def write_dry_run_publish_documents(root: Path) -> list[Path]:
    state = _state_with_publish_disabled(load_state(root))
    base = job_dir(root) / "publishing"
    base.mkdir(parents=True, exist_ok=True)
    plan_sections = ["# Publish Plan", "", "상태: `manual-ready`", "", "실제 SNS 게시 API는 호출하지 않는다."]
    result_sections = ["# Publish Results", "", "상태: `pending/manual-ready`", "", "Actual API clients: not called"]
    for platform in PUBLISH_PLATFORMS:
        display = _platform_display_name(platform)
        body = _post_text_for_platform(root, platform) or "NEEDS_REVIEW: post body missing"
        assets = _asset_mapping_for_platform(state, platform)
        plan_sections.extend(["", f"## {display}", "", "### Body", "", body, "", "### Images", "", "\n".join(f"- {item}" for item in assets) or "- cache:missing"])
        result_sections.extend(["", f"## {display}", "", "status: pending/manual-ready", "publish_enabled: false", "api_client: not called"])
    failed_path = base / "failed-publishes.md"
    failed_path.write_text("# Failed Publishes\n\n상태: `none`\n", encoding="utf-8")
    plan_path = base / "publish-plan.md"
    results_path = base / "publish-results.md"
    plan_path.write_text("\n".join(plan_sections).rstrip() + "\n", encoding="utf-8")
    results_path.write_text("\n".join(result_sections).rstrip() + "\n", encoding="utf-8")
    return [plan_path, results_path]


def publish_results() -> str:
    return """# Publish Results

상태: `pending/manual-ready`

Actual API clients: not called

- LinkedIn: pending/manual-ready
- Facebook: pending/manual-ready
- Instagram: pending/manual-ready
- X: pending/manual-ready
"""


def failed_publishes() -> str:
    return "# Failed Publishes\n\n상태: `none`\n"


def review_checklist() -> str:
    return """# Review Checklist

## Draft Review

- [ ] 고객사/조직명 노출 없음
- [ ] 서버/IP/토큰/계정 정보 없음
- [ ] 과장된 성과 표현 없음
- [ ] 공개 근거가 `source-evidence.md`에 있음
- [ ] 플랫폼별 문체가 맞음

## Asset Review

- [ ] 사용자가 Discord에 업로드함
- [ ] 사용자가 이미지 사용을 승인함
- [ ] 플랫폼별 비율이 적절함

## Final Approval

- [ ] LinkedIn 승인
- [ ] Facebook Page 승인
- [ ] Instagram 승인
- [ ] X 승인
"""


def fallback_manual_posting() -> str:
    return """# Fallback Manual Posting

상태: `ready`

## Steps

1. `posts/`의 플랫폼별 초안을 사용자가 검토한다.
2. `assets/approved-assets.md`에 승인된 이미지가 있는지 확인한다.
3. 각 플랫폼에 수동 게시한다.
4. 게시 URL을 `publishing/publish-results.md`에 기록한다.
"""


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate weekly profile update drafts.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Wiki repository root")
    parser.add_argument("--days", type=int, default=DEFAULT_WINDOW_DAYS, help="Lookback window in days")
    parser.add_argument("--dry-run", action="store_true", help="Collect and list files without writing reports")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    root = args.root.resolve()
    if args.days <= 0:
        raise SystemExit("--days must be a positive integer")
    if not root.exists():
        raise SystemExit(f"root does not exist: {root}")
    written = write_report(root, args.days, args.dry_run)
    action = "would update" if args.dry_run else "updated"
    print(f"{action} {len(written)} files under {job_dir(root).relative_to(root)}")
    for path in written:
        print(path.relative_to(root).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
