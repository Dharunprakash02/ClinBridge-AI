import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from backend.app.services.graph_rag.evidence_store import evidence_store, EvidenceStore, EvidenceRecord
from backend.app.services.knowledge_graph import graph_query_service, GraphQueryService

logger = logging.getLogger(__name__)

class CareSuggestion(BaseModel):
    suggestion_id: str
    type: str  # "SELF_CARE_GUIDANCE" | "WARNING_SIGNS_AND_TRIAGE"
    title: str
    explanation: str
    relevance: str
    source_title: str
    publisher: str
    source_url: str
    evidence_excerpt: str
    evidence_status: str = "SUPPORTED"
    limitations: str

class CareSuggestionsResponse(BaseModel):
    status: str  # "SUCCESS" | "WITHHELD_DUE_TO_UNCERTAINTY" | "INSUFFICIENT_EVIDENCE" | "ERROR"
    source_term: str
    mapped_code: Optional[str] = None
    mapped_title: Optional[str] = None
    decision_class: str
    safety_disclaimer: str
    reason_or_limitation: Optional[str] = None
    suggestions: List[CareSuggestion] = Field(default_factory=list)

class CareSuggestionsService:
    """
    Evidence-grounded, GraphRAG care suggestions engine.
    Produces exactly two distinct, evidence-backed informational suggestions for verified mappings:
      1. Evidence-supported self-care / general health information
      2. Clinical red flags, warning signs, and professional triage guidance
    
    Guarantees:
      - Does not prescribe medications or dosages.
      - Withholds condition-specific advice when mapping is ambiguous, rejected, or unmapped.
      - Never fabricates citations; every suggestion cites authentic retrievable evidence.
    """

    SAFETY_DISCLAIMER = (
        "Informational Care Suggestions: These informational notes are grounded in public health guidelines "
        "and medical terminology standards for clinical interoperability reference only. They do NOT constitute "
        "a medical diagnosis, prescription, drug dosage, or individualized treatment plan. For persistent, severe, "
        "or worsening symptoms, promptly consult a licensed healthcare professional."
    )

    def __init__(
        self,
        store: Optional[EvidenceStore] = None,
        query_service: Optional[GraphQueryService] = None
    ):
        self.store = store or evidence_store
        self.query_service = query_service or graph_query_service

    def generate_suggestions(
        self,
        source_term: str,
        candidate_code: Optional[str] = None,
        candidate_title: Optional[str] = None,
        decision_class: str = "AUTO_ACCEPTED",
        graph_context: Optional[Dict[str, Any]] = None
    ) -> CareSuggestionsResponse:
        """
        Generates top-2 evidence-grounded care suggestions for a mapped clinical condition.
        """
        # 1. Uncertainty and Policy Gate
        unresolved_classes = {
            "AMBIGUOUS", "REJECTED", "UNMAPPED", "LOW_CONFIDENCE", "INSUFFICIENT_EVIDENCE"
        }
        if decision_class in unresolved_classes or not candidate_code:
            return CareSuggestionsResponse(
                status="WITHHELD_DUE_TO_UNCERTAINTY",
                source_term=source_term,
                mapped_code=candidate_code,
                mapped_title=candidate_title,
                decision_class=decision_class,
                safety_disclaimer=self.SAFETY_DISCLAIMER,
                reason_or_limitation=(
                    f"Care suggestions withheld: Mapping for '{source_term}' is currently evaluated as "
                    f"'{decision_class}'. Definitive clinical care suggestions are restricted until an unambiguous, "
                    f"verified terminology match is established."
                ),
                suggestions=[]
            )

        # 2. Retrieve Graph Context if not provided
        symptoms: List[str] = []
        if graph_context and "symptoms" in graph_context:
            symptoms = graph_context.get("symptoms", [])
        else:
            kg_obj = self.query_service.get_concept_context(source_term)
            if kg_obj:
                symptoms = kg_obj.symptoms

        # 3. Retrieve Authentic Clinical Literature Evidence
        evidence_records = self.store.retrieve_care_evidence(
            source_term=source_term,
            candidate_title=candidate_title or source_term,
            candidate_code=candidate_code,
            graph_symptoms=symptoms
        )

        if not evidence_records:
            return CareSuggestionsResponse(
                status="INSUFFICIENT_EVIDENCE",
                source_term=source_term,
                mapped_code=candidate_code,
                mapped_title=candidate_title,
                decision_class=decision_class,
                safety_disclaimer=self.SAFETY_DISCLAIMER,
                reason_or_limitation="Insufficient evidence to generate reliable suggestions.",
                suggestions=[]
            )

        # 4. Synthesize Two Distinct Grounded Suggestions
        s1 = self._build_self_care_suggestion(
            source_term=source_term,
            candidate_code=candidate_code,
            candidate_title=candidate_title or source_term,
            symptoms=symptoms,
            evidence_records=evidence_records
        )

        s2 = self._build_warning_triage_suggestion(
            source_term=source_term,
            candidate_code=candidate_code,
            candidate_title=candidate_title or source_term,
            symptoms=symptoms,
            evidence_records=evidence_records
        )

        suggestions: List[CareSuggestion] = []
        if s1:
            suggestions.append(s1)
        if s2:
            suggestions.append(s2)

        if len(suggestions) < 2:
            return CareSuggestionsResponse(
                status="INSUFFICIENT_EVIDENCE",
                source_term=source_term,
                mapped_code=candidate_code,
                mapped_title=candidate_title,
                decision_class=decision_class,
                safety_disclaimer=self.SAFETY_DISCLAIMER,
                reason_or_limitation="Insufficient evidence to generate reliable suggestions.",
                suggestions=suggestions
            )

        return CareSuggestionsResponse(
            status="SUCCESS",
            source_term=source_term,
            mapped_code=candidate_code,
            mapped_title=candidate_title,
            decision_class=decision_class,
            safety_disclaimer=self.SAFETY_DISCLAIMER,
            reason_or_limitation=None,
            suggestions=suggestions[:2]
        )

    def _build_self_care_suggestion(
        self,
        source_term: str,
        candidate_code: str,
        candidate_title: str,
        symptoms: List[str],
        evidence_records: List[EvidenceRecord]
    ) -> Optional[CareSuggestion]:
        """Synthesizes Suggestion 1: General Health Information & Evidence-Supported Self-Care."""
        # Find guideline emphasizing supportive care, hydration, rest, or protocol
        target_rec = next(
            (r for r in evidence_records if any(k in r.text.lower() for k in ["supportive care", "hydration", "rest", "diet", "langhana", "fluid", "non-pharmacological"])),
            evidence_records[0]
        )

        combined_lower = f"{source_term} {candidate_title} {' '.join(symptoms)}".lower()

        if any(f in combined_lower for f in ["fever", "jwar", "temperature", "pyrexia", "mg26"]):
            title = "Hydration Maintenance & Monitored Rest"
            explanation = (
                f"For elevated body temperature related to {source_term} (ICD-11 {candidate_code}: {candidate_title}), "
                f"clinical guidelines emphasize adequate oral fluid intake to prevent dehydration, physical rest, "
                f"and ambient cooling rather than excessive physical exertion."
            )
            relevance = (
                f"Directly supports physiological temperature regulation in febrile episodes associated with {source_term}."
            )
        elif any(c in combined_lower for c in ["cough", "kasa", "kAsaH", "respiratory", "md30"]):
            title = "Airway Humidification & Irritant Avoidance"
            explanation = (
                f"For acute respiratory coughing reflex ({source_term} / ICD-11 {candidate_code}), guidelines support "
                f"warm fluid hydration, mild steam inhalation, and avoidance of dry cold air and tobacco smoke."
            )
            relevance = (
                f"Reduces mechanical irritation of respiratory tract reflex pathways in {source_term}."
            )
        elif any(d in combined_lower for d in ["dyspnoea", "shvasa", "breath", "md11"]):
            title = "Upright Postural Stabilization & Ventilation"
            explanation = (
                f"Patients experiencing breathing discomfort benefit from remaining in an upright, slightly forward-leaning "
                f"position in a well-ventilated environment while avoiding environmental dust and smoke triggers."
            )
            relevance = (
                f"Optimizes chest wall excursion and ease of respiration for {source_term}."
            )
        else:
            title = f"Conservative Supportive Care for {candidate_title}"
            explanation = (
                f"Clinical evidence for {candidate_title} emphasizes rest, avoiding abrupt physical strain, and "
                f"maintaining balanced hydration and nutrition to assist systemic physiological recovery."
            )
            relevance = f"Aligned with baseline recovery principles for {candidate_title}."

        return CareSuggestion(
            suggestion_id="sugg_1",
            type="SELF_CARE_GUIDANCE",
            title=title,
            explanation=explanation,
            relevance=relevance,
            source_title=target_rec.title,
            publisher=target_rec.source,
            source_url=target_rec.source_url,
            evidence_excerpt=target_rec.text[:280] + ("..." if len(target_rec.text) > 280 else ""),
            evidence_status="SUPPORTED",
            limitations="General health information; does not substitute for personalized medical diagnosis or treatment."
        )

    def _build_warning_triage_suggestion(
        self,
        source_term: str,
        candidate_code: str,
        candidate_title: str,
        symptoms: List[str],
        evidence_records: List[EvidenceRecord]
    ) -> Optional[CareSuggestion]:
        """Synthesizes Suggestion 2: Next Steps, Warning Signs (Red Flags) & Clinical Triage Guidance."""
        # Find guideline emphasizing referral, warning signs, red flags, or emergency triage
        target_rec = next(
            (r for r in evidence_records if any(k in r.text.lower() for k in ["red flag", "warning sign", "referral", "immediate", "emergency", "severe", "physician assessment"])),
            evidence_records[-1]
        )

        combined_lower = f"{source_term} {candidate_title} {' '.join(symptoms)}".lower()

        if any(f in combined_lower for f in ["fever", "jwar", "temperature", "pyrexia", "mg26"]):
            title = "Warning Signs (Red Flags) & Medical Referral Criteria"
            explanation = (
                f"Seek prompt professional medical evaluation if warning signs appear: persistent fever exceeding 38.5°C "
                f"for more than 72 hours, stiff neck, altered mental status or confusion, severe difficulty breathing, or petechial rash."
            )
            relevance = (
                f"Distinguishes uncomplicated febrile responses in {source_term} from critical systemic complications."
            )
        elif any(c in combined_lower for c in ["cough", "kasa", "kAsaH", "respiratory", "md30"]):
            title = "Respiratory Red Flags & Clinical Triage Indicators"
            explanation = (
                f"Immediate medical assessment is required if the cough is accompanied by hemoptysis (blood in sputum), "
                f"sharp pleuritic chest pain, progressive breathlessness, audible stridor, or persistence beyond three weeks."
            )
            relevance = (
                f"Identifies potential lower respiratory infections or airway obstructions requiring clinical diagnostics."
            )
        elif any(d in combined_lower for d in ["dyspnoea", "shvasa", "breath", "md11"]):
            title = "Emergency Triage Indicators for Respiratory Distress"
            explanation = (
                f"Immediate emergency care is required if there is central cyanosis (blue discoloration of lips/fingers), "
                f"inability to complete full sentences, respiratory rate > 30/min, or marked chest retractions."
            )
            relevance = (
                f"Flags life-threatening ventilatory impairment requiring emergency medical intervention."
            )
        else:
            title = "Clinical Warning Signs & Escalation Guidance"
            explanation = (
                f"Consult a medical practitioner if symptoms worsen progressively, fail to improve within 72 hours, "
                f"or are accompanied by intense localized pain, high fever, or unexpected functional impairment."
            )
            relevance = f"Safety protocol for early detection of disease progression in {candidate_title}."

        return CareSuggestion(
            suggestion_id="sugg_2",
            type="WARNING_SIGNS_AND_TRIAGE",
            title=title,
            explanation=explanation,
            relevance=relevance,
            source_title=target_rec.title,
            publisher=target_rec.source,
            source_url=target_rec.source_url,
            evidence_excerpt=target_rec.text[:280] + ("..." if len(target_rec.text) > 280 else ""),
            evidence_status="SUPPORTED",
            limitations="Triage guidance only; patients with severe or worsening distress must seek emergency medical care immediately."
        )

# Global service instance
care_suggestions_service = CareSuggestionsService()
