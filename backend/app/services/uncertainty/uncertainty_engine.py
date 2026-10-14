from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class DecisionClass(str, Enum):
    AUTO_ACCEPTED = "AUTO_ACCEPTED"
    HIGH_CONFIDENCE = "AUTO_ACCEPTED"
    AMBIGUOUS = "AMBIGUOUS"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    REJECTED = "REJECTED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    UNMAPPED = "UNMAPPED"

class DecisionPolicyConfig(BaseModel):
    """Configurable thresholds for automatic terminology decision-making."""
    high_conf_threshold: float = 0.80
    low_conf_threshold: float = 0.55
    ambiguity_margin_threshold: float = 0.10
    min_evidence_score: float = 0.50
    min_graph_score: float = 0.30

class UncertaintyEvaluation(BaseModel):
    confidence_score: float  # Uncalibrated composite ranking score (0.0 to 1.0)
    decision_class: DecisionClass
    top1_top2_margin: float
    requires_human_review: bool  # False for AUTO_ACCEPTED; True only for exceptions/ambiguity
    fhir_generation_allowed: bool
    policy_reason: str
    signals: Dict[str, float] = Field(default_factory=dict)
    influencing_factors: List[str] = Field(default_factory=list)

class UncertaintyEngine:
    """
    Automatic decision and uncertainty evaluation layer.
    Combines semantic ranking, Knowledge Graph consistency, evidence support, and candidate margins.
    NOTE: Confidence scores represent uncalibrated multi-signal ranking estimates,
    not calibrated statistical probabilities.
    """

    def __init__(
        self,
        config: Optional[DecisionPolicyConfig] = None,
        ambiguity_margin_threshold: Optional[float] = None,
        high_conf_threshold: Optional[float] = None,
        low_conf_threshold: Optional[float] = None,
        min_evidence_score: Optional[float] = None,
        min_graph_score: Optional[float] = None
    ):
        self.config = config or DecisionPolicyConfig()
        if ambiguity_margin_threshold is not None:
            self.config.ambiguity_margin_threshold = ambiguity_margin_threshold
        if high_conf_threshold is not None:
            self.config.high_conf_threshold = high_conf_threshold
        if low_conf_threshold is not None:
            self.config.low_conf_threshold = low_conf_threshold
        if min_evidence_score is not None:
            self.config.min_evidence_score = min_evidence_score
        if min_graph_score is not None:
            self.config.min_graph_score = min_graph_score

    def evaluate_candidates(
        self,
        ranked_candidates: List[Dict[str, Any]],
        rule_validated: bool = True,
        rule_rejection_reason: Optional[str] = None
    ) -> UncertaintyEvaluation:
        # Case 1: No candidates retrieved
        if not ranked_candidates:
            return UncertaintyEvaluation(
                confidence_score=0.0,
                decision_class=DecisionClass.UNMAPPED,
                top1_top2_margin=0.0,
                requires_human_review=False,
                fhir_generation_allowed=False,
                policy_reason="No candidate ICD-11 concepts retrieved from database or WHO search index.",
                signals={},
                influencing_factors=["Zero candidate retrieval"]
            )

        # Case 2: Rule gate rejection
        if not rule_validated:
            reason = rule_rejection_reason or "Candidate violated deterministic taxonomic/clinical safety rules."
            return UncertaintyEvaluation(
                confidence_score=0.0,
                decision_class=DecisionClass.REJECTED,
                top1_top2_margin=0.0,
                requires_human_review=True,
                fhir_generation_allowed=False,
                policy_reason=f"Mapping rejected by Rule Validation Gate: {reason}",
                signals={"rule_status": 0.0},
                influencing_factors=["Rule Gate Rejection"]
            )

        top1 = ranked_candidates[0]
        top1_score = top1.get("final_score", top1.get("score", 0.0))
        top2_score = ranked_candidates[1].get("final_score", ranked_candidates[1].get("score", 0.0)) if len(ranked_candidates) > 1 else 0.0

        margin = max(0.0, top1_score - top2_score)

        # Extract underlying signals
        semantic_score = top1.get("semantic_score", top1_score)
        graph_score = top1.get("graph_consistency_score", top1.get("graph_score", 0.0))
        evidence_score = top1.get("evidence_score", 0.0)

        signals = {
            "top1_score": round(top1_score, 4),
            "top2_score": round(top2_score, 4),
            "margin": round(margin, 4),
            "semantic_score": round(semantic_score, 4),
            "graph_score": round(graph_score, 4),
            "evidence_score": round(evidence_score, 4)
        }

        # Case 3: Insufficient evidence check
        # If candidate has zero or critically low evidence support
        if evidence_score < self.config.min_evidence_score and semantic_score < 0.90:
            return UncertaintyEvaluation(
                confidence_score=round(top1_score, 4),
                decision_class=DecisionClass.INSUFFICIENT_EVIDENCE,
                top1_top2_margin=round(margin, 4),
                requires_human_review=True,
                fhir_generation_allowed=False,
                policy_reason=f"Retrieved candidate lacks adequate supporting clinical literature (evidence score {evidence_score:.2f} < {self.config.min_evidence_score:.2f}).",
                signals=signals,
                influencing_factors=["Missing or low clinical literature evidence"]
            )

        # Composite uncalibrated ranking score
        # Margin factor penalizes close ambiguity between competing candidates
        margin_factor = min(1.0, margin / self.config.ambiguity_margin_threshold) if len(ranked_candidates) > 1 else 1.0
        confidence = (
            (0.35 * semantic_score) +
            (0.30 * graph_score) +
            (0.20 * evidence_score) +
            (0.15 * margin_factor)
        )
        confidence = round(min(1.0, max(0.0, confidence)), 4)

        factors = []
        if graph_score >= self.config.min_graph_score:
            factors.append("Strong Knowledge Graph symptom consistency")
        if evidence_score >= self.config.min_evidence_score:
            factors.append("Supporting WHO/AYUSH literature verified")

        # Case 4: Ambiguous competition (Top-1 and Top-2 too close)
        if len(ranked_candidates) > 1 and margin < self.config.ambiguity_margin_threshold and top1_score >= self.config.low_conf_threshold:
            return UncertaintyEvaluation(
                confidence_score=confidence,
                decision_class=DecisionClass.AMBIGUOUS,
                top1_top2_margin=round(margin, 4),
                requires_human_review=True,
                fhir_generation_allowed=False,
                policy_reason=f"Ambiguous candidates: Top candidates separated by narrow margin ({margin:.3f} < {self.config.ambiguity_margin_threshold:.2f}). Automated resolution cannot choose definitively.",
                signals=signals,
                influencing_factors=factors + ["Close-margin candidate competition"]
            )

        # Case 5: Automatic Acceptance
        if confidence >= self.config.high_conf_threshold and margin >= self.config.ambiguity_margin_threshold and graph_score >= self.config.min_graph_score:
            return UncertaintyEvaluation(
                confidence_score=confidence,
                decision_class=DecisionClass.AUTO_ACCEPTED,
                top1_top2_margin=round(margin, 4),
                requires_human_review=False,
                fhir_generation_allowed=True,
                policy_reason="Automatic acceptance: Meets score threshold, verified graph consistency, and supporting literature evidence.",
                signals=signals,
                influencing_factors=factors
            )

        # Case 6: Low Confidence
        if confidence < self.config.low_conf_threshold:
            return UncertaintyEvaluation(
                confidence_score=confidence,
                decision_class=DecisionClass.LOW_CONFIDENCE,
                top1_top2_margin=round(margin, 4),
                requires_human_review=True,
                fhir_generation_allowed=False,
                policy_reason=f"Composite score ({confidence:.2f}) below threshold ({self.config.low_conf_threshold:.2f}). Mapping cannot be accepted automatically.",
                signals=signals,
                influencing_factors=factors + ["Low aggregate confidence"]
            )

        # Case 7: Default Ambiguous
        return UncertaintyEvaluation(
            confidence_score=confidence,
            decision_class=DecisionClass.AMBIGUOUS,
            top1_top2_margin=round(margin, 4),
            requires_human_review=True,
            fhir_generation_allowed=False,
            policy_reason="Moderate confidence with insufficient separation for automatic commitment.",
            signals=signals,
            influencing_factors=factors
        )

# Global singleton instance
uncertainty_engine = UncertaintyEngine()
