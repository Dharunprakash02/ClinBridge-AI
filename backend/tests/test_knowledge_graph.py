import pytest
from backend.app.services.knowledge_graph import (
    NodeType, RelationshipType, GraphNode, GraphEdge,
    KnowledgeGraphRepository, load_knowledge_graph,
    extract_symptoms, extract_doshas, GraphQueryService
)

def test_symptom_and_dosha_extraction():
    sample_text = "Patient suffering from high fever, burning sensation (daha), and severe headache aggravated by vata and pitta dosha."
    symptoms = extract_symptoms(sample_text)
    doshas = extract_doshas(sample_text)

    assert "fever" in symptoms
    assert "burning_sensation" in symptoms
    assert "headache" in symptoms
    assert "Vata" in doshas
    assert "Pitta" in doshas

def test_knowledge_graph_repository_crud():
    repo = KnowledgeGraphRepository()
    
    # 1. Add Concept and Symptom
    concept = GraphNode(id="namaste_TEST1", node_type=NodeType.AYURVEDA_CONCEPT, label="Jwara", properties={"code": "TEST1"})
    symptom = GraphNode(id="symptom_fever", node_type=NodeType.SYMPTOM, label="Fever")
    repo.add_node(concept)
    repo.add_node(symptom)

    assert repo.count_nodes() == 2
    assert repo.get_node("namaste_TEST1").label == "Jwara"

    # 2. Add Edge
    edge = GraphEdge(
        source_id="namaste_TEST1",
        target_id="symptom_fever",
        rel_type=RelationshipType.HAS_SYMPTOM
    )
    repo.add_edge(edge)

    assert repo.count_edges() == 1
    out_edges = repo.get_out_edges("namaste_TEST1")
    assert len(out_edges) == 1
    assert out_edges[0][1] == "symptom_fever"

def test_knowledge_graph_loading_and_querying():
    repo = KnowledgeGraphRepository()
    loaded_repo = load_knowledge_graph(repo)

    assert loaded_repo.count_nodes() > 10
    assert loaded_repo.count_edges() > 5

    query_svc = GraphQueryService(loaded_repo)
    
    # Test symptom overlap
    overlap = query_svc.calculate_symptom_overlap("TEST_NON_EXISTENT", ["fever"])
    assert 0.0 <= overlap <= 1.0

    # Ensure dosha and symptom nodes exist
    assert loaded_repo.get_node("dosha_vata") is not None
    assert loaded_repo.get_node("symptom_fever") is not None
