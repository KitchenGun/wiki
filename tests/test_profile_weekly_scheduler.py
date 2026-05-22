import importlib.util
import sys
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "profile_weekly_scheduler.py"
SPEC = importlib.util.spec_from_file_location("profile_weekly_scheduler", MODULE_PATH)
profile_weekly_scheduler = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = profile_weekly_scheduler
SPEC.loader.exec_module(profile_weekly_scheduler)


def test_generate_weekly_scheduler_units_match_systemd_pattern(tmp_path):
    root = tmp_path / "Wiki"
    hermes = tmp_path / "hermes-agent"
    (root / "cron").mkdir(parents=True)
    (root / "cron" / "profile_update.py").write_text("", encoding="utf-8")
    (hermes / "venv" / "bin").mkdir(parents=True)
    (hermes / "venv" / "bin" / "python").write_text("", encoding="utf-8")

    service = profile_weekly_scheduler.generate_service_unit(root, hermes)
    timer = profile_weekly_scheduler.generate_timer_unit("weekly")

    assert "Type=oneshot" in service
    assert f"ExecStart={hermes / 'venv' / 'bin' / 'python'}" in service
    assert f"--root {root.resolve()}" in service
    assert f"WorkingDirectory={root.resolve()}" in service
    assert "HERMES_AGENT_PATH=" in service
    assert "OnCalendar=weekly" in timer
    assert "Persistent=true" in timer
    assert "Unit=weekly-profile-update.service" in timer
    assert "DISCORD_BOT_TOKEN" not in service + timer
    assert "discord_bot_token" not in service + timer
    assert profile_weekly_scheduler.validate_unit_text(service, timer) == []


def test_validate_scheduler_fails_without_job(tmp_path):
    hermes = tmp_path / "hermes-agent"
    hermes.mkdir()

    try:
        profile_weekly_scheduler.validate(tmp_path / "Wiki", hermes)
    except profile_weekly_scheduler.SchedulerError as exc:
        assert "missing profile update job" in str(exc)
    else:
        raise AssertionError("expected validation failure")


def test_install_writes_service_timer_and_enables_timer(monkeypatch, tmp_path):
    root = tmp_path / "Wiki"
    hermes = tmp_path / "hermes-agent"
    unit_dir = tmp_path / "systemd"
    (root / "cron").mkdir(parents=True)
    (root / "cron" / "profile_update.py").write_text("", encoding="utf-8")
    hermes.mkdir()
    calls = []

    monkeypatch.setattr(profile_weekly_scheduler, "service_unit_path", lambda: unit_dir / profile_weekly_scheduler.SERVICE_FILE_NAME)
    monkeypatch.setattr(profile_weekly_scheduler, "timer_unit_path", lambda: unit_dir / profile_weekly_scheduler.TIMER_FILE_NAME)
    monkeypatch.setattr(profile_weekly_scheduler, "run_systemctl", lambda args, check=True: calls.append((args, check)))

    service_path, timer_path = profile_weekly_scheduler.install(root, hermes)

    assert service_path.exists()
    assert timer_path.exists()
    assert calls == [(["daemon-reload"], True), (["enable", profile_weekly_scheduler.TIMER_FILE_NAME], True)]
