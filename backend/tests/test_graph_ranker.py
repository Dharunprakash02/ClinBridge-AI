import pytest
from backend.app.services.mapping.graph_ranker import GraphAwareRanker, ScoringWeights
from backend.app.services.knowledge_graph import KnowledgeGraphRepository, load_knowledge_graph, GraphQueryService

def test_graph_aware_ranker_scoring():
    repo = KnowledgeGraphRepository()
    load_knowledge_graph(repo)
    query_svc = GraphQueryService(repo)

    ranker = GraphAwareRanker(query_service=query_svc)

    candidate = {
        "title": "Fever, unspecified",
        "definition": "Body temperature elevation associated with pyrexia and heat.",
        "icd11_code": "MG26"
    }

    breakdown = ranker.rank_candidate(
        source_code="SR11",
        source_term="Jwara",
        candidate=candidate,
        textual_score=0.85,
        semantic_score=0.90,
        api_rank_score=0.95
    )

    assert 0.0 <= breakdown.graph_consistency_score <= 1.0
    assert 0.0 <= breakdown.final_score <= 1.0
    assert breakdown.textual_score == 0.85
    assert breakdown.semantic_score == 0.90
    assert breakdown.rank_score == 0.95
