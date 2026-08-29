from typing import List, Dict, Any
from backend.app.db.models import NamasteCode

def generate_namaste_codesystem(codes: List[NamasteCode]) -> Dict[str, Any]:
    """
    Generates a FHIR CodeSystem resource for the NAMASTE terminology.
    """
    concepts = []
    for code in codes:
        concept = {
            "code": code.namaste_code,
            "display": code.term,
        }
        if code.long_definition:
            concept["definition"] = code.long_definition
            
        concepts.append(concept)
        
    codesystem = {
        "resourceType": "CodeSystem",
        "id": "namaste-ayurveda-codesystem",
        "url": "http://clinbridge.ai/fhir/CodeSystem/namaste-ayurveda",
        "version": "1.0.0",
        "name": "NAMASTEAyurvedaMorbidityCodes",
        "title": "National Ayurveda Morbidity Codes (NAMASTE)",
        "status": "active",
        "experimental": False,
        "date": "2026-08-27",
        "publisher": "ClinBridge AI Mini Project",
        "description": "A CodeSystem representing the standard Ayurvedic morbidity codes.",
        "caseSensitive": True,
        "content": "complete",
        "concept": concepts
    }
    
    return codesystem
