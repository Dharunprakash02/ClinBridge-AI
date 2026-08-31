from typing import List
from sqlalchemy.orm import Session
from backend.app.db.models import HybridMappingResult, ConceptMap, NamasteCode

class MappingService:
    def __init__(self):
        self._mapper = None

    @property
    def mapper(self):
        if self._mapper is None:
            from backend.scripts.mapping.hybrid_mapper import HybridMapper
            self._mapper = HybridMapper()
        return self._mapper

    def get_mappings_for_source(self, db: Session, source_code: str) -> List[HybridMappingResult]:
        """
        Retrieve all target mappings for a given source code (e.g., a NAMASTE code).
        Fallback order:
        1. Pre-computed / cached HybridMappingResult in DB
        2. Seeded manual ConceptMap records in DB
        3. On-demand dynamic HybridMapper execution (persisted to DB)
        """
        # 1. Check existing HybridMappingResult
        results = db.query(HybridMappingResult).filter(HybridMappingResult.namaste_code == source_code).all()
        if results:
            return results

        # 2. Check ConceptMap (e.g. manual mappings)
        concept_maps = db.query(ConceptMap).filter(ConceptMap.source_code == source_code).all()
        if concept_maps:
            namaste_rec = db.query(NamasteCode).filter(NamasteCode.namaste_code == source_code).first()
            created_results = []
            for cm in concept_maps:
                res = HybridMappingResult(
                    namaste_code=cm.source_code,
                    namaste_term=namaste_rec.term if namaste_rec else cm.source_code,
                    namaste_definition=namaste_rec.short_definition or namaste_rec.long_definition if namaste_rec else "",
                    icd11_code=cm.target_code.split('/')[-1] if '/' in cm.target_code else cm.target_code,
                    icd11_title=cm.mapping_note or "Mapped ICD-11 Entity",
                    icd11_uri=cm.target_code,
                    icd11_release=cm.target_system,
                    lexical_score=1.0,
                    token_score=1.0,
                    fuzzy_score=1.0,
                    synonym_score=1.0,
                    translation_score=1.0,
                    transliteration_score=1.0,
                    definition_score=1.0,
                    clinical_score=1.0,
                    semantic_score=1.0,
                    api_rank_score=1.0,
                    conflict_penalty=0.0,
                    final_score=1.0,
                    confidence_level="HIGH_CONFIDENCE_MATCH",
                    relationship_type=cm.equivalence,
                    mapping_status="MANUAL_MAPPED",
                    mapping_method="MANUAL"
                )
                db.add(res)
                created_results.append(res)
            try:
                db.commit()
            except Exception:
                db.rollback()
            return created_results

        # 3. On-demand dynamic execution via HybridMapper
        namaste_rec = db.query(NamasteCode).filter(NamasteCode.namaste_code == source_code).first()
        if namaste_rec:
            try:
                dyn_res = self.mapper.process_record(namaste_rec)
                if dyn_res:
                    db.add(dyn_res)
                    db.commit()
                    return [dyn_res]
            except Exception as e:
                db.rollback()

        return []

mapping_service = MappingService()
