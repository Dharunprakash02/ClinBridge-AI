import os
import json
import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from backend.app.services.graph_rag.care_suggestions_service import care_suggestions_service
from backend.app.services.knowledge_graph import graph_query_service
from backend.app.fhir.bundle import generate_clinical_bundle, validate_fhir_bundle_structure

logger = logging.getLogger(__name__)

class PatientInfoSection(BaseModel):
    first_name: str
    last_name: str
    full_name: str
    gender: str
    birth_date: str
    age_years: Optional[int] = None
    patient_id: str

class SourceDiagnosisSection(BaseModel):
    condition_name: str
    source_code: str
    terminology_system: str = "National AYUSH Morbidity and Standardized Terminologies Electronic (NAMASTE) Portal"
    terminology_version: str = "v1.0 (2024)"
    description: str
    knowledge_graph_symptoms: List[str] = Field(default_factory=list)
    doshas: List[str] = Field(default_factory=list)

class TargetIcd11Section(BaseModel):
    target_title: str
    target_code: str
    classification_system: str = "World Health Organization International Classification of Diseases (WHO ICD-11 MMS Release 2026-01)"
    tm2_designation: str
    mapping_relationship: str
    ranking_score: float
    confidence_calibration_status: str = "Uncalibrated Multi-Signal Ranking Score"
    decision_class: str
    decision_reason: str
    short_explanation: str
    relevant_graph_relations: List[str] = Field(default_factory=list)
    timestamp: str

class ScoreBreakdownSection(BaseModel):
    textual: float
    semantic: float
    graph: float
    evidence: float
    final: float
    policy_rationale: str

class KgContextSection(BaseModel):
    symptoms: List[str] = Field(default_factory=list)
    doshas: List[str] = Field(default_factory=list)
    related_concepts: List[str] = Field(default_factory=list)

class PatientReportData(BaseModel):
    report_title: str = "ClinBridge AI — Patient Terminology Mapping Report"
    report_id: str
    generated_at: str
    system_version: str = "ClinBridge AI v2.4 (Research Interoperability Architecture)"
    
    patient: PatientInfoSection
    original_ayurveda_diagnosis: SourceDiagnosisSection
    mapped_icd11_concept: TargetIcd11Section
    decision_and_scores: ScoreBreakdownSection
    knowledge_graph_context: KgContextSection
    care_suggestions: List[Dict[str, Any]] = Field(default_factory=list)
    care_suggestions_status: str
    care_suggestions_disclaimer: str
    evidence_provenance: List[Dict[str, Any]] = Field(default_factory=list)
    
    fhir_validation_status: str
    fhir_bundle_valid: bool
    fhir_validation_errors: List[str] = Field(default_factory=list)
    academic_disclaimer: str

