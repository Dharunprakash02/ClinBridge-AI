import sys
import json
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

from backend.app.db.database import SessionLocal
from backend.app.db.models import NamasteCode, HybridMappingResult
from backend.app.fhir.codesystem import generate_namaste_codesystem
from backend.app.fhir.conceptmap import generate_concept_map

def test_fhir_generation():
    print("Testing FHIR Generators...\n")
    db = SessionLocal()
    
    try:
        # Test CodeSystem
        print("1. Generating FHIR CodeSystem (first 2 records)...")
        codes = db.query(NamasteCode).limit(2).all()
        if codes:
            codesystem = generate_namaste_codesystem(codes)
            assert codesystem["resourceType"] == "CodeSystem"
            print(json.dumps(codesystem, indent=2))
        else:
            print("No NAMASTE codes found in DB.")
            
        print("\n" + "="*50 + "\n")
            
        # Test ConceptMap
        print("2. Generating FHIR ConceptMap...")
        mappings = db.query(HybridMappingResult).limit(5).all()
        if mappings:
            conceptmap = generate_concept_map(mappings)
            assert conceptmap["resourceType"] == "ConceptMap"
            print(json.dumps(conceptmap, indent=2))
        else:
            print("No HybridMappingResult records found in DB.")

    finally:
        db.close()
        
    print("\nTest completed.")

if __name__ == "__main__":
    test_fhir_generation()
