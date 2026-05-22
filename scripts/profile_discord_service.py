#!/usr/bin/env python3
"""Manage the weekly profile Discord bot as a systemd user service."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Sequence

SERVICE_NAME = "weekly-profile-discord-bot"
SERVICE_FILE_NAME = f"{SERVICE_NAME}.service"
DEFAULT_ROOT = Path("/mnt/e/Wiki")
DEFAULT_HERMES_AGENT = Path.home() / ".hermes" / "hermes-agent"


class ServiceError(RuntimeError):
    pass


def systemd_unit_dir() -> Path:
    return Path.home() / ".config" / "systemd" / "user"


def systemd_unit_path() -> Path:
    return systemd_unit_dir() / SERVICE_FILE_NAME


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
    seen = set()
    parts = []
    for candidate in candidates:
        text = str(candidate)
        if text not in seen and (candidate.exists() or text in {"/usr/local/bin", "/usr/bin", "/bin"}):
            seen.add(text)
            parts.append(text)
    return ":".join(parts)


def generate_systemd_unit(root: Path = DEFAULT_ROOT, hermes_agent: Path = DEFAULT_HERMES_AGENT) -> str:
    root = root.resolve()
    hermes_agent = hermes_agent.expanduser().resolve()
    runner = root / "scripts" / "run_profile_discord_bot.py"
    return f"""[Unit]
Description=Weekly profile update Discord approval bot
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=0

[Service]
Type=simple
ExecStart={python_executable(hermes_agent)} {runner} --root {root}
WorkingDirectory={root}
Environment="PATH={build_service_path(root, hermes_agent)}"
Environment="HERMES_AGENT_PATH={hermes_agent}"
Restart=always
RestartSec=5
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
"""


def validate_unit_text(text: str) -> list[str]:
    required = [
        "[Unit]",
        "[Service]",
        "Type=simple",
        "ExecStart=",
        "WorkingDirectory=",
        "HERMES_AGENT_PATH=",
        "Restart=always",
        "StandardOutput=journal",
        "StandardError=journal",
    ]
    errors = [f"missing {item}" for item in required if item not in text]
    forbidden = ["DISCORD_BOT_TOKEN=", "discord_bot_token:"]
    errors.extend(f"forbidden secret-bearing directive: {item}" for item in forbidden if item in text)
    return errors


def validate(root: Path, hermes_agent: Path) -> str:
    unit = generate_systemd_unit(root, hermes_agent)
    errors = validate_unit_text(unit)
    if not (root / "scripts" / "run_profile_discord_bot.py").exists():
        errors.append("missing runner script")
    if not hermes_agent.exists():
        errors.append("missing Hermes agent checkout")
    if errors:
        raise ServiceError("; ".join(errors))
    return unit


def install(root: Path, hermes_agent: Path) -> Path:
    unit = validate(root, hermes_agent)
    path = systemd_unit_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(unit, encoding="utf-8")
    run_systemctl(["daemon-reload"])
    run_systemctl(["enable", SERVICE_FILE_NAME])
    return path


def run_systemctl(args: list[str], check: bool = True) -> subprocess.CompletedProcess:
    systemctl = shutil.which("systemctl")
    if not systemctl:
        raise ServiceError("systemctl is not available")
    return subprocess.run([systemctl, "--user", *args], check=check, text=True, capture_output=True)


def start() -> None:
    run_systemctl(["start", SERVICE_FILE_NAME])


def stop() -> None:
    run_systemctl(["stop", SERVICE_FILE_NAME], check=False)


def restart() -> None:
    run_systemctl(["restart", SERVICE_FILE_NAME])


def status() -> subprocess.CompletedProcess:
    return run_systemctl(["status", SERVICE_FILE_NAME, "--no-pager"], check=False)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage the weekly profile Discord bot service.")
    parser.add_argument("action", choices=("validate", "print-unit", "install", "start", "stop", "restart", "status"))
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Wiki repository root")
    parser.add_argument("--hermes-agent", type=Path, default=DEFAULT_HERMES_AGENT, help="Hermes agent checkout path")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    root = args.root.resolve()
    hermes_agent = args.hermes_agent.expanduser().resolve()
    try:
        if args.action == "validate":
            validate(root, hermes_agent)
            print("service config valid")
        elif args.action == "print-unit":
            print(validate(root, hermes_agent), end="")
        elif args.action == "install":
            path = install(root, hermes_agent)
            print(f"installed {path}")
        elif args.action == "start":
            start()
            print(f"started {SERVICE_FILE_NAME}")
        elif args.action == "stop":
            stop()
            print(f"stopped {SERVICE_FILE_NAME}")
        elif args.action == "restart":
            restart()
            print(f"restarted {SERVICE_FILE_NAME}")
        elif args.action == "status":
            result = status()
            output = result.stdout.strip() or result.stderr.strip()
            if output:
                print(output)
            return result.returncode
    except (ServiceError, subprocess.CalledProcessError) as exc:
        print(f"service error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
