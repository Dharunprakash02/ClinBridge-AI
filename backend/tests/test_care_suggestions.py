import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.graph_rag.care_suggestions_service import (
    care_suggestions_service, CareSuggestionsService, CareSuggestionsResponse
)
from backend.app.services.graph_rag.evidence_store import EvidenceStore
from backend.app.services.mapping_pipeline import mapping_pipeline_service
from backend.app.db.database import SessionLocal

client = TestClient(app)

def test_care_suggestions_supported_febrile():
    """Valid auto-accepted febrile mapping produces exactly two distinct supported suggestions."""
    res = care_suggestions_service.generate_suggestions(
        source_term="Jwara",
        candidate_code="MG26",
        candidate_title="Symptoms or signs involving the body temperature",
        decision_class="AUTO_ACCEPTED",
        graph_context={"symptoms": ["fever", "heat", "thirst"]}
    )

    assert isinstance(res, CareSuggestionsResponse)
    assert res.status == "SUCCESS"
    assert len(res.suggestions) == 2

    s1, s2 = res.suggestions[0], res.suggestions[1]
    assert s1.type == "SELF_CARE_GUIDANCE"
    assert s2.type == "WARNING_SIGNS_AND_TRIAGE"
    assert s1.title != s2.title
    assert "hydration" in s1.title.lower() or "rest" in s1.title.lower()
    assert "warning" in s2.title.lower() or "red flag" in s2.title.lower()
    assert s1.source_url.startswith("http")
    assert s2.source_url.startswith("http")
    assert len(s1.evidence_excerpt) > 20
    assert len(s2.evidence_excerpt) > 20
    assert "does not substitute" in s1.limitations.lower()
    assert len(res.safety_disclaimer) > 50

def test_care_suggestions_supported_respiratory_cough():
    """Valid respiratory cough mapping produces cough-specific guidance and triage."""
    res = care_suggestions_service.generate_suggestions(
        source_term="kAsaH",
        candidate_code="MD30",
        candidate_title="Cough",
        decision_class="AUTO_ACCEPTED",
        graph_context={"symptoms": ["cough", "throat irritation"]}
    )

    assert res.status == "SUCCESS"
    assert len(res.suggestions) == 2
    s1, s2 = res.suggestions[0], res.suggestions[1]
    assert s1.type == "SELF_CARE_GUIDANCE"
    assert s2.type == "WARNING_SIGNS_AND_TRIAGE"
    assert "airway" in s1.title.lower() or "humidification" in s1.title.lower() or "care" in s1.title.lower()
    assert "red flag" in s2.title.lower() or "triage" in s2.title.lower() or "warning" in s2.title.lower()
    assert "hemoptysis" in s2.explanation.lower() or "persistent" in s2.explanation.lower()

def test_care_suggestions_withheld_for_ambiguous_mapping():
    """When terminology mapping is ambiguous, care suggestions must be withheld."""
    res = care_suggestions_service.generate_suggestions(
        source_term="AmbiguousTerm",
        candidate_code="MG26",
        candidate_title="Symptoms or signs involving the body temperature",
        decision_class="AMBIGUOUS"
    )

    assert res.status == "WITHHELD_DUE_TO_UNCERTAINTY"
    assert len(res.suggestions) == 0
    assert "withheld" in res.reason_or_limitation.lower()
    assert "ambiguous" in res.reason_or_limitation.lower()

def test_care_suggestions_withheld_for_rejected_or_unmapped():
    """When candidate is rejected by rule gate or unmapped, suggestions are withheld."""
    res_rejected = care_suggestions_service.generate_suggestions(
        source_term="Fracture",
        candidate_code="NC72",
        candidate_title="Fracture of femur",
        decision_class="REJECTED"
    )
    assert res_rejected.status == "WITHHELD_DUE_TO_UNCERTAINTY"
    assert len(res_rejected.suggestions) == 0

    res_unmapped = care_suggestions_service.generate_suggestions(
        source_term="UnknownConcept",
        candidate_code=None,
        candidate_title=None,
        decision_class="UNMAPPED"
    )
    assert res_unmapped.status == "WITHHELD_DUE_TO_UNCERTAINTY"
    assert len(res_unmapped.suggestions) == 0

def test_care_suggestions_insufficient_evidence():
    """When clinical evidence is absent from the repository, returns INSUFFICIENT_EVIDENCE."""
    # Custom empty store
    empty_store = EvidenceStore()
    empty_store.evidence_list = []
    service = CareSuggestionsService(store=empty_store)

    res = service.generate_suggestions(
        source_term="UnseenSyndrome",
        candidate_code="ZZ99",
        candidate_title="Unseen Condition",
        decision_class="AUTO_ACCEPTED"
    )
    assert res.status == "INSUFFICIENT_EVIDENCE"
    assert len(res.suggestions) == 0
    assert "insufficient evidence" in res.reason_or_limitation.lower()

def test_care_suggestions_api_endpoint():
    """API endpoint /care-suggestions handles requests correctly."""
    # 1. Success case
    payload = {
        "source_term": "Jwara",
        "candidate_code": "MG26",
        "candidate_title": "Symptoms or signs involving the body temperature",
        "decision_class": "AUTO_ACCEPTED"
    }
    response = client.post("/care-suggestions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert len(data["suggestions"]) == 2

    # 2. Withheld case
    ambiguous_payload = {
        "source_term": "Jwara",
        "candidate_code": "MG26",
        "candidate_title": "Symptoms or signs involving the body temperature",
        "decision_class": "AMBIGUOUS"
    }
    amb_res = client.post("/care-suggestions", json=ambiguous_payload)
    assert amb_res.status_code == 200
    assert amb_res.json()["status"] == "WITHHELD_DUE_TO_UNCERTAINTY"

def test_mapping_pipeline_includes_care_suggestions():
    """Mapping pipeline automatically enriches response with care suggestions matching decision policy."""
    db = SessionLocal()
    try:
        pipeline_output = mapping_pipeline_service.run_pipeline(
            db=db,
            term="Jwara",
            code="SR11"
        )
        assert pipeline_output.care_suggestions is not None
        # Pipeline evaluated as AMBIGUOUS due to multiple close fever candidates in database
        if pipeline_output.decision_class == "AMBIGUOUS":
            assert pipeline_output.care_suggestions.status == "WITHHELD_DUE_TO_UNCERTAINTY"
            assert "withheld" in pipeline_output.care_suggestions.reason_or_limitation.lower()
        else:
            assert pipeline_output.care_suggestions.status == "SUCCESS"
            assert len(pipeline_output.care_suggestions.suggestions) == 2
    finally:
        db.close()
