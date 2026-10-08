from typing import Dict, Any, List, Optional
import logging
from sqlalchemy.orm import Session

from backend.app.db.models import NamasteCode, HybridMappingResult
from backend.app.services.icd_service import icd_service
from backend.app.services.knowledge_graph import (
    graph_query_service, load_knowledge_graph, extract_symptoms
)
from backend.app.services.mapping.rule_gate import rule_validation_gate
from backend.app.services.mapping.graph_ranker import graph_aware_ranker
from backend.app.services.graph_rag import (
    evidence_store, grounded_explanation_generator
)
from backend.app.services.uncertainty import uncertainty_engine
from backend.app.schemas.schemas import (
    MappingPipelineResponse, CandidateMappingOutput, CandidateScores
)

logger = logging.getLogger(__name__)

class MappingPipelineService:
    """
    End-to-End Orchestrator for Context-Aware, Evidence-Grounded, Explainable,
    and Uncertainty-Aware Terminology Mapping.
    """

    def __init__(self):
        # Ensure knowledge graph is loaded
        load_knowledge_graph()

    def run_pipeline(
        self,
        db: Session,
        term: str,
        code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> MappingPipelineResponse:
        # 1. Lookup or synthesize source concept details
        source_record = None
        if code:
            source_record = db.query(NamasteCode).filter(NamasteCode.namaste_code == code).first()
        if not source_record and term:
            source_record = db.query(NamasteCode).filter(
                (NamasteCode.term.ilike(f"%{term}%")) | (NamasteCode.search_text.ilike(f"%{term}%"))
            ).first()

        source_code = source_record.namaste_code if source_record else (code or "CUSTOM_TERM")
        source_term = source_record.term if source_record else term
        source_def = source_record.long_definition if source_record else (context.get("definition", "") if context else "")

        source_concept = {
            "code": source_code,
            "term": source_term,
            "definition": source_def
        }

        # 2. Knowledge Graph Context Expansion
        kg_context_obj = graph_query_service.get_concept_context(source_code)
        kg_context_dict = {
            "symptoms": kg_context_obj.symptoms if kg_context_obj else extract_symptoms(f"{source_term} {source_def}"),
            "doshas": kg_context_obj.doshas if kg_context_obj else [],
            "related_concepts": kg_context_obj.related_concepts if kg_context_obj else []
        }

        # 3. Retrieve Candidate Concepts
        candidates_raw = []
        # A. Query HybridMappingResult DB if exists
        db_mappings = db.query(HybridMappingResult).filter(HybridMappingResult.namaste_code == source_code).all()
        for m in db_mappings:
            if m.icd11_code and m.icd11_code != "NO_MATCH":
                candidates_raw.append({
                    "code": m.icd11_code,
                    "title": m.icd11_title or m.icd11_code,
                    "definition": m.icd11_definition or "",
                    "uri": m.icd11_uri,
                    "lexical_score": m.lexical_score,
                    "semantic_score": m.semantic_score,
                    "api_rank_score": m.api_rank_score or 0.85
                })

        # B. Fallback / supplementary retrieval from ICD-11 service or keywords
        if not candidates_raw:
            try:
                who_results = icd_service.search_icd11(source_term)
                for w in who_results[:3]:
                    candidates_raw.append({
                        "code": w.get("code", w.get("theCode", "ICD11_TM2")),
                        "title": w.get("title", w.get("label", source_term)),
                        "definition": "",
                        "uri": w.get("uri", f"http://id.who.int/icd/entity/{w.get('theCode', '')}"),
                        "lexical_score": 0.80,
                        "semantic_score": 0.85,
                        "api_rank_score": 0.90
                    })
            except Exception as e:
                logger.warning(f"ICD service lookup fallback: {e}")

        # Default fallback candidate if none retrieved
        if not candidates_raw:
            candidates_raw.append({
                "code": "TM2_FEV",
                "title": f"Disorders associated with {source_term} (TM2 pattern)",
                "definition": f"Ayurvedic pattern corresponding to {source_term}",
                "uri": "http://id.who.int/icd/entity/tm2",
                "lexical_score": 0.70,
                "semantic_score": 0.75,
                "api_rank_score": 0.75
            })

        # 4. Multi-Factor Scoring & Rule Validation for each candidate
        processed_candidates = []
        for cand in candidates_raw:
            rule_res = rule_validation_gate.validate_candidate(source_concept, cand, kg_context_dict)
            
            score_breakdown = graph_aware_ranker.rank_candidate(
                source_code=source_code,
                source_term=source_term,
                candidate=cand,
                textual_score=cand.get("lexical_score", 0.75),
                semantic_score=cand.get("semantic_score", 0.80),
                api_rank_score=cand.get("api_rank_score", 0.80)
            )

            evidence_score = evidence_store.calculate_evidence_support_score(source_term, cand.get("title", ""))

            processed_candidates.append({
                "candidate": cand,
                "rule_result": rule_res,
                "score_breakdown": score_breakdown,
                "evidence_score": round(evidence_score, 4),
                "final_score": score_breakdown.final_score
            })

        # Sort candidates by final score descending
        processed_candidates.sort(key=lambda x: x["final_score"], reverse=True)

        # 5. Uncertainty Engine Evaluation
        candidates_for_uncertainty = [
            {
                "title": p["candidate"].get("title"),
                "final_score": p["final_score"],
                "semantic_score": p["score_breakdown"].semantic_score,
                "graph_consistency_score": p["score_breakdown"].graph_consistency_score,
                "evidence_score": p["evidence_score"]
            }
            for p in processed_candidates
        ]

        top_rule_valid = processed_candidates[0]["rule_result"].rule_validated if processed_candidates else False
        uncertainty_res = uncertainty_engine.evaluate_candidates(candidates_for_uncertainty, rule_validated=top_rule_valid)

        # 6. Generate Grounded Explanations for top candidate(s)
        candidate_outputs: List[CandidateMappingOutput] = []
        for idx, item in enumerate(processed_candidates):
            c = item["candidate"]
            sb = item["score_breakdown"]
            rr = item["rule_result"]

            scores_dict = {
                "textual": sb.textual_score,
                "semantic": sb.semantic_score,
                "rank": sb.rank_score,
                "graph": sb.graph_consistency_score,
                "evidence": item["evidence_score"],
                "final": sb.final_score
            }

            # Grounded explanation
            explanation_res = grounded_explanation_generator.generate_explanation(
                source_concept=source_concept,
                candidate=c,
                graph_context=kg_context_dict,
                rule_status={"passed": rr.passed_rules, "failed": rr.failed_rules},
                scores=scores_dict,
                confidence=uncertainty_res.confidence_score if idx == 0 else max(0.0, uncertainty_res.confidence_score - 0.15),
                alternatives=[{"title": p["candidate"].get("title"), "final_score": p["final_score"]} for p in processed_candidates if p != item]
            )

            candidate_outputs.append(CandidateMappingOutput(
                code=c.get("code", "UNKNOWN"),
                term=c.get("title", "Unknown Entity"),
                uri=c.get("uri"),
                scores=CandidateScores(**scores_dict),
                relationship="equivalent" if rr.rule_validated else "unmatched",
                rule_validated=rr.rule_validated,
                confidence=explanation_res.overall_confidence,
                decision=uncertainty_res.decision_class.value if idx == 0 else "ALTERNATIVE",
                graph_context=kg_context_dict,
                evidence=explanation_res.evidence,
                explanation=explanation_res.why_selected
            ))

        return MappingPipelineResponse(
            source_term=source_term,
            source_code=source_code,
            requires_review=uncertainty_res.requires_human_review,
            decision_class=uncertainty_res.decision_class.value,
            candidates=candidate_outputs
        )

# Global singleton pipeline service instance
mapping_pipeline_service = MappingPipelineService()
