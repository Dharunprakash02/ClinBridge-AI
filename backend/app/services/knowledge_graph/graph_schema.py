from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class NodeType(str, Enum):
    AYURVEDA_CONCEPT = "AyurvedaConcept"
    ICD11_CONCEPT = "ICD11Concept"
    BIOMEDICAL_CONCEPT = "BiomedicalConcept"
    SYMPTOM = "Symptom"
    CONDITION = "Condition"
    HERB = "Herb"
    DOSHA = "Dosha"
    EVIDENCE_SOURCE = "EvidenceSource"
    MAPPING_DECISION = "MappingDecision"

class RelationshipType(str, Enum):
    HAS_SYMPTOM = "HAS_SYMPTOM"
    RELATED_TO = "RELATED_TO"
    MAPPED_TO = "MAPPED_TO"
    BROADER_THAN = "BROADER_THAN"
    NARROWER_THAN = "NARROWER_THAN"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    CONTAINS = "CONTAINS"
    SUPPORTED_BY = "SUPPORTED_BY"
    DERIVED_FROM = "DERIVED_FROM"
    CONTRAINDICATED_WITH = "CONTRAINDICATED_WITH"

class GraphNode(BaseModel):
    id: str
    node_type: NodeType
    label: str
    properties: Dict[str, Any] = Field(default_factory=dict)

class GraphEdge(BaseModel):
    source_id: str
    target_id: str
    rel_type: RelationshipType
    properties: Dict[str, Any] = Field(default_factory=dict)

class ConceptContext(BaseModel):
    concept_id: str
    node: GraphNode
    symptoms: List[str] = Field(default_factory=list)
    doshas: List[str] = Field(default_factory=list)
    related_concepts: List[Dict[str, Any]] = Field(default_factory=list)
    icd11_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    evidence_sources: List[Dict[str, Any]] = Field(default_factory=list)
