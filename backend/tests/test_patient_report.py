import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.reporting.report_generator import (
    patient_report_generator, PatientReportGenerator, PatientReportData
)
from backend.app.fhir.bundle import generate_clinical_bundle, validate_fhir_bundle_structure

client = TestClient(app)

def test_patient_input_validation():
    """Validates patient inputs: missing fields or invalid dates raise ValueError."""
    gen = PatientReportGenerator()

    # Missing first name
    with pytest.raises(ValueError, match="First Name is required"):
        gen.validate_patient_input({"first_name": "", "last_name": "Kumar", "birth_date": "1990-01-01"})

    # Missing DOB
    with pytest.raises(ValueError, match="Date of Birth is required"):
        gen.validate_patient_input({"first_name": "Ram", "last_name": "Kumar", "birth_date": ""})

    # Future date
    with pytest.raises(ValueError, match="future"):
        gen.validate_patient_input({"first_name": "Ram", "last_name": "Kumar", "birth_date": "2099-01-01"})

def test_generate_complete_patient_report_10_sections():
    """Generates complete report with all 10 standard clinical sections."""
    patient = {
        "first_name": "Ananya",
        "last_name": "Sharma",
        "gender": "Female",
        "birth_date": "1992-06-20",
        "patient_id": "PAT-2026-901"
    }
    candidate = {
        "code": "MG26",
        "term": "Symptoms or signs involving the body temperature",
        "relationship": "equivalent",
        "confidence": 0.88,
        "decision": "AUTO_ACCEPTED",
        "scores": {
            "textual": 0.85,
            "semantic": 0.89,
            "graph": 0.86,
            "evidence": 0.82,
            "final": 0.88
        },
        "graph_context": {
            "symptoms": ["fever", "heat", "thirst"],
            "doshas": ["Pitta"]
        },
        "explanation": "High semantic and clinical alignment with febrile symptoms."
    }

    report = patient_report_generator.generate_report(
        patient=patient,
        namaste_term="Jwara",
        namaste_code="SR11",
        candidate=candidate,
        pipeline_data={"decision_class": "AUTO_ACCEPTED", "decision_reason": "High confidence threshold satisfied."}
    )

    assert isinstance(report, PatientReportData)
    assert report.report_title == "ClinBridge AI — Patient Terminology Mapping Report"
    assert report.report_id.startswith("RPT-")
    
    # Section 2: Patient
    assert report.patient.full_name == "Ananya Sharma"
    assert report.patient.gender == "Female"
    assert report.patient.patient_id == "PAT-2026-901"
    assert report.patient.age_years is not None

    # Section 3: Original Diagnosis
    assert report.original_ayurveda_diagnosis.condition_name == "Jwara"
    assert report.original_ayurveda_diagnosis.source_code == "SR11"
    assert "NAMASTE" in report.original_ayurveda_diagnosis.terminology_system

    # Section 4: Mapped ICD-11
    assert report.mapped_icd11_concept.target_code == "MG26"
    assert "body temperature" in report.mapped_icd11_concept.target_title.lower()
    assert report.mapped_icd11_concept.decision_class == "AUTO_ACCEPTED"
    assert report.mapped_icd11_concept.ranking_score == 0.88

    # Section 5: Score Breakdown
    assert report.decision_and_scores.textual == 0.85
    assert report.decision_and_scores.semantic == 0.89
    assert report.decision_and_scores.final == 0.88

    # Section 6: Knowledge Graph Context
    assert "fever" in report.knowledge_graph_context.symptoms or "heat" in report.knowledge_graph_context.symptoms

    # Section 7: Top-2 AI Care Suggestions
    assert len(report.care_suggestions) == 2
    assert report.care_suggestions[0]["type"] == "SELF_CARE_GUIDANCE"
    assert report.care_suggestions[1]["type"] == "WARNING_SIGNS_AND_TRIAGE"

    # Section 8: Provenance
    assert len(report.evidence_provenance) > 0

    # Section 9: Validation Status
    assert report.fhir_bundle_valid is True
    assert "Valid" in report.fhir_validation_status

    # Section 10: Metadata
    assert len(report.generated_at) > 10

def test_source_code_unavailable_when_missing():
    """If source terminology code is absent or unknown, report displays explicit unavailable notice without fabricating."""
    patient = {
        "first_name": "Dev",
        "last_name": "Patel",
        "birth_date": "1985-04-12"
    }

    report = patient_report_generator.generate_report(
        patient=patient,
        namaste_term="CustomTraditionalTerm",
        namaste_code="",
        candidate=None
    )

    assert report.original_ayurveda_diagnosis.source_code == "Source terminology code unavailable"
    assert report.mapped_icd11_concept.target_code == "UNMAPPED"
    assert report.mapped_icd11_concept.decision_class == "UNMAPPED"
    assert len(report.care_suggestions) == 0

def test_ambiguous_mapping_withholds_care_suggestions_in_report():
    """Ambiguous or rejected mappings in report have care suggestions withheld."""
    patient = {
        "first_name": "Vikram",
        "last_name": "Singh",
        "birth_date": "1978-11-03"
    }
    candidate = {
        "code": "MG26",
        "term": "Pyrexia of unknown origin",
        "decision": "AMBIGUOUS",
        "confidence": 0.65
    }

    report = patient_report_generator.generate_report(
        patient=patient,
        namaste_term="Jwara",
        namaste_code="SR11",
        candidate=candidate,
        pipeline_data={"decision_class": "AMBIGUOUS", "decision_reason": "Narrow margin between top candidates."}
    )

    assert report.mapped_icd11_concept.decision_class == "AMBIGUOUS"
    assert report.care_suggestions_status == "WITHHELD_DUE_TO_UNCERTAINTY"
    assert len(report.care_suggestions) == 0

def test_fhir_and_report_consistency():
    """Ensures consistent patient details and terminology coding between FHIR bundle and Report."""
    patient = {
        "first_name": "Meera",
        "last_name": "Nair",
        "gender": "Female",
        "birth_date": "2000-01-15",
        "patient_id": "PAT-MEERA-01"
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
        is_confirmed=True,
        decision_class="AUTO_ACCEPTED"
    )

    report = patient_report_generator.generate_report(
        patient=patient,
        namaste_term="Jwara",
        namaste_code="SR11",
        candidate={"code": "MG26", "term": "Symptoms or signs involving the body temperature", "decision": "AUTO_ACCEPTED"}
    )

    # Check consistency
    patient_res = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Patient")
    cond_res = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition")

    assert patient_res["name"][0]["family"] == report.patient.last_name
    assert cond_res["code"]["coding"][0]["code"] == report.original_ayurveda_diagnosis.source_code
    assert cond_res["code"]["coding"][1]["code"] == report.mapped_icd11_concept.target_code

def test_api_report_endpoint(auth_headers):
    """Tests POST /reports/patient-mapping HTTP endpoint."""
    payload = {
        "patient": {
            "first_name": "Suresh",
            "last_name": "Rao",
            "gender": "Male",
            "birth_date": "1994-08-10"
        },
        "namaste_term": "Jwara",
        "namaste_code": "SR11",
        "candidate": {
            "code": "MG26",
            "term": "Symptoms or signs involving the body temperature",
            "decision": "AUTO_ACCEPTED",
            "confidence": 0.90
        }
    }

    res = client.post("/reports/patient-mapping", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["report_title"] == "ClinBridge AI — Patient Terminology Mapping Report"
    assert data["patient"]["full_name"] == "Suresh Rao"
    assert data["mapped_icd11_concept"]["target_code"] == "MG26"
    assert "care_suggestions" in data
