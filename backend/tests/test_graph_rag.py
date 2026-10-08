import pytest
from backend.app.services.graph_rag import (
    EvidenceStore, MockLLMProvider, ContextBuilder,
    GroundedExplanationGenerator, GroundedExplanationResult
)

def test_evidence_store_retrieval():
    store = EvidenceStore()
    assert len(store.evidence_list) >= 3

    # Concept query
    results = store.retrieve_by_concepts(["Jwara", "fever"])
    assert len(results) >= 1
    assert any("fever" in r.concept_ids or "Jwara" in r.concept_ids for r in results)

    # Provenance fields present
    first = results[0]
    assert first.title is not None
    assert first.source_url.startswith("http")
    assert first.publication_year > 2000

def test_grounded_explanation_generation():
    generator = GroundedExplanationGenerator(provider=MockLLMProvider())

    source = {"term": "Jwara", "code": "SR11", "definition": "High fever with burning sensation."}
    candidate = {"title": "Fever, unspecified", "code": "MG26", "definition": "Elevated core body temperature."}
    graph_ctx = {"symptoms": ["fever", "burning_sensation"], "doshas": ["Pitta"]}
    rule_status = {"passed": ["CATEGORY_COMPATIBILITY_VALID"], "failed": []}
    scores = {"textual": 0.85, "semantic": 0.90, "graph_consistency": 0.88, "evidence_support": 0.80, "final": 0.86}

    result = generator.generate_explanation(
        source_concept=source,
        candidate=candidate,
        graph_context=graph_ctx,
        rule_status=rule_status,
        scores=scores,
        confidence=0.89,
        alternatives=[{"title": "Alternative Fever Pattern", "score": 0.72}]
    )

    assert isinstance(result, GroundedExplanationResult)
    assert result.selected_candidate == "Fever, unspecified"
    assert result.overall_confidence == 0.89
    assert len(result.why_selected) > 10
    assert len(result.evidence) >= 1
    assert len(result.alternatives) == 1
