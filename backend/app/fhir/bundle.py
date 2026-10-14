from typing import List, Dict, Any, Optional
import uuid
import datetime

def validate_fhir_bundle_structure(bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates resource structure against core HL7 FHIR R4 Transaction Bundle constraints.
    Checks resourceType, mandatory entry fields, HTTP verbs, and clinical resource keys.
    """
    errors = []
    if not isinstance(bundle, dict):
        return {"is_valid": False, "errors": ["Bundle must be a valid JSON dictionary"]}

    if bundle.get("resourceType") != "Bundle":
        errors.append("Root resourceType must be 'Bundle'")

    if bundle.get("type") != "transaction":
        errors.append("Bundle type must be 'transaction'")

    entries = bundle.get("entry", [])
    if not isinstance(entries, list) or len(entries) == 0:
        errors.append("Transaction Bundle must contain at least one entry")

    for idx, entry in enumerate(entries):
        if "fullUrl" not in entry:
            errors.append(f"Entry {idx} missing 'fullUrl'")
        if "request" not in entry or "method" not in entry["request"]:
            errors.append(f"Entry {idx} missing valid 'request.method'")
        res = entry.get("resource")
        if not res or "resourceType" not in res:
            errors.append(f"Entry {idx} missing valid resource object with 'resourceType'")
        else:
            if res.get("resourceType") == "Condition":
                if "clinicalStatus" not in res:
                    errors.append(f"Condition entry {idx} missing mandatory 'clinicalStatus'")
                if "code" not in res or not res["code"].get("coding"):
                    errors.append(f"Condition entry {idx} missing 'code.coding'")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors
    }

def generate_clinical_bundle(
    patient_data: dict,
    condition_code: str,
    condition_term: str,
    translations: List[dict],
    is_confirmed: bool = True,
    decision_class: str = "AUTO_ACCEPTED"
) -> Dict[str, Any]:
    """
    Generates a FHIR Transaction Bundle containing a Patient and a Condition resource.
    Reflects decision status:
    - If AUTO_ACCEPTED: verificationStatus = "confirmed"
    - If AMBIGUOUS / UNRESOLVED: verificationStatus = "provisional"
    - If REJECTED: verificationStatus = "refuted"
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
                "family": patient_data.get("last_name", "Unknown"),
                "given": [patient_data.get("first_name", "Unknown")]
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
        target_code = trans.get("target_uri") or trans.get("target_code") or trans.get("code")
        if target_code:
            codings.append({
                "system": "http://id.who.int/icd/entity",
                "code": str(target_code),
                "display": trans.get("icd11_title", trans.get("term", "ICD-11 Target Entity"))
            })

    # Verification status reflects genuine decision state
    verification_code = "confirmed" if is_confirmed and decision_class == "AUTO_ACCEPTED" else (
        "refuted" if decision_class == "REJECTED" else "provisional"
    )

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
        "verificationStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                    "code": verification_code
                }
            ],
            "text": f"Decision: {decision_class}"
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
    
    # 4. Perform structure validation
    val_res = validate_fhir_bundle_structure(bundle)
    bundle["_meta_validation"] = {
        "structure_valid": val_res["is_valid"],
        "validation_errors": val_res["errors"]
    }
    
    return bundle
