import importlib.util
import sys
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "profile_discord_service.py"
SPEC = importlib.util.spec_from_file_location("profile_discord_service", MODULE_PATH)
profile_discord_service = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = profile_discord_service
SPEC.loader.exec_module(profile_discord_service)


def test_generate_systemd_unit_matches_hermes_service_shape(tmp_path):
    root = tmp_path / "Wiki"
    hermes = tmp_path / "hermes-agent"
    (root / "scripts").mkdir(parents=True)
    (root / "scripts" / "run_profile_discord_bot.py").write_text("", encoding="utf-8")
    (hermes / "venv" / "bin").mkdir(parents=True)
    (hermes / "venv" / "bin" / "python").write_text("", encoding="utf-8")

    unit = profile_discord_service.generate_systemd_unit(root, hermes)

    assert "Type=simple" in unit
    assert f"ExecStart={hermes / 'venv' / 'bin' / 'python'}" in unit
    assert f"--root {root.resolve()}" in unit
    assert f"WorkingDirectory={root.resolve()}" in unit
    assert "Restart=always" in unit
    assert "StandardOutput=journal" in unit
    assert "StandardError=journal" in unit
    assert "HERMES_AGENT_PATH=" in unit
    assert "DISCORD_BOT_TOKEN" not in unit
    assert "discord_bot_token" not in unit
    assert profile_discord_service.validate_unit_text(unit) == []


def test_validate_fails_without_runner(tmp_path):
    hermes = tmp_path / "hermes-agent"
    hermes.mkdir()

    try:
        profile_discord_service.validate(tmp_path / "Wiki", hermes)
    except profile_discord_service.ServiceError as exc:
        assert "missing runner script" in str(exc)
    else:
        raise AssertionError("expected validation failure")


def test_install_writes_unit_and_uses_systemctl(monkeypatch, tmp_path):
    root = tmp_path / "Wiki"
    hermes = tmp_path / "hermes-agent"
    unit_dir = tmp_path / "systemd"
    (root / "scripts").mkdir(parents=True)
    (root / "scripts" / "run_profile_discord_bot.py").write_text("", encoding="utf-8")
    hermes.mkdir()
    calls = []

    monkeypatch.setattr(profile_discord_service, "systemd_unit_path", lambda: unit_dir / profile_discord_service.SERVICE_FILE_NAME)
    monkeypatch.setattr(profile_discord_service, "run_systemctl", lambda args, check=True: calls.append((args, check)))

    path = profile_discord_service.install(root, hermes)

    assert path == unit_dir / profile_discord_service.SERVICE_FILE_NAME
    assert path.exists()
    assert calls == [(["daemon-reload"], True), (["enable", profile_discord_service.SERVICE_FILE_NAME], True)]
