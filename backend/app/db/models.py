from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from backend.app.db.database import Base

class NamasteCode(Base):
    __tablename__ = "namaste_codes"

    id = Column(Integer, primary_key=True, index=True)
    namaste_code = Column(String, unique=True, index=True, nullable=False)
    term = Column(Text, nullable=False)
    term_normalized = Column(Text)
    search_text = Column(Text, index=True)
    short_definition = Column(Text)
    long_definition = Column(Text)
    version = Column(String, default="1.0")

class Icd11Code(Base):
    __tablename__ = "icd11_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    display = Column(Text, nullable=False)
    system_type = Column(String, index=True)  # e.g., "TM2" or "Biomedicine"
    version = Column(String, default="2026-01")

class ConceptMap(Base):
    __tablename__ = "concept_map"

    id = Column(Integer, primary_key=True, index=True)
    source_code = Column(String, index=True, nullable=False)
    target_code = Column(String, index=True, nullable=False)
    target_system = Column(String, nullable=False)
    equivalence = Column(String, nullable=False) # e.g., equivalent, broader, narrower, related
    mapping_note = Column(Text)
    version = Column(String, default="1.0")

class FhirBundle(Base):
    __tablename__ = "fhir_bundles"

    id = Column(Integer, primary_key=True, index=True)
    bundle_id = Column(String, unique=True, index=True, nullable=False)
    bundle_type = Column(String, nullable=False)
    bundle_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    operation = Column(String, index=True, nullable=False)
    details = Column(Text)
    status = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

from sqlalchemy import Float
class HybridMappingResult(Base):
    """Stores fully automated hybrid mapping results with granular scoring."""
    __tablename__ = "hybrid_mapping_results"
    
    id = Column(Integer, primary_key=True, index=True)
    namaste_code = Column(String(50), nullable=False, index=True)
    namaste_term = Column(Text, nullable=False)
    namaste_definition = Column(Text)
    
    icd11_code = Column(String(50), index=True)
    icd11_title = Column(Text)
    icd11_definition = Column(Text)
    icd11_uri = Column(String(200))
    
    lexical_score = Column(Float, default=0.0)
    token_score = Column(Float, default=0.0)
    fuzzy_score = Column(Float, default=0.0)
    synonym_score = Column(Float, default=0.0)
    translation_score = Column(Float, default=0.0)
    transliteration_score = Column(Float, default=0.0)
    definition_score = Column(Float, default=0.0)
    clinical_score = Column(Float, default=0.0)
    semantic_score = Column(Float, default=0.0)
    api_rank_score = Column(Float, default=0.0)
    conflict_penalty = Column(Float, default=0.0)
    
    final_score = Column(Float, default=0.0)
    confidence_level = Column(String(50), default="NO_MATCH")
    relationship_type = Column(String(50))
    mapping_status = Column(String(50), default="AUTO_MAPPED")
    mapping_method = Column(String(50), default="HYBRID")
    
    icd11_release = Column(String(50), default="2026-01")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class MappingDecision(Base):
    """Stores reviewer actions (Accept, Modify, Reject) and audit metadata."""
    __tablename__ = "mapping_decisions"

    id = Column(Integer, primary_key=True, index=True)
    source_term = Column(Text, nullable=False, index=True)
    source_code = Column(String(50), index=True)
    selected_candidate_code = Column(String(50))
    selected_candidate_title = Column(Text)
    previous_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    decision_class = Column(String(50))
    reviewer_action = Column(String(50), nullable=False) # ACCEPT, MODIFY, REJECT
    reviewer_comment = Column(Text)
    evidence_used = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


