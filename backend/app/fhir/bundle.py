from typing import List, Dict, Any
import uuid
import datetime

def generate_clinical_bundle(patient_data: dict, condition_code: str, condition_term: str, translations: List[dict]) -> Dict[str, Any]:
    """
    Generates a FHIR Transaction Bundle containing a Patient and a Condition resource.
    The Condition resource will contain dual coding (NAMASTE and translated ICD-11).
    """
    patient_id = f"urn:uuid:{uuid.uuid4()}"
    condition_id = f"urn:uuid:{uuid.uuid4()}"
    
    # 1. Patient Resource
    patient_resource = {
        "resourceType": "Patient",
        "id": patient_id.replace("urn:uuid:", ""),
        "name": [
            {
                "use": "official",
                "family": patient_data.get("last_name"),
                "given": [patient_data.get("first_name")]
            }
        ],
        "gender": patient_data.get("gender", "unknown").lower(),
        "birthDate": patient_data.get("birth_date")
    }

    # 2. Condition Resource Codings
    codings = [
        {
            "system": "http://clinbridge.ai/fhir/CodeSystem/namaste-ayurveda",
            "code": condition_code,
            "display": condition_term
        }
    ]
    
    for trans in translations:
        codings.append({
            "system": "http://id.who.int/icd/entity",
            "code": trans.get("target_uri"),
            "display": trans.get("icd11_title", "Unknown ICD-11 Entity")
        })

    condition_resource = {
        "resourceType": "Condition",
        "id": condition_id.replace("urn:uuid:", ""),
        "clinicalStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active"
                }
            ]
        },
        "code": {
            "coding": codings,
            "text": condition_term
        },
        "subject": {
            "reference": patient_id
        },
        "recordedDate": datetime.datetime.utcnow().isoformat() + "Z"
    }

    # 3. Transaction Bundle
    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "fullUrl": patient_id,
                "resource": patient_resource,
                "request": {
                    "method": "POST",
                    "url": "Patient"
                }
            },
            {
                "fullUrl": condition_id,
                "resource": condition_resource,
                "request": {
                    "method": "POST",
                    "url": "Condition"
                }
            }
        ]
    }
    
    return bundle
