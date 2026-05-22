#!/usr/bin/env bash
set -uo pipefail

ROOT="/mnt/e/Wiki"
PYTHON="/home/kang/.hermes/hermes-agent/venv/bin/python"
BOT_SCRIPT="$ROOT/scripts/run_profile_discord_bot.py"
LOG_DIR="$ROOT/weekly-profile-update/logs"

mkdir -p "$LOG_DIR"
cd "$ROOT" || exit 1

# Windows keeps this script alive; avoid a duplicate systemd sidecar.
systemctl --user disable --now weekly-profile-discord-bot.service >/dev/null 2>&1 || true

while true; do
  printf '[%s] starting weekly-profile Discord bot\n' "$(date -Is)"
  "$PYTHON" "$BOT_SCRIPT" --root "$ROOT"
  status=$?
  printf '[%s] weekly-profile Discord bot exited with %s; restarting in 5s\n' "$(date -Is)" "$status"
  sleep 5
done
