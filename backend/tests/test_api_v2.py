import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import SessionLocal, engine, Base
from backend.app.db.models import NamasteCode

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Ensure tables exist (like mapping_decisions)
    Base.metadata.create_all(bind=engine)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "knowledge_graph" in data["capabilities"]

def test_execute_mapping_pipeline():
    response = client.post("/mapping", json={"term": "Jwara", "code": "SR11"})
    assert response.status_code == 200
    data = response.json()
    assert data["source_term"] is not None
    assert "candidates" in data
    assert len(data["candidates"]) > 0
    top = data["candidates"][0]
    assert "scores" in top
    assert "textual" in top["scores"]
    assert "semantic" in top["scores"]
    assert "graph" in top["scores"]
    assert "evidence" in top["scores"]
    assert "explanation" in top

def test_explain_candidate():
    payload = {
        "source_term": "Jwara",
        "source_code": "SR11",
        "candidate_code": "MG26",
        "candidate_title": "Fever, unspecified"
    }
    response = client.post("/mapping/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["selected_candidate"] == "Fever, unspecified"
    assert "why_selected" in data
    assert "evidence" in data

def test_record_review_decision_and_history():
    payload = {
        "source_term": "Jwara",
        "source_code": "SR11",
        "selected_candidate_code": "MG26",
        "selected_candidate_title": "Fever, unspecified",
        "action": "ACCEPT",
        "comment": "Verified by Ayurveda clinical specialist.",
        "confidence": 0.92,
        "decision_class": "HIGH_CONFIDENCE"
    }
    response = client.post("/mapping/review", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify in history
    hist_response = client.get("/mapping/reviews")
    assert hist_response.status_code == 200
    reviews = hist_response.json()
    assert len(reviews) >= 1
    assert any(r["source_term"] == "Jwara" and r["action"] == "ACCEPT" for r in reviews)

def test_graph_context_endpoint():
    response = client.get("/graph/context/dosha_vata")
    assert response.status_code == 200
    data = response.json()
    assert data["concept_id"] == "dosha_vata"

def test_evidence_endpoint():
    response = client.get("/evidence/Jwara")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_evaluation_results_endpoint():
    response = client.get("/evaluation/results")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "baselines" in data
    assert "ablations" in data
    assert len(data["baselines"]) == 6
    assert len(data["ablations"]) == 5
