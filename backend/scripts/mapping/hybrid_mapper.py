import sys
import logging
import re
import math
from typing import Dict, Any, List, Optional
from pathlib import Path
from rapidfuzz import fuzz, process

# Ensure imports work
project_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.append(str(project_root))

from backend.app.db.database import SessionLocal
from backend.app.db.models import NamasteCode, HybridMappingResult
from backend.app.services.icd_service import icd_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HybridMapper:
    def __init__(self):
        # Configuration for weights
        self.weights = {
            "exact_match": 1.0,
            "lexical": 0.15,
            "token": 0.15,
            "fuzzy": 0.10,
            "synonym": 0.20,
            "translation": 0.10,
            "transliteration": 0.05,
            "definition": 0.15,
            "clinical": 0.15,
            "semantic": 0.10, # supporting only
            "api_rank": 0.05
        }
        
    def normalize_text(self, text: str) -> str:
        """Phase 5: Terminology Normalization"""
        if not text:
            return ""
        # Lowercase
        text = text.lower()
        # Remove punctuation and special characters
        text = re.sub(r'[^\w\s]', ' ', text)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text
        
    def generate_queries(self, source_record) -> List[str]:
        """Phase 6: Query Generation"""
        queries = []
        
        # 1. Original term
        if source_record.term:
            queries.append(source_record.term)
            
        # 2. Extract meaningful terms from short definition
        if source_record.short_definition:
            short_def = self.normalize_text(source_record.short_definition)
            if short_def and short_def not in [self.normalize_text(q) for q in queries]:
                queries.append(short_def)
                
        # 3. Important clinical terms (mock logic: taking top nouns/verbs if NLP was available)
        # We will split long definition and take some meaningful parts
        if source_record.long_definition:
            # Simple heuristic for keyword extraction: words longer than 5 chars
            words = [w for w in self.normalize_text(source_record.long_definition).split() if len(w) > 5]
            if words:
                queries.append(" ".join(words[:4])) # First 4 significant words
                
        # Filter empty queries
        queries = [q for q in queries if q and q.strip()]
        
        # Deduplicate
        return list(dict.fromkeys(queries))

    def _safe_get_title(self, entity: dict) -> str:
        title_obj = entity.get("title", {})
        if isinstance(title_obj, dict):
            return title_obj.get("@value", "")
        return str(title_obj) if title_obj else ""
        
    def _safe_get_definition(self, entity: dict) -> str:
        def_obj = entity.get("definition", {})
        if isinstance(def_obj, dict):
            return def_obj.get("@value", "")
        return str(def_obj) if def_obj else ""

    def _safe_get_synonyms(self, entity: dict) -> List[str]:
        synonyms = entity.get("synonym", [])
        result = []
        for syn in synonyms:
            if isinstance(syn, dict) and "label" in syn:
                label = syn["label"]
                if isinstance(label, dict):
                    result.append(label.get("@value", ""))
                else:
                    result.append(str(label))
        return [r for r in result if r]

    def retrieve_candidates(self, queries: List[str], top_n: int = 10) -> List[Dict[str, Any]]:
        """Phase 8: Retrieve Multiple ICD-11 Candidates"""
        candidates_map = {}
        
        for q_idx, query in enumerate(queries):
            results = icd_service.search_foundation(query)
            if not results or "destinationEntities" not in results:
                continue
                
            entities = results["destinationEntities"][:top_n]
            
            for rank, entity in enumerate(entities):
                uri = entity.get("id")
                if uri in candidates_map:
                    continue
                    
                # Fetch full entity details
                details = icd_service.get_entity_by_uri(uri)
                if not details:
                    continue
                    
                candidates_map[uri] = {
                    "uri": uri,
                    "code": details.get("code", ""),
                    "title": self._safe_get_title(details),
                    "definition": self._safe_get_definition(details),
                    "synonyms": self._safe_get_synonyms(details),
                    "api_rank": rank + 1,
                    "query_source_idx": q_idx
                }
                
        return list(candidates_map.values())
        
    def calculate_scores(self, source: NamasteCode, candidate: Dict[str, Any]) -> Dict[str, float]:
        """Phases 9, 10, 11: Hybrid Scoring"""
        scores = {
            "lexical_score": 0.0,
            "token_score": 0.0,
            "fuzzy_score": 0.0,
            "synonym_score": 0.0,
            "translation_score": 0.0,
            "transliteration_score": 0.0,
            "definition_score": 0.0,
            "clinical_score": 0.0,
            "semantic_score": 0.0,
            "api_rank_score": 0.0,
            "conflict_penalty": 0.0,
            "final_score": 0.0
        }
        
        src_term = self.normalize_text(source.term)
        tgt_term = self.normalize_text(candidate["title"])
        
        # 1. Exact / Lexical Match
        if src_term == tgt_term:
            scores["lexical_score"] = 1.0
        
        # 2. Token Similarity
        src_tokens = set(src_term.split())
        tgt_tokens = set(tgt_term.split())
        if src_tokens and tgt_tokens:
            intersection = src_tokens.intersection(tgt_tokens)
            scores["token_score"] = len(intersection) / max(len(src_tokens), len(tgt_tokens))
            
        # 3. Fuzzy Score
        scores["fuzzy_score"] = fuzz.ratio(src_term, tgt_term) / 100.0
        
        # 4. Synonym Match
        best_syn_score = 0.0
        for syn in candidate["synonyms"]:
            syn_norm = self.normalize_text(syn)
            best_syn_score = max(best_syn_score, fuzz.ratio(src_term, syn_norm) / 100.0)
        scores["synonym_score"] = best_syn_score
        
        # 5. Definition Score
        src_def = self.normalize_text(source.short_definition or source.long_definition or "")
        tgt_def = self.normalize_text(candidate["definition"])
        if src_def and tgt_def:
            src_def_tokens = set(src_def.split())
            tgt_def_tokens = set(tgt_def.split())
            if src_def_tokens and tgt_def_tokens:
                intersection = src_def_tokens.intersection(tgt_def_tokens)
                scores["definition_score"] = len(intersection) / max(len(src_def_tokens), len(tgt_def_tokens))
                
        # 6. Clinical Score (simplified: check for shared clinical keywords)
        clinical_keywords = ["fever", "pain", "swelling", "inflammation", "syndrome", "disease", "disorder", "acute", "chronic"]
        src_clinical = [w for w in src_tokens if w in clinical_keywords]
        tgt_clinical = [w for w in tgt_tokens if w in clinical_keywords]
        if src_clinical and tgt_clinical:
            intersection = set(src_clinical).intersection(set(tgt_clinical))
            scores["clinical_score"] = len(intersection) / max(len(src_clinical), len(tgt_clinical))
            
        # 7. Semantic Score (Simulated using rapidfuzz token_set_ratio as fallback)
        scores["semantic_score"] = fuzz.token_set_ratio(src_def or src_term, tgt_def or tgt_term) / 100.0
        
        # 8. API Rank Score (Inverse rank)
        rank = candidate["api_rank"]
        scores["api_rank_score"] = 1.0 / rank if rank > 0 else 0.0
        
        # 9. Conflict Penalty (e.g. source says "acute", target says "chronic")
        if ("acute" in src_tokens and "chronic" in tgt_tokens) or ("chronic" in src_tokens and "acute" in tgt_tokens):
            scores["conflict_penalty"] = 0.5
            
        # Calculate Final Score
        final_score = 0.0
        for key, weight in self.weights.items():
            if key in scores and key != "conflict_penalty":
                final_score += scores[key] * weight
                
        scores["final_score"] = max(0.0, final_score - scores["conflict_penalty"])
        
        # Cap at 1.0
        scores["final_score"] = min(1.0, scores["final_score"])
        
        return scores
        
    def determine_confidence(self, final_score: float) -> str:
        """Phase 12: Automatic Decision Engine"""
        if final_score >= 0.85:
            return "HIGH_CONFIDENCE_MATCH"
        elif final_score >= 0.60:
            return "PROBABLE_MATCH"
        elif final_score >= 0.40:
            return "LOW_CONFIDENCE_MATCH"
        else:
            return "NO_MATCH"
            
    def determine_relationship(self, scores: Dict[str, float], confidence: str) -> str:
        """Phase 14: Automatic Relationship Detection"""
        if confidence == "NO_MATCH":
            return "no_match"
        if scores["lexical_score"] == 1.0 or scores["final_score"] >= 0.90:
            return "equivalent"
        if scores["final_score"] >= 0.70:
            return "related"
        return "broader"

    def process_record(self, source: NamasteCode) -> Optional[HybridMappingResult]:
        logger.info(f"Processing NAMASTE code: {source.namaste_code} - {source.term}")
        
        queries = self.generate_queries(source)
        logger.info(f"Generated queries: {queries}")
        
        if not queries:
            return None
            
        candidates = self.retrieve_candidates(queries, top_n=5)
        logger.info(f"Retrieved {len(candidates)} unique candidates from WHO API.")
        
        best_candidate = None
        best_scores = None
        
        for candidate in candidates:
            scores = self.calculate_scores(source, candidate)
            if best_scores is None or scores["final_score"] > best_scores["final_score"]:
                best_scores = scores
                best_candidate = candidate
                
        if not best_candidate:
            return None
            
        confidence = self.determine_confidence(best_scores["final_score"])
        relationship = self.determine_relationship(best_scores, confidence)
        
        # Phase 13: NEVER FORCE A MAPPING
        if confidence == "NO_MATCH":
            best_candidate["code"] = None
            best_candidate["title"] = "NO SUITABLE CANDIDATE FOUND"
            best_candidate["uri"] = None
            best_candidate["definition"] = None
            
        result = HybridMappingResult(
            namaste_code=source.namaste_code,
            namaste_term=source.term,
            namaste_definition=source.short_definition or source.long_definition,
            icd11_code=best_candidate.get("code"),
            icd11_title=best_candidate.get("title"),
            icd11_definition=best_candidate.get("definition"),
            icd11_uri=best_candidate.get("uri"),
            
            lexical_score=best_scores["lexical_score"],
            token_score=best_scores["token_score"],
            fuzzy_score=best_scores["fuzzy_score"],
            synonym_score=best_scores["synonym_score"],
            translation_score=best_scores["translation_score"],
            transliteration_score=best_scores["transliteration_score"],
            definition_score=best_scores["definition_score"],
            clinical_score=best_scores["clinical_score"],
            semantic_score=best_scores["semantic_score"],
            api_rank_score=best_scores["api_rank_score"],
            conflict_penalty=best_scores["conflict_penalty"],
            
            final_score=best_scores["final_score"],
            confidence_level=confidence,
            relationship_type=relationship,
            mapping_status="AUTO_MAPPED",
            mapping_method="HYBRID"
        )
        return result

    def run(self, limit: int = None):
        db = SessionLocal()
        try:
            query = db.query(NamasteCode).filter(NamasteCode.namaste_code != 'EC-3.8.23')
            codes = query.limit(limit).all() if limit else query.all()
            
            # Phase 15: Database Update
            for code in codes:
                result = self.process_record(code)
                if result:
                    # Remove old if exists
                    db.query(HybridMappingResult).filter_by(namaste_code=code.namaste_code).delete()
                    db.add(result)
                    db.commit()
                    logger.info(f"Saved mapping for {code.namaste_code}: {result.icd11_title} ({result.confidence_level})")
        finally:
            db.close()

if __name__ == "__main__":
    mapper = HybridMapper()
    mapper.run(limit=None)
