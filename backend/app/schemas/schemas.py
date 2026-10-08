from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class PatientData(BaseModel):
    first_name: str
    last_name: str
    gender: str
    birth_date: str

class GenerateBundleRequest(BaseModel):
    patient: PatientData
    namaste_code: str
    namaste_term: Optional[str] = None

class ProposedMappingResponse(BaseModel):
    id: int
    source_code: str
    source_term: str
    source_definition: Optional[str] = None
    target_uri: str
    target_title: str
    similarity_score: float
    status: str

class MappingRequest(BaseModel):
    term: str
    code: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class CandidateScores(BaseModel):
    textual: float
    semantic: float
    rank: float
    graph: float
    evidence: float
    final: float

class CandidateMappingOutput(BaseModel):
    code: str
    term: str
    uri: Optional[str] = None
    scores: CandidateScores
    relationship: str
    rule_validated: bool
    confidence: float
    decision: str
    graph_context: Optional[Dict[str, Any]] = None
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    explanation: str

class MappingPipelineResponse(BaseModel):
    source_term: str
    source_code: Optional[str] = None
    requires_review: bool
    decision_class: str
    candidates: List[CandidateMappingOutput]

class ExplainRequest(BaseModel):
    source_term: str
    source_code: Optional[str] = None
    candidate_code: str
    candidate_title: str

class ReviewMappingRequest(BaseModel):
    source_term: str
    source_code: Optional[str] = None
    selected_candidate_code: Optional[str] = None
    selected_candidate_title: Optional[str] = None
    action: str  # ACCEPT, MODIFY, REJECT
    comment: Optional[str] = None
    confidence: Optional[float] = None
    decision_class: Optional[str] = None
    evidence_used: Optional[str] = None
