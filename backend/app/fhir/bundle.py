from typing import List, Dict, Any, Optional
import uuid
import datetime
import re

# Standard allowed top-level elements for HL7 FHIR R4 Bundle
FHIR_R4_BUNDLE_STANDARD_KEYS = {
    "resourceType", "id", "meta", "implicitRules", "language",
    "identifier", "type", "timestamp", "total", "link", "entry", "signature"
}

# Standard FHIR R4 Condition ValueSets
VALID_CLINICAL_STATUS_CODES = {
    "active", "recurrence", "relapse", "inactive", "remission", "resolved"
}
VALID_VERIFICATION_STATUS_CODES = {
    "unconfirmed", "provisional", "differential", "confirmed", "refuted", "entered-in-error"
}
VALID_GENDERS = {"male", "female", "other", "unknown"}

CLINICAL_VALIDATION_DISCLAIMER = (
    "Structural validity confirms HL7 FHIR R4 schema and reference compliance only. "
    "It does NOT constitute clinical validation, medical confirmation, or proof of diagnostic accuracy."
)

def validate_fhir_bundle_structure(bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates resource structure against core HL7 FHIR R4 Transaction Bundle constraints.
    Checks resourceType, absence of non-standard properties, mandatory entry fields,
    HTTP verbs, subject reference integrity, and clinical resource keys.
    """
    errors: List[str] = []
    warnings: List[str] = []

    if not isinstance(bundle, dict):
        return {
            "is_valid": False,
            "structure_valid": False,
            "errors": ["Bundle must be a valid JSON dictionary"],
            "warnings": [],
            "disclaimer": CLINICAL_VALIDATION_DISCLAIMER
        }

    # 1. Top-level Bundle Checks
    if bundle.get("resourceType") != "Bundle":
        errors.append("Root resourceType must be 'Bundle'")

    if bundle.get("type") != "transaction":
        errors.append("Bundle type must be 'transaction'")

    # Ensure no arbitrary/non-standard metadata was injected into the Bundle root
    for key in bundle.keys():
        if key not in FHIR_R4_BUNDLE_STANDARD_KEYS:
            errors.append(f"Non-standard root element '{key}' is not permitted in standard FHIR R4 Bundle")

    entries = bundle.get("entry", [])
    if not isinstance(entries, list) or len(entries) == 0:
        errors.append("Transaction Bundle must contain at least one entry")
        return {
            "is_valid": False,
            "structure_valid": False,
            "errors": errors,
            "warnings": warnings,
            "disclaimer": CLINICAL_VALIDATION_DISCLAIMER
        }

    # Collect available fullUrls and resource identifiers for reference integrity verification
    known_targets = set()
    patient_entries = []

    for idx, entry in enumerate(entries):
        if not isinstance(entry, dict):
            errors.append(f"Entry {idx} must be a dictionary object")
            continue

        full_url = entry.get("fullUrl")
        if not full_url:
            errors.append(f"Entry {idx} missing mandatory 'fullUrl'")
        else:
            known_targets.add(full_url)

        req = entry.get("request")
        if not isinstance(req, dict) or "method" not in req or "url" not in req:
            errors.append(f"Entry {idx} missing valid 'request' object with 'method' and 'url'")
        else:
            method = req.get("method")
            if method not in ("POST", "PUT", "DELETE", "GET", "PATCH"):
                errors.append(f"Entry {idx} request.method '{method}' is not a valid FHIR transaction HTTP verb")

        res = entry.get("resource")
        if not isinstance(res, dict) or "resourceType" not in res:
            errors.append(f"Entry {idx} missing valid resource object with 'resourceType'")
            continue

        res_type = res.get("resourceType")
        res_id = res.get("id")
        if res_id:
            known_targets.add(f"{res_type}/{res_id}")
            known_targets.add(res_id)

        if res_type == "Patient":
            patient_entries.append(entry)
            gender = res.get("gender")
            if gender and gender.lower() not in VALID_GENDERS:
                errors.append(f"Patient entry {idx} has invalid gender '{gender}'. Must be one of: {sorted(list(VALID_GENDERS))}")
            birth_date = res.get("birthDate")
            if birth_date and not re.match(r"^\d{4}(-\d{2}(-\d{2})?)?$", str(birth_date)):
                warnings.append(f"Patient entry {idx} birthDate '{birth_date}' does not follow standard ISO YYYY-MM-DD format")

    # 2. Inspect Condition Resources & Reference Integrity
    for idx, entry in enumerate(entries):
        res = entry.get("resource")
        if not isinstance(res, dict) or res.get("resourceType") != "Condition":
            continue

        # Subject Reference Integrity Check
        subject = res.get("subject")
        if not isinstance(subject, dict) or "reference" not in subject:
            errors.append(f"Condition entry {idx} missing mandatory 'subject.reference'")
        else:
            sub_ref = subject.get("reference")
            if sub_ref not in known_targets:
                errors.append(
                    f"Condition entry {idx} subject reference '{sub_ref}' cannot be resolved to any Patient entry in the Bundle"
                )

        # Mandatory clinicalStatus Check
        clinical_status = res.get("clinicalStatus")
        if not isinstance(clinical_status, dict) or not clinical_status.get("coding"):
            errors.append(f"Condition entry {idx} missing mandatory 'clinicalStatus.coding'")
        else:
            c_code = clinical_status["coding"][0].get("code")
            if c_code not in VALID_CLINICAL_STATUS_CODES:
                errors.append(
                    f"Condition entry {idx} clinicalStatus '{c_code}' is invalid. Allowed: {sorted(list(VALID_CLINICAL_STATUS_CODES))}"
                )

        # VerificationStatus Check
        ver_status = res.get("verificationStatus")
        if ver_status:
            if not isinstance(ver_status, dict) or not ver_status.get("coding"):
                errors.append(f"Condition entry {idx} verificationStatus must contain a 'coding' list")
            else:
                v_code = ver_status["coding"][0].get("code")
                if v_code not in VALID_VERIFICATION_STATUS_CODES:
                    errors.append(
                        f"Condition entry {idx} verificationStatus code '{v_code}' is invalid. Allowed: {sorted(list(VALID_VERIFICATION_STATUS_CODES))}"
                    )

        # Terminology Codings Check
        code_obj = res.get("code")
        if not isinstance(code_obj, dict):
            errors.append(f"Condition entry {idx} missing 'code' object")
        else:
            codings = code_obj.get("coding", [])
            if not codings and not code_obj.get("text"):
                errors.append(f"Condition entry {idx} code must contain at least one coding or non-empty text")
            for c_idx, coding in enumerate(codings):
                system = coding.get("system")
                code_val = coding.get("code")
                display = coding.get("display")

                if not system or not str(system).startswith("http"):
                    warnings.append(f"Condition entry {idx} coding {c_idx} missing standard URI system: '{system}'")
                if not code_val:
                    errors.append(f"Condition entry {idx} coding {c_idx} missing 'code'")
                elif str(code_val).startswith("http://") or str(code_val).startswith("https://"):
                    errors.append(
                        f"Condition entry {idx} coding {c_idx} 'code' contains a full URL '{code_val}'. "
                        "Concept identifier must be the code symbol, not the entire URI."
                    )
                if display and str(display).isdigit():
                    warnings.append(
                        f"Condition entry {idx} coding {c_idx} display name '{display}' appears to be a numeric identifier instead of an official concept title"
                    )

    is_valid = len(errors) == 0
    return {
        "is_valid": is_valid,
        "structure_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "disclaimer": CLINICAL_VALIDATION_DISCLAIMER
    }


def extract_icd11_coding(trans: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extracts a compliant FHIR R4 Coding for WHO ICD-11.
    Ensures:
    1. Coding.code stores the concept identifier (e.g. 'MG26' or '1754178993'), NEVER a full URI.
    2. Coding.system uses the appropriate WHO system URI.
    3. Coding.display uses the official concept name and avoids raw numeric IDs when a title is available.
    """
    raw_code = trans.get("code") or trans.get("target_code") or ""
    raw_uri = trans.get("target_uri") or trans.get("uri") or ""
    explicit_system = trans.get("system")
    display_title = trans.get("display") or trans.get("icd11_title") or trans.get("term") or trans.get("target_title")

    # If raw_code is missing, parse the identifier from raw_uri
    if not raw_code and raw_uri:
        raw_code = str(raw_uri).rstrip("/").split("/")[-1]

    # If raw_code itself is a full URI, strip the URL prefix to get the concept identifier
    code_str = str(raw_code).strip()
    if code_str.startswith("http://") or code_str.startswith("https://"):
        code_str = code_str.rstrip("/").split("/")[-1]

    if not code_str or code_str == "NO_MATCH":
        return None

    # Determine standard WHO ICD-11 system URI
    if explicit_system:
        system = explicit_system
    elif "/entity/" in str(raw_uri) or (code_str.isdigit() and len(code_str) > 6):
        system = "http://id.who.int/icd/entity"
    else:
        system = "http://id.who.int/icd/release/11/mms"

    # Ensure display name is not a raw numeric identifier when a title is available
    if not display_title or str(display_title).strip() == code_str:
        if code_str.isdigit():
            clean_display = f"ICD-11 Entity {code_str}"
        else:
            clean_display = code_str
    else:
        clean_display = str(display_title).strip()

    return {
        "system": system,
        "code": code_str,
        "display": clean_display
    }


def generate_clinical_bundle(
    patient_data: dict,
    condition_code: str,
    condition_term: str,
    translations: List[dict],
    is_confirmed: Optional[bool] = None,
    decision_class: str = "AUTO_ACCEPTED",
    clinical_verification_status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a clean, standard-compliant HL7 FHIR R4 Transaction Bundle
    containing Patient and Condition resources.

    Clinical Verification Rules:
    - Condition.verificationStatus reflects actual clinical confirmation, NOT algorithmic decision.
    - AUTO_ACCEPTED terminology mapping does NOT imply clinical confirmation ('confirmed').
    - If clinical verification is unknown, verificationStatus is 'unconfirmed'.
    - If explicitly provided (e.g. from human clinician review), validated FHIR R4 status is used.
    - Algorithmic mapping decision (AUTO_ACCEPTED, AMBIGUOUS, REJECTED) is represented separately
      using a FHIR extension and Condition.note annotation.
    - Non-standard metadata (e.g. _meta_validation) is NEVER inserted into the Bundle resource.
    """
    patient_uuid = str(uuid.uuid4())
    condition_uuid = str(uuid.uuid4())
    patient_fullurl = f"urn:uuid:{patient_uuid}"
    condition_fullurl = f"urn:uuid:{condition_uuid}"

    # 1. Patient Resource
    patient_resource: Dict[str, Any] = {
        "resourceType": "Patient",
        "id": patient_uuid,
        "name": [
            {
                "use": "official",
                "family": patient_data.get("last_name", "Unknown").strip(),
                "given": [patient_data.get("first_name", "Unknown").strip()]
            }
        ],
        "gender": str(patient_data.get("gender", "unknown")).lower().strip(),
        "birthDate": patient_data.get("birth_date")
    }

    patient_id_val = patient_data.get("patient_id") or patient_data.get("id")
    if patient_id_val and str(patient_id_val).strip() and str(patient_id_val).strip().upper() not in ("UNKNOWN", "NONE"):
        patient_resource["identifier"] = [
            {
                "system": "http://clinbridge.ai/fhir/sid/patient",
                "value": str(patient_id_val).strip()
            }
        ]

    # 2. Condition Resource Codings
    codings: List[Dict[str, Any]] = []

    # Ayurveda / NAMASTE Source Terminology
    has_valid_source_code = bool(
        condition_code
        and str(condition_code).strip()
        and str(condition_code).strip().upper() not in (
            "SOURCE TERMINOLOGY CODE UNAVAILABLE", "UNAVAILABLE", "UNKNOWN", "NONE", "NO_CODE"
        )
    )
    if has_valid_source_code:
        codings.append({
            "system": "http://clinbridge.ai/fhir/CodeSystem/namaste-ayurveda",
            "code": str(condition_code).strip(),
            "display": str(condition_term).strip() if condition_term else str(condition_code).strip()
        })

    # Mapped WHO ICD-11 Target Terminology
    for trans in translations:
        icd_coding = extract_icd11_coding(trans)
        if icd_coding:
            codings.append(icd_coding)

    # 3. Clinical Verification Status vs Algorithmic Decision
    # Disentangle algorithmic decision from clinical verification:
    if clinical_verification_status and str(clinical_verification_status).lower() in VALID_VERIFICATION_STATUS_CODES:
        verification_code = str(clinical_verification_status).lower()
        verification_display = verification_code.capitalize()
        verification_text = f"Clinical verification status: {verification_display}"
    elif decision_class == "REJECTED":
        verification_code = "refuted"
        verification_display = "Refuted"
        verification_text = "Mapping rejected / condition refuted"
    elif decision_class in ("AMBIGUOUS", "UNMAPPED"):
        verification_code = "provisional"
        verification_display = "Provisional"
        verification_text = f"Provisional diagnosis (Mapping decision: {decision_class})"
    else:
        # Default for unreviewed clinical encounters or AUTO_ACCEPTED algorithmic mapping:
        # Clinical verification is unconfirmed until attested by an attending clinician.
        verification_code = "unconfirmed"
        verification_display = "Unconfirmed"
        verification_text = "Clinical verification unconfirmed (Algorithmic terminology crosswalk)"

    condition_resource: Dict[str, Any] = {
        "resourceType": "Condition",
        "id": condition_uuid,
        "clinicalStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active",
                    "display": "Active"
                }
            ]
        },
        "verificationStatus": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                    "code": verification_code,
                    "display": verification_display
                }
            ],
            "text": verification_text
        },
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                        "code": "encounter-diagnosis",
                        "display": "Encounter Diagnosis"
                    }
                ]
            }
        ],
        "code": {
            "coding": codings,
            "text": condition_term
        },
        "subject": {
            "reference": patient_fullurl
        },
        "recordedDate": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "extension": [
            {
                "url": "http://clinbridge.ai/fhir/StructureDefinition/mapping-decision",
                "valueString": decision_class
            }
        ],
        "note": [
            {
                "text": (
                    f"Algorithmic Terminology Mapping Decision: {decision_class}. "
                    "Clinical diagnosis verification remains distinct from terminology crosswalk evaluation."
                )
            }
        ]
    }

    # 4. Standard FHIR R4 Transaction Bundle
    bundle: Dict[str, Any] = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "fullUrl": patient_fullurl,
                "resource": patient_resource,
                "request": {
                    "method": "POST",
                    "url": "Patient"
                }
            },
            {
                "fullUrl": condition_fullurl,
                "resource": condition_resource,
                "request": {
                    "method": "POST",
                    "url": "Condition"
                }
            }
        ]
    }

    # Note: Technical validation metadata is kept OUTSIDE the FHIR Bundle resource
    # to maintain strict HL7 FHIR R4 compliance.
    return bundle

