#!/usr/bin/env python3
"""Manage the weekly profile draft generator as a systemd user timer."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Sequence

SERVICE_NAME = "weekly-profile-update"
SERVICE_FILE_NAME = f"{SERVICE_NAME}.service"
TIMER_FILE_NAME = f"{SERVICE_NAME}.timer"
DEFAULT_ROOT = Path("/mnt/e/Wiki")
DEFAULT_HERMES_AGENT = Path.home() / ".hermes" / "hermes-agent"
DEFAULT_ON_CALENDAR = "weekly"


class SchedulerError(RuntimeError):
    pass


def systemd_unit_dir() -> Path:
    return Path.home() / ".config" / "systemd" / "user"


def service_unit_path() -> Path:
    return systemd_unit_dir() / SERVICE_FILE_NAME


def timer_unit_path() -> Path:
    return systemd_unit_dir() / TIMER_FILE_NAME


def python_executable(hermes_agent: Path = DEFAULT_HERMES_AGENT) -> str:
    for candidate in (hermes_agent / "venv" / "bin" / "python", hermes_agent / ".venv" / "bin" / "python"):
        if candidate.exists():
            return str(candidate)
    return sys.executable


def build_service_path(root: Path, hermes_agent: Path) -> str:
    candidates = [
        root / "node_modules" / ".bin",
        hermes_agent / "venv" / "bin",
        hermes_agent / ".venv" / "bin",
        Path.home() / ".local" / "bin",
        Path("/usr/local/bin"),
        Path("/usr/bin"),
        Path("/bin"),
    ]
    seen: set[str] = set()
    parts: list[str] = []
    for candidate in candidates:
        text = str(candidate)
        if text not in seen and (candidate.exists() or text in {"/usr/local/bin", "/usr/bin", "/bin"}):
            seen.add(text)
            parts.append(text)
    return ":".join(parts)


def generate_service_unit(root: Path = DEFAULT_ROOT, hermes_agent: Path = DEFAULT_HERMES_AGENT) -> str:
    root = root.resolve()
    hermes_agent = hermes_agent.expanduser().resolve()
    job = root / "cron" / "profile_update.py"
    return f"""[Unit]
Description=Weekly profile update draft generator
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart={python_executable(hermes_agent)} {job} --root {root}
WorkingDirectory={root}
Environment=\"PATH={build_service_path(root, hermes_agent)}\"
Environment=\"HERMES_AGENT_PATH={hermes_agent}\"
StandardOutput=journal
StandardError=journal
"""


def generate_timer_unit(on_calendar: str = DEFAULT_ON_CALENDAR) -> str:
    return f"""[Unit]
Description=Run weekly profile update draft generator

[Timer]
OnCalendar={on_calendar}
Persistent=true
Unit={SERVICE_FILE_NAME}

[Install]
WantedBy=timers.target
"""


def validate_unit_text(service_text: str, timer_text: str) -> list[str]:
    required_service = [
        "[Service]",
        "Type=oneshot",
        "ExecStart=",
        "WorkingDirectory=",
        "HERMES_AGENT_PATH=",
        "StandardOutput=journal",
        "StandardError=journal",
    ]
    required_timer = ["[Timer]", "OnCalendar=", "Persistent=true", f"Unit={SERVICE_FILE_NAME}"]
    errors = [f"missing service {item}" for item in required_service if item not in service_text]
    errors.extend(f"missing timer {item}" for item in required_timer if item not in timer_text)
    forbidden = ["DISCORD_BOT_TOKEN=", "discord_bot_token:", "LINKEDIN_ACCESS_TOKEN=", "META_PAGE_ACCESS_TOKEN="]
    errors.extend(f"forbidden secret-bearing directive: {item}" for item in forbidden if item in service_text or item in timer_text)
    return errors


def validate(root: Path, hermes_agent: Path, on_calendar: str = DEFAULT_ON_CALENDAR) -> tuple[str, str]:
    service_text = generate_service_unit(root, hermes_agent)
    timer_text = generate_timer_unit(on_calendar)
    errors = validate_unit_text(service_text, timer_text)
    if not (root / "cron" / "profile_update.py").exists():
        errors.append("missing profile update job")
    if not hermes_agent.exists():
        errors.append("missing Hermes agent checkout")
    if errors:
        raise SchedulerError("; ".join(errors))
    return service_text, timer_text


def run_systemctl(args: list[str], check: bool = True) -> subprocess.CompletedProcess:
    systemctl = shutil.which("systemctl")
    if not systemctl:
        raise SchedulerError("systemctl is not available")
    return subprocess.run([systemctl, "--user", *args], check=check, text=True, capture_output=True)


def install(root: Path, hermes_agent: Path, on_calendar: str = DEFAULT_ON_CALENDAR) -> tuple[Path, Path]:
    service_text, timer_text = validate(root, hermes_agent, on_calendar)
    service_path = service_unit_path()
    timer_path = timer_unit_path()
    service_path.parent.mkdir(parents=True, exist_ok=True)
    service_path.write_text(service_text, encoding="utf-8")
    timer_path.write_text(timer_text, encoding="utf-8")
    run_systemctl(["daemon-reload"])
    run_systemctl(["enable", TIMER_FILE_NAME])
    return service_path, timer_path


def start() -> None:
    run_systemctl(["start", TIMER_FILE_NAME])


def stop() -> None:
    run_systemctl(["stop", TIMER_FILE_NAME], check=False)


def status() -> subprocess.CompletedProcess:
    return run_systemctl(["status", TIMER_FILE_NAME, "--no-pager"], check=False)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage the weekly profile update systemd timer.")
    parser.add_argument("action", choices=("validate", "print-units", "install", "start", "stop", "status"))
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Wiki repository root")
    parser.add_argument("--hermes-agent", type=Path, default=DEFAULT_HERMES_AGENT, help="Hermes agent checkout path")
    parser.add_argument("--on-calendar", default=DEFAULT_ON_CALENDAR, help="systemd OnCalendar expression")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    root = args.root.resolve()
    hermes_agent = args.hermes_agent.expanduser().resolve()
    try:
        if args.action == "validate":
            validate(root, hermes_agent, args.on_calendar)
            print("scheduler config valid")
        elif args.action == "print-units":
            service_text, timer_text = validate(root, hermes_agent, args.on_calendar)
            print(service_text, end="")
            print("\n--- timer ---")
            print(timer_text, end="")
        elif args.action == "install":
            service_path, timer_path = install(root, hermes_agent, args.on_calendar)
            print(f"installed {service_path}")
            print(f"installed {timer_path}")
        elif args.action == "start":
            start()
            print(f"started {TIMER_FILE_NAME}")
        elif args.action == "stop":
            stop()
            print(f"stopped {TIMER_FILE_NAME}")
        elif args.action == "status":
            result = status()
            output = result.stdout.strip() or result.stderr.strip()
            if output:
                print(output)
            return result.returncode
    except (SchedulerError, subprocess.CalledProcessError) as exc:
        print(f"scheduler error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
