import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.fhir.bundle import (
    generate_clinical_bundle,
    validate_fhir_bundle_structure,
    extract_icd11_coding
)

client = TestClient(app)

def test_fhir_verification_status_unconfirmed_for_auto_accepted_when_clinical_status_unknown():
    """
    Requirement 1: AUTO_ACCEPTED terminology mapping must NOT set Condition.verificationStatus
    to 'confirmed' merely because the algorithm accepted the match.
    If clinical verification is unknown, verificationStatus must be 'unconfirmed'.
    """
    patient = {
        "first_name": "Arun",
        "last_name": "Sharma",
        "gender": "male",
        "birth_date": "1990-05-12"
    }
    translations = [{
        "system": "http://id.who.int/icd/release/11/mms",
        "code": "MG26",
        "display": "Symptoms or signs involving the body temperature"
    }]

    bundle = generate_clinical_bundle(
        patient_data=patient,
        condition_code="SR11",
        condition_term="Jwara",
        translations=translations,
        decision_class="AUTO_ACCEPTED",
        clinical_verification_status=None  # Unknown clinical verification
    )

    cond_entry = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition")
    ver_status = cond_entry["verificationStatus"]
    
    # Must NOT be 'confirmed'
    assert ver_status["coding"][0]["code"] != "confirmed"
    assert ver_status["coding"][0]["code"] == "unconfirmed"
    assert ver_status["coding"][0]["system"] == "http://terminology.hl7.org/CodeSystem/condition-ver-status"
    
    # Algorithmic decision is separated into an extension and a clinical note
    ext = next((x for x in cond_entry.get("extension", []) if "mapping-decision" in x["url"]), None)
    assert ext is not None
    assert ext["valueString"] == "AUTO_ACCEPTED"

def test_fhir_explicit_clinical_verification_status_honored():
    """
    Requirement 1: When an explicit clinical verification status is provided (e.g. from an attending clinician),
    it is honored and validated against the FHIR R4 ValueSet.
    """
    patient = {"first_name": "Priya", "last_name": "Nair", "gender": "female", "birth_date": "1988-11-20"}
    translations = [{
        "system": "http://id.who.int/icd/release/11/mms",
        "code": "MG26",
        "display": "Symptoms or signs involving the body temperature"
    }]

    # Clinician confirmed
    bundle_confirmed = generate_clinical_bundle(
        patient_data=patient,
        condition_code="SR11",
        condition_term="Jwara",
        translations=translations,
        decision_class="AUTO_ACCEPTED",
        clinical_verification_status="confirmed"
    )
    cond_confirmed = next(e["resource"] for e in bundle_confirmed["entry"] if e["resource"]["resourceType"] == "Condition")
    assert cond_confirmed["verificationStatus"]["coding"][0]["code"] == "confirmed"

    # Clinician provisional
    bundle_provisional = generate_clinical_bundle(
        patient_data=patient,
        condition_code="SR11",
        condition_term="Jwara",
        translations=translations,
        decision_class="AMBIGUOUS",
        clinical_verification_status="provisional"
    )
    cond_provisional = next(e["resource"] for e in bundle_provisional["entry"] if e["resource"]["resourceType"] == "Condition")
    assert cond_provisional["verificationStatus"]["coding"][0]["code"] == "provisional"

def test_fhir_icd11_coding_compliance_and_no_full_uri_in_code():
    """
    Requirement 2: Coding.code must store the concept identifier, NEVER a full URI.
    Coding.system must be the official WHO URI.
    Coding.display must not be a numeric ID when an official concept name is available.
    """
    # 1. MMS code passed as URI
    trans_mms_uri = {
        "target_uri": "http://id.who.int/icd/release/11/mms/MG26",
        "code": "http://id.who.int/icd/release/11/mms/MG26",
        "icd11_title": "Symptoms or signs involving the body temperature"
    }
    coding1 = extract_icd11_coding(trans_mms_uri)
    assert coding1 is not None
    assert coding1["system"] == "http://id.who.int/icd/release/11/mms"
    assert coding1["code"] == "MG26"
    assert not coding1["code"].startswith("http")
    assert coding1["display"] == "Symptoms or signs involving the body temperature"

    # 2. Foundation Entity numeric code with official title
    trans_entity = {
        "target_uri": "http://id.who.int/icd/entity/1754178993",
        "code": "1754178993",
        "icd11_title": "Fever disorder (TM2)"
    }
    coding2 = extract_icd11_coding(trans_entity)
    assert coding2 is not None
    assert coding2["system"] == "http://id.who.int/icd/entity"
    assert coding2["code"] == "1754178993"
    assert not coding2["code"].startswith("http")
    assert coding2["display"] == "Fever disorder (TM2)"
    assert not coding2["display"].isdigit()

