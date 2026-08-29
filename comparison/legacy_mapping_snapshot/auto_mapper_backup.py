import sys
import logging
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Ensure imports work
project_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.append(str(project_root))

from backend.app.db.database import SessionLocal
from backend.app.db.models import NamasteCode, ProposedMapping
from backend.app.services.icd_service import icd_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def compute_similarity(text1: str, text2: str) -> float:
    """Computes semantic similarity using TF-IDF and Cosine Similarity."""
    if not text1 or not text2:
        return 0.0
    vectorizer = TfidfVectorizer().fit_transform([text1, text2])
    vectors = vectorizer.toarray()
    return cosine_similarity(vectors)[0][1]

def run_auto_mapper(limit: int = None):
    """
    Pass 1: Search WHO for Namaste definitions
    Pass 2: Score using TF-IDF NLP similarity
    Saves to ProposedMapping table.
    """
    logger.info(f"Starting Auto-Mapper Pipeline for {'ALL' if limit is None else limit} records...")
    db = SessionLocal()
    
    try:
        # Get unmapped codes
        # Avoid EC-3.8.23 since it's already mapped
        query = db.query(NamasteCode).filter(NamasteCode.namaste_code != 'EC-3.8.23')
        if limit:
            codes = query.limit(limit).all()
        else:
            codes = query.all()
            
        for code in codes:
            logger.info(f"Processing: {code.namaste_code} - {code.term}")
            search_query = code.long_definition if code.long_definition else code.term
            
            # Use only the first few words to avoid over-complicating the search
            short_query = " ".join(search_query.split()[:5])
            
            # Pass 1: WHO Search
            results = icd_service.search_foundation(short_query)
            if not results or "destinationEntities" not in results:
                logger.warning(f"No WHO results for {code.namaste_code}")
                continue
            
            entities = results["destinationEntities"][:3] # Top 3
            
            for entity in entities:
                target_uri = entity.get("id")
                
                # Fetch full entity to get its title/definition
                entity_details = icd_service.get_entity_by_uri(target_uri)
                if not entity_details:
                    continue
                
                title_obj = entity_details.get("title", {})
                target_title = title_obj.get("@value", "") if isinstance(title_obj, dict) else str(title_obj)
                
                if not target_title:
                    continue
                
                # Pass 2: NLP Scoring
                score = compute_similarity(search_query, target_title)
                logger.info(f"  -> Found {target_title} (Score: {score:.2f})")
                
                # Check if proposal exists
                existing = db.query(ProposedMapping).filter_by(
                    source_code=code.namaste_code, target_uri=target_uri
                ).first()
                
                if not existing:
                    proposal = ProposedMapping(
                        source_code=code.namaste_code,
                        source_term=code.term,
                        target_uri=target_uri,
                        target_title=target_title,
                        similarity_score=f"{score:.2f}",
                        status="pending"
                    )
                    db.add(proposal)
                    db.commit() # Commit each one so the UI updates live!
        
        logger.info("Auto-Mapper Pipeline Finished.")
        
    finally:
        db.close()

if __name__ == "__main__":
    run_auto_mapper(limit=None)

