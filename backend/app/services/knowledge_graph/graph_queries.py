from typing import Dict, Any, List, Optional
from backend.app.services.knowledge_graph.graph_repository import kg_repository, KnowledgeGraphRepository
from backend.app.services.knowledge_graph.graph_schema import (
    NodeType, RelationshipType, ConceptContext, GraphNode
)

class GraphQueryService:
    def __init__(self, repo: Optional[KnowledgeGraphRepository] = None):
        self.repo = repo or kg_repository

    def _format_id(self, concept_id: str) -> str:
        if not concept_id.startswith("namaste_") and not concept_id.startswith("icd_") and not concept_id.startswith("dosha_") and not concept_id.startswith("symptom_"):
            return f"namaste_{concept_id}"
        return concept_id

    def get_concept_context(self, concept_id: str) -> Optional[ConceptContext]:
        """
        Retrieves full context for a given concept including symptoms, doshas,
        mapped ICD-11 entities, and evidence sources.
        """
        node_id = self._format_id(concept_id)
        node = self.repo.get_node(node_id)
        if not node:
            return None

        out_edges = self.repo.get_out_edges(node_id)
        symptoms = []
        doshas = []
        related = []
        icd_candidates = []
        evidence = []

        for _, target_id, data in out_edges:
            target_node = self.repo.get_node(target_id)
            if not target_node:
                continue

            rel_type = data.get("rel_type")
            if target_node.node_type == NodeType.SYMPTOM or rel_type == RelationshipType.HAS_SYMPTOM.value:
                symptoms.append(target_node.label)
            elif target_node.node_type == NodeType.DOSHA or rel_type == RelationshipType.RELATED_TO.value:
                doshas.append(target_node.label)
            elif target_node.node_type == NodeType.ICD11_CONCEPT or rel_type == RelationshipType.MAPPED_TO.value:
                icd_candidates.append({
                    "id": target_node.id,
                    "code": target_node.properties.get("icd11_code", target_node.label),
                    "title": target_node.label,
                    "rel_type": rel_type,
                    "properties": target_node.properties
                })
            elif target_node.node_type == NodeType.EVIDENCE_SOURCE or rel_type == RelationshipType.SUPPORTED_BY.value:
                evidence.append({
                    "id": target_node.id,
                    "label": target_node.label,
                    "properties": target_node.properties
                })
            else:
                related.append({
                    "id": target_node.id,
                    "label": target_node.label,
                    "rel_type": rel_type,
                    "type": target_node.node_type.value
                })

        return ConceptContext(
            concept_id=node.id,
            node=node,
            symptoms=symptoms,
            doshas=doshas,
            related_concepts=related,
            icd11_candidates=icd_candidates,
            evidence_sources=evidence
        )

    def get_related_symptoms(self, concept_id: str) -> List[str]:
        context = self.get_concept_context(concept_id)
        return context.symptoms if context else []

    def get_candidate_relationships(self, source_id: str, target_id: str) -> List[Dict[str, Any]]:
        src_id = self._format_id(source_id)
        tgt_id = target_id if target_id.startswith("icd_") else f"icd_{target_id}"

        out_edges = self.repo.get_out_edges(src_id)
        direct_matches = []
        for _, t_id, data in out_edges:
            if t_id == tgt_id:
                direct_matches.append({
                    "relationship": data.get("rel_type"),
                    "properties": data
                })
        return direct_matches

    def get_supporting_evidence(self, concept_id: str) -> List[Dict[str, Any]]:
        context = self.get_concept_context(concept_id)
        return context.evidence_sources if context else []

    def calculate_symptom_overlap(self, source_code: str, candidate_symptoms: List[str]) -> float:
        source_symptoms = set(s.lower() for s in self.get_related_symptoms(source_code))
        if not source_symptoms or not candidate_symptoms:
            return 0.5  # Neutral default if no explicit symptoms in metadata
        
        target_symptoms = set(s.lower() for s in candidate_symptoms)
        intersection = source_symptoms.intersection(target_symptoms)
        union = source_symptoms.union(target_symptoms)
        return len(intersection) / len(union) if union else 0.5

# Singleton query service instance
graph_query_service = GraphQueryService()