def test_fhir_bundle_no_arbitrary_metadata_and_validation_rejects_non_standard_keys():
    """
    Requirement 3: The exported Bundle must not contain arbitrary non-standard keys like _meta_validation.
    The validator must reject non-standard root keys.
    """
    patient = {"first_name": "Deepak", "last_name": "Kumar", "gender": "male", "birth_date": "1992-03-14"}
    bundle = generate_clinical_bundle(
        patient_data=patient,
        condition_code="SR11",
        condition_term="Jwara",
        translations=[{"code": "MG26", "display": "Fever", "system": "http://id.who.int/icd/release/11/mms"}],
        decision_class="AUTO_ACCEPTED"
    )

    # Must NOT have _meta_validation inside bundle
    assert "_meta_validation" not in bundle
    
    # Clean bundle validates successfully
    val_clean = validate_fhir_bundle_structure(bundle)
    assert val_clean["is_valid"] is True
    assert val_clean["structure_valid"] is True

    # Artificially injecting non-standard metadata causes validator to flag error
    bad_bundle = dict(bundle)
    bad_bundle["_meta_validation"] = {"custom": "invalid"}
    val_bad = validate_fhir_bundle_structure(bad_bundle)
    assert val_bad["is_valid"] is False
    assert any("Non-standard root element '_meta_validation'" in err for err in val_bad["errors"])

def test_fhir_subject_reference_integrity():
    """
    Requirement 4 & 5: Condition.subject must resolve to the Patient entry.
    Validator must flag broken/invalid subject references.
    """
    patient = {"first_name": "Geeta", "last_name": "Iyer", "gender": "female", "birth_date": "1985-07-22"}
    bundle = generate_clinical_bundle(
        patient_data=patient,
        condition_code="SR11",
        condition_term="Jwara",
        translations=[{"code": "MG26", "display": "Fever", "system": "http://id.who.int/icd/release/11/mms"}]
    )

    patient_entry = next(e for e in bundle["entry"] if e["resource"]["resourceType"] == "Patient")
    cond_entry = next(e for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition")

    # In valid bundle, subject reference matches Patient fullUrl
    assert cond_entry["resource"]["subject"]["reference"] == patient_entry["fullUrl"]

    # Corrupt the reference and assert validator catches it
    corrupt_bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            patient_entry,
            {
                "fullUrl": cond_entry["fullUrl"],
                "resource": {
                    **cond_entry["resource"],
                    "subject": {"reference": "urn:uuid:non-existent-patient-id"}
                },
                "request": cond_entry["request"]
            }
        ]
    }
    val_corrupt = validate_fhir_bundle_structure(corrupt_bundle)
    assert val_corrupt["is_valid"] is False
    assert any("cannot be resolved to any Patient entry" in err for err in val_corrupt["errors"])

def test_missing_source_code_does_not_fabricate_coding():
    """
    Requirement 2 & 5: When an Ayurveda/NAMASTE source code is unavailable,
    a fake code (like 'SOURCE TERMINOLOGY CODE UNAVAILABLE') must NOT be inserted into Coding.
    The clinical concept is represented truthfully in CodeableConcept.text.
    """
    patient = {"first_name": "Anil", "last_name": "Gupta", "gender": "male", "birth_date": "1978-09-05"}
    bundle = generate_clinical_bundle(
        patient_data=patient,
        condition_code="Source terminology code unavailable",
        condition_term="Vata Vyadhi",
        translations=[{"code": "MG26", "display": "Body Temperature", "system": "http://id.who.int/icd/release/11/mms"}]
    )

    cond_res = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition")
    codings = cond_res["code"]["coding"]

    # Verify no coding has the string 'Source terminology code unavailable' as a code
    for c in codings:
        assert "UNAVAILABLE" not in c["code"].upper()
    
    # CodeableConcept.text preserves the term
    assert cond_res["code"]["text"] == "Vata Vyadhi"

def test_structural_validity_disclaimer_present():
    """
    Requirement 5: Ensure structural validity is never treated as proof of clinical correctness.
    Validator returns explicit disclaimer.
    """
    val = validate_fhir_bundle_structure({"resourceType": "Bundle", "type": "transaction", "entry": []})
    assert "disclaimer" in val
    assert "does NOT constitute clinical validation" in val["disclaimer"]

def test_api_generate_bundle_returns_validation_metadata_separately():
    """
    Requirement 3: POST /api/v1/fhir/generate-bundle returns technical validation metadata
    (structure_valid, validation_errors) separately in the response envelope,
    leaving the Bundle resource pure and standard-compliant.
    """
    payload = {
        "patient": {
            "first_name": "Sunil",
            "last_name": "Mehta",
            "gender": "male",
            "birth_date": "1983-04-18"
        },
        "namaste_code": "SR11",
        "namaste_term": "Jwara",
        "selected_candidate_code": "MG26",
        "selected_candidate_title": "Symptoms or signs involving the body temperature"
    }

    # Default envelope response
    res = client.post("/api/v1/fhir/generate-bundle", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "bundle" in data
    assert "structure_valid" in data
    assert data["structure_valid"] is True
    assert "validation_errors" in data
    assert len(data["validation_errors"]) == 0
    assert "_meta_validation" not in data["bundle"]

    # Condition in bundle has correct unconfirmed status (clinical verification unknown)
    bundle = data["bundle"]
    cond = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition")
    assert cond["verificationStatus"]["coding"][0]["code"] == "unconfirmed"
    assert cond["code"]["coding"][1]["code"] == "MG26"
    assert not cond["code"]["coding"][1]["code"].startswith("http")

    # Raw bundle query param support
    res_raw = client.post("/api/v1/fhir/generate-bundle?raw_bundle=true", json=payload)
    assert res_raw.status_code == 200
    raw_data = res_raw.json()
    assert raw_data["resourceType"] == "Bundle"
    assert "_meta_validation" not in raw_data
