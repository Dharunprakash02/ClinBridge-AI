import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_fhir_history_unauthenticated_rejected():
    """Ensure accessing FHIR history requires valid authentication."""
    res = client.get("/api/v1/fhir/history")
    assert res.status_code == 401


def test_fhir_history_authenticated(auth_headers):
    """Authenticated user can fetch FHIR bundle history and statistics."""
    res = client.get("/api/v1/fhir/history", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_count" in data
    assert "generated_count" in data
    assert "uploaded_count" in data
    assert "compliant_count" in data
    assert "items" in data
    assert isinstance(data["items"], list)


def test_generate_bundle_persists_to_history(auth_headers):
    """Generating a FHIR R4 bundle stores it in the database and reflects in history."""
    payload = {
        "patient": {
            "first_name": "Siddharth",
            "last_name": "Menon",
            "gender": "male",
            "birth_date": "1988-06-20",
            "patient_id": "PAT-HIST-101"
        },
        "namaste_code": "NAMC-AYU-JW-01",
        "namaste_term": "Jwara (Fever)",
        "selected_candidate_code": "MG26",
        "selected_candidate_title": "Pyrexia of unknown origin",
        "selected_candidate_uri": "http://id.who.int/icd/release/11/mms/MG26",
        "force_unverified": False,
        "clinical_verification_status": "confirmed"
    }

    gen_res = client.post("/api/v1/fhir/generate-bundle", json=payload, headers=auth_headers)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert "bundle_id" in gen_data
    bundle_id = gen_data["bundle_id"]

    # Verify presence in history
    hist_res = client.get(f"/api/v1/fhir/history?search=Siddharth", headers=auth_headers)
    assert hist_res.status_code == 200
    hist_items = hist_res.json()["items"]
    matched = [it for it in hist_items if it["bundle_id"] == bundle_id or "Siddharth" in it["patient_name"]]
    assert len(matched) > 0
    assert matched[0]["source_type"] == "GENERATED"
    assert matched[0]["icd11_code"] == "MG26"


def test_upload_medical_report_structured(auth_headers):
    """Uploading an external medical report via structured parameters creates and saves a FHIR record."""
    payload = {
        "patient_first_name": "Lakshmi",
        "patient_last_name": "Nair",
        "patient_gender": "female",
        "patient_birth_date": "1992-04-12",
        "patient_id": "EXT-PAT-202",
        "condition_code": "NAMC-AYU-KS-01",
        "condition_term": "Kasa (Cough)",
        "icd11_code": "MD11",
        "icd11_title": "Cough",
        "clinical_verification_status": "confirmed",
        "notes": "External pulmonology referral notes."
    }

    res = client.post("/api/v1/fhir/upload-report", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "bundle_id" in data
    assert data["patient_name"] == "Lakshmi Nair"
    assert data["structure_valid"] is True

    # Check history
    hist_res = client.get("/api/v1/fhir/history?source_type=UPLOADED", headers=auth_headers)
    assert hist_res.status_code == 200
    items = hist_res.json()["items"]
    matched = [it for it in items if it["bundle_id"] == data["bundle_id"]]
    assert len(matched) == 1
    assert matched[0]["source_type"] == "UPLOADED"


def test_get_fhir_bundle_by_id(auth_headers):
    """Fetch full bundle by bundle_id."""
    # First create one
    payload = {
        "patient_first_name": "Devi",
        "patient_last_name": "Prasad",
        "patient_gender": "male",
        "patient_birth_date": "1980-01-01",
        "condition_term": "Prameha",
        "icd11_code": "5A10",
        "icd11_title": "Type 1 diabetes mellitus"
    }
    create_res = client.post("/api/v1/fhir/upload-report", json=payload, headers=auth_headers)
    assert create_res.status_code == 200
    bundle_id = create_res.json()["bundle_id"]

    get_res = client.get(f"/api/v1/fhir/bundles/{bundle_id}", headers=auth_headers)
    assert get_res.status_code == 200
    bundle_data = get_res.json()
    assert bundle_data["bundle_id"] == bundle_id
    assert bundle_data["patient_name"] == "Devi Prasad"
    assert "bundle" in bundle_data
    assert bundle_data["bundle"]["resourceType"] == "Bundle"


def test_delete_bundle_rbac_permissions(auth_headers, reviewer_headers):
    """Clinician cannot delete bundles, but Reviewer/Admin can."""
    # Create bundle
    payload = {
        "patient_first_name": "Test",
        "patient_last_name": "DeleteMe",
        "condition_term": "Temporary Condition"
    }
    create_res = client.post("/api/v1/fhir/upload-report", json=payload, headers=reviewer_headers)
    bundle_id = create_res.json()["bundle_id"]

    # Clinician attempt -> 403 Forbidden
    del_clinician = client.delete(f"/api/v1/fhir/bundles/{bundle_id}", headers=auth_headers)
    assert del_clinician.status_code == 403

    # Reviewer attempt -> 200 OK
    del_reviewer = client.delete(f"/api/v1/fhir/bundles/{bundle_id}", headers=reviewer_headers)
    assert del_reviewer.status_code == 200


def test_update_bundle_verification_status(auth_headers, reviewer_headers):
    """Clinical Reviewer can endorse a record from unconfirmed to confirmed."""
    # 1. Create an unconfirmed record
    payload = {
        "patient_first_name": "Devi",
        "patient_last_name": "Prasad",
        "condition_term": "Prameha",
        "icd11_code": "5A10",
        "icd11_title": "Type 1 diabetes mellitus",
        "clinical_verification_status": "unconfirmed"
    }
    create_res = client.post("/api/v1/fhir/upload-report", json=payload, headers=auth_headers)
    assert create_res.status_code == 200
    bundle_id = create_res.json()["bundle_id"]

    # 2. Reviewer endorses to 'confirmed'
    endorse_res = client.patch(
        f"/api/v1/fhir/bundles/{bundle_id}/verification-status",
        json={
            "status": "confirmed",
            "endorsement_note": "Laboratory fasting glucose verified."
        },
        headers=reviewer_headers
    )
    assert endorse_res.status_code == 200
    data = endorse_res.json()
    assert data["success"] is True
    assert data["new_status"] == "confirmed"

    # 3. Verify in database
    get_res = client.get(f"/api/v1/fhir/bundles/{bundle_id}", headers=auth_headers)
    assert get_res.status_code == 200
    bundle_data = get_res.json()
    assert bundle_data["clinical_verification_status"] == "confirmed"
    
    # Check inner FHIR resource
    cond_entry = [e["resource"] for e in bundle_data["bundle"]["entry"] if e["resource"]["resourceType"] == "Condition"][0]
    assert cond_entry["verificationStatus"]["coding"][0]["code"] == "confirmed"

