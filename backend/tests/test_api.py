import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_search_terminology():
    # Test valid search query
    response = client.get("/api/v1/terminology/search?q=jvara")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    
    # Test search query that's too short (validation error)
    response_short = client.get("/api/v1/terminology/search?q=a")
    assert response_short.status_code == 422

def test_fhir_codesystem():
    # Test FHIR CodeSystem generation
    response = client.get("/api/v1/fhir/CodeSystem")
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "CodeSystem"
    assert data["status"] == "active"
    assert "concept" in data

def test_fhir_conceptmap():
    # Test FHIR ConceptMap generation
    response = client.get("/api/v1/fhir/ConceptMap")
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "ConceptMap"
    assert data["status"] == "active"

def test_generate_bundle_invalid_payload(auth_headers):
    # Test bundle generation with missing patient data
    payload = {
        "namaste_code": "EC-3.8.23"
        # patient data missing
    }
    response = client.post("/api/v1/fhir/generate-bundle", json=payload, headers=auth_headers)
    assert response.status_code == 422 # Validation error
