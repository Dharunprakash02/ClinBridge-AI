from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging

from backend.app.services.graph_rag.evidence_store import evidence_store, EvidenceStore
from backend.app.services.graph_rag.llm_provider import get_llm_provider, LLMProvider
from backend.app.services.graph_rag.context_builder import context_builder, ContextBuilder

logger = logging.getLogger(__name__)

class GroundedExplanationResult(BaseModel):
    selected_candidate: str
    overall_confidence: float
    why_selected: str
    score_breakdown: Dict[str, float]
    rules_status: Dict[str, List[str]]
    evidence: List[Dict[str, Any]]
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)

class GroundedExplanationGenerator:
    """
    Generates structured, provenance-grounded explanations for candidate terminology mappings.
    Combines EvidenceStore citations, Rule Validation Gate status, and LLM synthesis.
    """

    def __init__(
        self,
        store: Optional[EvidenceStore] = None,
        builder: Optional[ContextBuilder] = None,
        provider: Optional[LLMProvider] = None
    ):
        self.store = store or evidence_store
        self.builder = builder or context_builder
        self.provider = provider or get_llm_provider()

    def generate_explanation(
        self,
        source_concept: Dict[str, Any],
        candidate: Dict[str, Any],
        graph_context: Optional[Dict[str, Any]],
        rule_status: Dict[str, Any],
        scores: Dict[str, float],
        confidence: float,
        alternatives: Optional[List[Dict[str, Any]]] = None
    ) -> GroundedExplanationResult:
        # 1. Retrieve supporting evidence
        source_term = source_concept.get("term", "")
        source_code = source_concept.get("code", "")
        candidate_title = candidate.get("title", candidate.get("icd11_title", ""))

        concepts_to_query = [source_code, source_term, candidate_title]
        evidence_records = self.store.retrieve_by_concepts(concepts_to_query)
        if not evidence_records:
            evidence_records = self.store.retrieve_by_text(f"{source_term} {candidate_title}", limit=2)

        # 2. Extract Evidence Provenance Citations
        citations = []
        for e in evidence_records:
            citations.append({
                "title": e.title,
                "source": e.source,
                "document_type": e.document_type,
                "publication_year": e.publication_year,
                "source_url": e.source_url,
                "snippet": e.text
            })

        # 3. Build Prompt & Synthesize Explanation
        prompt = self.builder.build_prompt(
            source_concept=source_concept,
            candidate=candidate,
            graph_context=graph_context,
            rule_status=rule_status,
            evidence_records=evidence_records,
            scores=scores
        )

        why_selected = self.provider.generate_explanation(prompt)

        # 4. Format alternatives
        formatted_alts = []
        if alternatives:
            for alt in alternatives:
                formatted_alts.append({
                    "candidate": alt.get("title", alt.get("icd11_title", "Unknown")),
                    "score": alt.get("final_score", alt.get("score", 0.0))
                })

        return GroundedExplanationResult(
            selected_candidate=candidate_title,
            overall_confidence=round(confidence, 4),
            why_selected=why_selected.strip(),
            score_breakdown=scores,
            rules_status=rule_status,
            evidence=citations,
            alternatives=formatted_alts
        )

# Global singleton instance
grounded_explanation_generator = GroundedExplanationGenerator()
