import pytest
from backend.app.services.mapping.rule_gate import RuleValidationGate, RuleValidationResult

def test_rule_validation_gate_pass():
    gate = RuleValidationGate()
    source = {"term": "Jwara", "definition": "Characterized by fever and body heat."}
    candidate = {"title": "Fever of unknown origin", "definition": "Elevated core body temperature.", "code": "MG26"}

    result = gate.validate_candidate(source, candidate)
    assert result.rule_validated is True
    assert result.status == "PASS"
    assert len(result.failed_rules) == 0

def test_rule_validation_gate_reject_incompatible_category():
    gate = RuleValidationGate()
    source = {"term": "Jwara", "definition": "High fever and pyrexia."}
    candidate = {"title": "Fracture of femur", "definition": "Traumatic bone breakage.", "code": "NC72"}

    result = gate.validate_candidate(source, candidate)
    assert result.rule_validated is False
    assert result.status == "REJECT"
    assert any("INCOMPATIBLE_CONCEPT_CATEGORY" in rule for rule in result.failed_rules)

def test_rule_validation_gate_no_match_target():
    gate = RuleValidationGate()
    source = {"term": "Kasa", "definition": "Cough"}
    candidate = {"title": "Unknown", "code": "NO_MATCH"}

    result = gate.validate_candidate(source, candidate)
    assert result.rule_validated is False
    assert result.status == "REJECT"
