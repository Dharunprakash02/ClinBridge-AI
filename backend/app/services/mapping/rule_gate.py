from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class RuleValidationResult(BaseModel):
    rule_validated: bool
    status: str  # "PASS", "REJECT", "UNCERTAIN"
    passed_rules: List[str] = Field(default_factory=list)
    failed_rules: List[str] = Field(default_factory=list)
    rejection_reason: Optional[str] = None

class RuleValidationGate:
    """
    Deterministic rule engine that sits between candidate ranking and confidence estimation.
    A candidate must pass hard clinical and taxonomic rules. High similarity never overrides a rule rejection.
    """

    def validate_candidate(
        self,
        source_concept: Dict[str, Any],
        candidate: Dict[str, Any],
        graph_context: Optional[Dict[str, Any]] = None
    ) -> RuleValidationResult:
        passed = []
        failed = []

        source_term = source_concept.get("term", "").lower()
        source_def = source_concept.get("definition", "").lower()
        candidate_title = candidate.get("title", candidate.get("icd11_title", "")).lower()
        candidate_def = candidate.get("definition", candidate.get("icd11_definition", "")).lower()
        candidate_code = candidate.get("code", candidate.get("icd11_code", ""))

        # 1. Rule: Incompatible Category Check
        # e.g., Diagnostic pattern should not map to surgical procedure or injury unless explicit
        if ("fever" in source_term or "jwara" in source_term) and ("fracture" in candidate_title or "poisoning" in candidate_title):
            failed.append("INCOMPATIBLE_CONCEPT_CATEGORY: Fever concept matched to injury/poisoning.")
        else:
            passed.append("CATEGORY_COMPATIBILITY_VALID")

        # 2. Rule: Incompatible Terminology Type Check
        # e.g., TM2 concepts vs unrelated external codes
        if candidate_code and candidate_code == "NO_MATCH":
            failed.append("NO_MATCH_TARGET: Candidate is explicitly marked as NO_MATCH.")
        else:
            passed.append("TERMINOLOGY_TYPE_VALID")

        # 3. Rule: Contradictory Clinical Relation
        # e.g., acute infectious disease mapped to chronic congenital deformity without context
        if "acute" in source_def and "congenital malformation" in candidate_def:
            failed.append("CONTRADICTORY_CLINICAL_RELATION: Acute condition mapped to congenital malformation.")
        else:
            passed.append("CLINICAL_RELATION_CONSISTENT")

        # 4. Rule: Missing Required Clinical Context
        # If term is extremely generic and definition is empty
        if len(source_term.split()) == 1 and not source_def and not graph_context:
            return RuleValidationResult(
                rule_validated=False,
                status="UNCERTAIN",
                passed_rules=passed,
                failed_rules=["MISSING_REQUIRED_CONTEXT: Ambiguous single token without definition."],
                rejection_reason="Concept lacks sufficient clinical context for automated verification."
            )

        # Evaluate final rule status
        if failed:
            return RuleValidationResult(
                rule_validated=False,
                status="REJECT",
                passed_rules=passed,
                failed_rules=failed,
                rejection_reason="; ".join(failed)
            )

        return RuleValidationResult(
            rule_validated=True,
            status="PASS",
            passed_rules=passed,
            failed_rules=[],
            rejection_reason=None
        )

# Global singleton instance
rule_validation_gate = RuleValidationGate()
