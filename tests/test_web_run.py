"""Tests for browser-triggered setup runner behavior."""

from __future__ import annotations

from types import SimpleNamespace

import rakkib.web.run as web_run


def test_setup_child_env_normalizes_non_root_home(monkeypatch):
    monkeypatch.setenv("HOME", "/root")
    monkeypatch.setattr(web_run.os, "getuid", lambda: 1000)
    monkeypatch.setattr(web_run.pwd, "getpwuid", lambda uid: SimpleNamespace(pw_dir="/home/fayaa"))

    env = web_run._setup_child_env()

    assert env["HOME"] == "/home/fayaa"
    assert env["PYTHONUNBUFFERED"] == "1"


def test_setup_child_env_keeps_root_home_for_root(monkeypatch):
    monkeypatch.setenv("HOME", "/root")
    monkeypatch.setattr(web_run.os, "getuid", lambda: 0)

    env = web_run._setup_child_env()

    assert env["HOME"] == "/root"


def test_web_run_manager_builds_service_sync_command(tmp_path):
    manager = web_run.WebRunManager(tmp_path)

    command = manager._command_for_operation(web_run.SERVICE_SYNC_OPERATION)

    assert command[-1] == "sync-services"


def test_web_run_manager_cancel_terminates_child_and_persists_status(tmp_path):
    class FakeProcess:
        pid = 12345

        def __init__(self):
            self.terminated = False

        def poll(self):
            return None

        def terminate(self):
            self.terminated = True

        def wait(self, timeout=None):
            return -15

    process = FakeProcess()
    manager = web_run.WebRunManager(tmp_path)
    manager._process = process
    manager._record = web_run.RunRecord(
        status="running",
        message="Setup run is in progress.",
        started_at="2026-05-09T00:00:00Z",
        command=["rakkib", "pull"],
        log_path=str(tmp_path / ".rakkib-web-run.log"),
        pid=process.pid,
    )

    snapshot = manager.cancel()

    assert process.terminated is True
    assert snapshot["status"] == "canceled"
    assert snapshot["pid"] is None
    assert snapshot["can_start"] is True
