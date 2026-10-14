import pytest
from backend.app.services.uncertainty.uncertainty_engine import (
    UncertaintyEngine, DecisionClass, DecisionPolicyConfig
)
from backend.app.services.graph_rag.grounded_explanation import (
    GroundedExplanationGenerator, GroundedExplanationResult
)
from backend.app.services.graph_rag.evidence_store import EvidenceStore
from backend.app.fhir.bundle import generate_clinical_bundle, validate_fhir_bundle_structure
from experiments.benchmark_runner import run_benchmarks

def test_1_strong_candidate_automatic_acceptance():
    """1. Strong candidate with sufficient evidence -> automatic acceptance."""
    engine = UncertaintyEngine()
    candidates = [
        {"title": "Fever, unspecified", "final_score": 0.88, "semantic_score": 0.90, "graph_consistency_score": 0.85, "evidence_score": 0.80},
        {"title": "Hypothermia", "final_score": 0.40, "semantic_score": 0.45, "graph_consistency_score": 0.30, "evidence_score": 0.20}
    ]
    res = engine.evaluate_candidates(candidates, rule_validated=True)
    assert res.decision_class == DecisionClass.AUTO_ACCEPTED
    assert res.requires_human_review is False
    assert res.fhir_generation_allowed is True

def test_2_close_competing_candidates_ambiguity():
    """2. Close competing candidates -> ambiguity detection."""
    engine = UncertaintyEngine(ambiguity_margin_threshold=0.10)
    candidates = [
        {"title": "Fever, unspecified", "final_score": 0.84, "semantic_score": 0.86, "graph_consistency_score": 0.80, "evidence_score": 0.75},
        {"title": "Pyrexia of unknown origin", "final_score": 0.82, "semantic_score": 0.85, "graph_consistency_score": 0.79, "evidence_score": 0.74}
    ]
    res = engine.evaluate_candidates(candidates, rule_validated=True)
    assert res.decision_class == DecisionClass.AMBIGUOUS
    assert res.top1_top2_margin < 0.10
    assert res.fhir_generation_allowed is False

def test_3_missing_or_irrelevant_evidence_insufficient():
    """3. Missing or irrelevant evidence -> unmapped / insufficient evidence."""
    engine = UncertaintyEngine(min_evidence_score=0.50)
    candidates = [
        {"title": "Rare Tropical Condition", "final_score": 0.78, "semantic_score": 0.82, "graph_consistency_score": 0.80, "evidence_score": 0.0}
    ]
    res = engine.evaluate_candidates(candidates, rule_validated=True)
    assert res.decision_class in [DecisionClass.INSUFFICIENT_EVIDENCE, DecisionClass.LOW_CONFIDENCE]
    assert res.fhir_generation_allowed is False

def test_4_failed_mandatory_validation_rule():
    """4. Failed mandatory validation rule -> no automatic acceptance."""
    engine = UncertaintyEngine()
    candidates = [
        {"title": "Fracture of tibia", "final_score": 0.96, "semantic_score": 0.95, "graph_consistency_score": 0.90, "evidence_score": 0.85}
    ]
    res = engine.evaluate_candidates(candidates, rule_validated=False, rule_rejection_reason="Violates safety rule")
    assert res.decision_class == DecisionClass.REJECTED
    assert res.fhir_generation_allowed is False
    assert res.confidence_score == 0.0

def test_5_graphrag_failure_graceful_handling():
    """5. GraphRAG failure -> graceful handling without fabricated evidence."""
    generator = GroundedExplanationGenerator()
    res = generator.generate_explanation(
        source_concept={"term": "UnknownTerm", "code": "UK00"},
        candidate={"title": "Unknown Target", "code": "XX00"},
        graph_context={},
        rule_status={"passed": [], "failed": ["NO_RULE_MATCH"]},
        scores={"final": 0.3},
        confidence=0.3
    )
    assert isinstance(res, GroundedExplanationResult)
    assert res.has_sufficient_evidence is False

def test_6_fhir_generation_for_valid_accepted_mapping():
    """6. FHIR generation for a valid accepted mapping."""
    bundle = generate_clinical_bundle(
        patient_data={"first_name": "Sita", "last_name": "Devi", "gender": "female"},
        condition_code="SR11",
        condition_term="Jwara",
        translations=[{
            "system": "http://id.who.int/icd/release/11/mms",
            "code": "MG26",
            "display": "Symptoms or signs involving the body temperature"
        }],
        is_confirmed=True,
        decision_class="AUTO_ACCEPTED"
    )
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "transaction"
    val = validate_fhir_bundle_structure(bundle)
    assert val["is_valid"] is True
    assert len(val["errors"]) == 0

def test_7_fhir_generation_blocked_or_restricted_for_unresolved():
    """7. FHIR generation marked provisional or refuted for unresolved mappings."""
    bundle = generate_clinical_bundle(
        patient_data={"first_name": "Rohan", "last_name": "Verma"},
        condition_code="UK99",
        condition_term="Unmapped Sensation",
        translations=[],
        is_confirmed=False,
        decision_class="REJECTED"
    )
    condition_entry = next((e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition"), None)
    assert condition_entry is not None
    assert condition_entry["verificationStatus"]["coding"][0]["code"] == "refuted"

def test_8_b1_to_b6_evaluation_on_shared_dataset():
    """8. B1–B6 evaluation on a shared labelled dataset with genuine computed metrics."""
    benchmark_res = run_benchmarks()
    baselines = benchmark_res["baselines"]
    assert len(baselines) == 6
    b_ids = [b["id"] for b in baselines]
    assert b_ids == ["B1", "B2", "B3", "B4", "B5", "B6"]
    for b in baselines:
        assert 0.0 <= b["top1_accuracy"] <= 1.0
        assert 0.0 <= b["mrr"] <= 1.0

def test_9_correct_handling_of_missing_data_and_unavailable_metrics():
    """9. Correct handling of missing data and unmapped inputs."""
    engine = UncertaintyEngine()
    empty_res = engine.evaluate_candidates([], rule_validated=True)
    assert empty_res.decision_class == DecisionClass.UNMAPPED
    assert empty_res.confidence_score == 0.0
    assert empty_res.fhir_generation_allowed is False

def test_10_evidence_store_zero_score_on_irrelevant():
    """10. Zero evidence score when no retrievable records exist."""
    store = EvidenceStore()
    recs = store.retrieve_by_candidate_support("UnrelatedTermXYZ", "UnrelatedCandidateXYZ", "NON_EXISTENT_999")
    assert len(recs) == 0
    sc = store.calculate_evidence_support_score("UnrelatedTermXYZ", "UnrelatedCandidateXYZ", "NON_EXISTENT_999")
    assert sc == 0.0
