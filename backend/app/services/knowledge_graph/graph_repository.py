import networkx as nx
from typing import Dict, Any, List, Optional, Tuple
import logging
from backend.app.services.knowledge_graph.graph_schema import (
    NodeType, RelationshipType, GraphNode, GraphEdge
)

logger = logging.getLogger(__name__)

class KnowledgeGraphRepository:
    """
    In-memory / persistent Knowledge Graph repository using NetworkX MultiDiGraph.
    Provides node/edge insertion, indexed lookup, and neighborhood traversal.
    """

    def __init__(self):
        self._graph = nx.MultiDiGraph()
        self._node_index: Dict[str, GraphNode] = {}

    @property
    def graph(self) -> nx.MultiDiGraph:
        return self._graph

    def clear(self):
        self._graph.clear()
        self._node_index.clear()

    def add_node(self, node: GraphNode) -> None:
        self._node_index[node.id] = node
        self._graph.add_node(
            node.id,
            node_type=node.node_type.value,
            label=node.label,
            **node.properties
        )

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self._node_index.get(node_id)

    def add_edge(self, edge: GraphEdge) -> None:
        if edge.source_id not in self._node_index or edge.target_id not in self._node_index:
            logger.debug(f"Adding edge for missing node(s): {edge.source_id} -> {edge.target_id}")
            # Ensure placeholder nodes exist if not already indexed
            if edge.source_id not in self._node_index:
                self.add_node(GraphNode(id=edge.source_id, node_type=NodeType.AYURVEDA_CONCEPT, label=edge.source_id))
            if edge.target_id not in self._node_index:
                self.add_node(GraphNode(id=edge.target_id, node_type=NodeType.ICD11_CONCEPT, label=edge.target_id))

        self._graph.add_edge(
            edge.source_id,
            edge.target_id,
            key=edge.rel_type.value,
            rel_type=edge.rel_type.value,
            **edge.properties
        )

    def get_out_edges(self, node_id: str, rel_type: Optional[RelationshipType] = None) -> List[Tuple[str, str, Dict[str, Any]]]:
        if not self._graph.has_node(node_id):
            return []
        edges = []
        for u, v, k, data in self._graph.out_edges(node_id, keys=True, data=True):
            if rel_type is None or k == rel_type.value:
                edges.append((u, v, data))
        return edges

    def get_in_edges(self, node_id: str, rel_type: Optional[RelationshipType] = None) -> List[Tuple[str, str, Dict[str, Any]]]:
        if not self._graph.has_node(node_id):
            return []
        edges = []
        for u, v, k, data in self._graph.in_edges(node_id, keys=True, data=True):
            if rel_type is None or k == rel_type.value:
                edges.append((u, v, data))
        return edges

    def get_neighbors(self, node_id: str, radius: int = 1) -> List[Dict[str, Any]]:
        if not self._graph.has_node(node_id):
            return []
        subgraph_nodes = nx.single_source_shortest_path_length(
            self._graph.to_undirected(), node_id, cutoff=radius
        )
        results = []
        for n_id, dist in subgraph_nodes.items():
            if n_id == node_id:
                continue
            node_obj = self.get_node(n_id)
            if node_obj:
                results.append({
                    "id": node_obj.id,
                    "label": node_obj.label,
                    "type": node_obj.node_type.value,
                    "distance": dist,
                    "properties": node_obj.properties
                })
        return results

    def count_nodes(self) -> int:
        return self._graph.number_of_nodes()

    def count_edges(self) -> int:
        return self._graph.number_of_edges()

# Global singleton instance
kg_repository = KnowledgeGraphRepository()
