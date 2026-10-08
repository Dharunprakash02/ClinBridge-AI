import pytest
from backend.app.services.uncertainty import (
    UncertaintyEngine, DecisionClass, UncertaintyEvaluation
)

def test_uncertainty_high_confidence():
    engine = UncertaintyEngine()
    candidates = [
        {"title": "Fever", "final_score": 0.92, "semantic_score": 0.95, "graph_consistency_score": 0.90, "evidence_score": 0.85},
        {"title": "Hypothermia", "final_score": 0.40, "semantic_score": 0.45, "graph_consistency_score": 0.30, "evidence_score": 0.20}
    ]

    eval_result = engine.evaluate_candidates(candidates, rule_validated=True)
    assert isinstance(eval_result, UncertaintyEvaluation)
    assert eval_result.decision_class == DecisionClass.HIGH_CONFIDENCE
    assert eval_result.confidence_score >= 0.80
    assert eval_result.requires_human_review is False
    assert eval_result.top1_top2_margin > 0.10

def test_uncertainty_ambiguous_close_margin():
    engine = UncertaintyEngine(ambiguity_margin_threshold=0.10)
    candidates = [
        {"title": "Fever, unspecified", "final_score": 0.82, "semantic_score": 0.85, "graph_consistency_score": 0.80, "evidence_score": 0.75},
        {"title": "Pyrexia of unknown origin", "final_score": 0.80, "semantic_score": 0.83, "graph_consistency_score": 0.79, "evidence_score": 0.74}
    ]

    eval_result = engine.evaluate_candidates(candidates, rule_validated=True)
    assert eval_result.decision_class == DecisionClass.AMBIGUOUS
    assert eval_result.requires_human_review is True
    assert eval_result.top1_top2_margin < 0.10

def test_uncertainty_rejected_by_rule_gate():
    engine = UncertaintyEngine()
    candidates = [
        {"title": "Fracture of tibia", "final_score": 0.95, "semantic_score": 0.95}
    ]

    eval_result = engine.evaluate_candidates(candidates, rule_validated=False)
    assert eval_result.decision_class == DecisionClass.REJECTED
    assert eval_result.confidence_score == 0.0
    assert eval_result.requires_human_review is True
