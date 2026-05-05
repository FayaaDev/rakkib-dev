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
