from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.api.dependencies import get_db
from backend.app.db.models import NamasteCode, HybridMappingResult
from backend.app.services.icd_service import icd_service
from backend.app.services.mapping_service import mapping_service
from backend.app.fhir.codesystem import generate_namaste_codesystem
from backend.app.fhir.conceptmap import generate_concept_map
from backend.app.schemas.schemas import GenerateBundleRequest
from backend.app.fhir.bundle import generate_clinical_bundle

router = APIRouter()

@router.get("/terminology/search")
def search_terminology(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    """Search NAMASTE codes by term or code."""
    results = db.query(NamasteCode).filter(
        (NamasteCode.search_text.ilike(f"%{q}%")) |
        (NamasteCode.namaste_code.ilike(f"%{q}%"))
    ).limit(20).all()
    
    return [
        {
            "code": r.namaste_code,
            "term": r.term,
            "definition": r.long_definition
        }
        for r in results
    ]

@router.get("/mapping/translate")
def translate_code(source_code: str, db: Session = Depends(get_db)):
    """Translate a NAMASTE code to ICD-11 URIs."""
    mappings = mapping_service.get_mappings_for_source(db, source_code)
    if not mappings:
        return []
        
    response = []
    for m in mappings:
        response.append({
            "source_code": m.namaste_code,
            "target_system": m.icd11_release,
            "target_uri": m.icd11_uri,
            "icd11_uri": m.icd11_uri,
            "equivalence": m.relationship_type,
            "icd11_title": m.icd11_title,
            "icd11_code": m.icd11_code,
            "confidence_level": m.confidence_level,
            "final_score": m.final_score,
            "lexical_score": m.lexical_score,
            "synonym_score": m.synonym_score,
            "translation_score": m.translation_score,
            "definition_score": m.definition_score,
            "clinical_score": m.clinical_score,
            "semantic_score": m.semantic_score,
            "api_rank_score": m.api_rank_score,
            "conflict_penalty": m.conflict_penalty,
            "mapping_method": m.mapping_method,
            "relationship_type": m.relationship_type
        })
        
    return response

@router.get("/fhir/CodeSystem")
def get_fhir_codesystem(db: Session = Depends(get_db)):
    """Retrieve the NAMASTE terminology as a FHIR CodeSystem."""
    codes = db.query(NamasteCode).limit(500).all()  # Limiting to 500 for performance in MVP
    return generate_namaste_codesystem(codes)

@router.get("/fhir/ConceptMap")
def get_fhir_conceptmap(db: Session = Depends(get_db)):
    """Retrieve the NAMASTE to ICD-11 mapping as a FHIR ConceptMap."""
    mappings = db.query(HybridMappingResult).all()
    return generate_concept_map(mappings)

@router.post("/fhir/generate-bundle")
def generate_bundle(request: GenerateBundleRequest, db: Session = Depends(get_db)):
    """
    Accepts patient data and an Ayurveda diagnosis, translates it to ICD-11,
    and returns a FHIR Transaction Bundle with Patient and Condition resources.
    """
    # 1. Verify the NAMASTE code exists (optional but good practice)
    namaste_record = db.query(NamasteCode).filter(NamasteCode.namaste_code == request.namaste_code).first()
    condition_term = request.namaste_term or (namaste_record.term if namaste_record else "Unknown Ayurveda Condition")

    # 2. Get Translations
    mappings = mapping_service.get_mappings_for_source(db, request.namaste_code)
    translations = []
    for m in mappings:
        translations.append({
            "target_uri": m.icd11_uri,
            "icd11_title": m.icd11_title or "Unknown ICD-11 Entity"
        })
        
    # 3. Generate the Bundle
    bundle = generate_clinical_bundle(
        patient_data=request.patient.dict(),
        condition_code=request.namaste_code,
        condition_term=condition_term,
        translations=translations
    )
    
    return bundle

