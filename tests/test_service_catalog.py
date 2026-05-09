"""Tests for shared service-catalog side effects."""

from __future__ import annotations

from rakkib.service_catalog import apply_service_catalog_selection, mark_deployment_stale
from rakkib.state import State


def test_apply_service_catalog_selection_sets_shared_state_shape():
    registry = {
        "services": [
            {"id": "postgres", "state_bucket": "always"},
            {"id": "nocodb", "state_bucket": "foundation_services", "default_subdomain": "nocodb"},
            {"id": "n8n", "state_bucket": "selected_services", "default_subdomain": "n8n"},
        ]
    }
    state = State({"subdomains": {"n8n": "workflow"}})

    apply_service_catalog_selection(state, registry, {"nocodb", "n8n"})

    assert state.get("foundation_services") == ["nocodb"]
    assert state.get("selected_services") == ["n8n"]
    assert state.get("admin_email") == "admin@nocodb.com"
    assert state.get("subdomains") == {"nocodb": "nocodb", "n8n": "workflow"}
    assert state.get("NOCODB_SUBDOMAIN") == "nocodb"
    assert state.get("N8N_SUBDOMAIN") == "workflow"


def test_mark_deployment_stale_matches_web_and_cli_behavior():
    state = State({"confirmed": True, "web_deployment": {"status": "succeeded"}})

    mark_deployment_stale(state)

    assert state.get("confirmed") is False
    assert state.get("web_deployment.status") == "stale"
