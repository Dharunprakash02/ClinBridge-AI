from typing import List, Dict, Any
from backend.app.db.models import HybridMappingResult

def generate_concept_map(mappings: List[HybridMappingResult]) -> Dict[str, Any]:
    """
    Generates a FHIR ConceptMap resource mapping NAMASTE to ICD-11.
    """
    
    # Group mappings by source_code to structure the FHIR groups
    source_to_targets = {}
    for mapping in mappings:
        if mapping.namaste_code not in source_to_targets:
            source_to_targets[mapping.namaste_code] = []
            
        target_element = {
            "code": mapping.icd11_code if mapping.icd11_code else "NO_MATCH",
            "equivalence": mapping.relationship_type if mapping.relationship_type else "unmatched",
            "comment": f"Confidence: {mapping.confidence_level}, Final Score: {mapping.final_score:.2f}, Method: {mapping.mapping_method}"
        }
            
        source_to_targets[mapping.namaste_code].append(target_element)

    elements = []
    for source_code, targets in source_to_targets.items():
        elements.append({
            "code": source_code,
            "target": targets
        })
    
    concept_map = {
        "resourceType": "ConceptMap",
        "id": "namaste-to-icd11",
        "url": "http://clinbridge.ai/fhir/ConceptMap/namaste-to-icd11",
        "version": "2.0.0",
        "name": "NamasteToICD11ConceptMap",
        "title": "NAMASTE to ICD-11 Concept Map (Hybrid Automation)",
        "status": "active",
        "experimental": False,
        "date": "2026-08-28",
        "publisher": "ClinBridge AI Mini Project",
        "description": "Automated Hybrid Mapping from Ayurveda NAMASTE codes to WHO ICD-11 URIs.",
        "sourceUri": "http://clinbridge.ai/fhir/CodeSystem/namaste-ayurveda",
        "targetUri": "http://id.who.int/icd/entity",
        "group": [
            {
                "source": "http://clinbridge.ai/fhir/CodeSystem/namaste-ayurveda",
                "target": "http://id.who.int/icd/entity",
                "element": elements
            }
        ]
    }
    
    return concept_map
