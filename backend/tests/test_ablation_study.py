"""
ClinBridge AI - Ablation Study Test Suite
Tests dataset validation, single-factor A1–A5 ablation experiments, performance drop calculations,
reproducibility, zero-denominator avoidance, and API endpoints.
"""

import os
import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

from backend.app.services.evaluation.dataset_validator import (
    validate_evaluation_dataset,
    DatasetValidationResult,
)
from experiments.ablation_runner import (
    run_ablation_study,
    EXPERIMENT_DEFINITIONS,
    build_candidate_pool,
)
from experiments.benchmark_runner import run_benchmarks

client = TestClient(app)

def test_dataset_validator_with_standard_reference_set():
    """Verify standard reference ground truth dataset validates cleanly."""
    path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "evaluation", "reference_ground_truth.json"
    )
    res: DatasetValidationResult = validate_evaluation_dataset(path)
    assert res.is_valid is True
    assert res.status == "VALID"
    assert res.valid_count == 12
    assert res.invalid_count == 0
    assert res.duplicate_count == 0
    assert len(res.valid_cases) == 12
    for c in res.valid_cases:
        assert "id" in c
        assert "source_term" in c
        assert "ground_truth_target_code" in c
        assert "expected_decision" in c

def test_dataset_validator_empty_dataset_handling():
    """Verify empty datasets are caught gracefully with zero-denominator protection."""
    res = validate_evaluation_dataset([])
    assert res.is_valid is False
    assert res.status == "EMPTY"
    assert res.valid_count == 0
    assert "0 cases" in res.message or "empty" in res.message

def test_dataset_validator_malformed_and_duplicate_handling():
    """Verify malformed records and duplicate identifiers are flagged explicitly."""
    malformed_data = [
        {"id": "CASE-1", "source_term": "Jwara", "ground_truth_target_code": "MG26", "expected_decision": "AUTO_ACCEPTED"},
        {"id": "CASE-1", "source_term": "Jwara Duplicate", "ground_truth_target_code": "MG26"},  # Duplicate ID
        {"id": "CASE-2", "source_term": "", "ground_truth_target_code": "MD30"},  # Missing term
        {"id": "CASE-3", "source_term": "kAsaH", "ground_truth_target_code": ""},  # Missing target code
        {"id": "CASE-4", "source_term": "SvAsaH", "ground_truth_target_code": "MD11", "expected_decision": "INVALID_DECISION_TYPE"},  # Invalid decision
        "not-a-dict"  # Invalid type
    ]
    res = validate_evaluation_dataset(malformed_data)
    # Only CASE-1 is completely valid
    assert res.is_valid is True
    assert res.valid_count == 1
    assert res.invalid_count == 5
    assert res.duplicate_count == 1
    assert len(res.validation_errors) >= 4

def test_ablation_experiment_definitions():
    """Verify exact definitions for A1 to A5 as required."""
    exp_ids = [e["id"] for e in EXPERIMENT_DEFINITIONS]
    assert exp_ids == ["A1", "A2", "A3", "A4", "A5"]

    a1 = next(e for e in EXPERIMENT_DEFINITIONS if e["id"] == "A1")
    assert a1["name"] == "Full Model Baseline"
    assert a1["is_baseline"] is True
    assert a1["use_kg"] is True
    assert a1["use_evidence"] is True
    assert a1["use_rule_gate"] is True
    assert a1["use_uncertainty"] is True

    a2 = next(e for e in EXPERIMENT_DEFINITIONS if e["id"] == "A2")
    assert a2["use_kg"] is False
    assert a2["use_evidence"] is True
    assert a2["use_rule_gate"] is True
    assert a2["use_uncertainty"] is True

    a3 = next(e for e in EXPERIMENT_DEFINITIONS if e["id"] == "A3")
    assert a3["use_kg"] is True
    assert a3["use_evidence"] is False
    assert a3["use_rule_gate"] is True
    assert a3["use_uncertainty"] is True

    a4 = next(e for e in EXPERIMENT_DEFINITIONS if e["id"] == "A4")
    assert a4["use_kg"] is True
    assert a4["use_evidence"] is True
    assert a4["use_rule_gate"] is False
    assert a4["use_uncertainty"] is True

    a5 = next(e for e in EXPERIMENT_DEFINITIONS if e["id"] == "A5")
    assert a5["use_kg"] is True
    assert a5["use_evidence"] is True
    assert a5["use_rule_gate"] is True
    assert a5["use_uncertainty"] is False

def test_ablation_study_execution_and_metrics():
    """Verify full ablation study execution on standard dataset."""
    result = run_ablation_study()
    assert result["status"] == "EVALUATED"
    assert result["sample_count"] == 12
    ablations = result["ablations"]
    assert len(ablations) == 5

    a1 = next(a for a in ablations if a["id"] == "A1")
    assert a1["status"] == "EVALUATED"
    assert 0.80 <= a1["top1_accuracy"] <= 1.0
    assert a1["performance_drop"] == 0.0
    assert a1["performance_drop_pp"] == 0.0

    # For each ablation, performance drop must equal A1 Top1 - Ax Top1
    for a in ablations:
        assert a["top1_accuracy"] is not None
        assert 0.0 <= a["top1_accuracy"] <= 1.0
        expected_drop = round(a1["top1_accuracy"] - a["top1_accuracy"], 4)
        assert abs(a["performance_drop"] - expected_drop) < 0.001
        expected_drop_pp = round((a1["top1_accuracy"] - a["top1_accuracy"]) * 100, 2)
        assert abs(a["performance_drop_pp"] - expected_drop_pp) < 0.01

def test_ablation_results_csv_saved():
    """Verify that ablation_results.csv is generated with proper columns."""
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "experiments", "results", "ablation_results.csv"
    )
    assert os.path.exists(csv_path)
    with open(csv_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        assert len(lines) == 6  # Header + 5 experiments
        header = lines[0].strip().split(",")
        assert "id" in header
        assert "top1_accuracy" in header
        assert "performance_drop" in header
        assert "performance_drop_pp" in header

def test_api_evaluation_endpoints():
    """Test GET /evaluation/results and POST /evaluation/run endpoints."""
    # 1. GET results
    res_get = client.get("/evaluation/results")
    assert res_get.status_code == 200
    data_get = res_get.json()
    assert "baselines" in data_get
    assert "ablations" in data_get
    assert len(data_get["baselines"]) == 6
    assert len(data_get["ablations"]) == 5

    # Check that A1 to A5 have valid numbers, not NaN
    for a in data_get["ablations"]:
        assert a["id"] in ["A1", "A2", "A3", "A4", "A5"]
        assert a["top1_accuracy"] is not None
        assert 0.0 <= a["top1_accuracy"] <= 1.0

    # 2. POST run
    res_post = client.post("/evaluation/run")
    assert res_post.status_code == 200
    data_post = res_post.json()
    assert "baselines" in data_post
    assert "ablations" in data_post
    assert len(data_post["ablations"]) == 5

def test_ablation_empty_dataset_graceful_unavailable():
    """Test that when given a non-existent or empty dataset, ablation runner returns UNAVAILABLE without NaN."""
    empty_result = run_ablation_study(dataset_path="non_existent_dataset_path.json")
    assert empty_result["status"] == "UNAVAILABLE"
    assert empty_result["sample_count"] == 0
    for a in empty_result["ablations"]:
        assert a["status"] == "UNAVAILABLE"
        assert a["top1_accuracy"] is None
        assert a["performance_drop"] is None
