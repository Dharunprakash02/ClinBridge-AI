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

def test_care_suggestions_source_links_verified_no_404():
    """Confirms all generated care suggestion source URLs are valid, verified, and not returning 404."""
    from backend.app.services.graph_rag.evidence_verifier import is_url_verified

    for term, code, title in [
        ("kAsaH", "MD30", "Cough"),
        ("Jwara", "MG26", "Symptoms or signs involving the body temperature")
    ]:
        res = care_suggestions_service.generate_suggestions(
            source_term=term,
            candidate_code=code,
            candidate_title=title,
            decision_class="AUTO_ACCEPTED"
        )
        assert res.status == "SUCCESS"
        for s in res.suggestions:
            assert s.url_verified is True
            assert s.evidence_status == "SUPPORTED"
            assert s.source_url.startswith("https://")
            # Verify URL is confirmed in our registry
            assert is_url_verified(s.source_url) is True
            # Never return the broken WHO-2019-nCoV-clinical-2024.1 URL
            assert "WHO-2019-nCoV-clinical-2024.1" not in s.source_url

def test_care_suggestions_no_steam_inhalation():
    """Ensures unsafe hot-water steam inhalation advice is omitted from all suggestions."""
    res = care_suggestions_service.generate_suggestions(
        source_term="kAsaH",
        candidate_code="MD30",
        candidate_title="Cough",
        decision_class="AUTO_ACCEPTED"
    )
    for s in res.suggestions:
        assert "steam" not in s.title.lower()
        # If steam is mentioned in explanation, it must only be warning against it or omitted
        if "steam" in s.explanation.lower():
            assert "not recommended" in s.explanation.lower() or "avoid" in s.explanation.lower()
        assert "steam" not in s.evidence_excerpt.lower()

def test_care_suggestions_distinct_quotations_and_sources():
    """Ensures Suggestion 1 and Suggestion 2 retrieve distinct evidence and do not duplicate quotes."""
    res = care_suggestions_service.generate_suggestions(
        source_term="kAsaH",
        candidate_code="MD30",
        candidate_title="Cough",
        decision_class="AUTO_ACCEPTED"
    )
    s1, s2 = res.suggestions[0], res.suggestions[1]
    # Distinct quotes
    assert s1.evidence_excerpt != s2.evidence_excerpt
    # Distinct types
    assert s1.type == "SELF_CARE_GUIDANCE"
    assert s2.type == "WARNING_SIGNS_AND_TRIAGE"
    # Specific claim support
    assert "rest" in s1.evidence_excerpt.lower() or "fluids" in s1.evidence_excerpt.lower()
    assert "urgent" in s2.evidence_excerpt.lower() or "blood" in s2.evidence_excerpt.lower() or "weeks" in s2.evidence_excerpt.lower()

def test_care_suggestions_unverified_url_failure_handling():
    """When a source record has an unverified or broken URL, the suggestion is marked UNVERIFIED with no active link."""
    from backend.app.services.graph_rag.evidence_store import EvidenceRecord

    unverified_rec = EvidenceRecord(
        evidence_id="ev_broken_test",
        title="Unverified Clinical Leaflet",
        source="External Source",
        document_type="Leaflet",
        publication_year=2024,
        source_url="https://www.who.int/publications/i/item/WHO-2019-nCoV-clinical-2024.1",  # Known 404
        text="Supportive care involves rest and fluids.",
        concept_ids=["MD30"],
        url_verified=False,
        claim_type="SELF_CARE_GUIDANCE"
    )

    empty_store = EvidenceStore()
    empty_store.evidence_list = [unverified_rec]
    service = CareSuggestionsService(store=empty_store)

    sugg = service._build_self_care_suggestion(
        source_term="kAsaH",
        candidate_code="MD30",
        candidate_title="Cough",
        symptoms=["cough"],
        evidence_records=[unverified_rec]
    )

    assert sugg is not None
    assert sugg.url_verified is False
    assert sugg.evidence_status == "UNVERIFIED"
    assert sugg.source_url == ""

