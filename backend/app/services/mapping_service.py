from typing import List
from sqlalchemy.orm import Session
from backend.app.db.models import HybridMappingResult

class MappingService:
    def get_mappings_for_source(self, db: Session, source_code: str) -> List[HybridMappingResult]:
        """
        Retrieve all target mappings for a given source code (e.g., a NAMASTE code).
        """
        return db.query(HybridMappingResult).filter(HybridMappingResult.namaste_code == source_code).all()

mapping_service = MappingService()
