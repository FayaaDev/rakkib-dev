"""Tests for browser phase answer handling."""

from __future__ import annotations

from rakkib.schema import FieldDef, QuestionSchema
from rakkib.state import State
from rakkib.web.answers import apply_phase_answers


def test_phase3_submission_preserves_last_deployed_selection_snapshot():
    state = State(
        {
            "web_deployment": {"status": "succeeded"},
            "foundation_services": ["homepage"],
            "selected_services": ["n8n"],
        }
    )
    schema = QuestionSchema(
        schema_version=1,
        phase=3,
        fields=[
            FieldDef(
                id="optional_services",
                type="multi_select",
                canonical_values=["n8n", "stirling-pdf"],
                records=["selected_services"],
            )
        ],
        service_catalog={
            "optional_services": [
                {"slug": "n8n", "default_subdomain": "n8n"},
                {"slug": "stirling-pdf", "default_subdomain": "pdf"},
            ]
        },
    )

    updated = apply_phase_answers(
        state,
        schema,
        {"optional_services": ["n8n", "stirling-pdf"]},
    )

    assert updated.get("deployed.exists") is True
    assert updated.get("deployed.foundation_services") == ["homepage"]
    assert updated.get("deployed.selected_services") == ["n8n"]
    assert updated.get("selected_services") == ["n8n", "stirling-pdf"]
    assert updated.get("web_deployment.status") == "stale"
