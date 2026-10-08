import os
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class EvidenceRecord(BaseModel):
    evidence_id: str
    title: str
    source: str
    document_type: str
    publication_year: int
    source_url: str
    text: str
    concept_ids: List[str] = Field(default_factory=list)

class EvidenceStore:
    """
    In-memory / persistent Evidence Store supporting provenance-tracked clinical literature
    and retrieval by concept IDs and keyword matching.
    """

    def __init__(self, json_path: Optional[str] = None):
        self.evidence_list: List[EvidenceRecord] = []
        if json_path is None:
            json_path = os.path.join(os.path.dirname(__file__), "../../../../data/evidence/curated_medical_references.json")
        self.load_from_json(json_path)

    def load_from_json(self, path: str):
        if not os.path.exists(path):
            logger.warning(f"Evidence file not found at {path}")
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.evidence_list = [EvidenceRecord(**item) for item in data]
                logger.info(f"Loaded {len(self.evidence_list)} evidence records.")
        except Exception as e:
            logger.error(f"Failed to load evidence store: {e}")

    def retrieve_by_concepts(self, concepts: List[str]) -> List[EvidenceRecord]:
        if not concepts:
            return []
        lower_concepts = [c.lower() for c in concepts]
        matched = []
        for record in self.evidence_list:
            rec_concepts = [rc.lower() for rc in record.concept_ids]
            if any(c in rec_concepts or any(c in rc for rc in rec_concepts) for c in lower_concepts):
                matched.append(record)
        return matched

    def retrieve_by_text(self, query: str, limit: int = 3) -> List[EvidenceRecord]:
        if not query:
            return []
        query_words = set(query.lower().split())
        scored_records = []
        for record in self.evidence_list:
            text_words = set(record.text.lower().split()).union(set(record.title.lower().split()))
            overlap = len(query_words.intersection(text_words))
            if overlap > 0:
                scored_records.append((overlap, record))

        scored_records.sort(key=lambda x: x[0], reverse=True)
        return [r for _, r in scored_records[:limit]]

    def calculate_evidence_support_score(self, source_term: str, candidate_title: str) -> float:
        combined_query = f"{source_term} {candidate_title}"
        matched = self.retrieve_by_text(combined_query, limit=2)
        if not matched:
            return 0.4  # Neutral fallback when no specific text snippet found
        return min(1.0, 0.6 + (len(matched) * 0.18))

# Global singleton instance
evidence_store = EvidenceStore()
