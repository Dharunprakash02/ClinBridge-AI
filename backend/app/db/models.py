from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from backend.app.db.database import Base

# =========================================================================
# Authentication & Role-Based Access Control (RBAC) Models
# =========================================================================

class User(Base):
    """
    HIPAA-compliant User entity for ClinBridge AI.
    Roles:
      - clinician: Clinical search, mapping pipeline execution, patient reports, FHIR generation.
      - reviewer: Clinical validation, QA audit endorsements, and terminology adjustments.
      - admin: Complete system authority, policy configuration, audit log overrides, user management.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), default="clinician", nullable=False) # 'clinician', 'reviewer', 'admin'
    organization = Column(String(200), nullable=True) # e.g., 'National Institute of Ayurveda', 'AllMS'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    revoked_tokens = relationship("RevokedToken", back_populates="user", cascade="all, delete-orphan")
    mapping_decisions = relationship("MappingDecision", back_populates="reviewer")
    fhir_bundles = relationship("FhirBundle", back_populates="creator")


class UserSession(Base):
    """
    Stores active user sessions with JTI tracking for non-repudiation and replay protection.
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = Column(String(20), default="access", nullable=False) # 'access' or 'refresh'
    is_revoked = Column(Boolean, default=False, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sessions")


class RevokedToken(Base):
    """
    High-performance blocklist for immediately revoked or logged-out JWT tokens.
    """
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    revoked_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="revoked_tokens")


# =========================================================================
# Existing Terminology & FHIR Models
# =========================================================================

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
    
    # Audit linkage
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=True)
    
    # Structured medical report & tracking fields
    patient_name = Column(String(255), nullable=True, index=True)
    patient_id = Column(String(100), nullable=True, index=True)
    patient_gender = Column(String(50), nullable=True)
    patient_birth_date = Column(String(50), nullable=True)
    
    namaste_code = Column(String(100), nullable=True, index=True)
    namaste_term = Column(String(255), nullable=True)
    icd11_code = Column(String(100), nullable=True, index=True)
    icd11_title = Column(String(255), nullable=True)
    confidence_score = Column(Float, nullable=True)
    decision_class = Column(String(50), nullable=True)
    clinical_verification_status = Column(String(50), nullable=True)
    source_type = Column(String(50), default="GENERATED")  # e.g., "GENERATED" or "UPLOADED"
    structure_valid = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    creator = relationship("User", back_populates="fhir_bundles")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    operation = Column(String, index=True, nullable=False)
    details = Column(Text)
    status = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

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

    # User accountability & HIPAA audit trail
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=True)
    reviewer = relationship("User", back_populates="mapping_decisions")
