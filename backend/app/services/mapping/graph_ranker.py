from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.app.services.knowledge_graph.graph_queries import graph_query_service, GraphQueryService
from backend.app.services.knowledge_graph.graph_loader import extract_symptoms

class ScoringWeights(BaseModel):
    w_textual: float = 0.25
    w_semantic: float = 0.35
    w_rank: float = 0.15
    w_graph: float = 0.25

class CandidateScoreBreakdown(BaseModel):
    textual_score: float
    semantic_score: float
    rank_score: float
    graph_consistency_score: float
    final_score: float

class GraphAwareRanker:
    """
    Ranks candidate terminology mappings by combining textual, semantic,
    WHO API rank, and Knowledge Graph consistency signals.
    """

    def __init__(self, query_service: Optional[GraphQueryService] = None, weights: Optional[ScoringWeights] = None):
        self.query_svc = query_service or graph_query_service
        self.weights = weights or ScoringWeights()

    def calculate_graph_consistency(
        self,
        source_code: str,
        source_term: str,
        candidate_title: str,
        candidate_def: str
    ) -> float:
        # 1. Extract Candidate symptoms
        candidate_text = f"{candidate_title} {candidate_def}"
        candidate_symptoms = extract_symptoms(candidate_text)

        # 2. Compute Symptom Overlap via Knowledge Graph
        symptom_overlap = self.query_svc.calculate_symptom_overlap(source_code, candidate_symptoms)

        # 3. Check direct graph relationships in Knowledge Graph
        candidate_code = candidate_title.split()[0] if candidate_title else ""
        direct_rels = self.query_svc.get_candidate_relationships(source_code, candidate_code)
        relation_bonus = 0.2 if direct_rels else 0.0

        # Weighted consistency score clamped to [0.0, 1.0]
        consistency_score = min(1.0, max(0.0, (symptom_overlap * 0.8) + relation_bonus))
        return round(consistency_score, 4)

    def rank_candidate(
        self,
        source_code: str,
        source_term: str,
        candidate: Dict[str, Any],
        textual_score: float,
        semantic_score: float,
        api_rank_score: float = 0.8
    ) -> CandidateScoreBreakdown:
        candidate_title = candidate.get("title", candidate.get("icd11_title", ""))
        candidate_def = candidate.get("definition", candidate.get("icd11_definition", ""))

        graph_score = self.calculate_graph_consistency(
            source_code=source_code,
            source_term=source_term,
            candidate_title=candidate_title,
            candidate_def=candidate_def
        )

        w = self.weights
        final_score = (
            (w.w_textual * textual_score) +
            (w.w_semantic * semantic_score) +
            (w.w_rank * api_rank_score) +
            (w.w_graph * graph_score)
        )

        return CandidateScoreBreakdown(
            textual_score=round(textual_score, 4),
            semantic_score=round(semantic_score, 4),
            rank_score=round(api_rank_score, 4),
            graph_consistency_score=round(graph_score, 4),
            final_score=round(min(1.0, max(0.0, final_score)), 4)
        )

# Global singleton instance
graph_aware_ranker = GraphAwareRanker()