class PatientReportGenerator:
    """
    Generates a structured, professional patient terminology-mapping report
    conforming to the 10 standard report sections.
    """

    ACADEMIC_DISCLAIMER = (
        "ClinBridge AI is a research and clinical informatics interoperability platform developed "
        "for semantic terminology translation between traditional medicine (AYUSH/NAMASTE) and modern biomedical "
        "coding (WHO ICD-11). This document is produced for health informatics verification, EHR data exchange, and academic demonstration. "
        "It does NOT constitute an independent clinical diagnosis, therapeutic instruction, medical prescription, or order. "
        "Direct clinical diagnosis, drug prescribing, and treatment decisions must be administered by a qualified, licensed medical practitioner."
    )

    def validate_patient_input(self, patient: Dict[str, Any]) -> None:
        """Validates mandatory patient demographic inputs and date formatting."""
        if not isinstance(patient, dict):
            raise ValueError("Patient data must be a dictionary.")

        first_name = (patient.get("first_name") or "").strip()
        last_name = (patient.get("last_name") or "").strip()
        birth_date = (patient.get("birth_date") or "").strip()

        if not first_name:
            raise ValueError("Patient First Name is required.")
        if not last_name:
            raise ValueError("Patient Last Name is required.")
        if not birth_date:
            raise ValueError("Patient Date of Birth is required.")

        try:
            parsed_date = datetime.date.fromisoformat(birth_date)
            if parsed_date > datetime.date.today():
                raise ValueError("Date of Birth cannot be in the future.")
        except Exception as e:
            raise ValueError(f"Invalid Date of Birth format '{birth_date}'. Expected YYYY-MM-DD: {e}")

    def generate_report(
        self,
        patient: Dict[str, Any],
        namaste_term: str,
        namaste_code: Optional[str] = None,
        candidate: Optional[Dict[str, Any]] = None,
        pipeline_data: Optional[Dict[str, Any]] = None
    ) -> PatientReportData:
        """Assembles all 10 required report sections from validated patient and mapping data."""
        self.validate_patient_input(patient)

        # 1. Patient Details
        first = patient["first_name"].strip()
        last = patient["last_name"].strip()
        dob = patient["birth_date"].strip()
        gender = patient.get("gender", "unknown").capitalize()

        age_years = None
        try:
            bdate = datetime.date.fromisoformat(dob)
            today = datetime.date.today()
            age_years = today.year - bdate.year - ((today.month, today.day) < (bdate.month, bdate.day))
        except Exception:
            pass

        patient_id = patient.get("patient_id") or patient.get("id") or "PAT-EMR-LOCAL"

        patient_section = PatientInfoSection(
            first_name=first,
            last_name=last,
            full_name=f"{first} {last}",
            gender=gender,
            birth_date=dob,
            age_years=age_years,
            patient_id=patient_id
        )

        # 2. Source Diagnosis Details
        src_code = namaste_code.strip() if namaste_code and namaste_code.strip() else "Source terminology code unavailable"
        if src_code in ["CUSTOM_TERM", "UNKNOWN"]:
            src_code = "Source terminology code unavailable"

        # Lookup description from DB or ground truth
        src_desc = ""
        if pipeline_data and pipeline_data.get("source_def"):
            src_desc = pipeline_data["source_def"]
        elif candidate and candidate.get("definition"):
            src_desc = candidate.get("definition")
        else:
            src_desc = f"Ayurvedic clinical entity documented under NAMASTE standard: {namaste_term}."

        # Knowledge Graph context
        kg_context_obj = graph_query_service.get_concept_context(src_code if src_code != "Source terminology code unavailable" else namaste_term)
        kg_symptoms = kg_context_obj.symptoms if kg_context_obj else []
        kg_doshas = kg_context_obj.doshas if kg_context_obj else []
        kg_related = kg_context_obj.related_concepts if kg_context_obj else []

        if not kg_symptoms and candidate and candidate.get("graph_context"):
            kg_symptoms = candidate["graph_context"].get("symptoms", [])
            kg_doshas = candidate["graph_context"].get("doshas", [])
            kg_related = candidate["graph_context"].get("related_concepts", [])

        source_section = SourceDiagnosisSection(
            condition_name=namaste_term,
            source_code=src_code,
            description=src_desc,
            knowledge_graph_symptoms=kg_symptoms,
            doshas=kg_doshas
        )

        # 3. Target ICD-11 Details
        decision = (candidate.get("decision") if candidate else None) or (pipeline_data.get("decision_class") if pipeline_data else "UNMAPPED")
        decision_reason = (pipeline_data.get("decision_reason") if pipeline_data else "Automated mapping policy evaluated.")
        
        target_code = candidate.get("code") if candidate else "UNMAPPED"
        target_title = candidate.get("term") or candidate.get("title") if candidate else "No Confirmed ICD-11 Match"
        
        rel = candidate.get("relationship", "uncertain") if candidate else "unmapped"
        if decision == "AUTO_ACCEPTED" and rel == "uncertain":
            rel = "equivalent"

        # Scores
        scores_obj = candidate.get("scores", {}) if candidate else {}
        if hasattr(scores_obj, "dict"):
            scores_obj = scores_obj.dict()

        textual_sc = float(scores_obj.get("textual", 0.0))
        semantic_sc = float(scores_obj.get("semantic", 0.0))
        graph_sc = float(scores_obj.get("graph", 0.0))
        evidence_sc = float(scores_obj.get("evidence", 0.0))
        final_sc = float(candidate.get("confidence") or scores_obj.get("final", 0.0)) if candidate else 0.0

        tm2_designation = "Traditional Medicine Module 2 (TM2)" if (candidate and "TM2" in str(candidate.get("uri", ""))) else "Biomedical Linearisation (MMS)"

        target_section = TargetIcd11Section(
            target_title=target_title,
            target_code=target_code,
            tm2_designation=tm2_designation,
            mapping_relationship=rel,
            ranking_score=round(final_sc, 4),
            decision_class=decision,
            decision_reason=decision_reason,
            short_explanation=candidate.get("explanation", f"Automated mapping with score {final_sc:.2f}") if candidate else "No match satisfying thresholds.",
            relevant_graph_relations=candidate.get("influencing_graph_relations", []) if candidate else [],
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )

        score_section = ScoreBreakdownSection(
            textual=round(textual_sc, 3),
            semantic=round(semantic_sc, 3),
            graph=round(graph_sc, 3),
            evidence=round(evidence_sc, 3),
            final=round(final_sc, 3),
            policy_rationale=decision_reason
        )

        kg_section = KgContextSection(
            symptoms=kg_symptoms,
            doshas=kg_doshas,
            related_concepts=kg_related
        )

        # 4. Care Suggestions & Evidence
        care_res = care_suggestions_service.generate_suggestions(
            source_term=namaste_term,
            candidate_code=target_code if target_code != "UNMAPPED" else None,
            candidate_title=target_title if target_code != "UNMAPPED" else None,
            decision_class=decision,
            graph_context={"symptoms": kg_symptoms, "doshas": kg_doshas}
        )

        formatted_suggestions = [s.dict() for s in care_res.suggestions]
        
        # Provenance records
        provenance_list = []
        if candidate and candidate.get("evidence"):
            from backend.app.services.graph_rag.evidence_verifier import is_url_verified
            for e in candidate.get("evidence", []):
                rec_url = e.get("url") or e.get("source_url") or ""
                is_ver = e.get("url_verified")
                if is_ver is None:
                    is_ver = is_url_verified(rec_url)
                provenance_list.append({
                    "title": e.get("title"),
                    "source": e.get("source") or e.get("publisher"),
                    "url": rec_url if is_ver else "",
                    "url_verified": bool(is_ver),
                    "evidence_status": "SUPPORTED" if is_ver else "UNVERIFIED",
                    "excerpt": e.get("excerpt") or e.get("text", "")
                })
        elif formatted_suggestions:
            for s in formatted_suggestions:
                provenance_list.append({
                    "title": s.get("source_title"),
                    "source": s.get("publisher"),
                    "url": s.get("source_url") if s.get("url_verified") else "",
                    "url_verified": s.get("url_verified", False),
                    "evidence_status": s.get("evidence_status", "UNVERIFIED"),
                    "excerpt": s.get("evidence_excerpt")
                })

        # 5. FHIR Validation Status
        # Validate actual bundle using our validator
        bundle_translations = []
        if candidate and target_code != "UNMAPPED":
            bundle_translations.append({
                "system": "http://id.who.int/icd/release/11/mms",
                "code": target_code,
                "display": target_title
            })

        clinical_bundle = generate_clinical_bundle(
            patient_data=patient,
            condition_code=src_code,
            condition_term=namaste_term,
            translations=bundle_translations,
            is_confirmed=(decision == "AUTO_ACCEPTED"),
            decision_class=decision
        )
        val_result = validate_fhir_bundle_structure(clinical_bundle)

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        report_id = f"RPT-{uuid.uuid4().hex[:12].upper()}"

        return PatientReportData(
            report_id=report_id,
            generated_at=now_str,
            patient=patient_section,
            original_ayurveda_diagnosis=source_section,
            mapped_icd11_concept=target_section,
            decision_and_scores=score_section,
            knowledge_graph_context=kg_section,
            care_suggestions=formatted_suggestions,
            care_suggestions_status=care_res.status,
            care_suggestions_disclaimer=care_res.safety_disclaimer,
            evidence_provenance=provenance_list,
            fhir_validation_status="Confirmed Validated FHIR R4 Bundle" if val_result["is_valid"] else "Validation Warnings Present",
            fhir_bundle_valid=val_result["is_valid"],
            fhir_validation_errors=val_result["errors"],
            academic_disclaimer=self.ACADEMIC_DISCLAIMER
        )

patient_report_generator = PatientReportGenerator()
