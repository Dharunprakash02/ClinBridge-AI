"""
ClinBridge AI - Evaluation Dataset Validator
Ensures research integrity by validating ground-truth reference datasets before benchmark or ablation execution.
Handles empty datasets, schema mismatches, duplicate identifiers, and missing labels gracefully.
"""

import os
import json
from typing import Dict, Any, List, Union
from pydantic import BaseModel, Field

VALID_DECISION_CLASSES = {
    "AUTO_ACCEPTED",
    "AMBIGUOUS",
    "LOW_CONFIDENCE",
    "REJECTED",
    "INSUFFICIENT_EVIDENCE",
    "UNMAPPED",
}

class DatasetValidationResult(BaseModel):
    is_valid: bool
    status: str  # "VALID", "EMPTY", "INVALID", "FILE_NOT_FOUND", "ERROR"
    message: str
    total_records: int = 0
    valid_count: int = 0
    invalid_count: int = 0
    duplicate_count: int = 0
    validation_errors: List[str] = Field(default_factory=list)
    valid_cases: List[Dict[str, Any]] = Field(default_factory=list)
    invalid_cases: List[Dict[str, Any]] = Field(default_factory=list)
    dataset_metadata: Dict[str, Any] = Field(default_factory=dict)

def validate_evaluation_dataset(dataset_or_path: Union[str, List[Dict[str, Any]]]) -> DatasetValidationResult:
    """
    Validates an evaluation dataset from a file path or in-memory record list.
    Enforces strict research validation:
      - Validates non-empty dataset (zero-denominator avoidance)
      - Validates required fields: id, source_term, ground_truth_target_code, expected_decision
      - Detects duplicate case identifiers
      - Documents invalid records explicitly
    """
    raw_data: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}

    if isinstance(dataset_or_path, str):
        path = dataset_or_path
        if not os.path.exists(path):
            return DatasetValidationResult(
                is_valid=False,
                status="FILE_NOT_FOUND",
                message=f"Evaluation dataset file not found at path: {path}",
                validation_errors=[f"File not found: {path}"]
            )
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return DatasetValidationResult(
                        is_valid=False,
                        status="EMPTY",
                        message="Evaluation dataset file is empty (0 bytes). Minimum 1 labelled reference case is required.",
                        validation_errors=["Dataset file is empty"]
                    )
                raw_data = json.loads(content)
                metadata["source_path"] = path
                metadata["file_size_bytes"] = os.path.getsize(path)
        except json.JSONDecodeError as e:
            return DatasetValidationResult(
                is_valid=False,
                status="ERROR",
                message=f"Invalid JSON format in evaluation dataset: {str(e)}",
                validation_errors=[f"JSONDecodeError: {str(e)}"]
            )
        except Exception as e:
            return DatasetValidationResult(
                is_valid=False,
                status="ERROR",
                message=f"Failed to read evaluation dataset: {str(e)}",
                validation_errors=[str(e)]
            )
    elif isinstance(dataset_or_path, list):
        raw_data = dataset_or_path
        metadata["source_type"] = "in_memory_list"
    else:
        return DatasetValidationResult(
            is_valid=False,
            status="INVALID",
            message=f"Unsupported dataset input type: {type(dataset_or_path).__name__}. Expected file path or list of dicts.",
            validation_errors=[f"Invalid input type: {type(dataset_or_path).__name__}"]
        )

    if not isinstance(raw_data, list):
        return DatasetValidationResult(
            is_valid=False,
            status="INVALID",
            message=f"Dataset root must be a JSON array of case objects, got {type(raw_data).__name__}.",
            validation_errors=["Root JSON element is not a list"]
        )

    if len(raw_data) == 0:
        return DatasetValidationResult(
            is_valid=False,
            status="EMPTY",
            message="Evaluation dataset contains 0 cases. At least 1 valid labelled case is required to calculate metrics.",
            total_records=0,
            valid_count=0,
            invalid_count=0,
            validation_errors=["Dataset is empty (0 records)"]
        )

    valid_cases: List[Dict[str, Any]] = []
    invalid_cases: List[Dict[str, Any]] = []
    errors: List[str] = []
    seen_ids = set()
    duplicate_count = 0

    for idx, item in enumerate(raw_data):
        if not isinstance(item, dict):
            errors.append(f"Record at index {idx} is not an object/dict: {item}")
            invalid_cases.append({"index": idx, "raw": item, "reason": "Not an object"})
            continue

        item_id = item.get("id") or item.get("case_id")
        source_term = item.get("source_term") or item.get("term")
        gt_target = item.get("ground_truth_target_code") or item.get("target_code")
        expected_decision = item.get("expected_decision") or item.get("decision")

        record_errors = []

        if not item_id or not str(item_id).strip():
            record_errors.append(f"Record {idx}: Missing or blank 'id'")
        elif str(item_id).strip() in seen_ids:
            duplicate_count += 1
            record_errors.append(f"Record {idx}: Duplicate identifier '{item_id}' detected")
        else:
            seen_ids.add(str(item_id).strip())

        if not source_term or not str(source_term).strip():
            record_errors.append(f"Record {idx} (ID={item_id}): Missing or blank 'source_term'")

        if not gt_target or not str(gt_target).strip():
            record_errors.append(f"Record {idx} (ID={item_id}): Missing or blank 'ground_truth_target_code'")

        if expected_decision:
            if expected_decision.upper() not in VALID_DECISION_CLASSES:
                record_errors.append(
                    f"Record {idx} (ID={item_id}): Invalid 'expected_decision'='{expected_decision}'. Must be one of {sorted(VALID_DECISION_CLASSES)}"
                )

        if record_errors:
            errors.extend(record_errors)
            invalid_cases.append({
                "record": item,
                "errors": record_errors
            })
        else:
            # Normalized record
            valid_cases.append({
                "id": str(item_id).strip(),
                "source_code": item.get("source_code", "UNKNOWN"),
                "source_term": str(source_term).strip(),
                "definition": item.get("definition", ""),
                "ground_truth_target_code": str(gt_target).strip(),
                "ground_truth_target_title": item.get("ground_truth_target_title", ""),
                "expected_decision": expected_decision.upper() if expected_decision else "AUTO_ACCEPTED",
                "category": item.get("category", "General")
            })

    total = len(raw_data)
    valid_count = len(valid_cases)
    invalid_count = len(invalid_cases)

    if valid_count == 0:
        return DatasetValidationResult(
            is_valid=False,
            status="INVALID",
            message=f"All {total} records failed validation. Zero valid test cases available.",
            total_records=total,
            valid_count=0,
            invalid_count=invalid_count,
            duplicate_count=duplicate_count,
            validation_errors=errors,
            valid_cases=[],
            invalid_cases=invalid_cases,
            dataset_metadata=metadata
        )

    return DatasetValidationResult(
        is_valid=True,
        status="VALID",
        message=f"Dataset successfully validated with {valid_count} valid reference cases ({invalid_count} invalid rejected).",
        total_records=total,
        valid_count=valid_count,
        invalid_count=invalid_count,
        duplicate_count=duplicate_count,
        validation_errors=errors,
        valid_cases=valid_cases,
        invalid_cases=invalid_cases,
        dataset_metadata=metadata
    )
