from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class DecisionClass(str, Enum):
    HIGH_CONFIDENCE = "HIGH_CONFIDENCE"
    AMBIGUOUS = "AMBIGUOUS"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    REJECTED = "REJECTED"

class UncertaintyEvaluation(BaseModel):
    confidence_score: float
    decision_class: DecisionClass
    top1_top2_margin: float
    requires_human_review: bool
    policy_reason: str
    signals: Dict[str, float] = Field(default_factory=dict)

class UncertaintyEngine:
    """
    Multi-signal uncertainty evaluation layer that calculates confidence and assigns
    policy classes (HIGH_CONFIDENCE, AMBIGUOUS, LOW_CONFIDENCE, REJECTED).
    """

    def __init__(
        self,
        high_conf_threshold: float = 0.80,
        low_conf_threshold: float = 0.55,
        ambiguity_margin_threshold: float = 0.10
    ):
        self.high_conf_threshold = high_conf_threshold
        self.low_conf_threshold = low_conf_threshold
        self.ambiguity_margin_threshold = ambiguity_margin_threshold

    def evaluate_candidates(
        self,
        ranked_candidates: List[Dict[str, Any]],
        rule_validated: bool = True
    ) -> UncertaintyEvaluation:
        if not ranked_candidates:
            return UncertaintyEvaluation(
                confidence_score=0.0,
                decision_class=DecisionClass.LOW_CONFIDENCE,
                top1_top2_margin=0.0,
                requires_human_review=True,
                policy_reason="No candidate mappings retrieved.",
                signals={}
            )

        if not rule_validated:
            return UncertaintyEvaluation(
                confidence_score=0.0,
                decision_class=DecisionClass.REJECTED,
                top1_top2_margin=0.0,
                requires_human_review=True,
                policy_reason="Mapping rejected by deterministic rule validation gate.",
                signals={"rule_status": 0.0}
            )

        top1 = ranked_candidates[0]
        top1_score = top1.get("final_score", top1.get("score", 0.0))
        top2_score = ranked_candidates[1].get("final_score", ranked_candidates[1].get("score", 0.0)) if len(ranked_candidates) > 1 else 0.0

        margin = max(0.0, top1_score - top2_score)

        # Extract underlying signals
        semantic_score = top1.get("semantic_score", top1_score)
        graph_score = top1.get("graph_consistency_score", top1.get("graph_score", 0.5))
        evidence_score = top1.get("evidence_score", 0.5)

        # Confidence calculation formula
        # Multi-signal weighted synthesis penalized by close margin ambiguity
        margin_factor = min(1.0, margin / self.ambiguity_margin_threshold) if len(ranked_candidates) > 1 else 1.0
        confidence = (
            (0.35 * semantic_score) +
            (0.30 * graph_score) +
            (0.20 * evidence_score) +
            (0.15 * margin_factor)
        )
        confidence = round(min(1.0, max(0.0, confidence)), 4)

        signals = {
            "top1_score": top1_score,
            "top2_score": top2_score,
            "margin": round(margin, 4),
            "semantic_score": semantic_score,
            "graph_score": graph_score,
            "evidence_score": evidence_score
        }

        # Policy decision logic
        if len(ranked_candidates) > 1 and margin < self.ambiguity_margin_threshold and top1_score >= self.low_conf_threshold:
            decision = DecisionClass.AMBIGUOUS
            requires_review = True
            reason = f"Close competition between top candidates (score margin {margin:.3f} < {self.ambiguity_margin_threshold}); requires clinical review."
        elif confidence >= self.high_conf_threshold and margin >= self.ambiguity_margin_threshold:
            decision = DecisionClass.HIGH_CONFIDENCE
            requires_review = False
            reason = "High confidence match backed by strong semantic, graph, and evidence agreement."
        elif confidence < self.low_conf_threshold:
            decision = DecisionClass.LOW_CONFIDENCE
            requires_review = True
            reason = "Confidence score below threshold; insufficient evidence for automated match."
        else:
            decision = DecisionClass.AMBIGUOUS
            requires_review = True
            reason = "Moderate confidence; reviewer verification recommended."

        return UncertaintyEvaluation(
            confidence_score=confidence,
            decision_class=decision,
            top1_top2_margin=round(margin, 4),
            requires_human_review=requires_review,
            policy_reason=reason,
            signals=signals
        )

# Global singleton instance
uncertainty_engine = UncertaintyEngine()
