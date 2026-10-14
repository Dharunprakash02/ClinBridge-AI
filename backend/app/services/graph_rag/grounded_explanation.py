from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging

from backend.app.services.graph_rag.evidence_store import evidence_store, EvidenceStore, EvidenceRecord
from backend.app.services.graph_rag.llm_provider import get_llm_provider, LLMProvider
from backend.app.services.graph_rag.context_builder import context_builder, ContextBuilder

logger = logging.getLogger(__name__)

class GroundedExplanationResult(BaseModel):
    selected_candidate: str
    overall_confidence: float
    why_selected: str
    has_sufficient_evidence: bool
    score_breakdown: Dict[str, float]
    rules_status: Dict[str, List[str]]
    evidence: List[Dict[str, Any]]
    influencing_graph_relations: List[str] = Field(default_factory=list)
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)

class GroundedExplanationGenerator:
    """
    Generates structured, provenance-grounded explanations for candidate terminology mappings.
    Combines EvidenceStore citations, Rule Validation Gate status, Knowledge Graph relations,
    and LLM synthesis.
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
        source_term = source_concept.get("term", "")
        source_code = source_concept.get("code", "")
        candidate_title = candidate.get("title", candidate.get("icd11_title", ""))
        candidate_code = candidate.get("code", candidate.get("icd11_code", ""))

        # 1. Retrieve candidate-supporting evidence (Never fabricated)
        evidence_records: List[EvidenceRecord] = self.store.retrieve_by_candidate_support(
            source_term=source_term,
            candidate_title=candidate_title,
            candidate_code=candidate_code
        )

        has_sufficient_evidence = len(evidence_records) > 0

        # 2. Extract Evidence Provenance Citations
        citations = []
        for e in evidence_records:
            citations.append({
                "title": e.title,
                "source": e.source,
                "document_type": e.document_type,
                "publication_year": e.publication_year,
                "source_url": e.source_url,
                "verbatim_snippet": e.text  # Verbatim excerpt clearly identified
            })

        # 3. Identify Knowledge Graph relations influencing this candidate
        influencing_relations = []
        symptoms = graph_context.get("symptoms", []) if graph_context else []
        doshas = graph_context.get("doshas", []) if graph_context else []
        if symptoms:
            influencing_relations.append(f"HAS_SYMPTOM: {', '.join(symptoms)}")
        if doshas:
            influencing_relations.append(f"RELATED_TO_DOSHA: {', '.join(doshas)}")

        # 4. Synthesize explanation using LLM provider with explicit metadata
        rule_passed = len(rule_status.get("failed", [])) == 0
        prompt = self.builder.build_prompt(
            source_concept=source_concept,
            candidate=candidate,
            graph_context=graph_context,
            rule_status=rule_status,
            evidence_records=evidence_records,
            scores=scores
        )

        context_metadata = {
            "has_evidence": has_sufficient_evidence,
            "evidence_count": len(evidence_records),
            "rule_passed": rule_passed,
            "symptoms": symptoms,
            "source_term": source_term,
            "candidate_title": candidate_title
        }

        why_selected = self.provider.generate_explanation(prompt, context_metadata)

        # 5. Format alternatives
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
            has_sufficient_evidence=has_sufficient_evidence,
            score_breakdown=scores,
            rules_status=rule_status,
            evidence=citations,
            influencing_graph_relations=influencing_relations,
            alternatives=formatted_alts
        )

# Global singleton instance
grounded_explanation_generator = GroundedExplanationGenerator()
