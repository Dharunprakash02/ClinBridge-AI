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
    selected_candidate_code: Optional[str] = None
    selected_candidate_title: Optional[str] = None
    selected_candidate_uri: Optional[str] = None
    force_unverified: Optional[bool] = False
    clinical_verification_status: Optional[str] = None

class FhirBundleResponse(BaseModel):
    bundle: Dict[str, Any]
    structure_valid: bool
    validation_errors: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    validation_disclaimer: Optional[str] = None

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
    influencing_graph_relations: List[str] = Field(default_factory=list)
    explanation: str

class CareSuggestionOutput(BaseModel):
    suggestion_id: str
    type: str
    title: str
    explanation: str
    relevance: str
    source_title: str
    publisher: str
    source_url: str
    evidence_excerpt: str
    evidence_status: str = "SUPPORTED"
    url_verified: bool = True
    claim_supported: bool = True
    publication_info: Optional[str] = None
    passage_location: Optional[str] = None
    verification_notes: Optional[str] = None
    limitations: str

class CareSuggestionsOutputResponse(BaseModel):
    status: str
    source_term: str
    mapped_code: Optional[str] = None
    mapped_title: Optional[str] = None
    decision_class: str
    safety_disclaimer: str
    reason_or_limitation: Optional[str] = None
    suggestions: List[CareSuggestionOutput] = Field(default_factory=list)

class MappingPipelineResponse(BaseModel):
    source_term: str
    source_code: Optional[str] = None
    decision_class: str
    decision_reason: str
    requires_review: bool
    fhir_generation_allowed: bool
    influencing_factors: List[str] = Field(default_factory=list)
    candidates: List[CandidateMappingOutput]
    care_suggestions: Optional[CareSuggestionsOutputResponse] = None

class ExplainRequest(BaseModel):
    source_term: str
    source_code: Optional[str] = None
    candidate_code: str
    candidate_title: str

class CareSuggestionsRequest(BaseModel):
    source_term: str
    candidate_code: Optional[str] = None
    candidate_title: Optional[str] = None
    decision_class: Optional[str] = "AUTO_ACCEPTED"
    graph_context: Optional[Dict[str, Any]] = None

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

class PatientReportRequest(BaseModel):
    patient: Dict[str, Any]
    namaste_term: str
    namaste_code: Optional[str] = None
    candidate: Optional[Dict[str, Any]] = None
    pipeline_data: Optional[Dict[str, Any]] = None
